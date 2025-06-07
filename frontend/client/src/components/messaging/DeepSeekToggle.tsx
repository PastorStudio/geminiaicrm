import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface DeepSeekToggleProps {
  accountId: number;
}

export default function DeepSeekToggle({ accountId }: DeepSeekToggleProps) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    companyName: 'Nuestra empresa',
    responseDelay: 3,
    systemPrompt: 'Eres un asistente de atención al cliente profesional y amigable. Responde de manera útil, clara y concisa.'
  });
  const { toast } = useToast();

  // Cargar estado inicial
  useEffect(() => {
    loadStatus();
  }, [accountId]);

  const loadStatus = async () => {
    try {
      const response = await fetch(`/api/deepseek/status/${accountId}`);
      const data = await response.json();
      
      if (response.ok) {
        setIsActive(data.isActive);
        if (data.config) {
          setConfig({
            companyName: data.config.companyName || 'Nuestra empresa',
            responseDelay: data.config.responseDelay || 3,
            systemPrompt: data.config.systemPrompt || config.systemPrompt
          });
        }
      }
    } catch (error) {
      console.error('Error cargando estado DeepSeek:', error);
    }
  };

  const toggleDeepSeek = async () => {
    setIsLoading(true);
    
    try {
      if (isActive) {
        // Desactivar
        const response = await fetch('/api/deepseek/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setIsActive(false);
          toast({
            title: "🛑 DeepSeek Desactivado",
            description: "Las respuestas automáticas han sido desactivadas"
          });
        } else {
          throw new Error(data.error || 'Error desactivando');
        }
      } else {
        // Activar
        const response = await fetch('/api/deepseek/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            ...config
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setIsActive(true);
          toast({
            title: "🤖 DeepSeek Activado",
            description: "Las respuestas automáticas están funcionando"
          });
        } else {
          throw new Error(data.error || 'Error activando');
        }
      }
    } catch (error) {
      console.error('Error toggling DeepSeek:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDeepSeek = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/deepseek/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hola, ¿pueden ayudarme con información sobre sus servicios?',
          companyName: config.companyName,
          systemPrompt: config.systemPrompt
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ Test Exitoso",
          description: `Respuesta: ${data.response?.substring(0, 100)}...`
        });
      } else {
        throw new Error(data.error || 'Error en test');
      }
    } catch (error) {
      console.error('Error testing DeepSeek:', error);
      toast({
        title: "Error en Test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🤖 DeepSeek Auto-Respuestas
          <Switch
            checked={isActive}
            onCheckedChange={toggleDeepSeek}
            disabled={isLoading}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyName">Nombre de la empresa</Label>
            <Input
              id="companyName"
              value={config.companyName}
              onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Tu empresa"
              disabled={isActive}
            />
          </div>
          
          <div>
            <Label htmlFor="responseDelay">Delay de respuesta (segundos)</Label>
            <Input
              id="responseDelay"
              type="number"
              min="1"
              max="60"
              value={config.responseDelay}
              onChange={(e) => setConfig(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 3 }))}
              disabled={isActive}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="systemPrompt">Prompt del sistema (personalización de respuestas)</Label>
          <Textarea
            id="systemPrompt"
            value={config.systemPrompt}
            onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
            placeholder="Instrucciones para el comportamiento del asistente..."
            rows={3}
            disabled={isActive}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={toggleDeepSeek}
            disabled={isLoading}
            variant={isActive ? "destructive" : "default"}
            className="flex-1"
          >
            {isLoading ? "Procesando..." : isActive ? "🛑 Desactivar" : "🚀 Activar"}
          </Button>
          
          <Button
            onClick={testDeepSeek}
            disabled={isLoading}
            variant="outline"
          >
            🧪 Test
          </Button>
        </div>

        {isActive && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ <strong>DeepSeek activo</strong> para la cuenta {accountId}
              <br />
              Las respuestas automáticas se generarán después de {config.responseDelay} segundos.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>Nota:</strong> Necesitas configurar tu clave API de DeepSeek en las variables de entorno (DEEPSEEK_API_KEY).</p>
        </div>
      </CardContent>
    </Card>
  );
}