import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, useOwnedTurfs } from "@/hooks/useUserRoles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ChevronLeft, ChevronRight, Building, LayoutDashboard, FileText, Clock,
  CalendarDays, CreditCard, BarChart3, Settings, Package
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tab Components
import { TurfOverviewTab } from "@/components/turf-dashboard/TurfOverviewTab";
import { TurfListingTab } from "@/components/turf-dashboard/TurfListingTab";
import { TurfAvailabilityTab } from "@/components/turf-dashboard/TurfAvailabilityTab";
import { TurfBookingsTab } from "@/components/turf-dashboard/TurfBookingsTab";
import { TurfPaymentsTab } from "@/components/turf-dashboard/TurfPaymentsTab";
import { TurfReportsTab } from "@/components/turf-dashboard/TurfReportsTab";
import { TurfSettingsTab } from "@/components/turf-dashboard/TurfSettingsTab";
import { TurfInventoryTab } from "@/components/turf-dashboard/TurfInventoryTab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "listing", label: "Listing & Details", icon: FileText },
  { id: "availability", label: "Availability & Pricing", icon: Clock },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "payments", label: "Payments & Payouts", icon: CreditCard },
  { id: "reports", label: "Reports & Export", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabType = typeof TABS[number]["id"];

export default function TurfDashboard() {
  const { user, loading } = useAuth();
  const { isTurfOwner, loading: rolesLoading } = useUserRoles();
  const { data: ownedTurfsData, isLoading: turfsLoading } = useOwnedTurfs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(null);

  const ownedTurfs = ownedTurfsData?.map((to: any) => to.turfs).filter(Boolean) || [];

  // Fetch full turf details for the selected turf
  const { data: selectedTurf, isLoading: turfLoading } = useQuery({
    queryKey: ["turf-details", selectedTurfId],
    queryFn: async () => {
      if (!selectedTurfId) return null;
      const { data, error } = await supabase
        .from("turfs")
        .select("*")
        .eq("id", selectedTurfId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTurfId,
  });

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || !isTurfOwner)) {
      navigate("/dashboard");
      toast.error("Access denied. Turf owners only.");
    }
  }, [user, isTurfOwner, loading, rolesLoading, navigate]);

  useEffect(() => {
    if (ownedTurfs.length > 0 && !selectedTurfId) {
      setSelectedTurfId(ownedTurfs[0].id);
    }
  }, [ownedTurfs, selectedTurfId]);

  if (loading || rolesLoading || turfsLoading || !isTurfOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (ownedTurfs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">No Turfs Assigned</h2>
            <p className="text-muted-foreground mb-4">
              You don't have any turfs assigned to your account yet. Contact an admin to get started.
            </p>
            <Link to="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTurfUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["turf-details", selectedTurfId] });
    queryClient.invalidateQueries({ queryKey: ["owned-turfs"] });
  };

  const renderTabContent = () => {
    if (!selectedTurfId || !selectedTurf) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading turf data...</div>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return <TurfOverviewTab turfId={selectedTurfId} turf={selectedTurf} />;
      case "listing":
        return <TurfListingTab turfId={selectedTurfId} turf={selectedTurf} onUpdate={handleTurfUpdate} />;
      case "availability":
        return <TurfAvailabilityTab turfId={selectedTurfId} turf={selectedTurf} onUpdate={handleTurfUpdate} />;
      case "bookings":
        return <TurfBookingsTab turfId={selectedTurfId} turf={selectedTurf} />;
      case "inventory":
        return <TurfInventoryTab turfId={selectedTurfId} turf={selectedTurf} />;
      case "payments":
        return <TurfPaymentsTab turfId={selectedTurfId} turf={selectedTurf} />;
      case "reports":
        return <TurfReportsTab turfId={selectedTurfId} turf={selectedTurf} />;
      case "settings":
        return <TurfSettingsTab turfId={selectedTurfId} turf={selectedTurf} onUpdate={handleTurfUpdate} />;
      default:
        return <TurfOverviewTab turfId={selectedTurfId} turf={selectedTurf} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "h-screen sticky top-0 border-r border-border bg-card transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Turf Console</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Turf Selector */}
        {!sidebarCollapsed && ownedTurfs.length > 1 && (
          <div className="p-4 border-b border-border">
            <Label className="text-xs text-muted-foreground">Select Turf</Label>
            <Select value={selectedTurfId || ""} onValueChange={setSelectedTurfId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select turf" />
              </SelectTrigger>
              <SelectContent>
                {ownedTurfs.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Show selected turf name when sidebar is collapsed but there are multiple turfs */}
        {sidebarCollapsed && ownedTurfs.length > 1 && (
          <div className="p-2 border-b border-border">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {selectedTurf?.name?.charAt(0) || "T"}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className={cn("w-full", sidebarCollapsed && "px-2")}>
              {sidebarCollapsed ? "←" : "← Back to Dashboard"}
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {renderTabContent()}
      </main>
    </div>
  );
}
