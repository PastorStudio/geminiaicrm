import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, QrCode, RefreshCw } from "lucide-react";

export default function Connection() {
  const [qrCodeSrc, setQrCodeSrc] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("whatsapp");
  const { toast } = useToast();

  // Para estado de conexión de WhatsApp
  const { data: whatsappStatus, refetch: refetchWhatsappStatus, isLoading: isLoadingWhatsapp } = useQuery({
    queryKey: ['/api/direct/whatsapp/status'],
    queryFn: async () => {
      const response = await fetch('/api/direct/whatsapp/status');
      if (!response.ok) throw new Error('Error al verificar estado de WhatsApp');
      return response.json();
    },
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

  // Para obtener el código QR de WhatsApp
  const getWhatsAppQR = async () => {
    try {
      const response = await fetch('/api/direct/whatsapp/qrcode');
      if (!response.ok) throw new Error('Error al obtener código QR');
      const data = await response.json();
      
      if (data && data.qrcode) {
        setQrCodeSrc(`data:image/png;base64,${data.qrcode}`);
      } else {
        console.error('No se recibió código QR válido');
        toast({
          title: "Error",
          description: "No se pudo obtener un código QR válido. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error obteniendo código QR:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener el código QR. Verifica la conexión.",
        variant: "destructive",
      });
    }
  };

  // Obtener código QR cuando cambie a pestaña WhatsApp
  useEffect(() => {
    if (activeTab === 'whatsapp' && !whatsappStatus?.authenticated) {
      getWhatsAppQR();
    }
  }, [activeTab, whatsappStatus]);

  return (
    <>
      <Helmet>
        <title>Conexiones | GeminiCRM</title>
        <meta name="description" content="Gestiona las conexiones de WhatsApp y Telegram para tu CRM" />
      </Helmet>

      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Conexiones</h1>
        
        <Tabs defaultValue="whatsapp" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Conexión de WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWhatsapp ? (
                  <div className="flex justify-center p-8">
                    <Spinner className="h-8 w-8 text-blue-600" />
                  </div>
                ) : whatsappStatus?.authenticated ? (
                  <div className="text-center">
                    <div className="bg-green-100 text-green-800 font-medium py-2 px-4 rounded-lg mb-4">
                      WhatsApp conectado correctamente
                    </div>
                    <p className="mb-4">El número está autenticado y listo para recibir mensajes.</p>
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/direct/whatsapp/logout', {
                            method: 'POST'
                          });
                          if (!response.ok) throw new Error('Error al desconectar');
                          refetchWhatsappStatus();
                          toast({
                            title: "Desconectado",
                            description: "La sesión de WhatsApp se ha cerrado correctamente.",
                          });
                        } catch (error) {
                          console.error('Error desconectando:', error);
                          toast({
                            title: "Error",
                            description: "No se pudo desconectar la sesión de WhatsApp.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Cerrar sesión
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-yellow-100 text-yellow-800 font-medium py-2 px-4 rounded-lg mb-4">
                      WhatsApp no conectado
                    </div>
                    <p className="mb-4">Escanea este código QR con tu WhatsApp para conectar tu número.</p>
                    
                    {qrCodeSrc ? (
                      <div className="mb-6 flex justify-center">
                        <div className="p-4 bg-white inline-block rounded-lg shadow-md">
                          <img src={qrCodeSrc} alt="Código QR WhatsApp" className="w-64 h-64" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center mb-6">
                        <div className="p-4 bg-gray-100 inline-block rounded-lg w-64 h-64 flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col space-y-3">
                      <Button 
                        onClick={getWhatsAppQR}
                        className="flex items-center"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Actualizar código QR
                      </Button>
                      
                      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-4 text-sm text-gray-600">
                        <span>¿Problemas para escanear? Prueba:</span>
                        <div className="flex space-x-2">
                          <a href="/raw-qr" className="text-blue-600 hover:underline">Ver texto del QR</a>
                          <span>|</span>
                          <a href="/qr-text" className="text-blue-600 hover:underline">Formato alternativo</a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="telegram">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Conexión de Telegram
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <p className="mb-4">La configuración de Telegram estará disponible próximamente.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}