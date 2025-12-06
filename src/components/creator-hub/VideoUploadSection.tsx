import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Match {
  id: string;
  match_name: string;
  match_date: string;
  video_url: string | null;
}

interface VideoUploadSectionProps {
  onUpload: (file: File, matchId?: string) => void;
  isUploading: boolean;
}

const VideoUploadSection = ({ onUpload, isUploading }: VideoUploadSectionProps) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchUserMatches();
    }
  }, [user]);

  const fetchUserMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('id, match_name, match_date, video_url')
      .eq('host_id', user?.id)
      .order('match_date', { ascending: false })
      .limit(20);

    if (!error && data) {
      setMatches(data);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onUpload(file, selectedMatchId || undefined);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0], selectedMatchId || undefined);
    }
  };

  const handleMatchSelect = (matchId: string) => {
    setSelectedMatchId(matchId);
    const match = matches.find(m => m.id === matchId);
    if (match?.video_url) {
      // If match has a video, we could auto-load it
      // For now, just set the match ID
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload Match Video
        </CardTitle>
        <CardDescription>
          Upload a full match video or select an existing match with video
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Selection */}
        {matches.length > 0 && (
          <div className="space-y-2">
            <Label>Link to Existing Match (Optional)</Label>
            <Select value={selectedMatchId} onValueChange={handleMatchSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a match..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No match linked</SelectItem>
                {matches.map(match => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.match_name} - {new Date(match.match_date).toLocaleDateString()}
                    {match.video_url && " (has video)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Drag and Drop Upload */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center justify-center text-center">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium">Uploading video...</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </>
            ) : (
              <>
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Drag & drop your match video</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Button variant="outline" type="button">
                  <Upload className="mr-2 h-4 w-4" />
                  Select Video
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Supported formats: MP4, WebM, MOV. Max size: 500MB
        </p>
      </CardContent>
    </Card>
  );
};

export default VideoUploadSection;
