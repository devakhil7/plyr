import { ReactNode, useEffect } from "react";
import { AppNavbar } from "./AppNavbar";
import { BottomNav } from "./BottomNav";
import { useUserRoles } from "@/hooks/useUserRoles";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function AppLayout({ children, showBottomNav = true }: AppLayoutProps) {
  const { isTurfOwner, loading } = useUserRoles();
  
  // Ensure proper viewport height on PWA/mobile browsers
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // Turf owners don't see bottom nav
  const shouldShowBottomNav = showBottomNav && !isTurfOwner && !loading;

  return (
    <div 
      className="min-h-screen min-h-[100dvh] flex flex-col bg-background"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <AppNavbar />
      {/* Spacer for fixed navbar */}
      <div className="h-12 md:h-14 flex-shrink-0" />
      <main className={`flex-1 ${shouldShowBottomNav ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : ''} md:pb-0 overflow-y-auto overflow-x-hidden`}>
        {children}
      </main>
      {shouldShowBottomNav && <BottomNav />}
    </div>
  );
}
