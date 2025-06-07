import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Power, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  agentUrl: string;
  status: string;
}

interface AgentSelectorProps {
  chatId: string;
  accountId: number;
  onAgentChange?: (agentId: string | null) => void;
}

export function AgentSelector({ chatId, accountId, onAgentChange }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Cargar agentes externos
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/external-agents');
        const data = await response.json();
        
        if (data.success && data.agents) {
          setAgents(data.agents);
          console.log('🤖 Agentes cargados:', data.agents.length);
        }
      } catch (error) {
        console.error('Error cargando agentes:', error);
      }
    };

    loadAgents();
  }, []);

  // Cargar configuración actual
  useEffect(() => {
    const loadConfig = async () => {
      if (!chatId || !accountId) return;
      
      try {
        const response = await fetch(`/api/whatsapp-accounts/${accountId}/agent-config`);
        const data = await response.json();
        
        if (data.success && data.config) {
          setSelectedAgentId(data.config.assignedExternalAgentId);
          setIsActive(data.config.autoResponseEnabled && data.config.assignedExternalAgentId);
          console.log('📊 Configuración cargada:', data.config);
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    };

    loadConfig();
  }, [chatId, accountId]);

  // Asignar agente automáticamente al seleccionar
  const handleAgentSelection = async (agentId: string) => {
    if (!accountId) return;
    
    setLoading(true);
    try {
      console.log(`🔧 Asignando agente ${agentId} automáticamente a cuenta ${accountId}...`);
      
      // Usar SQL directo para asegurar la asignación
      const directResponse = await fetch('/api/whatsapp-accounts/1/assign-external-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalAgentId: agentId,
          autoResponseEnabled: true
        })
      });

      if (!directResponse.ok) {
        throw new Error(`HTTP error! status: ${directResponse.status}`);
      }

      const result = await directResponse.json();
      
      if (result.success) {
        setIsActive(true);
        setSelectedAgentId(agentId);
        
        const selectedAgent = agents.find(a => a.id === agentId);
        
        // toast desactivado para evitar conflictos
        console.log(`🎯 Agente ${selectedAgent?.name} asignado automáticamente`);
        
        onAgentChange?.(agentId);
        console.log(`✅ Agente ${selectedAgent?.name} asignado exitosamente`);
      } else {
        throw new Error(result.message || 'Error al asignar agente');
      }
    } catch (error) {
      console.error('Error asignando agente:', error);
      // toast desactivado para evitar conflictos
      console.error('❌ No se pudo asignar el agente automáticamente');
      setSelectedAgentId(null);
      setIsActive(false);
    } finally {
      setLoading(false);
    }
  };

  // Desasignar agente completamente (solo cuando usuario selecciona "Sin agente")
  const handleDeactivateAgent = async () => {
    if (!accountId) return;
    
    setLoading(true);
    try {
      // Desasignar completamente el agente
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/assign-external-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalAgentId: null,
          autoResponseEnabled: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsActive(false);
        setSelectedAgentId(null);
        
        console.log('🔴 Agente completamente desasignado');
        onAgentChange?.(null);
      } else {
        console.error('Error al desasignar agente:', result.message);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="flex items-center gap-2">
      {/* Selector de agente */}
      <Select
        value={selectedAgentId || "none"}
        onValueChange={(value) => {
          if (value === "none") {
            // Solo desasignar cuando el usuario explícitamente selecciona "Sin agente"
            handleDeactivateAgent();
          } else {
            handleAgentSelection(value);
          }
        }}
        disabled={loading}
      >
        <SelectTrigger className="w-48 h-8 text-xs">
          <SelectValue placeholder="Seleccionar agente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sin agente</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <Bot className="h-3 w-3" />
                {agent.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Indicador de estado */}
      {selectedAgent && (
        <Badge 
          variant={isActive ? "default" : "outline"} 
          className={`${
            isActive 
              ? "bg-green-600 text-white" 
              : "border-gray-300 text-gray-600"
          } text-xs`}
        >
          <div className={`w-2 h-2 rounded-full mr-1 ${
            isActive ? "bg-white animate-pulse" : "bg-gray-400"
          }`} />
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      )}


    </div>
  );
}