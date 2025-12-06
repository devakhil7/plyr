import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FeedTab = "for-you" | "following" | "nearby" | "events";

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as FeedTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-muted/50">
        <TabsTrigger value="for-you" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          For You
        </TabsTrigger>
        <TabsTrigger value="following" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Following
        </TabsTrigger>
        <TabsTrigger value="nearby" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Nearby
        </TabsTrigger>
        <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Events
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
