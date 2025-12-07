import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Film, Send, Layers, Upload, Play } from "lucide-react";
import { useState, useRef } from "react";

interface HighlightClip {
  id: string;
  goal_timestamp_seconds: number;
  start_time_seconds: number;
  end_time_seconds: number;
  clip_video_url: string | null;
  is_selected: boolean;
  caption: string | null;
}

interface HighlightReviewSectionProps {
  clips: HighlightClip[];
  videoUrl: string;
  onClipToggle: (clipId: string, isSelected: boolean) => void;
  onCaptionChange: (clipId: string, caption: string) => void;
  onPublishIndividual: () => void;
  onPublishReel: () => void;
  onNewAnalysis: () => void;
  isPublishing: boolean;
}

const HighlightReviewSection = ({
  clips,
  videoUrl,
  onClipToggle,
  onCaptionChange,
  onPublishIndividual,
  onPublishReel,
  onNewAnalysis,
  isPublishing,
}: HighlightReviewSectionProps) => {
  const selectedCount = clips.filter(c => c.is_selected).length;

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (clips.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Goals Detected</h3>
            <p className="text-muted-foreground mb-4">
              The AI couldn't detect any goals in this video. This could happen if:
            </p>
            <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1">
              <li>• The video quality is too low</li>
              <li>• The video is too long for processing</li>
              <li>• No clear goal moments were visible</li>
            </ul>
            <Button onClick={onNewAnalysis} className="mt-6">
              <Upload className="mr-2 h-4 w-4" />
              Try Another Video
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <div>
              <p className="font-semibold">Analysis Complete!</p>
              <p className="text-sm text-muted-foreground">
                Found {clips.length} goal{clips.length !== 1 ? 's' : ''} in your video
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlight Clips Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Review Highlights
          </CardTitle>
          <CardDescription>
            Select the highlights you want to publish. {selectedCount} of {clips.length} selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                videoUrl={videoUrl}
                onToggle={onClipToggle}
                onCaptionChange={onCaptionChange}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Publish Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Publish to Feed
          </CardTitle>
          <CardDescription>
            Choose how you want to share your highlights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              onClick={onPublishIndividual}
              disabled={isPublishing || selectedCount === 0}
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <Layers className="h-6 w-6" />
                <span>Publish as Individual Posts</span>
                <span className="text-xs opacity-80">
                  {selectedCount} separate highlight posts
                </span>
              </div>
            </Button>
            
            <Button
              onClick={onPublishReel}
              disabled={isPublishing || selectedCount === 0}
              variant="secondary"
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <Film className="h-6 w-6" />
                <span>Publish as Combined Reel</span>
                <span className="text-xs opacity-80">
                  One highlight reel with all goals
                </span>
              </div>
            </Button>
          </div>

          <Button 
            variant="outline" 
            onClick={onNewAnalysis} 
            className="w-full"
            disabled={isPublishing}
          >
            <Upload className="mr-2 h-4 w-4" />
            Analyze Another Video
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

interface ClipCardProps {
  clip: HighlightClip;
  videoUrl: string;
  onToggle: (clipId: string, isSelected: boolean) => void;
  onCaptionChange: (clipId: string, caption: string) => void;
  formatTimestamp: (seconds: number) => string;
}

const ClipCard = ({ clip, videoUrl, onToggle, onCaptionChange, formatTimestamp }: ClipCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handlePlayClip = async () => {
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = clip.start_time_seconds;
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing video:", error);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= clip.end_time_seconds) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        handlePlayClip();
      }
    }
  };

  const handleLoadedMetadata = () => {
    setIsLoaded(true);
    // Set initial position to start of clip
    if (videoRef.current) {
      videoRef.current.currentTime = clip.start_time_seconds;
    }
  };

  return (
    <div 
      className={`
        border rounded-lg p-4 space-y-3 transition-colors
        ${clip.is_selected ? 'border-primary bg-primary/5' : 'border-muted'}
      `}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`clip-${clip.id}`}
          checked={clip.is_selected}
          onCheckedChange={(checked) => onToggle(clip.id, checked as boolean)}
        />
        <div className="flex-1">
          <Label 
            htmlFor={`clip-${clip.id}`} 
            className="font-medium cursor-pointer"
          >
            Goal at {formatTimestamp(clip.goal_timestamp_seconds)}
          </Label>
          <p className="text-xs text-muted-foreground">
            Clip: {formatTimestamp(clip.start_time_seconds)} - {formatTimestamp(clip.end_time_seconds)}
          </p>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative aspect-video bg-black rounded overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain cursor-pointer"
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onClick={handleVideoClick}
        />
        {!isPlaying && (
          <button
            onClick={handlePlayClip}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-primary-foreground ml-1" />
            </div>
          </button>
        )}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Caption Input */}
      <Input
        placeholder="Add a caption..."
        value={clip.caption || ''}
        onChange={(e) => onCaptionChange(clip.id, e.target.value)}
        className="text-sm"
      />
    </div>
  );
};

export default HighlightReviewSection;
