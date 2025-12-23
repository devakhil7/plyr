import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Share2, Copy, Check, MessageCircle, Twitter, Send, Share } from "lucide-react";

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
  const shortShareText = `Join my match "${matchName}" on ${matchDate} at ${matchTime} - ${turfName}`;

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
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.location.href = whatsappUrl;
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortShareText)}&url=${encodeURIComponent(matchUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(matchUrl)}&text=${encodeURIComponent(shortShareText)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: matchName,
          text: shortShareText,
          url: matchUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-white border-white/50 hover:bg-white/10 hover:text-white">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Match Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">{matchName}</p>
            <p className="text-xs text-muted-foreground">
              {matchDate} at {matchTime} • {turfName}
            </p>
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Input value={matchUrl} readOnly className="flex-1 text-sm bg-background" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleWhatsAppShare} className="bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={handleTelegramShare} className="bg-blue-500 hover:bg-blue-600">
              <Send className="h-4 w-4 mr-2" />
              Telegram
            </Button>
            <Button onClick={handleTwitterShare} variant="outline">
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
            <Button onClick={handleNativeShare} variant="outline">
              <Share className="h-4 w-4 mr-2" />
              More
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Anyone with the link can view and join this match
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
