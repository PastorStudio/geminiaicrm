import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw, QrCode } from 'lucide-react';

export default function QrTextViewer() {
  const [qrText, setQrText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQrText = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Acceso directo al archivo de texto QR
      const response = await fetch('/api/direct/whatsapp/qr-text');
      
      if (!response.ok) {
        throw new Error('No se pudo obtener el código QR');
      }
      
      const data = await response.json();
      
      if (data && data.qrText) {
        setQrText(data.qrText);
      } else {
        setError('Código QR no disponible');
      }
    } catch (error) {
      console.error('Error al obtener código QR:', error);
      setError('No se pudo cargar el código QR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrText();
    
    // Actualizar el código QR cada 20 segundos
    const interval = setInterval(fetchQrText, 20000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Helmet>
        <title>Código QR de WhatsApp | GeminiCRM</title>
        <meta name="description" content="Escanea este código QR para conectar WhatsApp con el CRM" />
      </Helmet>
      
      <div className="container mx-auto p-6 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Código QR de WhatsApp</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              Escanea este código para vincular WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Spinner className="h-10 w-10 text-blue-600 mr-4" />
                <p className="text-gray-500">Cargando código QR...</p>
              </div>
            ) : error ? (
              <div className="text-center p-6">
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                  {error}
                </div>
                <Button onClick={fetchQrText} className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : qrText ? (
              <div className="text-center">
                <div className="bg-white border rounded p-6 inline-block mb-6 font-mono text-sm overflow-hidden">
                  {qrText}
                </div>
                
                <div>
                  <Button onClick={fetchQrText} className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar código QR
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6">
                <p className="text-gray-500 mb-4">No hay código QR disponible en este momento</p>
                <Button onClick={fetchQrText}>
                  Obtener código QR
                </Button>
              </div>
            )}
            
            <div className="mt-8 border-t pt-4">
              <h3 className="font-semibold mb-2 text-lg">Instrucciones:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Abre WhatsApp en tu teléfono</li>
                <li>Toca los tres puntos (⋮) en la esquina superior derecha y selecciona "WhatsApp Web"</li>
                <li>Toca en "Vincular dispositivo"</li>
                <li>Apunta la cámara de tu teléfono al código QR mostrado en esta página</li>
                <li>¡Listo! Tu WhatsApp estará conectado al CRM</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}