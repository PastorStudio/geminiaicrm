import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lead } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import LeadForm from "../leads/LeadForm";

export default function SalesPipeline() {
  const { toast } = useToast();
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Verificar si WhatsApp está conectado
  const { data: whatsappStatus, isLoading: loadingWhatsappStatus } = useQuery({
    queryKey: ["/api/direct/whatsapp/status"],
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });
  
  const isWhatsappConnected = whatsappStatus?.authenticated === true;

  // Fetch leads by status - solo si WhatsApp está conectado
  const { data: newLeads, isLoading: loadingNewLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads", { status: "new" }],
    enabled: isWhatsappConnected,
  });

  const { data: contactedLeads, isLoading: loadingContactedLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads", { status: "contacted" }],
    enabled: isWhatsappConnected,
  });

  const { data: meetingLeads, isLoading: loadingMeetingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads", { status: "meeting" }],
    enabled: isWhatsappConnected,
  });

  const { data: closedLeads, isLoading: loadingClosedLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads", { status: "closed-won" }],
    enabled: isWhatsappConnected,
  });

  // Update lead status
  const moveLead = async (leadId: number, newStatus: string) => {
    try {
      await apiRequest('PATCH', `/api/leads/${leadId}/status`, { status: newStatus });
      toast({
        title: "Lead updated",
        description: "Lead moved to " + newStatus,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  // Render a lead card with services interests and probability based on conversation analysis
  const renderLeadCard = (lead: Lead) => {
    // Extraer servicios de interés y probabilidades de los tags si están disponibles
    const serviceTags = lead.tags?.filter(tag => 
      !tag.includes('%') && 
      tag !== 'WhatsApp' && 
      tag !== 'Contacto Real'
    ) || [];
    
    // Identificar tags de probabilidad (formato: "Interés: 75%")
    const probabilityTag = lead.tags?.find(tag => tag.includes('%'));
    let probability = null;
    
    if (probabilityTag) {
      const match = probabilityTag.match(/(\d+)%/);
      probability = match ? parseInt(match[1]) : null;
    }
    
    return (
      <div 
        key={lead.id}
        className="bg-white p-3 rounded-lg shadow-sm mb-3 cursor-pointer"
        onClick={() => setEditingLead(lead)}
      >
        <div className="flex justify-between">
          <span className="text-sm font-medium">{lead.name}</span>
          <Badge className={`${
            lead.status === 'new' ? 'bg-blue-100 text-blue-800' : 
            lead.status === 'contacted' ? 'bg-purple-100 text-purple-800' : 
            lead.status === 'meeting' ? 'bg-amber-100 text-amber-800' : 
            lead.status === 'closed-won' ? 'bg-green-100 text-green-800' : 
            lead.status === 'closed-lost' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {formatStatus(lead.status)}
          </Badge>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {lead.source && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 mr-2">{lead.source}</span>}
          {lead.company ? `Company: ${lead.company}` : lead.phone ? `Phone: ${lead.phone}` : `Email: ${lead.email}`}
        </div>
        
        {/* Extraer último mensaje de las notas si existe */}
        {lead.notes && lead.notes.includes('Último mensaje:') && (
          <div className="mt-2 text-xs bg-gray-50 p-1.5 rounded text-gray-600 max-h-10 overflow-hidden">
            <p className="truncate">"{lead.notes.split('Último mensaje:')[1].trim()}"</p>
          </div>
        )}
        
        {/* Mostrar servicios de interés analizados por Gemini */}
        {serviceTags.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-700 font-medium">Servicios de interés:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {serviceTags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Mostrar datos básicos */}
        <div className="mt-2 flex justify-between">
          <span className="text-xs text-gray-500">
            Added: {formatDate(lead.createdAt)}
          </span>
          
          {/* Mostrar probabilidad de interés/conversión */}
          {probability !== null && (
            <div className="flex flex-col">
              <div className="w-24 bg-gray-200 rounded-full h-1.5 mb-1">
                <div 
                  className={`h-1.5 rounded-full ${
                    probability > 75 ? 'bg-green-600' : 
                    probability > 50 ? 'bg-blue-600' : 
                    probability > 25 ? 'bg-yellow-500' : 'bg-red-600'}`}
                  style={{ width: `${probability}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-green-600 text-right">
                {probability}% Prob.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Format date to "2d ago" or similar
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays}d ago`;
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
      default: return status;
    }
  };

  // Get badge variant based on status
  const getStatusBadgeVariant = (status?: string) => {
    if (!status) return 'default';
    
    switch (status) {
      case 'new': return 'default';
      case 'contacted': return 'secondary';
      case 'meeting': return 'warning';
      case 'closed-won': return 'success';
      case 'closed-lost': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="px-4 py-5 sm:px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Sales Pipeline</CardTitle>
            <CardDescription>
              Lead progression through sales funnel
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <span className="material-icons">more_vert</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="p-4 min-w-full grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* New Leads Column */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">New Leads</h4>
                  <Badge variant="outline">{newLeads?.filter(lead => lead.source === 'whatsapp').length || 0}</Badge>
                </div>
                
                {!isWhatsappConnected ? (
                  <div className="text-center p-3 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-icons text-2xl mb-2">wifi_off</span>
                      <p>WhatsApp no conectado</p>
                      <p className="text-xs mt-1">Escanea el código QR para ver leads reales</p>
                    </div>
                  </div>
                ) : loadingNewLeads ? (
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
                      <div className="animate-pulse flex flex-col space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  newLeads?.filter(lead => lead.source === 'whatsapp').map(lead => renderLeadCard(lead))
                )}
                
                <Button 
                  variant="link" 
                  className="w-full mt-2 justify-center text-primary-600"
                  onClick={() => setEditingLead({ status: 'new' } as Lead)}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Add lead
                </Button>
              </div>
              
              {/* Contacted Column */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Contacted</h4>
                  <Badge variant="outline">{contactedLeads?.filter(lead => lead.source === 'whatsapp').length || 0}</Badge>
                </div>
                
                {!isWhatsappConnected ? (
                  <div className="text-center p-3 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-icons text-2xl mb-2">wifi_off</span>
                      <p>WhatsApp no conectado</p>
                      <p className="text-xs mt-1">Escanea el código QR para ver leads reales</p>
                    </div>
                  </div>
                ) : loadingContactedLeads ? (
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
                      <div className="animate-pulse flex flex-col space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  contactedLeads?.filter(lead => lead.source === 'whatsapp').map(lead => renderLeadCard(lead))
                )}
                
                <Button 
                  variant="link" 
                  className="w-full mt-2 justify-center text-primary-600"
                  onClick={() => setEditingLead({ status: 'contacted' } as Lead)}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Add contact
                </Button>
              </div>
              
              {/* Meeting Column */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Meeting Scheduled</h4>
                  <Badge variant="outline">{meetingLeads?.filter(lead => lead.source === 'whatsapp').length || 0}</Badge>
                </div>
                
                {!isWhatsappConnected ? (
                  <div className="text-center p-3 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-icons text-2xl mb-2">wifi_off</span>
                      <p>WhatsApp no conectado</p>
                      <p className="text-xs mt-1">Escanea el código QR para ver leads reales</p>
                    </div>
                  </div>
                ) : loadingMeetingLeads ? (
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
                      <div className="animate-pulse flex flex-col space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  meetingLeads?.filter(lead => lead.source === 'whatsapp').map(lead => renderLeadCard(lead))
                )}
                
                <Button 
                  variant="link" 
                  className="w-full mt-2 justify-center text-primary-600"
                  onClick={() => setEditingLead({ status: 'meeting' } as Lead)}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Add meeting
                </Button>
              </div>
              
              {/* Closed Column */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Closed</h4>
                  <Badge variant="outline">{closedLeads?.filter(lead => lead.source === 'whatsapp').length || 0}</Badge>
                </div>
                
                {!isWhatsappConnected ? (
                  <div className="text-center p-3 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-icons text-2xl mb-2">wifi_off</span>
                      <p>WhatsApp no conectado</p>
                      <p className="text-xs mt-1">Escanea el código QR para ver leads reales</p>
                    </div>
                  </div>
                ) : loadingClosedLeads ? (
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
                      <div className="animate-pulse flex flex-col space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  closedLeads?.filter(lead => lead.source === 'whatsapp').map(lead => renderLeadCard(lead))
                )}
                
                <Button 
                  variant="link" 
                  className="w-full mt-2 justify-center text-primary-600"
                  onClick={() => setEditingLead({ status: 'closed-won' } as Lead)}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Add deal
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editingLead && (
        <LeadForm 
          open={!!editingLead} 
          onClose={() => setEditingLead(null)} 
          initialData={editingLead}
        />
      )}
    </>
  );
}
