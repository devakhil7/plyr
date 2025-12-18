import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Upload, 
  Users, 
  CreditCard, 
  CheckCircle, 
  Loader2, 
  IndianRupee,
  Trophy,
  User,
  Phone,
  Mail,
  Image
} from "lucide-react";

type Step = "team" | "payment" | "success";

export default function TournamentRegister() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("team");
  const [teamName, setTeamName] = useState("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [paymentOption, setPaymentOption] = useState<"full" | "advance">("full");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "ground">("online");
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [teamNameError, setTeamNameError] = useState<string | null>(null);

  // Check for duplicate team name
  const checkDuplicateTeamName = async (name: string) => {
    if (!id || !name.trim()) {
      setTeamNameError(null);
      return;
    }
    
    const { data: existingTeams } = await supabase
      .from("tournament_teams")
      .select("id, team_name")
      .eq("tournament_id", id)
      .ilike("team_name", name.trim());
    
    if (existingTeams && existingTeams.length > 0) {
      setTeamNameError("A team with this name already exists in this tournament");
    } else {
      setTeamNameError(null);
    }
  };

  // Debounced team name check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkDuplicateTeamName(teamName);
    }, 500);
    return () => clearTimeout(timer);
  }, [teamName, id]);

  // Fetch tournament details
  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(`
          *,
          turfs (id, name, city, location)
        `)
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Pre-fill contact info from profile
  useEffect(() => {
    if (profile) {
      setContactEmail(profile.email || "");
    }
  }, [profile]);

  // Handle logo upload preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file must be less than 5MB");
        return;
      }
      setTeamLogoFile(file);
      setTeamLogoPreview(URL.createObjectURL(file));
    }
  };

  // Calculate advance amount
  const calculateAdvanceAmount = (): number => {
    if (!tournament?.allow_part_payment || !tournament?.advance_value) {
      return tournament?.entry_fee || 0;
    }
    if (tournament.advance_type === "percentage") {
      return Math.round((tournament.entry_fee * tournament.advance_value) / 100);
    }
    return tournament.advance_value;
  };

  const advanceAmount = calculateAdvanceAmount();
  const amountToPay = paymentOption === "advance" ? advanceAmount : (tournament?.entry_fee || 0);

  const isTeamValid = teamName.trim().length > 0 && contactPhone.trim().length > 0 && contactEmail.trim().length > 0 && !teamNameError;

  // Register team mutation
  const registerTeam = useMutation({
    mutationFn: async () => {
      if (!user || !tournament) throw new Error("Invalid state");

      // Final server-side check for duplicate team name before insert
      const { data: existingTeams } = await supabase
        .from("tournament_teams")
        .select("id")
        .eq("tournament_id", tournament.id)
        .ilike("team_name", teamName.trim());

      if (existingTeams && existingTeams.length > 0) {
        throw new Error("A team with this name already exists in this tournament");
      }

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (teamLogoFile) {
        const fileExt = teamLogoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${user.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("team-logos")
          .upload(fileName, teamLogoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("team-logos")
          .getPublicUrl(fileName);
        
        logoUrl = urlData.publicUrl;
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("tournament_teams")
        .insert({
          tournament_id: tournament.id,
          team_name: teamName.trim(),
          captain_user_id: user.id,
          team_logo_url: logoUrl,
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          total_fee: tournament.entry_fee,
          total_paid: 0,
          payment_status: "unpaid",
          registration_status: "pending",
          team_status: "pending_payment",
        })
        .select()
        .single();

      if (teamError) throw teamError;
      return team;
    },
    onSuccess: (team) => {
      setCreatedTeamId(team.id);
      setStep("payment");
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register team");
    },
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!user || !createdTeamId || !tournament) {
      toast.error("Invalid state");
      return;
    }

    try {
      // Create Razorpay order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-tournament-razorpay-order",
        {
          body: {
            tournamentId: tournament.id,
            teamId: createdTeamId,
            amount: amountToPay,
            isAdvance: paymentOption === "advance",
          },
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SPORTIQ",
        description: `Tournament Entry: ${tournament.name}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Verify payment
          const { error: verifyError } = await supabase.functions.invoke(
            "verify-tournament-razorpay-payment",
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                teamId: createdTeamId,
                tournamentId: tournament.id,
                amount: amountToPay,
                isAdvance: paymentOption === "advance",
              },
            }
          );

          if (verifyError) {
            toast.error("Payment verification failed");
            return;
          }

          setPaymentStatus(amountToPay >= tournament.entry_fee ? "paid" : "partial");
          setStep("success");
          queryClient.invalidateQueries({ queryKey: ["tournament", tournament?.id] });
          toast.success("Payment successful!");
        },
        prefill: {
          name: profile?.name || "",
          email: contactEmail,
          contact: contactPhone,
        },
        theme: {
          color: "#7c3aed",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Razorpay error:", error);
      toast.error(error.message || "Failed to initiate payment");
    }
  };

  // Process payment at ground
  const processPayAtGround = useMutation({
    mutationFn: async () => {
      if (!user || !createdTeamId || !tournament) throw new Error("Invalid state");

      // Update team status - use 'unpaid' as payment_status (allowed value)
      const { error: updateError } = await supabase
        .from("tournament_teams")
        .update({
          total_paid: 0,
          payment_status: "unpaid",
          team_status: "pending_payment",
          registration_status: "confirmed",
          verification_notes: "Pay at ground",
        })
        .eq("id", createdTeamId);

      if (updateError) throw updateError;

      return { paymentStatus: "unpaid", teamStatus: "pending_payment", payAtGround: true };
    },
    onSuccess: (result) => {
      setPaymentStatus("pay_at_ground"); // For UI display only
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournament?.id] });
      toast.success("Registration confirmed! Pay at the ground.");
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    },
  });

  if (!user) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to register for a tournament.</p>
          <Link to="/auth">
            <Button>Login / Sign Up</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container-app py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="container-app py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-4">Tournament not found</h2>
          <Link to="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const getStepNumber = () => {
    switch (step) {
      case "team": return 1;
      case "payment": return 2;
      case "success": return 3;
    }
  };

  return (
    <Layout>
      <div className="container-app py-8 max-w-2xl mx-auto">
        <Link to={`/tournaments/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tournament
        </Link>

        <div className="mb-8">
          <Badge variant="sport" className="mb-2">{tournament.sport}</Badge>
          <h1 className="text-2xl font-bold">Register for {tournament.name}</h1>
        </div>

        {/* Progress */}
        {step !== "success" && (
          <div className="space-y-2 mb-8">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {getStepNumber()} of 2</span>
              <span>
                {step === "team" && "Team Details"}
                {step === "payment" && "Payment"}
              </span>
            </div>
            <Progress value={(getStepNumber() / 2) * 100} />
          </div>
        )}

        {/* Step 1: Team Registration */}
        {step === "team" && (
          <div className="space-y-6">
            {/* Team Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    className={teamNameError ? "border-destructive" : ""}
                  />
                  {teamNameError && (
                    <p className="text-sm text-destructive mt-1">{teamNameError}</p>
                  )}
                </div>

                <div>
                  <Label>Team Logo (optional)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {teamLogoPreview ? (
                      <img 
                        src={teamLogoPreview} 
                        alt="Team logo preview" 
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Button variant="outline" type="button" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Captain Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Captain Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.profile_photo_url || undefined} />
                    <AvatarFallback>{profile?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">Captain (You)</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Captain is automatically set to the logged-in user
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contactPhone">Phone Number *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Enter contact phone"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email Address *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Entry Fee Info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Entry Fee</span>
                  <span className="text-xl font-bold">
                    {tournament.entry_fee > 0 ? `₹${tournament.entry_fee.toLocaleString()}` : "Free"}
                  </span>
                </div>
                {tournament.allow_part_payment && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Part payment available: {tournament.advance_type === "percentage" 
                      ? `${tournament.advance_value}%` 
                      : `₹${tournament.advance_value}`} advance
                  </p>
                )}
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={() => registerTeam.mutate()} 
              disabled={!isTeamValid || registerTeam.isPending}
            >
              {registerTeam.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue to Payment
            </Button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === "payment" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={paymentOption}
                  onValueChange={(v) => setPaymentOption(v as "full" | "advance")}
                  className="space-y-3"
                >
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentOption === "full" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="full" />
                    <div className="flex-1">
                      <p className="font-medium">Pay Full Amount</p>
                      <p className="text-sm text-muted-foreground">
                        Pay ₹{tournament.entry_fee.toLocaleString()} now
                      </p>
                    </div>
                  </label>

                  {tournament.allow_part_payment && (
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        paymentOption === "advance" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <RadioGroupItem value="advance" />
                      <div className="flex-1">
                        <p className="font-medium">Pay Advance Only</p>
                        <p className="text-sm text-muted-foreground">
                          Pay ₹{advanceAmount.toLocaleString()} now, ₹{(tournament.entry_fee - advanceAmount).toLocaleString()} later
                        </p>
                      </div>
                    </label>
                  )}
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "online" | "ground")}
                  className="space-y-3"
                >
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="online" />
                    <div className="flex-1">
                      <p className="font-medium">Pay Online</p>
                      <p className="text-sm text-muted-foreground">
                        Pay now via UPI, Card, or Net Banking (Razorpay)
                      </p>
                    </div>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === "ground" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="ground" />
                    <div className="flex-1">
                      <p className="font-medium">Pay at Ground</p>
                      <p className="text-sm text-muted-foreground">
                        Pay in cash when you arrive at the venue
                      </p>
                    </div>
                    <IndianRupee className="h-5 w-5 text-muted-foreground" />
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {paymentMethod === "ground" ? "Amount Due at Ground" : "Amount to Pay Now"}
                  </span>
                  <span className="text-xl font-bold text-primary">
                    ₹{amountToPay.toLocaleString()}
                  </span>
                </div>
                {paymentMethod === "ground" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Please pay this amount when you arrive at the venue
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("team")} className="flex-1">
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => {
                  if (paymentMethod === "online") {
                    handleRazorpayPayment();
                  } else {
                    processPayAtGround.mutate();
                  }
                }}
                disabled={processPayAtGround.isPending}
              >
                {processPayAtGround.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {paymentMethod === "online" ? `Pay ₹${amountToPay.toLocaleString()}` : "Confirm Registration"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold">Registration Successful!</h2>
              <p className="text-muted-foreground mt-2">
                Your team <strong>{teamName}</strong> has been registered.
              </p>
            </div>

            <Card>
              <CardContent className="p-4 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-medium">{teamName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  <Badge variant={paymentMethod === "ground" ? "secondary" : (paymentStatus === "paid" ? "default" : "outline")}>
                    {paymentMethod === "ground" ? "Pay at Ground" : (paymentStatus === "paid" ? "Paid" : "Partial")}
                  </Badge>
                </div>
                {paymentMethod === "online" && paymentStatus !== "pay_at_ground" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-medium">₹{amountToPay.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-800">
                <strong>Next Step:</strong> Add your team roster. You can manage your players from the tournament page.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate(`/tournaments/${id}`)}
                className="flex-1"
              >
                View Tournament
              </Button>
              <Button 
                onClick={() => navigate(`/tournaments/${id}/register/roster?team=${createdTeamId}`)}
                className="flex-1"
              >
                Add Players
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}