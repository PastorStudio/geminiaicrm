import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { QrCode, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RawQrViewer() {
  const [qrText, setQrText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fetchQrData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/direct/whatsapp/qr-text');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.qrText) {
        setQrText(data.qrText);
      } else {
        setError(data.error || 'No se pudo obtener el texto del código QR');
      }
    } catch (err) {
      console.error('Error al obtener el texto QR:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (qrText) {
      navigator.clipboard.writeText(qrText)
        .then(() => {
          setCopied(true);
          toast({
            title: "Texto copiado",
            description: "El texto del código QR se ha copiado al portapapeles",
          });
          
          // Restablecer el estado de copiado después de 2 segundos
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Error al copiar:', err);
          toast({
            title: "Error al copiar",
            description: "No se pudo copiar el texto al portapapeles",
            variant: "destructive",
          });
        });
    }
  };

  useEffect(() => {
    fetchQrData();
    
    // Actualizar el código QR cada 20 segundos
    const interval = setInterval(fetchQrData, 20000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Helmet>
        <title>Código QR (Texto) | CRM</title>
        <meta name="description" content="Visualiza el texto del código QR para WhatsApp" />
      </Helmet>
      
      <div className="container mx-auto p-6 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Texto del Código QR</h1>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              Texto del Código QR para WhatsApp
            </CardTitle>
            <CardDescription>
              Este es el texto raw del código QR que puedes usar para conectarte manualmente a WhatsApp.
            </CardDescription>
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
                <Button onClick={fetchQrData} className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : qrText ? (
              <div className="text-center">
                <div className="relative bg-gray-100 border rounded-lg p-6 mb-6 font-mono text-sm overflow-auto max-h-64 text-left whitespace-pre-wrap break-all">
                  {qrText}
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button onClick={copyToClipboard} className="flex items-center">
                    {copied ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar texto
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={fetchQrData} variant="outline" className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar código
                  </Button>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <p className="mb-2 font-bold">Instrucciones alternativas:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Copia el texto completo mostrado arriba</li>
                    <li>Genera un código QR con este texto usando algún generador online</li>
                    <li>Escanea el código generado con la aplicación de WhatsApp</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center p-6">
                <p className="text-gray-500 mb-4">No hay código QR disponible en este momento</p>
                <Button onClick={fetchQrData}>
                  Obtener código QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Button onClick={() => window.history.back()} variant="outline">
            Volver
          </Button>
        </div>
      </div>
    </>
  );
}