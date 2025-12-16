import { useState, useCallback } from 'react';

interface ExtractedFrame {
  timestamp: number;
  data: string; // base64 data URL
}

interface UseVideoFrameExtractorReturn {
  extractFrames: (videoElement: HTMLVideoElement, numFrames?: number) => Promise<ExtractedFrame[]>;
  isExtracting: boolean;
  progress: number;
}

export function useVideoFrameExtractor(): UseVideoFrameExtractorReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  const extractFrames = useCallback(async (
    videoElement: HTMLVideoElement,
    numFrames: number = 15 // Extract 15 frames by default
  ): Promise<ExtractedFrame[]> => {
    setIsExtracting(true);
    setProgress(0);
    
    const frames: ExtractedFrame[] = [];
    const duration = videoElement.duration;
    
    if (!duration || duration === 0) {
      setIsExtracting(false);
      throw new Error('Video duration not available');
    }

    // Calculate frame intervals - sample evenly across the video
    const interval = duration / (numFrames + 1);
    const timestamps: number[] = [];
    
    for (let i = 1; i <= numFrames; i++) {
      timestamps.push(interval * i);
    }

    // Create canvas for frame extraction
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setIsExtracting(false);
      throw new Error('Could not create canvas context');
    }

    // Set canvas size (scale down for efficiency)
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / videoElement.videoWidth);
    canvas.width = videoElement.videoWidth * scale;
    canvas.height = videoElement.videoHeight * scale;

    // Store original video state
    const originalTime = videoElement.currentTime;
    const wasPaused = videoElement.paused;
    
    if (!wasPaused) {
      videoElement.pause();
    }

    try {
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        
        // Seek to timestamp
        await new Promise<void>((resolve, reject) => {
          const onSeeked = () => {
            videoElement.removeEventListener('seeked', onSeeked);
            videoElement.removeEventListener('error', onError);
            resolve();
          };
          const onError = (e: Event) => {
            videoElement.removeEventListener('seeked', onSeeked);
            videoElement.removeEventListener('error', onError);
            reject(new Error('Video seek failed'));
          };
          
          videoElement.addEventListener('seeked', onSeeked);
          videoElement.addEventListener('error', onError);
          videoElement.currentTime = timestamp;
          
          // Timeout fallback
          setTimeout(() => {
            videoElement.removeEventListener('seeked', onSeeked);
            videoElement.removeEventListener('error', onError);
            resolve();
          }, 2000);
        });

        // Draw frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 (JPEG for smaller size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        frames.push({
          timestamp: timestamp,
          data: dataUrl
        });

        setProgress(Math.round(((i + 1) / timestamps.length) * 100));
      }
    } finally {
      // Restore original video state
      videoElement.currentTime = originalTime;
      if (!wasPaused) {
        videoElement.play();
      }
    }

    setIsExtracting(false);
    return frames;
  }, []);

  return {
    extractFrames,
    isExtracting,
    progress
  };
}