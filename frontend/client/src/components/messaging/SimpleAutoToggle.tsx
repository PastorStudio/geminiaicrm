import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Zap, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleAutoToggleProps {
  accountId: number;
}

export function SimpleAutoToggle({ accountId }: SimpleAutoToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar estado inicial desde la base de datos
  useEffect(() => {
    checkAccountStatus();
  }, [accountId]);

  const checkAccountStatus = async () => {
    try {
      const response = await fetch(`/api/whatsapp-accounts/${accountId}`);
      const data = await response.json();
      
      if (data && data.autoResponseEnabled !== undefined) {
        setIsEnabled(data.autoResponseEnabled);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const toggleAutoResponse = async () => {
    // Verificar si Auto A.E. está activo antes de activar respuestas automáticas
    if (!isEnabled) {
      const autoFunctions = (window as any).getAutoFunctionsStatus?.();
      if (autoFunctions?.autoAE) {
        toast({
          title: "Conflicto Detectado",
          description: "Auto A.E. está activo. Desactívalo primero para usar respuestas automáticas de la cuenta.",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const endpoint = isEnabled 
        ? `/api/auto-response/deactivate/${accountId}`
        : `/api/auto-response/activate/${accountId}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName: "Smart Assistant"
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsEnabled(!isEnabled);
        toast({
          title: isEnabled ? "Respuestas automáticas desactivadas" : "Respuestas automáticas activadas",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al cambiar configuración",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling auto response:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo cambiar la configuración",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-center space-x-2">
        <Bot className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-gray-700">Respuestas Automáticas</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          checked={isEnabled}
          onCheckedChange={toggleAutoResponse}
          disabled={isLoading}
        />
        
        <Badge variant={isEnabled ? "default" : "secondary"}>
          {isEnabled ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      {isLoading && (
        <div className="flex items-center space-x-1">
          <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">Guardando...</span>
        </div>
      )}
    </div>
  );
}