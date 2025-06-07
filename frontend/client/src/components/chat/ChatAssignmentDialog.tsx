import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/authContext";
import { Check, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatAssignmentDialogProps {
  chatId: string;
  chatName: string;
  accountId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
}

export default function ChatAssignmentDialog({
  chatId,
  chatName,
  accountId,
  isOpen,
  onOpenChange,
  onAssigned
}: ChatAssignmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  // Cargar las categorías de chat
  const { data: categories } = useQuery({
    queryKey: ['/api/chat-categories'],
    queryFn: async () => {
      const response = await fetch('/api/chat-categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener categorías');
      }
      const data = await response.json();
      return data.categories || [];
    }
  });

  // Cargar los agentes disponibles
  const { data: agents } = useQuery({
    queryKey: ['/api/users/agents', { accountId }],
    queryFn: async () => {
      const response = await fetch(`/api/users/agents?accountId=${accountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener agentes');
      }
      const data = await response.json();
      return data.agents || [];
    }
  });

  // Cargar asignación actual si existe
  const { data: currentAssignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['/api/chat-assignments', chatId, accountId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-assignments?chatId=${chatId}&accountId=${accountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No hay asignación
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener asignación actual');
      }
      const data = await response.json();
      return data.assignment || null;
    },
    enabled: isOpen
  });

  // Establecer la selección inicial basada en la asignación actual
  useEffect(() => {
    if (currentAssignment) {
      setSelectedAgent(currentAssignment.assignedToId.toString());
      setCategory(currentAssignment.category || "");
      setNotes(currentAssignment.notes || "");
    } else {
      // Si no hay asignación actual, limpiar los campos
      setSelectedAgent("");
      setCategory("");
      setNotes("");
    }
  }, [currentAssignment]);

  // Mutación para asignar chat
  const assignChatMutation = useMutation({
    mutationFn: async (data: {
      chatId: string;
      accountId: number;
      assignedToId: number;
      category?: string;
      notes?: string;
    }) => {
      const response = await fetch('/api/chat-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al asignar chat');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/direct/whatsapp/chats'] });
      
      toast({
        title: "Chat asignado",
        description: "La conversación ha sido asignada correctamente",
      });
      
      onOpenChange(false);
      if (onAssigned) onAssigned();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el chat",
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar asignación
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      assignedToId?: number;
      category?: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/chat-assignments/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar asignación');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/direct/whatsapp/chats'] });
      
      toast({
        title: "Asignación actualizada",
        description: "La asignación ha sido actualizada correctamente",
      });
      
      onOpenChange(false);
      if (onAssigned) onAssigned();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la asignación",
        variant: "destructive",
      });
    }
  });

  // Manejar envío del formulario
  const handleSubmit = () => {
    if (!selectedAgent) {
      toast({
        title: "Error",
        description: "Debes seleccionar un agente",
        variant: "destructive",
      });
      return;
    }

    if (currentAssignment) {
      // Actualizar asignación existente
      updateAssignmentMutation.mutate({
        id: currentAssignment.id,
        assignedToId: parseInt(selectedAgent),
        category,
        notes
      });
    } else {
      // Crear nueva asignación
      assignChatMutation.mutate({
        chatId,
        accountId,
        assignedToId: parseInt(selectedAgent),
        category,
        notes
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Asignar Conversación
          </DialogTitle>
          <DialogDescription>
            Asigna la conversación con {chatName || chatId.split('@')[0]} a un agente
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="agent">Seleccionar Agente</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger id="agent">
                <SelectValue placeholder="Seleccionar un agente" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent: { 
                    id: number; 
                    avatar?: string; 
                    fullName?: string; 
                    username: string;
                  }) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={agent.avatar} alt={agent.fullName} />
                        <AvatarFallback>{agent.fullName?.charAt(0) || agent.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {agent.fullName || agent.username}
                      {agent.id.toString() === currentAssignment?.assignedToId.toString() && (
                        <Badge variant="outline" className="ml-2">Actual</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccionar categoría (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin categoría</SelectItem>
                {categories?.map((cat: {
                    id: number;
                    name: string;
                    color?: string;
                    description?: string;
                  }) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: cat.color || '#3b82f6' }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Añade notas sobre esta asignación (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignChatMutation.isPending || updateAssignmentMutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedAgent || assignChatMutation.isPending || updateAssignmentMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            {currentAssignment ? "Actualizar Asignación" : "Asignar Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}