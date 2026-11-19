import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { RoutePath } from '../types/samo';
import { ProductImage } from './ProductImage';

interface HeroVideoSectionProps {
  onNavigate: (route: RoutePath) => void;
  onSelectCategory: (catName: string) => void;
  mediaType?: 'video' | 'image';
  videoUrl?: string;
  imageUrl?: string;
  kicker?: string;
  title?: string;
}

export const DEFAULT_HERO_VIDEO = 'https://images.samoweave.com/banners/1793837590618-copy-0698c90b-a323-4c4f-a4f4-b4cc32d2d791.mp4';

export const HeroVideoSection: React.FC<HeroVideoSectionProps> = ({
  onNavigate,
  onSelectCategory,
  mediaType = 'video',
  videoUrl = DEFAULT_HERO_VIDEO,
  imageUrl = 'studio://women-jacket-black-leather-biker',
  kicker = 'SAMO · CLASSIC · SPORT CHIC · FINE LEATHER · SUEDE · FUR',
  title = 'NEW ARRIVALS',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const userPausedRef = useRef<boolean>(false);
  const playInFlightRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [customVideoFailed, setCustomVideoFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

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
    <section className="relative w-full h-[calc(100svh-3.5rem)] md:h-[82vh] md:min-h-[565px] md:max-h-[900px] bg-zinc-950 overflow-hidden border-b border-zinc-950 touch-pan-y">
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
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute campaign video' : 'Mute campaign video'}
            className="bg-transparent border-0 p-1.5 text-white/90 hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Bottom-Center Campaign Title & Dual Rectangular White CTA Buttons */}
      <div className="absolute inset-x-0 bottom-10 z-20 flex flex-col items-center px-4 text-center">
        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-zinc-200 mb-2">
          {kicker}
        </p>
        <h1
          className="font-display text-white font-extrabold tracking-[0.14em] uppercase mb-6"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', textWrap: 'balance' }}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              onNavigate('/women');
              onSelectCategory('all');
            }}
            className="min-w-[168px] px-7 py-3.5 bg-white text-zinc-950 border border-zinc-950 text-xs font-bold tracking-[0.14em] uppercase hover:bg-zinc-950 hover:text-white hover:border-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Shop Women
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate('/kids');
              onSelectCategory('all');
            }}
            className="min-w-[168px] px-7 py-3.5 bg-white text-zinc-950 border border-zinc-950 text-xs font-bold tracking-[0.14em] uppercase hover:bg-zinc-950 hover:text-white hover:border-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Shop Kids
          </button>
        </div>
      </div>
    </section>
  );
};

