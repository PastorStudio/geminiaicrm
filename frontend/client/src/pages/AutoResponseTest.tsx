import { useState } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function AutoResponseTest() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const activateAutoResponse = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/direct/auto-response/activate/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentName: 'Smart Assistant' })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuestas automáticas activadas:', data);
        setIsActive(true);
        toast({
          title: "✅ Activado",
          description: "Respuestas automáticas activadas correctamente",
        });
      } else {
        console.error('❌ Error activando respuestas automáticas');
        toast({
          title: "❌ Error",
          description: "No se pudo activar las respuestas automáticas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
      toast({
        title: "❌ Error de conexión",
        description: "Error al conectar con el servidor",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const deactivateAutoResponse = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/direct/auto-response/deactivate/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuestas automáticas desactivadas:', data);
        setIsActive(false);
        toast({
          title: "✅ Desactivado",
          description: "Respuestas automáticas desactivadas correctamente",
        });
      } else {
        console.error('❌ Error desactivando respuestas automáticas');
        toast({
          title: "❌ Error",
          description: "No se pudo desactivar las respuestas automáticas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
      toast({
        title: "❌ Error de conexión",
        description: "Error al conectar con el servidor",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleToggle = () => {
    if (isActive) {
      deactivateAutoResponse();
    } else {
      activateAutoResponse();
    }
  };

  const testConfiguration = async () => {
    setLoading(true);
    try {
      // Probar guardado de configuración
      const configData = {
        enabled: true,
        greetingMessage: "Hola, gracias por contactarnos. En breve le atenderemos.",
        outOfHoursMessage: "Gracias por su mensaje. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00.",
        businessHoursStart: "09:00:00",
        businessHoursEnd: "18:00:00",
        workingDays: "1,2,3,4,5"
      };

      const response = await fetch('/api/auto-response/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Configuración guardada:', data);
        toast({
          title: "✅ Configuración guardada",
          description: "La configuración se guardó correctamente en la base de datos",
        });
      } else {
        console.error('❌ Error guardando configuración');
        toast({
          title: "❌ Error",
          description: "No se pudo guardar la configuración",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast({
        title: "❌ Error de conexión",
        description: "Error al conectar con el servidor",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Prueba de Respuestas Automáticas - GeminiCRM</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🧪</span>
              Prueba de Respuestas Automáticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estado actual */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Estado Actual</h3>
                <p className="text-sm text-gray-600">
                  Sistema de respuestas automáticas estables
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isActive ? '🟢 Activo' : '🔴 Inactivo'}
              </span>
            </div>

            {/* Controles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Activación de Respuestas Automáticas</h4>
                  <p className="text-sm text-gray-600">
                    Activa o desactiva el sistema estable de respuestas automáticas
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggle}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={testConfiguration}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? "Probando..." : "🔧 Probar Configuración"}
                </Button>

                <Button
                  onClick={handleToggle}
                  disabled={loading}
                  className={`w-full ${
                    isActive
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {loading ? "Procesando..." : isActive ? "🛑 Desactivar" : "🚀 Activar"}
                </Button>
              </div>
            </div>

            {/* Información del sistema */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">ℹ️ Información del Sistema</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Sistema estable que mantiene configuraciones en la base de datos</li>
                <li>• No se desactiva por errores temporales de WhatsApp</li>
                <li>• Configuraciones persistentes que sobreviven a reinicios</li>
                <li>• Monitoreo independiente cada 10 segundos</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}