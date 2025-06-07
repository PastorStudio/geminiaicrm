import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw } from 'lucide-react';

export default function QrViewer() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getQrCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Leer el archivo QR directamente desde el servidor
      const response = await fetch('/temp/whatsapp-qr.txt');
      
      if (!response.ok) {
        throw new Error('No se pudo obtener el código QR');
      }
      
      const text = await response.text();
      setQrCode(text);
    } catch (err) {
      console.error('Error al obtener código QR:', err);
      setError('No se pudo cargar el código QR. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getQrCode();
    
    // Recargar el QR cada 20 segundos
    const interval = setInterval(getQrCode, 20000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Helmet>
        <title>Código QR WhatsApp | CRM</title>
      </Helmet>
      
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Código QR de WhatsApp</h1>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Escanea este código con tu teléfono</CardTitle>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center">
            {loading ? (
              <div className="p-8 flex flex-col items-center">
                <Spinner className="w-12 h-12 text-blue-600 mb-4" />
                <p className="text-gray-600">Cargando código QR...</p>
              </div>
            ) : error ? (
              <div className="text-center p-8">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={getQrCode} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : qrCode ? (
              <div className="p-4">
                <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                  <pre className="text-xs overflow-hidden">{qrCode}</pre>
                </div>
                <div className="text-center">
                  <Button onClick={getQrCode} variant="outline" className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar código
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-gray-500 mb-4">No hay código QR disponible en este momento.</p>
                <Button onClick={getQrCode} variant="default">Reintentar</Button>
              </div>
            )}
            
            <div className="mt-6 text-sm text-gray-600">
              <h3 className="font-semibold mb-2">Instrucciones:</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Abre WhatsApp en tu teléfono</li>
                <li>Ve a Ajustes &gt; Dispositivos vinculados</li>
                <li>Selecciona "Vincular un dispositivo"</li>
                <li>Escanea el código QR que aparece arriba</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}