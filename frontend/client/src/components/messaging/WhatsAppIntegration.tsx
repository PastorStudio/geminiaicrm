import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WhatsAppQRDisplay } from './WhatsAppQRDisplay';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone, RefreshCw, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define la interfaz para el estado de WhatsApp
interface WhatsAppStatus {
  initialized?: boolean;
  ready?: boolean;
  authenticated?: boolean;
  qrCode?: string;
  qrDataUrl?: string;
  error?: string;
}

export default function WhatsAppIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 segundos

  // Consulta directa para obtener el estado de WhatsApp
  const fetchStatus = async (): Promise<WhatsAppStatus> => {
    console.log('Solicitando estado de WhatsApp (endpoint directo)...');
    try {
      // Añadir timestamp para evitar caché
      const timestamp = Date.now();
      const response = await fetch(`/api/direct/whatsapp/status?t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Estado WhatsApp recibido (endpoint directo):', data);
      return data;
    } catch (error) {
      console.error('Error obteniendo estado de WhatsApp:', error);
      return {
        initialized: true,
        ready: false,
        authenticated: false,
        error: 'Error de conexión'
      };
    }
  };

  // Consulta para obtener el estado actual de WhatsApp
  const { data: status, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: fetchStatus,
    refetchInterval: refreshInterval,
    initialData: { initialized: false, ready: false } 
  });

  // Función para reiniciar el servicio de WhatsApp (genera un nuevo QR)
  const handleRefresh = async () => {
    try {
      // Usar la ruta directa con timestamp para evitar la intercepción de Vite
      const timestamp = Date.now();
      const response = await fetch(`/api/direct/whatsapp/restart?t=${timestamp}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Respuesta reinicio WhatsApp:', data);
      
      // Actualizar la consulta de estado
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      
      toast({
        title: 'WhatsApp reiniciado',
        description: 'Servicio reiniciado. Escanea el nuevo código QR.',
      });
    } catch (error) {
      console.error('Error al reiniciar WhatsApp:', error);
      toast({
        title: 'Error al reiniciar',
        description: 'No se pudo reiniciar el servicio de WhatsApp.',
        variant: 'destructive'
      });
    }
  };

  // Función para cerrar sesión de WhatsApp
  const handleLogout = async () => {
    try {
      // Usar la ruta directa
      const timestamp = Date.now();
      const response = await fetch(`/api/direct/whatsapp/logout?t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      await response.json();
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión en WhatsApp.',
      });
    } catch (error) {
      console.error('Error al cerrar sesión de WhatsApp:', error);
      toast({
        title: 'Error al cerrar sesión',
        description: 'No se pudo cerrar la sesión de WhatsApp.',
        variant: 'destructive'
      });
    }
  };

  // Cuando el estado cambia a autenticado, mostrar notificación
  useEffect(() => {
    const isAuthenticated = status?.authenticated === true;
    
    if (isAuthenticated) {
      // Si acaba de autenticar, mostrar notificación
      toast({
        title: 'WhatsApp conectado',
        description: 'Tu cuenta de WhatsApp está conectada exitosamente.',
        variant: 'default'
      });
      
      // Reducir la frecuencia de actualización cuando está autenticado
      setRefreshInterval(30000); // 30 segundos
    } else {
      // Mayor frecuencia cuando no está autenticado
      setRefreshInterval(5000); // 5 segundos
    }
  }, [status, toast]);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center text-green-600">
          <Smartphone className="mr-2 h-6 w-6" />
          Conexión con WhatsApp
        </CardTitle>
        <CardDescription>
          Escanea el código QR con tu teléfono para conectar tu cuenta de WhatsApp al CRM.
          {status && status.authenticated === true && (
            <span className="text-green-600 font-medium block mt-1">
              ¡Conexión establecida! Tu cuenta de WhatsApp está conectada.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Mostrar el estado de WhatsApp y el código QR */}
          <WhatsAppQRDisplay 
            status={status || { initialized: false }} 
            isLoading={isLoading} 
            onRefresh={handleRefresh}
          />
          
          {/* Mostrar botones adicionales cuando está autenticado */}
          {status && status.authenticated === true && (
            <div className="mt-4 w-full flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refrescar estado
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-50" 
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}