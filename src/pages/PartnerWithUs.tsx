import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Mail, Phone, MapPin, Dumbbell, Send } from "lucide-react";

const SPORT_OPTIONS = ["Football", "Cricket", "Badminton", "Tennis", "Basketball", "Volleyball", "Hockey", "Other"];
const AMENITY_OPTIONS = ["Floodlights", "Changing Rooms", "Parking", "Cafeteria", "First Aid", "Restrooms", "Equipment Rental", "Seating Area"];

const PartnerWithUs = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    city: "",
    locationAddress: "",
    sportTypes: [] as string[],
    amenities: [] as string[],
    description: "",
    googleMapsLink: "",
  });

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      sportTypes: prev.sportTypes.includes(sport)
        ? prev.sportTypes.filter(s => s !== sport)
        : [...prev.sportTypes, sport]
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName || !formData.ownerName || !formData.email || !formData.phone || !formData.city || !formData.locationAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.sportTypes.length === 0) {
      toast.error("Please select at least one sport type");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("partnership_requests")
        .insert({
          business_name: formData.businessName.trim(),
          owner_name: formData.ownerName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim(),
          location_address: formData.locationAddress.trim(),
          sport_types: formData.sportTypes,
          amenities: formData.amenities,
          description: formData.description.trim() || null,
          google_maps_link: formData.googleMapsLink.trim() || null,
        });

      if (error) throw error;

      toast.success("Partnership request submitted successfully! We'll get back to you soon.");
      navigate("/");
    } catch (error: any) {
      console.error("Error submitting partnership request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    document.title = "Partner With Us | SPORTIQ";
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-3">Partner With Us</h1>
            <p className="text-muted-foreground text-lg">
              List your turf or sports facility on AthleteX and reach thousands of players
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Facility Details
              </CardTitle>
              <CardDescription>
                Fill in the details below and our team will get in touch with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business & Owner Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business/Turf Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="e.g., Green Valley Turf"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner Name *</Label>
                    <Input
                      id="ownerName"
                      placeholder="Full name"
                      value={formData.ownerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-4 w-4" /> Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="business@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-4 w-4" /> Phone *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Location Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> City *
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g., Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationAddress">Full Address *</Label>
                    <Input
                      id="locationAddress"
                      placeholder="Street address, area"
                      value={formData.locationAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, locationAddress: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="googleMapsLink">Google Maps Link (optional)</Label>
                  <Input
                    id="googleMapsLink"
                    placeholder="https://maps.google.com/..."
                    value={formData.googleMapsLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, googleMapsLink: e.target.value }))}
                  />
                </div>

                {/* Sport Types */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1">
                    <Dumbbell className="h-4 w-4" /> Sports Offered *
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {SPORT_OPTIONS.map((sport) => (
                      <div key={sport} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sport-${sport}`}
                          checked={formData.sportTypes.includes(sport)}
                          onCheckedChange={() => handleSportToggle(sport)}
                        />
                        <label
                          htmlFor={`sport-${sport}`}
                          className="text-sm cursor-pointer"
                        >
                          {sport}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-3">
                  <Label>Amenities (optional)</Label>
                  <div className="flex flex-wrap gap-3">
                    {AMENITY_OPTIONS.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`amenity-${amenity}`}
                          checked={formData.amenities.includes(amenity)}
                          onCheckedChange={() => handleAmenityToggle(amenity)}
                        />
                        <label
                          htmlFor={`amenity-${amenity}`}
                          className="text-sm cursor-pointer"
                        >
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Additional Information (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us more about your facility, capacity, special features..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Partnership Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PartnerWithUs;
