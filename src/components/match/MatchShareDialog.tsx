import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Share2, Copy, Check, MessageCircle } from "lucide-react";

interface MatchShareDialogProps {
  matchId: string;
  matchName: string;
  matchDate: string;
  matchTime: string;
  turfName: string;
}

export function MatchShareDialog({
  matchId,
  matchName,
  matchDate,
  matchTime,
  turfName
}: MatchShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const matchUrl = `${window.location.origin}/matches/${matchId}`;
  const shareText = `🎮 Join my match: ${matchName}\n📅 ${matchDate} at ${matchTime}\n📍 ${turfName}\n\nJoin here: ${matchUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(matchUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Match</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">{matchName}</p>
            <p className="text-xs text-muted-foreground">
              {matchDate} at {matchTime} • {turfName}
            </p>
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Input value={matchUrl} readOnly className="flex-1 text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleWhatsAppShare} className="flex-1 bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Share on WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
