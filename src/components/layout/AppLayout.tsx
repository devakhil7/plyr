import { ReactNode, useEffect } from "react";
import { AppNavbar } from "./AppNavbar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function AppLayout({ children, showBottomNav = true }: AppLayoutProps) {
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

  return (
    <div 
      className="min-h-screen min-h-[100dvh] flex flex-col bg-background"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <AppNavbar />
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 overflow-x-hidden">
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
