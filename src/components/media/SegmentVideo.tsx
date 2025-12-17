import { useMemo } from "react";

function parseSegment(src: string): {
  baseSrc: string;
  start: number | null;
  end: number | null;
} {
  const idx = src.indexOf("#t=");
  if (idx === -1) return { baseSrc: src, start: null, end: null };

  const baseSrc = src.slice(0, idx);
  const fragment = src.slice(idx + 3); // after "#t"
  const value = fragment.startsWith("=") ? fragment.slice(1) : fragment;
  const [startRaw, endRaw] = value.split(",");

  const start = startRaw ? Number(startRaw) : NaN;
  const end = endRaw ? Number(endRaw) : NaN;

  return {
    baseSrc,
    start: Number.isFinite(start) ? start : null,
    end: Number.isFinite(end) ? end : null,
  };
}

type SegmentVideoProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src" | "loop"> & {
  src: string;
  loop?: boolean;
};

export function SegmentVideo({
  src,
  loop,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  ...props
}: SegmentVideoProps) {
  const segment = useMemo(() => parseSegment(src), [src]);
  const hasSegment = segment.start !== null && segment.end !== null;

  return (
    <video
      {...props}
      src={segment.baseSrc}
      loop={hasSegment ? false : loop}
      onLoadedMetadata={(e) => {
        if (hasSegment && segment.start !== null) {
          // Ensure the initial frame is from the segment start
          e.currentTarget.currentTime = segment.start;
        }
        onLoadedMetadata?.(e);
      }}
      onPlay={(e) => {
        if (hasSegment && segment.start !== null) {
          // If user scrubs before the start, snap them back in
          if (e.currentTarget.currentTime < segment.start) {
            e.currentTarget.currentTime = segment.start;
          }
        }
        onPlay?.(e);
      }}
      onTimeUpdate={(e) => {
        if (hasSegment && segment.start !== null && segment.end !== null) {
          if (e.currentTarget.currentTime >= segment.end) {
            e.currentTarget.pause();
            e.currentTarget.currentTime = segment.start;
            if (loop) {
              // Best-effort replay for looped highlight segments
              void e.currentTarget.play().catch(() => undefined);
            }
          }
        }
        onTimeUpdate?.(e);
      }}
    />
  );
}
