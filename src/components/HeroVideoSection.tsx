import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { HeroHeadlineSize, RoutePath } from '../types/samo';
import { ProductImage } from './ProductImage';

interface HeroVideoSectionProps {
  onNavigate: (route: RoutePath) => void;
  onSelectCategory: (catName: string) => void;
  mediaType?: 'video' | 'image';
  videoUrl?: string;
  imageUrl?: string;
  kicker?: string;
  title?: string;
  headlineSize?: HeroHeadlineSize;
}

export const DEFAULT_HERO_VIDEO = 'https://images.samoweave.com/banners/1793837590618-copy-0698c90b-a323-4c4f-a4f4-b4cc32d2d791.mp4';

const HERO_HEADLINE_SIZE_CLASSES: Record<HeroHeadlineSize, string> = {
  xs: 'text-sm sm:text-lg md:text-2xl',
  sm: 'text-base sm:text-2xl md:text-3xl',
  md: 'text-xl sm:text-3xl md:text-[40px]',
  lg: 'text-2xl sm:text-4xl md:text-5xl',
  xl: 'text-3xl sm:text-5xl md:text-6xl',
};

export const HeroVideoSection: React.FC<HeroVideoSectionProps> = ({
  onNavigate,
  onSelectCategory,
  mediaType = 'video',
  videoUrl = DEFAULT_HERO_VIDEO,
  imageUrl = 'studio://women-jacket-black-leather-biker',
  title = 'WINTER EDITION',
  headlineSize = 'md',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const userPausedRef = useRef<boolean>(false);
  const playInFlightRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [customVideoFailed, setCustomVideoFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && window.innerHeight > 300) {
      return window.innerHeight;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastWidth = window.innerWidth;

    const syncMobileHeight = () => {
      if (window.innerWidth < 768 && window.innerHeight > 300) {
        setMobileViewportHeight(window.innerHeight);
      } else {
        setMobileViewportHeight(null);
      }
      lastWidth = window.innerWidth;
    };

    syncMobileHeight();

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (
        Math.abs(currentWidth - lastWidth) > 20 ||
        (currentWidth >= 768 && lastWidth < 768) ||
        (currentWidth < 768 && lastWidth >= 768)
      ) {
        syncMobileHeight();
      }
    };

    const handleOrientationChange = () => {
      window.setTimeout(syncMobileHeight, 120);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const requestedVideoUrl = (videoUrl || DEFAULT_HERO_VIDEO).trim();
  const effectiveVideoUrl = customVideoFailed
    ? DEFAULT_HERO_VIDEO
    : requestedVideoUrl;

  const showImageBanner = mediaType === 'image' || videoFailed;

  const attemptAutoplay = React.useCallback(() => {
    const vid = videoRef.current;
    if (
      !vid ||
      showImageBanner ||
      userPausedRef.current ||
      !vid.paused ||
      playInFlightRef.current
    ) {
      return;
    }
    if (isMuted) {
      vid.defaultMuted = true;
      vid.muted = true;
    }
    vid.playsInline = true;
    playInFlightRef.current = true;
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          playInFlightRef.current = false;
          setIsPlaying(true);
        })
        .catch(() => {
          playInFlightRef.current = false;
          if (!vid || userPausedRef.current || !vid.paused) return;
          vid.defaultMuted = true;
          vid.muted = true;
          setIsMuted(true);
          playInFlightRef.current = true;
          vid
            .play()
            .then(() => {
              playInFlightRef.current = false;
              setIsPlaying(true);
            })
            .catch(() => {
              playInFlightRef.current = false;
            });
        });
    } else {
      playInFlightRef.current = false;
    }
  }, [isMuted, showImageBanner]);

  useEffect(() => {
    userPausedRef.current = false;
    playInFlightRef.current = false;
    setCustomVideoFailed(false);
    setVideoFailed(false);
    setIsPlaying(true);
  }, [requestedVideoUrl, mediaType]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || showImageBanner) return;

    vid.defaultMuted = true;
    vid.muted = isMuted;
    vid.playsInline = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');

    if (vid.readyState >= 2) {
      attemptAutoplay();
    }

    // One-time passive touchstart/scroll fallback for iOS Low Power Mode or Android Data Saver
    const handleFirstInteraction = () => {
      const currentVid = videoRef.current;
      if (currentVid && currentVid.paused && !userPausedRef.current) {
        attemptAutoplay();
      }
    };

    window.addEventListener('touchstart', handleFirstInteraction, {
      passive: true,
      once: true,
    });
    window.addEventListener('scroll', handleFirstInteraction, {
      passive: true,
      once: true,
    });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
    };
  }, [effectiveVideoUrl, showImageBanner, isMuted, attemptAutoplay]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.defaultMuted = nextMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <section
      style={mobileViewportHeight ? { height: `${mobileViewportHeight}px` } : undefined}
      className="relative w-full h-[100svh] md:h-[94vh] md:min-h-[600px] md:max-h-[980px] bg-zinc-950 overflow-hidden border-b border-zinc-950 touch-pan-y"
    >
      {/* Background Video or Admin-Selected Image Banner */}
      {!showImageBanner ? (
        <video
          key={effectiveVideoUrl}
          ref={videoRef}
          src={effectiveVideoUrl}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          onLoadedData={attemptAutoplay}
          onCanPlay={attemptAutoplay}
          onPlay={() => setIsPlaying(true)}
          onError={(e) => {
            console.warn('[SAMO] Hero video playback notice:', e);
            if (!effectiveVideoUrl || effectiveVideoUrl === '') {
              setCustomVideoFailed(true);
            }
          }}
          className="pointer-events-none h-full w-full object-cover object-center opacity-90"
        />
      ) : (
        <div className="h-full w-full opacity-90">
          <ProductImage
            src={imageUrl || 'studio://women-jacket-black-leather-biker'}
            alt={title || 'SAMO Campaign Hero'}
            category="Jacket"
            styleType="Fine Leather"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Measured contrast scrim for 4.5:1 legibility across all frames */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/25" />

      {/* Bottom-Right Minimalist Volume Control (Mute/Unmute when in video mode) */}
      {!showImageBanner && (
        <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20 flex items-center">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute campaign video' : 'Mute campaign video'}
            className="bg-transparent border-0 p-1 text-white/90 hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-[14.7px] h-[14.7px]" />
            ) : (
              <Volume2 className="w-[14.7px] h-[14.7px]" />
            )}
          </button>
        </div>
      )}

      {/* Bottom-Center Campaign Title & Dual Underlined Text CTA Buttons */}
      <div className="absolute inset-x-0 bottom-9 sm:bottom-11 z-20 flex flex-col items-center px-4 text-center">
        {typeof title === 'string' && title.trim().length > 0 && (
          <h1
            className={`font-display text-white font-extrabold tracking-[0.14em] uppercase mb-5 leading-tight ${
              HERO_HEADLINE_SIZE_CLASSES[headlineSize] ||
              HERO_HEADLINE_SIZE_CLASSES.md
            }`}
          >
            {title.trim()}
          </h1>
        )}
        <div className="flex flex-wrap items-center justify-center gap-7">
          <button
            type="button"
            onClick={() => {
              onNavigate('/women');
              onSelectCategory('all');
            }}
            className="pb-1 border-b border-white text-white hover:text-white/80 hover:border-white/80 text-[11px] font-bold tracking-[0.16em] uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Shop Women
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate('/kids');
              onSelectCategory('all');
            }}
            className="pb-1 border-b border-white text-white hover:text-white/80 hover:border-white/80 text-[11px] font-bold tracking-[0.16em] uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Shop Kids
          </button>
        </div>
      </div>
    </section>
  );
};

