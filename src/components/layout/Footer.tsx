import { Link } from "react-router-dom";
import athletexLogo from "@/assets/athletex-logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={athletexLogo} alt="AthleteX" className="h-9 w-9 object-contain" />
              <span className="text-xl font-bold font-display text-foreground">AthleteX</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Pro-grade analytics, discovery and community for athletes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About AthleteX</Link></li>
              <li><Link to="/matches" className="hover:text-foreground transition-colors">Browse Matches</Link></li>
              <li><Link to="/turfs" className="hover:text-foreground transition-colors">Find Turfs</Link></li>
              <li><Link to="/feed" className="hover:text-foreground transition-colors">Community Feed</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* For Players */}
          <div>
            <h4 className="font-semibold mb-4">For Players</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/host-match" className="hover:text-foreground transition-colors">Host a Match</Link></li>
              <li><Link to="/profile" className="hover:text-foreground transition-colors">Complete Profile</Link></li>
              <li><Link to="/matches" className="hover:text-foreground transition-colors">Join Matches</Link></li>
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h4 className="font-semibold mb-4">For Business</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/partner" className="hover:text-foreground transition-colors">Partner With Us</Link></li>
              <li><Link to="/turf-login" className="hover:text-foreground transition-colors">Turf Owner Login</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AthleteX. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Made with ❤️ for Indian sports</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
