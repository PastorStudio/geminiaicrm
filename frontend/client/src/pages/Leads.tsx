import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LeadForm from "@/components/leads/LeadForm";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { useGemini } from "@/hooks/useGemini";
import { Eye, BrainCircuit, Plus, MoreVertical, Kanban } from "lucide-react";
import SalesPipelineKanban from "@/components/leads/SalesPipelineKanban";

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLeadId, setViewingLeadId] = useState<number | null>(null);
  const { toast } = useToast();
  const { analyzeLead } = useGemini();

  // Fetch all leads
  const { data: allLeads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Filter leads based on search term and selected status
  const filteredLeads = allLeads?.filter(lead => {
    const matchesSearch = 
      !searchTerm || 
      lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !selectedStatus || lead.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Handle lead status update
  const handleUpdateStatus = async (leadId: number, newStatus: string) => {
    try {
      await apiRequest('PATCH', `/api/leads/${leadId}/status`, { status: newStatus });
      
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      toast({
        title: "Lead status updated",
        description: `Lead has been moved to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  // Handle lead deletion
  const handleDeleteLead = async (leadId: number) => {
    try {
      await apiRequest('DELETE', `/api/leads/${leadId}`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      toast({
        title: "Lead deleted",
        description: "Lead has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    }
  };

  // Handle lead analysis with Gemini AI
  const handleAnalyzeWithAI = async (leadId: number) => {
    try {
      await analyzeLead(leadId);
      
      toast({
        title: "Análisis IA completado",
        description: "El lead ha sido analizado y enriquecido con Gemini AI",
      });
      
      // Refrescar la lista de leads
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo analizar el lead con IA",
        variant: "destructive",
      });
    }
  };

  // Get badge variant based on status
  const getStatusBadgeVariant = (status?: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'new': return 'default';
      case 'contacted': return 'secondary';
      case 'meeting': return 'outline';
      case 'closed-won': return 'default';
      case 'closed-lost': return 'destructive';
      default: return 'default';
    }
  };

  // Format status for display
  const formatStatus = (status?: string) => {
    if (!status) return 'New';
    
    switch (status) {
      case 'new': return 'New';
      case 'contacted': return 'Contacted';
      case 'meeting': return 'Meeting';
      case 'closed-won': return 'Won';
      case 'closed-lost': return 'Lost';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <>
      <Helmet>
        <title>Leads | GeminiCRM</title>
        <meta name="description" content="Manage your leads with intelligent AI-powered insights and tracking" />
      </Helmet>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:hidden">Leads</h1>
          <p className="text-sm text-gray-500">
            Manage and track your leads through the sales pipeline
          </p>
        </div>
        <Button 
          className="bg-primary-600 hover:bg-primary-700 text-white self-end"
          onClick={() => setEditingLead({ status: 'new' } as Lead)}
        >
          <span className="material-icons text-sm mr-1">add</span>
          New Lead
        </Button>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="pipeline" className="flex items-center space-x-2">
              <Kanban className="h-4 w-4" />
              <span>Sales Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center space-x-2">
              <span>Table View</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Select 
              value={selectedStatus || ""}
              onValueChange={(value) => setSelectedStatus(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="closed-won">Closed (Won)</SelectItem>
                <SelectItem value="closed-lost">Closed (Lost)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="pipeline">
          <SalesPipelineKanban />
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardContent className="pt-6">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : filteredLeads?.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-lg font-medium mb-2">No leads found</div>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Match</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.fullName}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.company || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {formatStatus(lead.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{lead.source || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.matchPercentage ? (
                          <span className="text-xs font-medium text-green-600">
                            {lead.matchPercentage}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setViewingLeadId(lead.id)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleAnalyzeWithAI(lead.id)}
                            title="Analizar con IA"
                          >
                            <BrainCircuit className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setEditingLead(lead)}>
                                <span className="material-icons mr-2 text-sm">edit</span>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewingLeadId(lead.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAnalyzeWithAI(lead.id)}>
                                <BrainCircuit className="h-4 w-4 mr-2" />
                                Analizar con IA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                            {["new", "contacted", "meeting", "closed-won", "closed-lost"].map((status) => (
                              <DropdownMenuItem
                                key={status}
                                disabled={lead.status === status}
                                onClick={() => handleUpdateStatus(lead.id, status)}
                              >
                                <Badge 
                                  variant={getStatusBadgeVariant(status)}
                                  className="mr-2"
                                >
                                  {formatStatus(status)}
                                </Badge>
                                Move to {formatStatus(status)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteLead(lead.id)}
                            >
                              <span className="material-icons mr-2 text-sm">delete</span>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingLead && (
        <LeadForm 
          open={!!editingLead} 
          onClose={() => setEditingLead(null)} 
          initialData={editingLead}
        />
      )}
      
      {viewingLeadId && (
        <LeadDetail
          leadId={viewingLeadId}
          open={!!viewingLeadId}
          onClose={() => setViewingLeadId(null)}
        />
      )}
    </>
  );
}
