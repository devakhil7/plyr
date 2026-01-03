import { ReactNode } from "react";
import { AppNavbar } from "./AppNavbar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function AppLayout({ children, showBottomNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden">{children}</main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
