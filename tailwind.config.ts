import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // AthleteX Custom Colors
        athletex: {
          primary: "hsl(var(--athletex-primary))",
          secondary: "hsl(var(--athletex-secondary))",
          accent: "hsl(var(--athletex-accent))",
          surface: "hsl(var(--athletex-surface))",
        },
        status: {
          open: "hsl(var(--status-open))",
          full: "hsl(var(--status-full))",
          progress: "hsl(var(--status-progress))",
          completed: "hsl(var(--status-completed))",
          cancelled: "hsl(var(--status-cancelled))",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glow': 'var(--shadow-glow)',
        'premium': '0 10px 40px hsla(165, 50%, 15%, 0.12), 0 2px 10px hsla(165, 50%, 15%, 0.08)',
        'premium-lg': '0 20px 60px hsla(165, 50%, 15%, 0.18), 0 4px 20px hsla(165, 50%, 15%, 0.1)',
        'inner-glow': 'inset 0 2px 20px hsla(68, 65%, 55%, 0.1)',
        'card': '0 8px 32px hsla(165, 50%, 15%, 0.1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          from: { transform: 'scale(1)', opacity: '1' },
          to: { transform: 'scale(0.95)', opacity: '0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px hsla(68, 65%, 50%, 0.3), 0 0 40px hsla(68, 70%, 55%, 0.15)' 
          },
          '50%': { 
            boxShadow: '0 0 30px hsla(68, 65%, 50%, 0.45), 0 0 60px hsla(68, 70%, 55%, 0.25)' 
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.3s ease-out',
        'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
        'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out',
        'glow': 'glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, hsl(165 55% 22%) 0%, hsl(165 50% 28%) 50%, hsl(68 65% 50%) 100%)',
        'gradient-premium-light': 'linear-gradient(135deg, hsl(85 25% 82%) 0%, hsl(85 20% 78%) 50%, hsl(85 25% 82%) 100%)',
        'gradient-glass': 'linear-gradient(160deg, hsla(0, 0%, 100%, 0.15) 0%, hsla(0, 0%, 100%, 0.05) 100%)',
        'gradient-dark-glass': 'linear-gradient(160deg, hsla(165, 50%, 25%, 0.4) 0%, hsla(165, 55%, 15%, 0.2) 100%)',
        'hero-pattern': 'radial-gradient(ellipse at 30% 20%, hsla(68, 65%, 50%, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsla(165, 55%, 22%, 0.08) 0%, transparent 50%)',
        'hero-pattern-dark': 'radial-gradient(ellipse at 30% 20%, hsla(68, 65%, 55%, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsla(165, 50%, 30%, 0.06) 0%, transparent 50%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
