import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import TurfOwnerLogin from "./pages/TurfOwnerLogin";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import BrowseMatches from "./pages/BrowseMatches";
import MatchDetails from "./pages/MatchDetails";
import HostMatch from "./pages/HostMatch";
import Turfs from "./pages/Turfs";
import TurfDetails from "./pages/TurfDetails";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import PlayerProfile from "./pages/PlayerProfile";
import Messages from "./pages/Messages";
import Tournaments from "./pages/Tournaments";
import TournamentDetails from "./pages/TournamentDetails";
import AdminDashboard from "./pages/AdminDashboard";
import TurfDashboard from "./pages/TurfDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/turf-login" element={<TurfOwnerLogin />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/matches" element={<BrowseMatches />} />
            <Route path="/matches/:id" element={<MatchDetails />} />
            <Route path="/host-match" element={<HostMatch />} />
            <Route path="/turfs" element={<Turfs />} />
            <Route path="/turfs/:id" element={<TurfDetails />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetails />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/turf-dashboard" element={<TurfDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
