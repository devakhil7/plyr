import { cn } from "@/lib/utils";

interface AthleteSilhouettesProps {
  className?: string;
}

export function FootballPlayerSilhouette({ className }: AthleteSilhouettesProps) {
  return (
    <svg 
      viewBox="0 0 100 150" 
      fill="currentColor" 
      className={cn("w-24 h-36", className)}
    >
      {/* Football player kicking */}
      <ellipse cx="50" cy="20" rx="12" ry="14" />
      <path d="M50 34 L45 55 L35 52 L25 75 M50 34 L55 55 L70 48" strokeWidth="3" stroke="currentColor" fill="none" />
      <path d="M45 55 L40 90 L35 130 M45 55 L55 90 L75 110" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
      <ellipse cx="80" cy="115" rx="8" ry="6" />
    </svg>
  );
}

export function BasketballPlayerSilhouette({ className }: AthleteSilhouettesProps) {
  return (
    <svg 
      viewBox="0 0 120 180" 
      fill="currentColor" 
      className={cn("w-28 h-40", className)}
    >
      {/* Basketball player dunking */}
      <ellipse cx="85" cy="25" rx="14" ry="16" />
      <path d="M85 41 L75 70 L50 55 L30 45 M85 41 L95 65 L110 50" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="40" r="10" />
      <path d="M75 70 L65 110 L55 160 M75 70 L90 100 L85 150" strokeWidth="6" stroke="currentColor" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function RunnerSilhouette({ className }: AthleteSilhouettesProps) {
  return (
    <svg 
      viewBox="0 0 100 140" 
      fill="currentColor" 
      className={cn("w-20 h-28", className)}
    >
      {/* Runner in motion */}
      <ellipse cx="55" cy="18" rx="11" ry="13" />
      <path d="M55 31 L50 55 L30 50 L15 55 M55 31 L65 50 L80 45" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
      <path d="M50 55 L40 85 L20 120 M50 55 L65 80 L85 100" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BadmintonPlayerSilhouette({ className }: AthleteSilhouettesProps) {
  return (
    <svg 
      viewBox="0 0 120 160" 
      fill="currentColor" 
      className={cn("w-24 h-32", className)}
    >
      {/* Badminton player smashing */}
      <ellipse cx="70" cy="35" rx="13" ry="15" />
      <path d="M70 50 L65 80 L45 75 L20 50 M70 50 L85 70 L95 85" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
      <path d="M15 45 L5 25 L0 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
      <path d="M65 80 L55 120 L45 155 M65 80 L80 110 L85 150" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CelebratingSilhouette({ className }: AthleteSilhouettesProps) {
  return (
    <svg 
      viewBox="0 0 100 150" 
      fill="currentColor" 
      className={cn("w-20 h-30", className)}
    >
      {/* Person celebrating with arms up */}
      <ellipse cx="50" cy="20" rx="12" ry="14" />
      <path d="M50 34 L50 70 M35 45 L25 25 M65 45 L75 25" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
      <path d="M50 70 L40 110 L35 145 M50 70 L60 110 L65 145" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function SplashEffect({ className }: AthleteSilhouettesProps) {
  return (
    <svg 
      viewBox="0 0 200 200" 
      className={cn("w-48 h-48", className)}
    >
      {/* Paint splash effect */}
      <defs>
        <radialGradient id="splashGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="60" fill="url(#splashGradient)" />
      {/* Splash droplets */}
      <circle cx="45" cy="80" r="8" fill="currentColor" opacity="0.3" />
      <circle cx="160" cy="70" r="6" fill="currentColor" opacity="0.25" />
      <circle cx="140" cy="150" r="10" fill="currentColor" opacity="0.2" />
      <circle cx="55" cy="140" r="7" fill="currentColor" opacity="0.3" />
      <circle cx="170" cy="110" r="5" fill="currentColor" opacity="0.25" />
      <circle cx="30" cy="110" r="4" fill="currentColor" opacity="0.2" />
      <circle cx="85" cy="45" r="5" fill="currentColor" opacity="0.3" />
      <circle cx="120" cy="165" r="4" fill="currentColor" opacity="0.25" />
      {/* Spray particles */}
      <circle cx="25" cy="60" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="175" cy="55" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="185" cy="130" r="3" fill="currentColor" opacity="0.25" />
      <circle cx="20" cy="145" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="75" cy="175" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="130" cy="25" r="2" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

export function SportsIconsCluster({ className }: AthleteSilhouettesProps) {
  return (
    <div className={cn("relative", className)}>
      <SplashEffect className="absolute inset-0 text-primary opacity-30" />
      <div className="absolute top-0 left-1/4 opacity-60">
        <FootballPlayerSilhouette className="text-primary/80" />
      </div>
      <div className="absolute top-4 right-0 opacity-50">
        <BasketballPlayerSilhouette className="text-accent/70" />
      </div>
      <div className="absolute bottom-0 left-0 opacity-40">
        <RunnerSilhouette className="text-primary/60" />
      </div>
    </div>
  );
}
