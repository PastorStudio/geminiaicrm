import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Ticket, 
  TrendingUp, 
  Clock, 
  Phone,
  Mail,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Activity
} from 'lucide-react';

interface AgentAnalysis {
  agentId: number;
  agentName: string;
  avatar?: string;
  role: string;
  department: string;
  status: string;
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
  totalChats: number;
  activeChats: number;
  ticketsOpen: number;
  ticketsClosed: number;
  ticketsResolved: number;
  performance: {
    responseTime: number;
    resolutionRate: number;
    customerSatisfaction: number;
    activityScore: number;
  };
  recentActivities: Array<{
    action: string;
    page: string;
    timestamp: string;
    details?: string;
  }>;
  leadCards: Array<{
    id: number;
    contactName: string;
    contactPhone: string;
    chatId: string;
    leadStatus: string;
    ticketStatus: string;
    assignedAgent: string;
    lastActivity: string;
    priority: string;
    tags: string[];
  }>;
}

export default function AgentAnalysis() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  
  // Obtener datos de análisis de agentes
  const { data: agentAnalysis, isLoading } = useQuery({
    queryKey: ['/api/agent-analysis'],
    queryFn: async () => {
      const response = await fetch('/api/agent-analysis');
      if (!response.ok) throw new Error('Error obteniendo análisis de agentes');
      return response.json();
    },
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  // Obtener leads como tarjetas con información completa
  const { data: leadCards } = useQuery({
    queryKey: ['/api/leads-cards', selectedAgent],
    queryFn: async () => {
      const url = selectedAgent 
        ? `/api/leads-cards?agentId=${selectedAgent}`
        : '/api/leads-cards';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error obteniendo tarjetas de leads');
      return response.json();
    },
    enabled: !!selectedAgent
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'nuevo': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contactado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'calificado': return 'bg-green-100 text-green-800 border-green-200';
      case 'convertido': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'perdido': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTicketStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'abierto': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'cerrado': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'resuelto': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando análisis de agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis Completo de Agentes</h1>
        <p className="text-gray-600">Análisis automático detallado de rendimiento, leads asignados y actividades de cada agente</p>
      </div>

      {/* Resumen general */}
      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Agentes</p>
                <h3 className="text-2xl font-bold text-blue-700">
                  {agentAnalysis?.length || 0}
                </h3>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Leads Activos</p>
                <h3 className="text-2xl font-bold text-green-700">
                  {agentAnalysis?.reduce((sum: number, agent: AgentAnalysis) => sum + agent.assignedLeads, 0) || 0}
                </h3>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Chats Activos</p>
                <h3 className="text-2xl font-bold text-purple-700">
                  {agentAnalysis?.reduce((sum: number, agent: AgentAnalysis) => sum + agent.activeChats, 0) || 0}
                </h3>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Tickets Abiertos</p>
                <h3 className="text-2xl font-bold text-orange-700">
                  {agentAnalysis?.reduce((sum: number, agent: AgentAnalysis) => sum + agent.ticketsOpen, 0) || 0}
                </h3>
              </div>
              <Ticket className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de agentes con análisis detallado */}
      <div className="grid gap-6">
        {agentAnalysis?.map((agent: AgentAnalysis) => (
          <Card key={agent.agentId} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {agent.agentName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{agent.agentName}</CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <Badge variant="outline">{agent.role}</Badge>
                      <Badge variant="secondary">{agent.department}</Badge>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm">{agent.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}
                  className="flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {selectedAgent === agent.agentId ? 'Ocultar Detalles' : 'Ver Detalles'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="performance">Rendimiento</TabsTrigger>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                  <TabsTrigger value="activity">Actividad</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                        Leads
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-bold text-blue-700">{agent.totalLeads}</div>
                          <div className="text-blue-600">Total</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-700">{agent.assignedLeads}</div>
                          <div className="text-green-600">Asignados</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="font-bold text-purple-700">{agent.convertedLeads}</div>
                          <div className="text-purple-600">Convertidos</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                        Chats
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-bold text-blue-700">{agent.totalChats}</div>
                          <div className="text-blue-600">Total</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-700">{agent.activeChats}</div>
                          <div className="text-green-600">Activos</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center">
                        <Ticket className="h-4 w-4 mr-2 text-orange-500" />
                        Tickets
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="font-bold text-yellow-700">{agent.ticketsOpen}</div>
                          <div className="text-yellow-600">Abiertos</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="font-bold text-red-700">{agent.ticketsClosed}</div>
                          <div className="text-red-600">Cerrados</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-700">{agent.ticketsResolved}</div>
                          <div className="text-green-600">Resueltos</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tiempo de Respuesta</span>
                          <span>{agent.performance.responseTime}min promedio</span>
                        </div>
                        <Progress value={Math.max(0, 100 - agent.performance.responseTime * 2)} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tasa de Resolución</span>
                          <span>{agent.performance.resolutionRate}%</span>
                        </div>
                        <Progress value={agent.performance.resolutionRate} className="h-2" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Satisfacción del Cliente</span>
                          <span>{agent.performance.customerSatisfaction}/5</span>
                        </div>
                        <Progress value={agent.performance.customerSatisfaction * 20} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Puntuación de Actividad</span>
                          <span>{agent.performance.activityScore}/100</span>
                        </div>
                        <Progress value={agent.performance.activityScore} className="h-2" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="leads">
                  {selectedAgent === agent.agentId && leadCards ? (
                    <div className="grid gap-4">
                      {leadCards.map((lead: any) => (
                        <Card key={lead.id} className="border-l-4 border-blue-500">
                          <CardContent className="pt-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">{lead.contactName}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Mail className="h-4 w-4" />
                                  <span>{lead.contactPhone}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>Chat: {lead.chatId}</span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Estado del Lead:</span>
                                  <Badge className={getStatusColor(lead.leadStatus)}>
                                    {lead.leadStatus}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Ticket:</span>
                                  {getTicketStatusIcon(lead.ticketStatus)}
                                  <span className="text-sm">{lead.ticketStatus}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Prioridad:</span>
                                  <Badge variant={lead.priority === 'alta' ? 'destructive' : lead.priority === 'media' ? 'default' : 'secondary'}>
                                    {lead.priority}
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Building className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm">Agente: {lead.assignedAgent}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm">Última actividad: {lead.lastActivity}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {lead.tags?.map((tag: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Selecciona "Ver Detalles" para mostrar las tarjetas de leads</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-blue-500" />
                      Actividades Recientes
                    </h4>
                    {agent.recentActivities?.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                          </div>
                          <p className="text-sm text-gray-600">Página: {activity.page}</p>
                          {activity.details && (
                            <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}