import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Brain, Target, TrendingUp, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  status: string;
  priority?: string;
  notes?: string;
  budget?: number;
  assigneeId?: number;
  createdAt?: string;
}

interface AIAnalysis {
  sentiment: string;
  intent: string;
  priority: string;
  category: string;
  confidence: number;
  recommendations: string[];
}

const PIPELINE_STAGES = [
  { id: 'new', name: 'Nuevos', color: 'bg-blue-100 text-blue-800' },
  { id: 'contacted', name: 'Contactados', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'qualified', name: 'Calificados', color: 'bg-orange-100 text-orange-800' },
  { id: 'proposal', name: 'Propuesta', color: 'bg-purple-100 text-purple-800' },
  { id: 'negotiation', name: 'Negociación', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'converted', name: 'Convertidos', color: 'bg-green-100 text-green-800' },
  { id: 'lost', name: 'Perdidos', color: 'bg-red-100 text-red-800' }
];

export function LeadsPipeline() {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{ [leadId: number]: AIAnalysis }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener todos los leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['/api/leads'],
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  // Mutación para mover lead entre etapas
  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, newStatus, notes }: { leadId: number; newStatus: string; notes?: string }) => {
      const response = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes })
      });
      
      if (!response.ok) {
        throw new Error('Error moviendo lead');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead actualizado",
        description: `Lead movido a ${PIPELINE_STAGES.find(s => s.id === data.lead.status)?.name}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo mover el lead",
        variant: "destructive"
      });
    }
  });

  // Mutación para análisis de IA
  const analyzeLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const lead = leads.find((l: Lead) => l.id === leadId);
      if (!lead) throw new Error('Lead no encontrado');

      const response = await fetch('/api/ai/analyze-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `lead_${leadId}`,
          messages: [
            { sender: 'Cliente', content: lead.notes || `Contacto desde ${lead.source}` },
            { sender: 'Sistema', content: `Lead: ${lead.name}, Email: ${lead.email}, Empresa: ${lead.company || 'N/A'}` }
          ],
          contactInfo: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company
          },
          accountId: 1
        })
      });
      
      if (!response.ok) {
        throw new Error('Error en análisis de IA');
      }
      
      return response.json();
    },
    onSuccess: (data, leadId) => {
      setAiAnalysis(prev => ({
        ...prev,
        [leadId]: data.analysis.analysis
      }));
      toast({
        title: "Análisis completado",
        description: "IA ha analizado el lead exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error en análisis",
        description: "No se pudo analizar el lead con IA",
        variant: "destructive"
      });
    }
  });

  // Generar leads automáticamente con IA
  const generateLeadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/generate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { sender: 'Cliente', content: 'Hola, estoy interesado en sus servicios' },
            { sender: 'Cliente', content: 'Necesito información sobre precios' }
          ],
          contactInfo: {
            name: 'Prospecto IA',
            phone: '+1234567890',
            email: 'prospecto@example.com'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Error generando lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead generado",
        description: "IA ha creado un nuevo lead automáticamente",
      });
    }
  });

  // Funciones de drag and drop
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    if (draggedLead && draggedLead.status !== targetStatus) {
      moveLeadMutation.mutate({
        leadId: draggedLead.id,
        newStatus: targetStatus,
        notes: `Movido a ${PIPELINE_STAGES.find(s => s.id === targetStatus)?.name} via drag-and-drop`
      });
    }
    
    setDraggedLead(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  // Agrupar leads por etapa
  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter((lead: Lead) => lead.status === stage.id);
    return acc;
  }, {} as { [key: string]: Lead[] });

  // Calcular estadísticas
  const totalLeads = leads.length;
  const convertedLeads = leadsByStage.converted?.length || 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(1) : '0';
  const totalValue = leads.reduce((sum: number, lead: Lead) => sum + (lead.budget || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black min-h-screen">
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Pipeline de Leads</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => generateLeadMutation.mutate()}
              disabled={generateLeadMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generar Lead IA
            </Button>
          </div>
        </div>

        {/* Estadísticas del pipeline */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Leads</p>
                  <p className="text-white text-2xl font-bold">{totalLeads}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Tasa Conversión</p>
                  <p className="text-white text-2xl font-bold">{conversionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Valor Total</p>
                  <p className="text-white text-2xl font-bold">${totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">En Proceso</p>
                  <p className="text-white text-2xl font-bold">{totalLeads - convertedLeads - (leadsByStage.lost?.length || 0)}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-7 gap-4 h-[calc(100vh-300px)]">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex flex-col bg-gray-900 rounded-lg border border-gray-700"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Header de la columna */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">{stage.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {leadsByStage[stage.id]?.length || 0}
                </Badge>
              </div>
            </div>

            {/* Lista de leads */}
            <div className="flex-1 p-2 overflow-y-auto space-y-2">
              {leadsByStage[stage.id]?.map((lead: Lead) => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-move transition-all duration-200 hover:shadow-lg border-gray-600 bg-gray-800 ${
                    draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-white text-sm leading-tight">{lead.name}</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => analyzeLeadMutation.mutate(lead.id)}
                          disabled={analyzeLeadMutation.isPending}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                          <Brain className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-gray-400 text-xs truncate">{lead.email}</p>
                      
                      {lead.company && (
                        <p className="text-gray-500 text-xs truncate">{lead.company}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {lead.budget && lead.budget > 0 && (
                          <span className="text-green-400 text-xs font-medium">
                            ${lead.budget.toLocaleString()}
                          </span>
                        )}
                        
                        {lead.priority && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              lead.priority === 'high' ? 'border-red-500 text-red-400' :
                              lead.priority === 'medium' ? 'border-yellow-500 text-yellow-400' :
                              'border-gray-500 text-gray-400'
                            }`}
                          >
                            {lead.priority}
                          </Badge>
                        )}
                      </div>

                      {/* Análisis de IA */}
                      {aiAnalysis[lead.id] && (
                        <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="h-3 w-3 text-blue-400" />
                            <span className="text-blue-400 font-medium">Análisis IA</span>
                          </div>
                          <div className="space-y-1 text-gray-300">
                            <p>Sentimiento: <span className="text-white">{aiAnalysis[lead.id].sentiment}</span></p>
                            <p>Intención: <span className="text-white">{aiAnalysis[lead.id].intent}</span></p>
                            <p>Confianza: <span className="text-white">{(aiAnalysis[lead.id].confidence * 100).toFixed(0)}%</span></p>
                          </div>
                        </div>
                      )}
                      
                      {lead.source && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {lead.source}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Placeholder cuando no hay leads */}
              {(!leadsByStage[stage.id] || leadsByStage[stage.id].length === 0) && (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Sin leads
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}