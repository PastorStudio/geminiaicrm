import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { LeadAITools } from './LeadAITools';
import { GeminiAssistant } from '../messaging/GeminiAssistant';

import { 
  BarChart3, 
  CalendarClock, 
  Mail, 
  Phone, 
  Building2,
  User, 
  Tag,
  Briefcase,
  Clock,
  Calendar,
  MessageSquare,
  BrainCircuit
} from 'lucide-react';

interface LeadDetailProps {
  leadId: number;
  open: boolean;
  onClose: () => void;
}

export function LeadDetail({ leadId, open, onClose }: LeadDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  // Consultar datos del lead
  const { 
    data: lead, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: [`/api/leads/${leadId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/leads/${leadId}`);
      return await response.json();
    },
    enabled: !!leadId && open,
  });
  
  // Consultar actividades asociadas al lead
  const { 
    data: activities, 
    isLoading: isLoadingActivities 
  } = useQuery({
    queryKey: ['/api/activities', { leadId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/activities?leadId=${leadId}`);
      return await response.json();
    },
    enabled: !!leadId && open,
  });
  
  // Consultar mensajes asociados al lead
  const { 
    data: messages, 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ['/api/messages', { leadId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/messages?leadId=${leadId}`);
      return await response.json();
    },
    enabled: !!leadId && open,
  });

  // Formatear estado para mostrar
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
  
  // Determinar la variante de la insignia según el estado
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
  
  // Formatear fecha para mostrar
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Manejar la generación de etiquetas
  const handleTagsGenerated = (tags: any[]) => {
    toast({
      title: "Etiquetas generadas",
      description: `Se generaron ${tags.length} etiquetas para este lead`,
    });
  };
  
  // Manejar la generación de tareas
  const handleTasksGenerated = (tasks: any[]) => {
    toast({
      title: "Tareas generadas",
      description: `Se generaron ${tasks.length} tareas para este lead`,
    });
  };

  // Renderizar información básica del lead
  const renderLeadInfo = () => {
    if (!lead) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="space-y-2">
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-24">Nombre:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-1 text-gray-400" />
                  {lead.fullName}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-24">Email:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Mail className="h-4 w-4 mr-1 text-gray-400" />
                  {lead.email}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-24">Teléfono:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Phone className="h-4 w-4 mr-1 text-gray-400" />
                  {lead.phone || "—"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-24">Empresa:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                  {lead.company || "—"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-24">Cargo:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                  {lead.position || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estado y seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="space-y-2">
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-28">Estado:</dt>
                <dd>
                  <Badge variant={getStatusBadgeVariant(lead.status)}>
                    {formatStatus(lead.status)}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-28">Origen:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Tag className="h-4 w-4 mr-1 text-gray-400" />
                  {lead.source || "—"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-28">Asignado a:</dt>
                <dd className="text-sm font-medium">
                  {lead.assignedTo ? "Usuario #" + lead.assignedTo : "No asignado"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-28">Últ. contacto:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-400" />
                  {formatDate(lead.lastContact)}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-gray-500 w-28">Próximo seg.:</dt>
                <dd className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                  {formatDate(lead.nextFollowUp)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        {/* Puntuación y Análisis */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Análisis AI</CardTitle>
            <CardDescription>Información generada automáticamente por Gemini AI</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-green-50 rounded-lg border">
                <div className="rounded-full bg-teal-100 p-2">
                  <BarChart3 className="h-5 w-5 text-teal-700" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Puntuación</div>
                  <div className="font-medium text-xl">
                    {lead.score ? lead.score + '/100' : '—'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <div className="rounded-full bg-blue-100 p-2">
                  <Tag className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Compatibilidad</div>
                  <div className="font-medium text-xl">
                    {lead.matchPercentage ? lead.matchPercentage + '%' : '—'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
                <div className="rounded-full bg-purple-100 p-2">
                  <CalendarClock className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Próx. etapa</div>
                  <div className="font-medium text-xl">
                    {lead.nextStageConfidence ? lead.nextStageConfidence + '%' : '—'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Etiquetas con probabilidades */}
            {lead.tags && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Etiquetas con probabilidad:</h3>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(lead.tags).map((tag: any, index: number) => (
                    <Badge 
                      key={index} 
                      variant={tag.probability >= 75 ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <span>{tag.name}</span>
                      <span className="inline-flex items-center justify-center rounded-full bg-white bg-opacity-20 px-1.5 py-0.5 text-xs font-medium">
                        {tag.probability}%
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Renderizar actividades del lead
  const renderActivities = () => {
    if (isLoadingActivities) {
      return (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      );
    }
    
    if (!activities || activities.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No hay actividades registradas para este lead</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {activities.map((activity: any) => (
          <Card key={activity.id} className={activity.completed ? "opacity-70" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{activity.title}</CardTitle>
                  <CardDescription>{activity.type}</CardDescription>
                </div>
                <Badge variant={activity.completed ? "outline" : "secondary"}>
                  {activity.completed ? "Completada" : "Pendiente"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <p className="text-sm text-gray-700">{activity.description}</p>
              
              {activity.aiGenerated && (
                <Badge variant="secondary" className="mt-2">
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  Generada por IA
                </Badge>
              )}
            </CardContent>
            <CardFooter className="pt-0 text-xs text-gray-500">
              <div className="flex justify-between w-full">
                <span>Creada: {formatDate(activity.createdAt)}</span>
                <span>Vence: {formatDate(activity.dueDate || activity.startTime)}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  // Renderizar mensajes del lead
  const renderMessages = () => {
    if (isLoadingMessages) {
      return (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      );
    }
    
    if (!messages || messages.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No hay mensajes registrados para este lead</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {messages.map((message: any) => (
          <Card key={message.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge variant={message.direction === "incoming" ? "outline" : "default"}>
                    {message.direction === "incoming" ? "Recibido" : "Enviado"}
                  </Badge>
                  <CardDescription>{message.channel}</CardDescription>
                </div>
                <span className="text-xs text-gray-500">{formatDate(message.sentAt)}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {message.aiGenerated && (
                <Badge variant="secondary" className="mt-2">
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  Generado por IA
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Detalle del Lead</span>
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <Badge variant={getStatusBadgeVariant(lead?.status)}>
                {formatStatus(lead?.status)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-red-500">
            Error al cargar la información del lead
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Vista general</TabsTrigger>
              <TabsTrigger value="activities">Actividades</TabsTrigger>
              <TabsTrigger value="messages">Mensajes</TabsTrigger>
              <TabsTrigger value="ai">Gemini AI</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {renderLeadInfo()}
            </TabsContent>
            
            <TabsContent value="activities" className="space-y-4">
              {renderActivities()}
            </TabsContent>
            
            <TabsContent value="messages" className="space-y-4">
              {renderMessages()}
            </TabsContent>
            
            <TabsContent value="ai" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LeadAITools 
                  leadId={leadId} 
                  onTagsGenerated={handleTagsGenerated}
                  onTasksGenerated={handleTasksGenerated}
                />
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-teal-500" />
                      Asistente Gemini
                    </CardTitle>
                    <CardDescription>
                      Consulta información y obtén ayuda con este lead
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <GeminiAssistant leadId={leadId} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}