import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Users, 
  Trophy, 
  MapPin, 
  Video, 
  BarChart3, 
  Calendar, 
  Star, 
  Shield,
  Zap,
  Target,
  Heart,
  Globe
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const features = [
  {
    icon: Users,
    title: "Host & Join Matches",
    description: "Create pickup games or join existing matches in your area. Build teams, invite friends, and never miss a game."
  },
  {
    icon: MapPin,
    title: "Discover Turfs",
    description: "Find and book the best sports facilities near you. Compare prices, amenities, and availability in one place."
  },
  {
    icon: Trophy,
    title: "Tournaments",
    description: "Participate in organized tournaments, track standings, and compete for glory with your team."
  },
  {
    icon: Video,
    title: "Match Recording & Highlights",
    description: "Record your matches, get AI-generated highlights, and relive your best moments with auto-detected goals and key plays."
  },
  {
    icon: BarChart3,
    title: "Player Analytics",
    description: "Track your performance across matches. View goals, assists, ratings, and improvement trends over time."
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Seamless booking system for turfs with real-time availability, instant confirmations, and reminders."
  },
  {
    icon: Star,
    title: "Player Ratings",
    description: "Rate teammates after matches across skills like pace, shooting, passing, and defending. Build your sports reputation."
  },
  {
    icon: Shield,
    title: "Skill-Based Matching",
    description: "Find matches that suit your skill level. From beginners to advanced players, everyone finds their perfect game."
  }
];

const values = [
  {
    icon: Target,
    title: "Our Mission",
    description: "To make sports accessible to everyone by connecting players, simplifying bookings, and building a thriving sports community."
  },
  {
    icon: Heart,
    title: "Community First",
    description: "We believe in the power of sports to bring people together. Every feature is designed to foster connections and friendships."
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "From AI-powered highlights to smart analytics, we leverage technology to enhance the amateur sports experience."
  },
  {
    icon: Globe,
    title: "Made for India",
    description: "Built specifically for Indian sports enthusiasts, understanding local turfs, playing styles, and community needs."
  }
];

const stats = [
  { value: "10K+", label: "Active Players" },
  { value: "500+", label: "Turfs Listed" },
  { value: "25K+", label: "Matches Played" },
  { value: "50+", label: "Cities" }
];

export default function About() {
  return (
    <Layout>
      <Helmet>
        <title>About SportsIQ - Your Complete Sports Companion</title>
        <meta 
          name="description" 
          content="SportsIQ is India's premier platform for amateur sports. Host matches, book turfs, join tournaments, and track your performance. Built for players, by players." 
        />
      </Helmet>

      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground py-20 md:py-32">
        <div className="container-app text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 animate-fade-in">
            About <span className="text-accent">SportsIQ</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-3xl mx-auto mb-8 animate-slide-up">
            The ultimate platform for neighbourhood sports enthusiasts. Host matches, discover turfs, 
            compete in tournaments, and build your sports identity — all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-4 animate-slide-up delay-200">
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="lg" className="btn-glow rounded-xl">
                Get Started Free
              </Button>
            </Link>
            <Link to="/matches">
              <Button variant="glass" size="lg" className="rounded-xl">
                Browse Matches
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-y border-border">
        <div className="container-app">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is SportsIQ */}
      <section className="section-spacing">
        <div className="container-app">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
              What is <span className="gradient-text">SportsIQ</span>?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              SportsIQ is India's premier digital platform designed for local sports players. 
              Whether you're looking for a casual game, want to organize a weekend tournament, 
              or need to book a turf for your team — we've got you covered. Our platform connects 
              players with venues, provides powerful analytics, and helps build a vibrant sports community.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-card p-6 card-hover animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-spacing bg-muted/30">
        <div className="container-app">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
            How It <span className="gradient-text">Works</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-xl mb-2">Create Your Profile</h3>
              <p className="text-muted-foreground">
                Sign up and set your skill level, preferred sports, and location. 
                Your profile becomes your sports identity.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-xl mb-2">Find or Host Matches</h3>
              <p className="text-muted-foreground">
                Browse available matches near you or create your own. 
                Invite friends, set skill requirements, and book a turf.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-xl mb-2">Play & Track Progress</h3>
              <p className="text-muted-foreground">
                Enjoy your game, record highlights, rate teammates, 
                and watch your stats improve over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="section-spacing">
        <div className="container-app">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
            Our <span className="gradient-text">Values</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Turf Owners */}
      <section className="section-spacing bg-card border-y border-border">
        <div className="container-app">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
              For <span className="gradient-text">Turf Owners</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Partner with SportsIQ to reach thousands of players, manage bookings effortlessly, 
              and grow your sports facility business. Our platform provides real-time booking management, 
              payment processing, and analytics to help you maximize occupancy.
            </p>
            <Link to="/partner">
              <Button variant="outline" size="lg" className="rounded-xl">
                Partner With Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing hero-gradient text-primary-foreground">
        <div className="container-app text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
            Ready to Level Up Your Game?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join thousands of players who are already using SportsIQ to find matches, 
            book turfs, and build their sports community.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="lg" className="btn-glow rounded-xl">
                Create Free Account
              </Button>
            </Link>
            <Link to="/turfs">
              <Button variant="glass" size="lg" className="rounded-xl">
                Explore Turfs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
