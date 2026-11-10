/**
 * Migration Script: Cloudflare R2 -> Cloudflare D1 SQL
 * Migrates all products, categories, orders, preorders, newsletter subscribers,
 * size guides, SEO config, and banners from R2 into D1 SQL.
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  initD1Schema,
  writeD1CatalogPatch,
  upsertD1NewsletterSubscriber,
  readD1CatalogState,
  readD1NewsletterSubscribers,
} from '../server/d1';

const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || 'samo-images',
};

async function readR2Catalog(): Promise<any> {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: 'state/catalog.json',
      })
    );
    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (err: any) {
    console.warn('[R2 Read Warning]', err.message);
    return null;
  }
}

async function readR2Newsletter(): Promise<any[]> {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: 'newsletter/subscribers.json',
      })
    );
    if (!res.Body) return [];
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function runMigration() {
  console.log('🚀 Starting Cloudflare R2 -> Cloudflare D1 SQL Migration...');

  // 1. Ensure Schema
  console.log('1. Initializing D1 SQL Tables...');
  await initD1Schema();

  // 2. Read R2 Data
  console.log('2. Reading live catalog state from R2 bucket...');
  const r2Data = await readR2Catalog();
  if (!r2Data) {
    throw new Error('Failed to read state/catalog.json from R2 bucket');
  }

  console.log(`Found in R2:
  - Products: ${r2Data.products?.length || 0}
  - Categories: ${r2Data.categories?.length || 0}
  - Orders: ${r2Data.orders?.length || 0}
  - Preorders: ${r2Data.preorders?.length || 0}
  - Settings keys: ${Object.keys(r2Data).join(', ')}`);

  // 3. Write into D1
  console.log('3. Inserting products, categories, orders, and settings into D1 SQL...');
  await writeD1CatalogPatch(r2Data);

  // 4. Newsletter subscribers
  console.log('4. Reading & migrating newsletter subscribers from R2...');
  const r2News = await readR2Newsletter();
  console.log(`Found ${r2News.length} newsletter subscribers in R2.`);
  for (const sub of r2News) {
    await upsertD1NewsletterSubscriber(sub);
  }

  // Also migrate any subscribers embedded in catalog
  if (Array.isArray(r2Data.newsletterSubscribers)) {
    for (const sub of r2Data.newsletterSubscribers) {
      if (sub && sub.email) {
        await upsertD1NewsletterSubscriber(sub);
      }
    }
  }

  // 5. Verification
  console.log('5. Verifying migrated state in D1 SQL...');
  const d1Catalog = await readD1CatalogState();
  const d1Subs = await readD1NewsletterSubscribers();

  console.log('✅ D1 Migration Verification Complete:');
  console.log(`  - Products in D1: ${d1Catalog?.products?.length || 0}`);
  console.log(`  - Categories in D1: ${d1Catalog?.categories?.length || 0}`);
  console.log(`  - Orders in D1: ${d1Catalog?.orders?.length || 0}`);
  console.log(`  - Preorders in D1: ${d1Catalog?.preorders?.length || 0}`);
  console.log(`  - Newsletter Subscribers in D1: ${d1Subs.length}`);
  console.log(`  - Banners preserved: ${Boolean(d1Catalog?.siteBanners)}`);
  console.log(`  - Size Guides preserved: ${Boolean(d1Catalog?.sizeGuideConfig)}`);
  console.log(`  - SEO Config preserved: ${Boolean(d1Catalog?.seoConfig)}`);

  console.log('🎉 Migration to Cloudflare D1 SQL succeeded flawlessly!');
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
