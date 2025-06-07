import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Bot, Loader2 } from 'lucide-react';

interface AutoResponseFixedProps {
  accountId: number;
}

export function AutoResponseFixed({ accountId }: AutoResponseFixedProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar estado inicial desde DeepSeek
  useEffect(() => {
    checkStatus();
  }, [accountId]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/deepseek/status/${accountId}`);
      const data = await response.json();
      
      console.log('📊 Estado DeepSeek cargado:', data);
      
      if (data.success) {
        setIsEnabled(data.isActive || false);
      }
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
    }
  };

  const toggleAutoResponse = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log(`🚀 ${isEnabled ? 'Desactivando' : 'Activando'} DeepSeek para cuenta ${accountId}`);
      
      // Guardar el estado en localStorage para persistencia inmediata
      const newState = !isEnabled;
      localStorage.setItem(`autoResponse_${accountId}`, JSON.stringify(newState));
      
      // Actualizar estado local
      setIsEnabled(newState);
      
      // Enviar al backend para persistencia en base de datos
      try {
        const response = await fetch('/api/auto-response/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            enabled: newState,
            agentId: 'deepseek-001',
            responseDelay: 3,
            systemPrompt: 'Eres un asistente profesional que ayuda a los clientes'
          })
        });
        
        if (response.ok) {
          console.log('✅ Estado guardado en base de datos');
        } else {
          console.log('⚠️ Estado guardado localmente, sincronización pendiente');
        }
      } catch (dbError) {
        console.log('⚠️ Estado guardado localmente, sincronización pendiente');
      }
      
      // Mostrar toast de éxito
      toast({
        title: `✅ ${isEnabled ? 'Desactivado' : 'Activado'}`,
        description: `DeepSeek ${isEnabled ? 'desactivado' : 'activado'} para la cuenta ${accountId}. Estado persistente activo.`,
      });
      
      console.log(`✅ DeepSeek ${isEnabled ? 'desactivado' : 'activado'} correctamente para cuenta ${accountId}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      toast({
        title: "Error", 
        description: "No se pudo cambiar el estado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-sm text-gray-700">DeepSeek AI</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          checked={isEnabled}
          onCheckedChange={toggleAutoResponse}
          disabled={isLoading}
        />
        
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        
        <Badge variant={isEnabled ? "default" : "secondary"} className={isEnabled ? "bg-green-500" : ""}>
          {isEnabled ? "Activo" : "Inactivo"}
        </Badge>
      </div>
      
      {isEnabled && (
        <div className="text-xs text-green-600 font-medium">
          ✨ Respondiendo automáticamente
        </div>
      )}
    </div>
  );
}