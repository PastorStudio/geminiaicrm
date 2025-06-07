import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bot, CheckCircle, XCircle, Loader2, Save } from 'lucide-react';

interface AgentConfigSectionProps {
  accountId: number;
}

interface ExternalAgent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  accountId: number;
}

interface AutoResponseConfig {
  enabled: boolean;
  assignedAgentId: string | null;
}

export function AgentConfigSection({ accountId }: AgentConfigSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado local para cambios pendientes
  const [pendingChanges, setPendingChanges] = useState<{
    enabled?: boolean;
    assignedAgentId?: string | null;
  }>({});

  // Obtener agentes externos disponibles
  const { data: externalAgents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['/api/external-agents'],
    queryFn: async () => {
      const response = await fetch('/api/external-agents');
      if (!response.ok) throw new Error('Error obteniendo agentes');
      const data = await response.json();
      // Asegurar que siempre devolvamos un array
      const agents = data.success && Array.isArray(data.agents) ? data.agents : [];
      console.log('🔍 Agentes obtenidos:', agents);
      return agents;
    }
  });

  // Obtener configuración actual de respuestas automáticas para esta cuenta
  const { data: autoConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['/api/whatsapp-accounts', accountId, 'agent-config'],
    queryFn: async () => {
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/agent-config`);
      if (!response.ok) throw new Error('Error obteniendo configuración');
      const data = await response.json();
      console.log('🔍 Configuración recibida del servidor:', data);
      return {
        enabled: data.autoResponseEnabled || data.config?.autoResponseEnabled || false,
        assignedAgentId: data.assignedAgentId || data.config?.assignedExternalAgentId || null
      };
    }
  });

  // Mutation para actualizar configuración de respuestas automáticas
  const updateConfigMutation = useMutation({
    mutationFn: async ({ enabled, agentId }: { enabled?: boolean; agentId?: string | null }) => {
      console.log('📤 Enviando al servidor:', { enabled, agentId });

      // Si se está actualizando el toggle AI
      if (enabled !== undefined) {
        const response = await fetch(`/api/whatsapp-accounts/${accountId}/ai-toggle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled })
        });

        if (!response.ok) {
          throw new Error('Error actualizando toggle AI');
        }
        
        const data = await response.json();
        console.log('🔍 Respuesta toggle AI:', data);
        
        // Actualizar el cache inmediatamente con la nueva configuración
        queryClient.setQueryData(['agent-config', accountId], {
          enabled: data.config?.autoResponseEnabled || false,
          assignedAgentId: data.config?.assignedExternalAgentId || null
        });
      }

      // Si se está actualizando el agente asignado
      if (agentId !== undefined) {
        const response = await fetch(`/api/whatsapp-accounts/${accountId}/assign-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentId })
        });

        if (!response.ok) {
          throw new Error('Error asignando agente');
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "✅ Configuración actualizada",
        description: "Los cambios se han guardado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-accounts', accountId, 'agent-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    }
  });

  const handleToggleAI = (enabled: boolean) => {
    setPendingChanges(prev => ({ ...prev, enabled }));
  };

  const handleAgentChange = (agentId: string) => {
    const finalAgentId = agentId === 'none' ? null : agentId;
    setPendingChanges(prev => ({ ...prev, assignedAgentId: finalAgentId }));
  };

  const handleSaveChanges = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios pendientes para guardar",
      });
      return;
    }

    updateConfigMutation.mutate({
      enabled: pendingChanges.enabled !== undefined ? pendingChanges.enabled : autoConfig?.enabled,
      agentId: pendingChanges.assignedAgentId !== undefined ? pendingChanges.assignedAgentId : autoConfig?.assignedAgentId
    });
    
    setPendingChanges({});
  };

  // Verificar si hay cambios pendientes
  const hasChanges = Object.keys(pendingChanges).length > 0;
  
  // Valores actuales considerando cambios pendientes
  const currentEnabled = pendingChanges.enabled !== undefined ? pendingChanges.enabled : autoConfig?.enabled || false;
  const currentAgentId = pendingChanges.assignedAgentId !== undefined ? pendingChanges.assignedAgentId : autoConfig?.assignedAgentId;



  const assignedAgent = externalAgents.find((agent: ExternalAgent) => 
    agent.id === currentAgentId
  );

  if (loadingAgents || loadingConfig) {
    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-gray-600">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Agente Externo
        </h4>
        <div className="flex items-center gap-2">
          {currentEnabled ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              AI ON
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
              <XCircle className="w-3 h-3 mr-1" />
              AI OFF
            </Badge>
          )}
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              Cambios pendientes
            </Badge>
          )}
        </div>
      </div>

      {/* Selector de Agente */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-700 block mb-1">
          Agente Asignado:
        </label>
        <Select
          value={currentAgentId || 'none'}
          onValueChange={handleAgentChange}
          disabled={updateConfigMutation.isPending}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Seleccionar agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin agente asignado</SelectItem>
            {externalAgents.map((agent: ExternalAgent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Información del agente asignado */}
      {assignedAgent && (
        <div className="mb-3 p-2 bg-white rounded border text-xs">
          <div className="font-medium text-gray-800">{assignedAgent.name}</div>
          <div className="text-gray-600 mt-1 line-clamp-2">{assignedAgent.description}</div>
        </div>
      )}

      {/* Toggle AI ON/OFF - Control principal */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={currentEnabled}
            onCheckedChange={handleToggleAI}
            disabled={updateConfigMutation.isPending}
          />
          <span className="text-xs font-medium text-gray-700">
            AI ON/OFF
          </span>
        </div>
        
        {updateConfigMutation.isPending && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        )}
      </div>

      {/* Botón de guardar cambios */}
      {hasChanges && (
        <div className="mb-3">
          <Button
            onClick={handleSaveChanges}
            disabled={updateConfigMutation.isPending}
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-3 h-3 mr-1" />
            {updateConfigMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      )}

      {/* Estado actual del sistema */}
      {assignedAgent && (
        <div className={`mt-2 text-xs p-2 rounded border ${
          autoConfig?.enabled 
            ? 'text-green-700 bg-green-50 border-green-200' 
            : 'text-blue-700 bg-blue-50 border-blue-200'
        }`}>
          {autoConfig?.enabled 
            ? `✅ ${assignedAgent.name} procesando mensajes automáticamente` 
            : `🤖 ${assignedAgent.name} listo para activar`
          }
        </div>
      )}

      {!assignedAgent && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          ⚠️ Asigna un agente en el selector de arriba para habilitar respuestas automáticas
        </div>
      )}
    </div>
  );
}