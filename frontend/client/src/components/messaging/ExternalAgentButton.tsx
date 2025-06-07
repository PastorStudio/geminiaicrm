import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Zap, ZapOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExternalAgentButtonProps {
  chatId: string;
  accountId: number;
}

export function ExternalAgentButton({ chatId, accountId }: ExternalAgentButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar estado del agente externo
  useEffect(() => {
    const loadAgentStatus = async () => {
      try {
        const response = await fetch(`/api/external-agents/status/${encodeURIComponent(chatId)}/${accountId}`);
        const data = await response.json();
        setIsActive(data.active || false);
        setAgentUrl(data.agentUrl || null);
      } catch (error) {
        console.error('Error cargando estado A.E AI:', error);
      }
    };

    if (chatId && accountId) {
      loadAgentStatus();
    }
  }, [chatId, accountId]);

  const toggleAgent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/external-agents/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          accountId,
          active: !isActive
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsActive(data.active);
        if (data.agentUrl) {
          setAgentUrl(data.agentUrl);
        }
        
        toast({
          title: data.active ? "🤖 A.E AI Activado" : "🔴 A.E AI Desactivado",
          description: data.message,
          duration: 3000,
        });

        // Si se activó, abrir enlace del agente
        if (data.active && data.agentUrl) {
          window.open(data.agentUrl, '_blank');
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al procesar solicitud",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error toggle A.E AI:', error);
      toast({
        title: "Error de Conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const openAgent = () => {
    if (agentUrl) {
      window.open(agentUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={toggleAgent}
        disabled={loading}
        variant={isActive ? "default" : "outline"}
        size="sm"
        className={`relative ${
          isActive 
            ? "bg-purple-600 hover:bg-purple-700 text-white" 
            : "border-purple-200 hover:bg-purple-50 text-purple-600"
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isActive ? (
          <Zap className="w-4 h-4" />
        ) : (
          <ZapOff className="w-4 h-4" />
        )}
        <span className="ml-2">A.E AI</span>
        
        {/* Indicador de estado activo */}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </Button>

      {/* Botón para abrir agente si está activo */}
      {isActive && agentUrl && (
        <Button
          onClick={openAgent}
          variant="ghost"
          size="sm"
          className="text-purple-600 hover:bg-purple-50"
          title="Abrir agente externo"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}