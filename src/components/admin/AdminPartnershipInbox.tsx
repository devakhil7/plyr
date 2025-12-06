import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Phone, MapPin, Building2, Eye, CheckCircle, XCircle, Clock, Search } from "lucide-react";

type PartnershipRequest = {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  city: string;
  location_address: string;
  sport_types: string[];
  amenities: string[] | null;
  description: string | null;
  google_maps_link: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  approved: { label: "Approved", color: "bg-green-500", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500", icon: XCircle },
  contacted: { label: "Contacted", color: "bg-blue-500", icon: Mail },
};

const AdminPartnershipInbox = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<PartnershipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["partnership-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partnership_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PartnershipRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: any = { status };
      if (notes !== undefined) updateData.admin_notes = notes;
      
      const { error } = await supabase
        .from("partnership_requests")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnership-requests"] });
      toast.success("Request updated successfully");
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error("Failed to update request");
    },
  });

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const handleViewDetails = (request: PartnershipRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedRequest) return;
    updateStatusMutation.mutate({ 
      id: selectedRequest.id, 
      status, 
      notes: adminNotes 
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading partnership requests...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Partnership Inbox
            </span>
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} Pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business, owner, city, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No partnership requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Sports</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.business_name}</TableCell>
                        <TableCell>{request.owner_name}</TableCell>
                        <TableCell>{request.city}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {request.sport_types.slice(0, 2).map(sport => (
                              <Badge key={sport} variant="outline" className="text-xs">
                                {sport}
                              </Badge>
                            ))}
                            {request.sport_types.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{request.sport_types.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(request.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDetails(request)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Building2 className="h-5 w-5" />
                                  {request.business_name}
                                </DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-6">
                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Owner Name</p>
                                    <p className="font-medium">{request.owner_name}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Mail className="h-3 w-3" /> Email
                                    </p>
                                    <a href={`mailto:${request.email}`} className="font-medium text-primary hover:underline">
                                      {request.email}
                                    </a>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3" /> Phone
                                    </p>
                                    <a href={`tel:${request.phone}`} className="font-medium text-primary hover:underline">
                                      {request.phone}
                                    </a>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> Location
                                    </p>
                                    <p className="font-medium">{request.city}</p>
                                  </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Full Address</p>
                                  <p>{request.location_address}</p>
                                  {request.google_maps_link && (
                                    <a 
                                      href={request.google_maps_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary text-sm hover:underline"
                                    >
                                      View on Google Maps
                                    </a>
                                  )}
                                </div>

                                {/* Sports */}
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Sports Offered</p>
                                  <div className="flex flex-wrap gap-2">
                                    {request.sport_types.map(sport => (
                                      <Badge key={sport} variant="secondary">{sport}</Badge>
                                    ))}
                                  </div>
                                </div>

                                {/* Amenities */}
                                {request.amenities && request.amenities.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Amenities</p>
                                    <div className="flex flex-wrap gap-2">
                                      {request.amenities.map(amenity => (
                                        <Badge key={amenity} variant="outline">{amenity}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Description */}
                                {request.description && (
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Additional Information</p>
                                    <p className="text-sm">{request.description}</p>
                                  </div>
                                )}

                                {/* Admin Notes */}
                                <div className="space-y-2 border-t pt-4">
                                  <p className="text-sm font-medium">Admin Notes</p>
                                  <Textarea
                                    placeholder="Add notes about this request..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 border-t pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleStatusUpdate("contacted")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <Mail className="h-4 w-4 mr-1" />
                                    Mark Contacted
                                  </Button>
                                  <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleStatusUpdate("approved")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleStatusUpdate("rejected")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPartnershipInbox;
