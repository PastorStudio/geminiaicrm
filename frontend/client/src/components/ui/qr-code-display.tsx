import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw, QrCode, Smartphone, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  endpoint: string;
  title?: string;
  showRawData?: boolean;
}

export function QRCodeDisplay({ 
  endpoint,
  title = 'Escanea el código QR',
  showRawData = false
}: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQrCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && (data.qrText || data.qrcode)) {
        setQrData(data.qrText || data.qrcode);
        
        toast({
          title: "Código QR actualizado",
          description: "El código QR se ha actualizado correctamente",
          variant: "default",
        });
      } else {
        setError(data.error || 'No se pudo obtener el código QR');
      }
    } catch (err) {
      console.error('Error al obtener el código QR:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrCode();
    
    // Actualizar el código QR cada 20 segundos
    const interval = setInterval(fetchQrCode, 20000);
    
    return () => clearInterval(interval);
  }, [endpoint]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="mr-2 h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Spinner className="h-12 w-12 text-blue-600 mb-4" />
            <p className="text-gray-500">Cargando código QR...</p>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
              {error}
            </div>
            <Button onClick={fetchQrCode} className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : qrData ? (
          <div className="text-center">
            {showRawData ? (
              <div className="bg-white border border-gray-300 rounded-lg p-6 font-mono text-xs overflow-hidden mb-4 max-w-full break-all">
                {qrData}
              </div>
            ) : (
              <div className="p-4 bg-white border border-gray-300 rounded-lg inline-block mb-4">
                <img 
                  src={`data:image/png;base64,${qrData}`} 
                  alt="Código QR de WhatsApp" 
                  className="mx-auto w-64 h-64"
                />
              </div>
            )}
            
            <div>
              <Button onClick={fetchQrCode} className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar código QR
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-6">
            <p className="text-gray-500 mb-4">No hay código QR disponible en este momento</p>
            <Button onClick={fetchQrCode}>
              Obtener código QR
            </Button>
          </div>
        )}
        
        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold mb-4 text-lg flex items-center">
            <Smartphone className="mr-2 h-5 w-5" />
            Instrucciones para conectar:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Abre WhatsApp en tu teléfono</li>
            <li>Toca en los tres puntos (⋮) y selecciona "Dispositivos vinculados"</li>
            <li>Toca en "Vincular un dispositivo"</li>
            <li>Apunta la cámara de tu teléfono al código QR de esta página</li>
            <li>Espera a que se complete la sincronización</li>
          </ol>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 flex items-center">
              <Link className="mr-2 h-4 w-4" />
              Una vez conectado, podrás gestionar tus conversaciones de WhatsApp directamente desde este CRM.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}