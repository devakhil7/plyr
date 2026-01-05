import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Phone } from "lucide-react";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check for redirect URL after auth
    const redirectUrl = sessionStorage.getItem("redirectAfterAuth");

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else {
            toast.error(error.message);
          }
        } else {
          // Store phone number in profile after signup
          if (phoneNumber) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from("profiles")
                .update({ phone_number: phoneNumber })
                .eq("id", user.id);
            }
          }
          toast.success("Account created! Redirecting...");
          // Keep redirectAfterAuth for CompleteProfile to use after profile completion
          navigate("/complete-profile");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error("Invalid email or password");
        } else {
          // Check if user is a turf owner
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", currentUser.id);
            
            const isTurfOwner = roles?.some(r => r.role === "turf_owner");
            
            toast.success("Welcome back!");
            sessionStorage.setItem("skipProfileCompletionRedirect", "1");
            sessionStorage.removeItem("redirectAfterAuth");
            
            // Redirect turf owners to their dashboard
            if (isTurfOwner) {
              navigate("/turf-dashboard");
            } else {
              navigate(redirectUrl || "/home");
            }
          }
        }
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container-app py-6">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary mx-auto mb-4">
              <span className="text-xl font-bold text-primary-foreground">S</span>
            </div>
            <CardTitle className="text-2xl">{isSignUp ? "Create your account" : "Welcome back"}</CardTitle>
            <CardDescription>
              {isSignUp ? "Join SPORTIQ and start playing" : "Sign in to your SPORTIQ account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional - for updates via WhatsApp</p>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              {isSignUp ? (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setIsSignUp(false)} className="text-primary font-medium hover:underline">
                    Sign in
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => setIsSignUp(true)} className="text-primary font-medium hover:underline">
                    Sign up
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
