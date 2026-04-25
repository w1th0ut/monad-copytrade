"use client";

import { useEffect, useRef, useState } from "react";

type ScrollVideoProps = {
  src: string;
  className?: string;
};

export function ScrollVideo({ src, className }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  // Pre-fetch full video as blob → instant seeks (no streaming gaps)
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(src);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("durationchange", onMeta);
    if (video.readyState >= 1) onMeta();

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("durationchange", onMeta);
    };
  }, [blobUrl]);

  // Scroll → currentTime, queued (one seek at a time)
  useEffect(() => {
    if (!duration) return;
    const video = videoRef.current;
    if (!video) return;

    const computeProgress = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY || doc.scrollTop || 0;
      return total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    };

    const flush = () => {
      if (seekingRef.current) return;
      const target = targetTimeRef.current;
      if (Math.abs(video.currentTime - target) < 0.05) return;
      seekingRef.current = true;
      video.currentTime = target;
    };

    const onSeeked = () => {
      seekingRef.current = false;
      // If scroll moved further while we were seeking, chase it
      if (Math.abs(video.currentTime - targetTimeRef.current) > 0.05) {
        flush();
      }
    };

    const onScroll = () => {
      targetTimeRef.current = computeProgress() * duration;
      flush();
    };

    video.addEventListener("seeked", onSeeked);
    targetTimeRef.current = computeProgress() * duration;
    flush();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [duration]);

  return (
    <div className={className}>
      {blobUrl ? (
        <video
          ref={videoRef}
          src={blobUrl}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}
