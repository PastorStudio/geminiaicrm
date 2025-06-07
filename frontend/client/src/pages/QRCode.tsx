import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { QrCode, RefreshCw } from 'lucide-react';

export default function QRCode() {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchQRCode = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Obtener el código QR desde el servidor
      const response = await fetch('/api/direct/whatsapp/qrcode');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error obteniendo código QR');
      }
      
      const data = await response.json();
      
      if (data.success && data.qrcode) {
        // Crear URL para la imagen
        setQrImageUrl(`data:image/png;base64,${data.qrcode}`);
      } else {
        setErrorMessage('No se pudo obtener el código QR');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar el código QR cuando se monte el componente
  useEffect(() => {
    fetchQRCode();
    
    // Actualizar el código QR cada 30 segundos
    const intervalId = setInterval(fetchQRCode, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <Helmet>
        <title>Código QR de WhatsApp | GeminiCRM</title>
        <meta name="description" content="Escanea este código QR para conectar WhatsApp con GeminiCRM" />
      </Helmet>
      
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Conexión de WhatsApp</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              Código QR para WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            {isLoading ? (
              <div className="flex flex-col items-center">
                <Spinner className="h-10 w-10 text-blue-500 mb-4" />
                <p>Cargando código QR...</p>
              </div>
            ) : errorMessage ? (
              <div className="text-center">
                <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
                  {errorMessage}
                </div>
                <Button onClick={fetchQRCode} className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : qrImageUrl ? (
              <div className="text-center">
                <p className="mb-4">Escanea este código QR con tu teléfono para conectar WhatsApp</p>
                <div className="p-4 bg-white rounded-lg shadow-md inline-block mb-6">
                  <img src={qrImageUrl} alt="Código QR de WhatsApp" className="w-64 h-64" />
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  El código QR expira después de cierto tiempo. Si no puedes escanearlo,
                  haz clic en el botón para actualizar.
                </p>
                <Button onClick={fetchQRCode} className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar código QR
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-4">No hay código QR disponible</p>
                <Button onClick={fetchQRCode}>
                  Obtener código QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Instrucciones</h2>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Abre WhatsApp en tu teléfono.</li>
            <li>Toca en los tres puntos (⋮) en la esquina superior derecha.</li>
            <li>Selecciona "WhatsApp Web" o "Dispositivos vinculados".</li>
            <li>Toca en "Vincular un dispositivo".</li>
            <li>Escanea el código QR que aparece en esta página.</li>
          </ol>
          <p className="mt-4 text-sm text-gray-600">
            Nota: Esta conexión permanecerá activa hasta que cierres la sesión manualmente o se desconecte.
          </p>
        </div>
      </div>
    </>
  );
}