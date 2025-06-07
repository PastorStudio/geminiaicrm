import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import WhatsAppIntegration from "@/components/messaging/WhatsAppIntegration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QRCodeData {
  data: string;
  expiry?: string;
}

interface ConnectionStatus {
  initialized: boolean;
  ready: boolean;
  authenticated?: boolean;
  connectedChats?: number[];
  pendingMessages?: number;
  qrCode?: string;
  error?: string;
  message?: string;
}

export default function Integrations() {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Consultas para obtener el estado de las conexiones
  const { 
    data: whatsappStatus, 
    isLoading: whatsappStatusLoading,
    error: whatsappStatusError
  } = useQuery<ConnectionStatus>({
    queryKey: ["/api/integrations/whatsapp/status", lastRefresh],
    queryFn: async () => {
      try {
        // Log para depuración
        console.log("Solicitando estado de WhatsApp...");
        
        // Usar endpoint con timestamp para evitar caché
        const url = `/api/integrations/whatsapp/status?t=${Date.now()}`;
        
        // Usar el XMLHttpRequest para tener más control que con fetch
        return new Promise<ConnectionStatus>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.setRequestHeader('Cache-Control', 'no-cache, no-store');
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Verificar si la respuesta parece HTML (contiene DOCTYPE)
              if (xhr.responseText.includes('<!DOCTYPE html>')) {
                console.error("La respuesta parece ser HTML en lugar de JSON");
                
                // Devolvemos un estado por defecto para evitar errores
                resolve({
                  initialized: true,
                  ready: false,
                  authenticated: false,
                  error: "Interceptado por Vite - intenta recargar la página"
                });
                return;
              }
              
              try {
                const data = JSON.parse(xhr.responseText);
                console.log("Estado WhatsApp recibido:", data);
                resolve(data);
              } catch (e) {
                console.error("Error al parsear JSON:", e);
                reject(new Error("Error al parsear la respuesta como JSON"));
              }
            } else {
              reject(new Error(`Error HTTP: ${xhr.status}`));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error("Error de red al obtener estado de WhatsApp"));
          };
          
          xhr.send();
        });
      } catch (error) {
        console.error("Error obteniendo estado de WhatsApp:", error);
        // Devolvemos un estado mínimo para evitar errores
        return {
          initialized: true,
          ready: false,
          authenticated: false,
          error: error instanceof Error ? error.message : "Error desconocido"
        };
      }
    },
    refetchInterval: 5000, // Refrescar cada 5 segundos para mejor respuesta
  });

  const { 
    data: telegramStatus, 
    isLoading: telegramStatusLoading,
    error: telegramStatusError 
  } = useQuery<ConnectionStatus>({
    queryKey: ["/api/integrations/telegram/status", lastRefresh],
    queryFn: async () => {
      return await apiRequest("/api/integrations/telegram/status");
    },
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });

  // Ya no necesitamos consultar el código QR por separado
  // El código QR se obtiene directamente del estado de WhatsApp

  const { 
    data: telegramQR, 
    isLoading: telegramQRLoading,
    error: telegramQRError 
  } = useQuery<QRCodeData>({
    queryKey: ["/api/integrations/telegram/authcode", lastRefresh],
    queryFn: async () => {
      return await apiRequest("/api/integrations/telegram/authcode");
    },
    enabled: !!telegramStatus && !telegramStatus.ready,
  });

  // Mutaciones para interactuar con los servicios
  const { mutate: restartWhatsapp, isPending: isRestartingWhatsapp } = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/integrations/whatsapp/restart", {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Conexión de WhatsApp reiniciada",
        description: "La conexión se ha reiniciado correctamente y generará un nuevo código QR.",
      });
      setLastRefresh(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/whatsapp/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/whatsapp/qrcode"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo reiniciar la conexión: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const { mutate: logoutWhatsapp, isPending: isLoggingOutWhatsapp } = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/integrations/whatsapp/logout", {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Sesión cerrada",
        description: "Se ha cerrado la sesión de WhatsApp correctamente.",
      });
      setLastRefresh(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/whatsapp/status"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo cerrar la sesión: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const { mutate: restartTelegram, isPending: isRestartingTelegram } = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/integrations/telegram/restart", {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Conexión de Telegram reiniciada",
        description: "La conexión se ha reiniciado correctamente.",
      });
      setLastRefresh(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/telegram/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/telegram/authcode"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo reiniciar la conexión: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const { mutate: generateTelegramCode, isPending: isGeneratingTelegramCode } = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/integrations/telegram/generate-authcode", {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Código generado",
        description: "Se ha generado un nuevo código de autenticación para Telegram.",
      });
      setLastRefresh(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/telegram/authcode"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo generar el código: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Helmet>
        <title>Integraciones de Mensajería | GeminiCRM</title>
        <meta name="description" content="Configure las integraciones de WhatsApp y Telegram para su CRM" />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 md:hidden">Integraciones</h1>
        <p className="text-sm text-gray-500">
          Configure las integraciones de WhatsApp y Telegram para comunicarse con sus leads
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
        </TabsList>
        
        {/* WhatsApp Integration */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>WhatsApp Business</CardTitle>
                  <CardDescription>
                    Integración directa con WhatsApp para comunicarse con leads y clientes
                  </CardDescription>
                </div>
                <ConnectionStatusBadge 
                  isLoading={whatsappStatusLoading} 
                  status={whatsappStatus} 
                />
              </div>
            </CardHeader>
            <CardContent>
              {whatsappStatusError ? (
                <div className="p-4 mb-4 border border-red-200 rounded-md bg-red-50">
                  <p className="text-red-600 text-sm">
                    Error al obtener el estado de la conexión.
                    Por favor, intente de nuevo más tarde.
                  </p>
                </div>
              ) : !whatsappStatus?.authenticated ? (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Escanear código QR</h3>
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="text-sm font-medium text-green-800">Código QR oficial de WhatsApp Web</h4>
                    <p className="text-xs text-green-700 mt-1">
                      Este sistema genera un código QR oficial compatible con WhatsApp Web que puede ser escaneado
                      desde la aplicación de WhatsApp en tu teléfono.
                    </p>
                    <p className="text-xs text-green-700 mt-2">
                      <strong>Nota:</strong> Escanea el código QR desde la sección "Dispositivos vinculados" en WhatsApp.
                    </p>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Escanee este código QR con su teléfono para conectar WhatsApp con el CRM.
                    La sesión se guardará para futuras conexiones.
                  </p>
                  
                  <div className="flex justify-center my-6">
                    {/* Componente autónomo de integración WhatsApp */}
                    <WhatsAppIntegration />
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Para escanear el código QR:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-2">
                      <li>Abra WhatsApp en su teléfono</li>
                      <li>Toque Menú o Configuración</li>
                      <li>Seleccione WhatsApp Web</li>
                      <li>Apunte su teléfono a esta pantalla para escanear el código</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Conexión activa</h3>
                  <p className="text-green-600 text-sm mb-4">
                    ¡Conexión establecida correctamente! La sesión de WhatsApp está activa.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-sm mb-2">Estado</h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Inicializado:</dt>
                          <dd className="font-medium">{whatsappStatus?.initialized ? 'Sí' : 'No'}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Listo:</dt>
                          <dd className="font-medium">{whatsappStatus?.ready ? 'Sí' : 'No'}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Autenticado:</dt>
                          <dd className="font-medium">{whatsappStatus?.authenticated ? 'Sí' : 'No'}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Mensajes pendientes:</dt>
                          <dd className="font-medium">{whatsappStatus?.pendingMessages || 0}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-sm mb-2">Mensajería</h4>
                      <p className="text-sm text-gray-600">
                        Los mensajes se enviarán automáticamente a través de esta conexión.
                        Puede enviar mensajes desde la página de Leads o Mensajes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Opciones de conexión</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => restartWhatsapp()}
                    disabled={isRestartingWhatsapp}
                    variant="outline"
                  >
                    {isRestartingWhatsapp ? "Reiniciando..." : "Reiniciar conexión"}
                  </Button>
                  
                  {whatsappStatus?.authenticated && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Cerrar sesión</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción cerrará la sesión de WhatsApp y necesitará escanear el código QR nuevamente para reconectarse.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => logoutWhatsapp()}
                            disabled={isLoggingOutWhatsapp}
                          >
                            {isLoggingOutWhatsapp ? "Cerrando..." : "Cerrar sesión"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-xs text-gray-500">
                Última actualización: {new Date().toLocaleTimeString()}
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLastRefresh(new Date())}
              >
                Actualizar
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Telegram Integration */}
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Telegram</CardTitle>
                  <CardDescription>
                    Integración con Telegram para comunicarse con leads y clientes
                  </CardDescription>
                </div>
                <ConnectionStatusBadge 
                  isLoading={telegramStatusLoading} 
                  status={telegramStatus} 
                />
              </div>
            </CardHeader>
            <CardContent>
              {telegramStatusError ? (
                <div className="p-4 mb-4 border border-red-200 rounded-md bg-red-50">
                  <p className="text-red-600 text-sm">
                    Error al obtener el estado de la conexión.
                    Por favor, intente de nuevo más tarde.
                  </p>
                </div>
              ) : !telegramStatus?.ready ? (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Configuración del bot</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Escanee este código QR o use el código de autorización para configurar su bot de Telegram.
                  </p>
                  
                  <div className="flex flex-col items-center my-6">
                    {telegramQRLoading ? (
                      <div className="h-64 w-64 bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
                        <p className="text-gray-400">Generando código...</p>
                      </div>
                    ) : telegramQR?.data ? (
                      <div className="border p-4 rounded-md bg-white">
                        <img 
                          src={telegramQR.data.startsWith('data:') ? telegramQR.data : `data:image/png;base64,${telegramQR.data}`} 
                          alt="Código QR de Telegram" 
                          className="h-64 w-64"
                        />
                        
                        {telegramQR.expiry && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Expira: {new Date(telegramQR.expiry).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-64 w-64 bg-gray-100 rounded-md flex items-center justify-center">
                        <p className="text-gray-400">No hay código disponible</p>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => generateTelegramCode()}
                      disabled={isGeneratingTelegramCode}
                      variant="outline"
                      className="mt-4"
                    >
                      {isGeneratingTelegramCode ? "Generando..." : "Generar nuevo código"}
                    </Button>
                  </div>
                  
                  <div className="mt-4 bg-gray-50 p-4 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Pasos para configurar su bot de Telegram
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 ml-2">
                      <li>Contacte con <code>@BotFather</code> en Telegram</li>
                      <li>Envíe el comando <code>/newbot</code> y siga las instrucciones para crear un nuevo bot</li>
                      <li>Una vez creado, recibirá un token de API. Cópielo.</li>
                      <li>Vuelva a esta página y configure el token en la sección de opciones de conexión</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Conexión activa</h3>
                  <p className="text-green-600 text-sm mb-4">
                    ¡Conexión establecida correctamente! El bot de Telegram está activo.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-sm mb-2">Estado</h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Inicializado:</dt>
                          <dd className="font-medium">{telegramStatus?.initialized ? 'Sí' : 'No'}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Listo:</dt>
                          <dd className="font-medium">{telegramStatus?.ready ? 'Sí' : 'No'}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Chats conectados:</dt>
                          <dd className="font-medium">{telegramStatus?.connectedChats?.length || 0}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Mensajes pendientes:</dt>
                          <dd className="font-medium">{telegramStatus?.pendingMessages || 0}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-sm mb-2">Mensajería</h4>
                      <p className="text-sm text-gray-600">
                        Los mensajes se enviarán automáticamente a través de esta conexión.
                        Puede enviar mensajes desde la página de Leads o Mensajes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Opciones de conexión</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => restartTelegram()}
                    disabled={isRestartingTelegram}
                    variant="outline"
                  >
                    {isRestartingTelegram ? "Reiniciando..." : "Reiniciar conexión"}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-xs text-gray-500">
                Última actualización: {new Date().toLocaleTimeString()}
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLastRefresh(new Date())}
              >
                Actualizar
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ConnectionStatusBadge({ 
  isLoading, 
  status
}: { 
  isLoading: boolean, 
  status?: ConnectionStatus
}) {
  if (isLoading) {
    return <Badge variant="outline" className="animate-pulse">Cargando...</Badge>;
  }
  
  if (!status) {
    return <Badge variant="destructive">No disponible</Badge>;
  }
  
  if (status.ready) {
    return <Badge className="bg-green-500 text-white">Conectado</Badge>;
  }
  
  if (status.initialized) {
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Iniciando...</Badge>;
  }
  
  return <Badge variant="destructive">Desconectado</Badge>;
}