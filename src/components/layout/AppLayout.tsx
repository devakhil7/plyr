import { ReactNode } from "react";
import { AppNavbar } from "./AppNavbar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function AppLayout({ children, showBottomNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
