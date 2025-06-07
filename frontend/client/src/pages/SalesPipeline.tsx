import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Tag, TrendingUp, MoreVertical, Trash2, Edit, Calendar } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarIntegration } from '@/components/CalendarIntegration';

interface Lead {
  id: number;
  title: string;
  value: string;
  status: string;
  notes: string;
  tags: string[];
  probability: number;
  source: string;
  createdAt: string;
  contactId?: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const PIPELINE_STAGES = [
  { id: 'new', name: 'Nuevos', color: 'bg-blue-500' },
  { id: 'assigned', name: 'Asignados', color: 'bg-purple-500' },
  { id: 'contacted', name: 'Contactados', color: 'bg-yellow-500' },
  { id: 'negotiation', name: 'Negociación', color: 'bg-orange-500' },
  { id: 'completed', name: 'Completados', color: 'bg-green-500' },
  { id: 'not_interested', name: 'No Interesados', color: 'bg-red-500' },
];

const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Alto Valor', color: 'bg-emerald-100 text-emerald-800' },
  { id: '2', name: 'Urgente', color: 'bg-red-100 text-red-800' },
  { id: '3', name: 'WhatsApp', color: 'bg-green-100 text-green-800' },
  { id: '4', name: 'Referido', color: 'bg-blue-100 text-blue-800' },
  { id: '5', name: 'Prospecto Caliente', color: 'bg-orange-100 text-orange-800' },
];

export default function SalesPipeline() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    title: '',
    value: '',
    notes: '',
    tags: [] as string[],
    probability: 50,
    source: 'Manual'
  });
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [newTag, setNewTag] = useState({ name: '', color: 'bg-gray-100 text-gray-800' });
  const [showTagDialog, setShowTagDialog] = useState(false);
  
  const { toast } = useToast();

  // Fetch leads data
  const { data: leadsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => apiRequest('/api/leads'),
  });

  // Ensure leads is always an array
  const leads = Array.isArray(leadsResponse) ? leadsResponse : [];

  // Group leads by status
  const leadsByStatus = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter((lead: Lead) => lead.status === stage.id);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Create new lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (leadData: any) => apiRequest('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        title: leadData.title,
        value: leadData.value,
        status: 'new',
        notes: leadData.notes,
        tags: leadData.tags,
        probability: leadData.probability,
        source: leadData.source,
        whatsappAccountId: 1,
        contactId: 1
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setIsDialogOpen(false);
      setNewLead({
        title: '',
        value: '',
        notes: '',
        tags: [],
        probability: 50,
        source: 'Manual'
      });
      toast({
        title: "Lead creado",
        description: "El nuevo lead ha sido agregado al pipeline",
      });
    },
  });

  // Update lead status mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: number; status: string }) =>
      apiRequest(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      const leadId = parseInt(draggableId);
      const newStatus = destination.droppableId;
      
      updateLeadMutation.mutate({ leadId, status: newStatus });
    }
  };

  const handleCreateLead = () => {
    if (!newLead.title || !newLead.value) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el título y valor del lead",
        variant: "destructive"
      });
      return;
    }
    createLeadMutation.mutate(newLead);
  };

  const addTag = () => {
    if (!newTag.name.trim()) return;
    
    const tag: Tag = {
      id: Date.now().toString(),
      name: newTag.name,
      color: newTag.color
    };
    
    setTags([...tags, tag]);
    setNewTag({ name: '', color: 'bg-gray-100 text-gray-800' });
    setShowTagDialog(false);
    
    toast({
      title: "Etiqueta creada",
      description: `La etiqueta "${tag.name}" ha sido agregada`,
    });
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline de Ventas</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tu pipeline con tablero Kanban, etiquetas y probabilidades
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Gestionar Etiquetas</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Etiqueta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tag-name">Nombre de la etiqueta</Label>
                  <Input
                    id="tag-name"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    placeholder="Ej: Alto Valor"
                  />
                </div>
                <div>
                  <Label htmlFor="tag-color">Color</Label>
                  <Select onValueChange={(value) => setNewTag({ ...newTag, color: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-red-100 text-red-800">Rojo</SelectItem>
                      <SelectItem value="bg-blue-100 text-blue-800">Azul</SelectItem>
                      <SelectItem value="bg-green-100 text-green-800">Verde</SelectItem>
                      <SelectItem value="bg-yellow-100 text-yellow-800">Amarillo</SelectItem>
                      <SelectItem value="bg-purple-100 text-purple-800">Morado</SelectItem>
                      <SelectItem value="bg-orange-100 text-orange-800">Naranja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addTag} className="w-full">Crear Etiqueta</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Nuevo Lead</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título del Lead *</Label>
                  <Input
                    id="title"
                    value={newLead.title}
                    onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
                    placeholder="Ej: Empresa ABC - Software CRM"
                  />
                </div>
                
                <div>
                  <Label htmlFor="value">Valor Estimado *</Label>
                  <Input
                    id="value"
                    value={newLead.value}
                    onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                    placeholder="Ej: $50,000"
                  />
                </div>

                <div>
                  <Label htmlFor="probability">Probabilidad de Cierre: {newLead.probability}%</Label>
                  <Progress value={newLead.probability} className="mt-2" />
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={newLead.probability}
                    onChange={(e) => setNewLead({ ...newLead, probability: parseInt(e.target.value) })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="source">Fuente</Label>
                  <Select onValueChange={(value) => setNewLead({ ...newLead, source: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la fuente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Manual">Manual</SelectItem>
                      <SelectItem value="Referido">Referido</SelectItem>
                      <SelectItem value="Web">Sitio Web</SelectItem>
                      <SelectItem value="Redes Sociales">Redes Sociales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Etiquetas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const isSelected = newLead.tags.includes(tag.id);
                          setNewLead({
                            ...newLead,
                            tags: isSelected 
                              ? newLead.tags.filter(t => t !== tag.id)
                              : [...newLead.tags, tag.id]
                          });
                        }}
                        className={`px-2 py-1 rounded-full text-xs ${
                          newLead.tags.includes(tag.id) 
                            ? tag.color + ' ring-2 ring-offset-1 ring-blue-500' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    placeholder="Información adicional sobre el lead..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleCreateLead} 
                  className="w-full"
                  disabled={createLeadMutation.isPending}
                >
                  {createLeadMutation.isPending ? 'Creando...' : 'Crear Lead'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = leadsByStatus[stage.id] || [];
          const totalValue = stageLeads.reduce((sum, lead) => {
            const value = parseFloat(lead.value.replace(/[^0-9.-]+/g, '')) || 0;
            return sum + value;
          }, 0);

          return (
            <Card key={stage.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stage.name}</p>
                    <p className={`text-2xl font-bold ${stage.color.replace('bg-', 'text-').replace('-500', '-600')}`}>
                      {stageLeads.length}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${totalValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="min-w-[280px]">
              <div className={`text-white p-3 rounded-t-lg ${stage.color}`}>
                <h3 className="font-semibold">{stage.name}</h3>
                <p className="text-sm opacity-90">
                  {leadsByStatus[stage.id]?.length || 0} leads
                </p>
              </div>
              
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[500px] p-3 border border-t-0 rounded-b-lg bg-gray-50 ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                  >
                    {leadsByStatus[stage.id]?.map((lead, index) => (
                      <Draggable
                        key={lead.id.toString()}
                        draggableId={lead.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 cursor-move h-[180px] ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                            }`}
                          >
                            <CardContent className="p-4 h-full">
                              <div className="space-y-2 h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-semibold text-sm">{lead.title}</h4>
                                  <div className="flex items-center space-x-1">
                                    <TrendingUp 
                                      className={`h-4 w-4 ${getProbabilityColor(lead.probability)}`} 
                                    />
                                    <span className={`text-xs font-medium ${getProbabilityColor(lead.probability)}`}>
                                      {lead.probability}%
                                    </span>
                                  </div>
                                </div>

                                {lead.phone && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">📱</span>
                                    <span className="text-xs font-mono text-gray-600">{lead.phone}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-green-600">
                                    {lead.value}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {lead.source}
                                  </Badge>
                                </div>

                                {lead.notes && lead.notes.includes('Interés detectado:') && (
                                  <div className="flex items-center">
                                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                      {lead.notes.split('Interés detectado: ')[1]?.split('.')[0] || 'Consulta general'}
                                    </Badge>
                                  </div>
                                )}

                                {lead.tags && lead.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {lead.tags.slice(0, 2).map((tagId) => {
                                      const tag = tags.find(t => t.id === tagId);
                                      return tag ? (
                                        <Badge 
                                          key={tag.id} 
                                          className={`text-xs ${tag.color}`}
                                          variant="secondary"
                                        >
                                          {tag.name}
                                        </Badge>
                                      ) : null;
                                    })}
                                    {lead.tags.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{lead.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {lead.notes && (
                                  <p className="text-xs text-gray-600 line-clamp-2">
                                    {lead.notes}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                  <div className="flex items-center gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                          <Calendar className="h-3 w-3" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Calendario - {lead.title}</DialogTitle>
                                        </DialogHeader>
                                        <CalendarIntegration 
                                          leadId={lead.id}
                                          leadName={lead.title}
                                        />
                                      </DialogContent>
                                    </Dialog>
                                    <Progress value={lead.probability} className="w-12 h-1" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}