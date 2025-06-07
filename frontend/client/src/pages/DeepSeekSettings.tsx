import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function DeepSeekSettings() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    companyName: 'Mi Empresa',
    responseDelay: 3,
    systemPrompt: 'Eres un asistente de atención al cliente profesional y amigable. Responde de manera útil, clara y concisa para WhatsApp.'
  });
  const { toast } = useToast();

  // Cargar cuentas de WhatsApp
  useEffect(() => {
    loadAccounts();
  }, []);

  // Cargar estado cuando se selecciona una cuenta
  useEffect(() => {
    if (selectedAccount) {
      loadAccountStatus();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/whatsapp-accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccount) {
          setSelectedAccount(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    }
  };

  const loadAccountStatus = async () => {
    if (!selectedAccount) return;
    
    try {
      const response = await fetch(`/api/deepseek/status/${selectedAccount}`);
      const data = await response.json();
      
      if (response.ok) {
        setIsActive(data.isActive);
        if (data.config) {
          setConfig({
            companyName: data.config.companyName || 'Mi Empresa',
            responseDelay: data.config.responseDelay || 3,
            systemPrompt: data.config.systemPrompt || config.systemPrompt
          });
        }
      }
    } catch (error) {
      console.error('Error cargando estado:', error);
    }
  };

  const toggleDeepSeek = async () => {
    if (!selectedAccount) {
      toast({
        title: "Error",
        description: "Selecciona una cuenta primero",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (isActive) {
        // Desactivar
        const response = await fetch('/api/deepseek/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: selectedAccount })
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
            accountId: selectedAccount,
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
      console.error('Error:', error);
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
          message: '¿Podrían ayudarme con información sobre sus servicios?',
          companyName: config.companyName,
          systemPrompt: config.systemPrompt
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.response) {
        toast({
          title: "✅ Test Exitoso",
          description: `Respuesta en ${data.responseTime}ms: ${data.response.substring(0, 100)}...`
        });
      } else {
        throw new Error(data.error || 'Error en test');
      }
    } catch (error) {
      console.error('Error testing:', error);
      toast({
        title: "Error en Test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🤖 DeepSeek Auto-Respuestas</h1>
          <p className="text-gray-600">Respuestas automáticas inteligentes con Web Scraping</p>
        </div>
        {isActive && (
          <Badge variant="default" className="bg-green-500">
            ✅ Activo
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración Principal */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de Cuenta */}
            <div>
              <Label>Cuenta de WhatsApp</Label>
              <Select value={selectedAccount?.toString()} onValueChange={(value) => setSelectedAccount(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} {account.isConnected ? '🟢' : '🔴'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccountData && (
                <p className="text-sm text-gray-500 mt-1">
                  Estado: {selectedAccountData.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
                </p>
              )}
            </div>

            {/* Nombre de la Empresa */}
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
            
            {/* Delay de Respuesta */}
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
              <p className="text-xs text-gray-500 mt-1">
                Tiempo de espera antes de enviar la respuesta automática
              </p>
            </div>

            {/* Prompt del Sistema */}
            <div>
              <Label htmlFor="systemPrompt">Prompt del sistema</Label>
              <Textarea
                id="systemPrompt"
                value={config.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Instrucciones para el comportamiento del asistente..."
                rows={4}
                disabled={isActive}
              />
              <p className="text-xs text-gray-500 mt-1">
                Define cómo debe comportarse el asistente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Control */}
        <Card>
          <CardHeader>
            <CardTitle>Control y Monitoreo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Activar/Desactivar */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Estado del Sistema</h3>
                <p className="text-sm text-gray-500">
                  {isActive ? 'DeepSeek está procesando mensajes automáticamente' : 'Sistema desactivado'}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={toggleDeepSeek}
                disabled={isLoading || !selectedAccount}
              />
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2">
              <Button
                onClick={toggleDeepSeek}
                disabled={isLoading || !selectedAccount}
                variant={isActive ? "destructive" : "default"}
                className="w-full"
              >
                {isLoading ? "Procesando..." : isActive ? "🛑 Desactivar DeepSeek" : "🚀 Activar DeepSeek"}
              </Button>
              
              <Button
                onClick={testDeepSeek}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                🧪 Probar Respuesta
              </Button>
            </div>

            {/* Información del Estado */}
            {isActive && selectedAccount && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-green-800">Sistema Activo</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>✅ Cuenta: {selectedAccountData?.name}</p>
                  <p>⏱️ Delay: {config.responseDelay} segundos</p>
                  <p>🏢 Empresa: {config.companyName}</p>
                </div>
              </div>
            )}

            {/* Información Técnica */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">💡 Información Técnica</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Usa web scraping para acceder a DeepSeek</p>
                <p>• No requiere API key ni costos adicionales</p>
                <p>• Procesa mensajes automáticamente</p>
                <p>• Respuestas contextuales inteligentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}