import { cn } from "@/lib/utils";

interface SportsSplashBackgroundProps {
  className?: string;
}

export function SportsSplashBackground({ className }: SportsSplashBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Large splash effects */}
      <svg 
        viewBox="0 0 800 600" 
        className="absolute -top-20 -right-20 w-[600px] h-[450px] opacity-20"
        fill="none"
      >
        <defs>
          <radialGradient id="splash1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(260 70% 60%)" stopOpacity="0.6" />
            <stop offset="70%" stopColor="hsl(270 80% 70%)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(280 80% 75%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Main splash blob */}
        <ellipse cx="400" cy="300" rx="280" ry="220" fill="url(#splash1)" />
        {/* Splatter droplets */}
        <circle cx="150" cy="150" r="25" fill="hsl(260 70% 60%)" opacity="0.3" />
        <circle cx="650" cy="120" r="18" fill="hsl(270 80% 70%)" opacity="0.25" />
        <circle cx="700" cy="350" r="30" fill="hsl(260 70% 60%)" opacity="0.2" />
        <circle cx="100" cy="400" r="22" fill="hsl(280 80% 75%)" opacity="0.3" />
        <circle cx="550" cy="500" r="15" fill="hsl(260 70% 60%)" opacity="0.25" />
        {/* Small particles */}
        <circle cx="200" cy="80" r="8" fill="hsl(270 80% 70%)" opacity="0.4" />
        <circle cx="720" cy="200" r="6" fill="hsl(260 70% 60%)" opacity="0.35" />
        <circle cx="80" cy="280" r="10" fill="hsl(280 80% 75%)" opacity="0.3" />
        <circle cx="600" cy="450" r="7" fill="hsl(270 80% 70%)" opacity="0.35" />
        <circle cx="300" cy="520" r="5" fill="hsl(260 70% 60%)" opacity="0.4" />
      </svg>

      {/* Left side splash */}
      <svg 
        viewBox="0 0 400 500" 
        className="absolute -bottom-20 -left-20 w-[350px] h-[440px] opacity-15"
        fill="none"
      >
        <defs>
          <radialGradient id="splash2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(270 80% 70%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(260 70% 60%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#splash2)" />
        <circle cx="50" cy="100" r="20" fill="hsl(270 80% 70%)" opacity="0.3" />
        <circle cx="350" cy="80" r="15" fill="hsl(260 70% 60%)" opacity="0.25" />
        <circle cx="380" cy="350" r="12" fill="hsl(280 80% 75%)" opacity="0.3" />
        <circle cx="30" cy="420" r="18" fill="hsl(270 80% 70%)" opacity="0.25" />
      </svg>

      {/* Floating particles throughout */}
      <div className="absolute top-1/4 left-1/3 w-3 h-3 rounded-full bg-primary/30 animate-float" />
      <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-accent/40 animate-float delay-200" />
      <div className="absolute bottom-1/4 left-1/5 w-4 h-4 rounded-full bg-primary/20 animate-float delay-300" />
      <div className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-accent/30 animate-float delay-500" />
      <div className="absolute bottom-1/3 right-1/5 w-3 h-3 rounded-full bg-primary/25 animate-float delay-100" />
    </div>
  );
}

export function HeroSplashDecoration({ className }: SportsSplashBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Dynamic splash behind hero */}
      <svg 
        viewBox="0 0 1000 600" 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="heroSplash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="50%" stopColor="white" stopOpacity="0.05" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Central glow */}
        <ellipse cx="500" cy="300" rx="400" ry="250" fill="url(#heroSplash)" />
        
        {/* Scattered splash particles */}
        <g filter="url(#glow)">
          <circle cx="200" cy="150" r="8" fill="white" opacity="0.2" />
          <circle cx="800" cy="180" r="10" fill="white" opacity="0.15" />
          <circle cx="150" cy="400" r="12" fill="white" opacity="0.1" />
          <circle cx="850" cy="420" r="8" fill="white" opacity="0.15" />
          <circle cx="350" cy="500" r="6" fill="white" opacity="0.2" />
          <circle cx="650" cy="100" r="7" fill="white" opacity="0.15" />
        </g>
        
        {/* Spray effect lines */}
        <g stroke="white" strokeWidth="1" opacity="0.1">
          <line x1="500" y1="300" x2="200" y2="100" />
          <line x1="500" y1="300" x2="800" y2="120" />
          <line x1="500" y1="300" x2="100" y2="350" />
          <line x1="500" y1="300" x2="900" y2="380" />
          <line x1="500" y1="300" x2="250" y2="500" />
          <line x1="500" y1="300" x2="750" y2="520" />
        </g>
      </svg>

      {/* Athlete silhouettes positioned around - More visible */}
      {/* Runner - bottom left */}
      <svg 
        viewBox="0 0 100 150" 
        className="absolute bottom-16 left-[3%] w-32 h-48 text-white/30 animate-float"
      >
        <ellipse cx="55" cy="18" rx="11" ry="13" fill="currentColor" />
        <path d="M55 31 L50 55 L30 50 L15 55 M55 31 L65 50 L80 45" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M50 55 L40 85 L20 120 M50 55 L65 80 L85 100" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </svg>

      {/* Basketball player dunking - top right */}
      <svg 
        viewBox="0 0 120 180" 
        className="absolute top-16 right-[5%] w-36 h-52 text-white/25 animate-float delay-300"
      >
        <ellipse cx="85" cy="25" rx="14" ry="16" fill="currentColor" />
        <path d="M85 41 L75 70 L50 55 L30 45 M85 41 L95 65 L110 50" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="22" cy="40" r="10" fill="currentColor" />
        <path d="M75 70 L65 110 L55 160 M75 70 L90 100 L85 150" strokeWidth="6" stroke="currentColor" fill="none" strokeLinecap="round" />
      </svg>

      {/* Football player kicking - bottom right */}
      <svg 
        viewBox="0 0 100 150" 
        className="absolute bottom-20 right-[10%] w-28 h-40 text-white/25 animate-float delay-500"
      >
        <ellipse cx="50" cy="20" rx="12" ry="14" fill="currentColor" />
        <path d="M50 34 L45 55 L35 52 L25 75 M50 34 L55 55 L70 48" strokeWidth="3" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M45 55 L40 90 L35 130 M45 55 L55 90 L75 110" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="80" cy="115" rx="8" ry="6" fill="currentColor" />
      </svg>

      {/* Badminton player - top left */}
      <svg 
        viewBox="0 0 120 160" 
        className="absolute top-24 left-[8%] w-28 h-36 text-white/20 animate-float delay-200"
      >
        <ellipse cx="70" cy="35" rx="13" ry="15" fill="currentColor" />
        <path d="M70 50 L65 80 L45 75 L20 50 M70 50 L85 70 L95 85" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M15 45 L5 25 L0 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M65 80 L55 120 L45 155 M65 80 L80 110 L85 150" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </svg>

      {/* Celebrating player - center bottom */}
      <svg 
        viewBox="0 0 100 150" 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-28 text-white/15 animate-float delay-400"
      >
        <ellipse cx="50" cy="20" rx="12" ry="14" fill="currentColor" />
        <path d="M50 34 L50 70 M35 45 L25 25 M65 45 L75 25" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M50 70 L40 110 L35 145 M50 70 L60 110 L65 145" strokeWidth="5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
