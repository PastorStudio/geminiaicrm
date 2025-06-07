import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Eye, MessageSquare, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PipelineColumn {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
}

export default function SalesPipelineKanban() {
  const { data: allLeads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for updating lead status
  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      return await apiRequest(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead actualizado",
        description: "El estado del lead se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del lead.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting leads
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      return await apiRequest(`/api/leads/${leadId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead eliminado",
        description: "El lead se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el lead.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating lead details
  const updateLeadDetailsMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: number; data: Partial<Lead> }) => {
      return await apiRequest(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditingLead(null);
      toast({
        title: "Lead actualizado",
        description: "Los detalles del lead se han actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los detalles del lead.",
        variant: "destructive",
      });
    },
  });

  // Organize leads into columns by status - 5-step pipeline
  useEffect(() => {
    if (allLeads) {
      const statusColumns: PipelineColumn[] = [
        {
          id: "new",
          title: "Nuevo",
          color: "bg-blue-100 border-blue-200",
          leads: allLeads.filter(lead => lead.status === "new")
        },
        {
          id: "assigned",
          title: "Asignado",
          color: "bg-purple-100 border-purple-200",
          leads: allLeads.filter(lead => lead.status === "assigned")
        },
        {
          id: "contacted",
          title: "Contactado",
          color: "bg-yellow-100 border-yellow-200",
          leads: allLeads.filter(lead => lead.status === "contacted")
        },
        {
          id: "negotiation",
          title: "Negociación",
          color: "bg-orange-100 border-orange-200",
          leads: allLeads.filter(lead => lead.status === "negotiation")
        },
        {
          id: "completed",
          title: "Completado",
          color: "bg-green-100 border-green-200",
          leads: allLeads.filter(lead => lead.status === "completed" || lead.status === "closed-won")
        },
        {
          id: "not-interested",
          title: "No Interesado",
          color: "bg-red-100 border-red-200",
          leads: allLeads.filter(lead => lead.status === "not-interested" || lead.status === "closed-lost")
        }
      ];
      setColumns(statusColumns);
    }
  }, [allLeads]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Update lead status based on the destination column
    const leadId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistically update the UI
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const sourceColumnIndex = newColumns.findIndex(col => col.id === source.droppableId);
      const destColumnIndex = newColumns.findIndex(col => col.id === destination.droppableId);

      const sourceLead = newColumns[sourceColumnIndex].leads[source.index];
      newColumns[sourceColumnIndex].leads.splice(source.index, 1);
      newColumns[destColumnIndex].leads.splice(destination.index, 0, { ...sourceLead, status: newStatus });

      return newColumns;
    });

    // Make API call to update the lead status in the database
    updateLeadMutation.mutate({ leadId, status: newStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "meeting": return "outline";
      case "proposal": return "outline";
      case "negotiation": return "outline";
      case "closed-won": return "default";
      case "closed-lost": return "destructive";
      default: return "default";
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-20 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="text-lg font-semibold">Sales Pipeline</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-h-[500px]">
            {columns.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${column.color} rounded-lg border-2 border-dashed p-3 transition-colors ${
                      snapshot.isDraggingOver ? "border-blue-400 bg-blue-50" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium text-sm text-gray-700">{column.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {column.leads.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {column.leads.map((lead, index) => (
                        <Draggable
                          key={lead.id.toString()}
                          draggableId={lead.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg border p-3 shadow-sm cursor-move transition-shadow ${
                                snapshot.isDragging ? "shadow-lg" : "hover:shadow-md"
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                    {lead.title}
                                  </h4>
                                </div>
                                
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <span>Value: {lead.value} {lead.currency}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span>Priority: {lead.priority}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center space-x-1">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLead(lead);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('¿Estás seguro de que quieres eliminar este lead?')) {
                                          deleteLeadMutation.mutate(lead.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {lead.probability}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}