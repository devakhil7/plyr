import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Share2, Copy, Check, MessageCircle, Twitter, Send, Share, Trophy } from "lucide-react";
import { format } from "date-fns";

interface TournamentShareDialogProps {
  tournamentId: string;
  tournamentName: string;
  startDate: string;
  endDate: string;
  city: string;
  entryFee?: number;
  prizeDetails?: string;
}

export function TournamentShareDialog({
  tournamentId,
  tournamentName,
  startDate,
  endDate,
  city,
  entryFee,
  prizeDetails
}: TournamentShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tournamentUrl = `${window.location.origin}/tournaments/${tournamentId}`;
  const dateRange = `${format(new Date(startDate), "MMM d")} - ${format(new Date(endDate), "MMM d, yyyy")}`;
  
  const shareText = `🏆 Register your team for ${tournamentName}!\n📅 ${dateRange}\n📍 ${city}${entryFee && entryFee > 0 ? `\n💰 Entry: ₹${entryFee.toLocaleString()}` : ''}${prizeDetails ? `\n🎖️ ${prizeDetails}` : ''}\n\nRegister here: ${tournamentUrl}`;
  const shortShareText = `Register for "${tournamentName}" - ${dateRange} in ${city}${prizeDetails ? ` | ${prizeDetails}` : ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tournamentUrl);
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
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortShareText)}&url=${encodeURIComponent(tournamentUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(tournamentUrl)}&text=${encodeURIComponent(shortShareText)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournamentName,
          text: shortShareText,
          url: tournamentUrl,
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
          <DialogTitle>Share Tournament</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{tournamentName}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {dateRange} • {city}
            </p>
            {entryFee && entryFee > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Entry Fee: ₹{entryFee.toLocaleString()}
              </p>
            )}
            {prizeDetails && (
              <p className="text-xs text-green-600 font-medium mt-1">
                🏆 {prizeDetails}
              </p>
            )}
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Input value={tournamentUrl} readOnly className="flex-1 text-sm bg-background" />
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
            Share this link with teams to invite them to register
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
