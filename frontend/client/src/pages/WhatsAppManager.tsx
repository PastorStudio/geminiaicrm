import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Card, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Phone, Settings, RefreshCw } from "lucide-react";

// URL base para la API
const API_URL = 'http://localhost:5000/api';

// Interfaces para los tipos de datos
interface WhatsAppStatus {
  status: string;
  authenticated: boolean;
  hasQrCode: boolean;
  timestamp: string;
}

interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: string | null;
  lastMessage: {
    body: string;
    fromMe: boolean;
    timestamp: string | null;
  } | null;
}

interface Message {
  id: string;
  body: string;
  timestamp: string | null;
  fromMe: boolean;
  author: string;
  hasMedia: boolean;
  type: string;
}

interface AutoResponseConfig {
  id: number;
  enabled: boolean;
  greetingMessage: string;
  outOfHoursMessage: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  workingDays: string;
  geminiApiKey: string | null;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

// Componente principal para gestionar WhatsApp
export default function WhatsAppManager() {
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // Consulta para obtener el estado de WhatsApp
  const { 
    data: whatsappStatus, 
    isLoading: isLoadingStatus,
    refetch: refetchStatus 
  } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/whatsapp/status`);
      return res.data as WhatsAppStatus;
    },
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  // Consulta para obtener el código QR
  const { 
    data: qrCode, 
    isLoading: isLoadingQR,
    refetch: refetchQR
  } = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/whatsapp/qr`);
      return res.data as string;
    },
    enabled: !!whatsappStatus?.hasQrCode && !whatsappStatus?.authenticated,
    retry: false,
  });

  // Consulta para obtener chats
  const { 
    data: chats, 
    isLoading: isLoadingChats,
    refetch: refetchChats
  } = useQuery({
    queryKey: ['whatsapp-chats'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/whatsapp/chats`);
      return res.data as Chat[];
    },
    enabled: !!whatsappStatus?.authenticated,
    refetchInterval: whatsappStatus?.authenticated ? 10000 : false, // Refrescar cada 10 segundos si está autenticado
  });

  // Consulta para obtener mensajes de un chat
  const {
    data: messages,
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['whatsapp-messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      const res = await axios.get(`${API_URL}/whatsapp/chats/${selectedChat}/messages`);
      return res.data as Message[];
    },
    enabled: !!selectedChat && !!whatsappStatus?.authenticated,
  });

  // Consulta para obtener configuración de respuestas automáticas
  const {
    data: autoResponseConfig,
    isLoading: isLoadingConfig,
    refetch: refetchConfig
  } = useQuery({
    queryKey: ['auto-response-config'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/auto-response/config`);
      return res.data as AutoResponseConfig;
    },
  });

  // Mutación para conectar WhatsApp
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${API_URL}/whatsapp/connect`);
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Conectando WhatsApp",
        description: "Por favor escanea el código QR cuando aparezca.",
      });
      // Refrescar estado y QR
      setTimeout(() => {
        refetchStatus();
        refetchQR();
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error al conectar WhatsApp",
        description: "No se pudo iniciar la conexión. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para desconectar WhatsApp
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${API_URL}/whatsapp/disconnect`);
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "WhatsApp desconectado",
        description: "La sesión se ha cerrado correctamente.",
      });
      setSelectedChat(null);
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Error al desconectar WhatsApp",
        description: "No se pudo cerrar la sesión. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para enviar mensaje
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: string, message: string }) => {
      const res = await axios.post(`${API_URL}/whatsapp/send`, { chatId, message });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Mensaje enviado",
        description: "El mensaje se ha enviado correctamente.",
      });
      setTimeout(() => {
        refetchMessages();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error al enviar mensaje",
        description: "No se pudo enviar el mensaje. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar configuración de respuestas automáticas
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<AutoResponseConfig>) => {
      const res = await axios.post(`${API_URL}/auto-response/config`, config);
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "La configuración de respuestas automáticas se ha actualizado correctamente.",
      });
      refetchConfig();
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar configuración",
        description: "No se pudo actualizar la configuración. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Estado local para el mensaje a enviar
  const [messageText, setMessageText] = useState("");

  // Función para enviar un mensaje
  const handleSendMessage = () => {
    if (!selectedChat || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      chatId: selectedChat,
      message: messageText
    });
    
    setMessageText("");
  };

  // Función para marcar un chat como leído
  const markChatAsRead = async (chatId: string) => {
    try {
      await axios.post(`${API_URL}/whatsapp/read/${chatId}`);
      refetchChats();
    } catch (error) {
      console.error("Error al marcar chat como leído:", error);
    }
  };

  // Función para alternar respuestas automáticas
  const toggleAutoResponse = (enabled: boolean) => {
    if (!autoResponseConfig) return;
    
    updateConfigMutation.mutate({
      enabled
    });
  };

  // Efecto para actualizar título de la página
  useEffect(() => {
    document.title = "Gestor de WhatsApp";
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gestor de WhatsApp</h1>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Panel de estado y conexión */}
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Estado de conexión</h2>
          
          {isLoadingStatus ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    whatsappStatus?.authenticated ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">Estado: {whatsappStatus?.status}</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Última actualización: {new Date(whatsappStatus?.timestamp || '').toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                {whatsappStatus?.authenticated ? (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Desconectar WhatsApp
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Conectar WhatsApp
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => refetchStatus()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar estado
                </Button>
              </div>

              {/* Código QR si está disponible */}
              {whatsappStatus?.hasQrCode && !whatsappStatus?.authenticated && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Escanea el código QR para conectar</h3>
                  {isLoadingQR ? (
                    <div className="flex justify-center items-center h-40 bg-gray-100">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                  ) : qrCode ? (
                    <div className="bg-white p-3 max-w-xs mx-auto">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} 
                        alt="Código QR de WhatsApp" 
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No se pudo cargar el código QR
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <Separator className="my-4" />

          {/* Configuración de respuestas automáticas */}
          <h2 className="text-xl font-semibold mb-4">Respuestas automáticas</h2>
          
          {isLoadingConfig ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : autoResponseConfig ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Estado</p>
                  <p className="text-sm text-gray-600">
                    {autoResponseConfig.enabled ? 'Activado' : 'Desactivado'}
                  </p>
                </div>
                <Switch 
                  checked={autoResponseConfig.enabled}
                  onCheckedChange={toggleAutoResponse}
                />
              </div>

              <div>
                <p className="font-medium mb-1">Horario de atención</p>
                <p className="text-sm text-gray-600">
                  {autoResponseConfig.businessHoursStart} - {autoResponseConfig.businessHoursEnd}
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">Mensaje de bienvenida</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {autoResponseConfig.greetingMessage}
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">Mensaje fuera de horario</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {autoResponseConfig.outOfHoursMessage}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No se pudo cargar la configuración</p>
          )}
        </Card>

        {/* Panel de chats y mensajes */}
        <Card className="p-4 lg:col-span-4">
          <Tabs defaultValue="chats">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chats" className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </TabsTrigger>
            </TabsList>
            
            {/* Pestaña de chats */}
            <TabsContent value="chats" className="pt-4">
              {!whatsappStatus?.authenticated ? (
                <div className="text-center py-10">
                  <Phone className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">WhatsApp no conectado</h3>
                  <p className="mt-1 text-gray-500">
                    Conecta WhatsApp para ver tus chats y mensajes
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Lista de chats */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b">
                      <h3 className="font-medium">Conversaciones</h3>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[500px]">
                      {isLoadingChats ? (
                        <div className="flex justify-center items-center h-40">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                        </div>
                      ) : chats && chats.length > 0 ? (
                        <ul className="divide-y">
                          {chats.map((chat) => (
                            <li 
                              key={chat.id}
                              className={`p-3 hover:bg-gray-50 cursor-pointer ${
                                selectedChat === chat.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => {
                                setSelectedChat(chat.id);
                                if (chat.unreadCount > 0) {
                                  markChatAsRead(chat.id);
                                }
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{chat.name}</p>
                                  <p className="text-sm text-gray-500 truncate">
                                    {chat.lastMessage?.body || 'No hay mensajes'}
                                  </p>
                                </div>
                                {chat.unreadCount > 0 && (
                                  <span className="bg-blue-500 text-white text-xs font-medium rounded-full px-2 py-0.5">
                                    {chat.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {chat.timestamp ? new Date(chat.timestamp).toLocaleString() : ''}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-center text-gray-500 py-10">No hay chats disponibles</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Mensajes del chat seleccionado */}
                  <div className="md:col-span-2 border rounded-md overflow-hidden flex flex-col h-[500px]">
                    {!selectedChat ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500">Selecciona un chat para ver los mensajes</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50 p-3 border-b">
                          <h3 className="font-medium">
                            {chats?.find(c => c.id === selectedChat)?.name || 'Chat'}
                          </h3>
                        </div>
                        
                        {/* Área de mensajes */}
                        <div className="flex-1 overflow-y-auto p-3">
                          {isLoadingMessages ? (
                            <div className="flex justify-center items-center h-40">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                            </div>
                          ) : messages && messages.length > 0 ? (
                            <div className="space-y-3">
                              {messages.slice().reverse().map((message) => (
                                <div 
                                  key={message.id}
                                  className={`max-w-[80%] p-3 rounded-lg ${
                                    message.fromMe 
                                      ? 'bg-blue-100 ml-auto' 
                                      : 'bg-gray-100 mr-auto'
                                  }`}
                                >
                                  <p>{message.body}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {message.timestamp 
                                      ? new Date(message.timestamp).toLocaleString() 
                                      : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-10">No hay mensajes</p>
                          )}
                        </div>
                        
                        {/* Campo para enviar mensaje */}
                        <div className="p-3 border-t">
                          <div className="flex">
                            <input
                              type="text"
                              className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Escribe un mensaje..."
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                            />
                            <Button
                              className="rounded-l-none"
                              onClick={handleSendMessage}
                              disabled={!messageText.trim() || sendMessageMutation.isPending}
                            >
                              {sendMessageMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Enviar'
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Pestaña de configuración */}
            <TabsContent value="settings" className="pt-4">
              <div className="max-w-xl mx-auto">
                <h3 className="text-lg font-medium mb-4">Configuración de respuestas automáticas</h3>
                
                {isLoadingConfig ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : autoResponseConfig ? (
                  <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      
                      updateConfigMutation.mutate({
                        enabled: formData.get('enabled') === 'on',
                        greetingMessage: formData.get('greetingMessage') as string,
                        outOfHoursMessage: formData.get('outOfHoursMessage') as string,
                        businessHoursStart: formData.get('businessHoursStart') as string,
                        businessHoursEnd: formData.get('businessHoursEnd') as string,
                        workingDays: formData.get('workingDays') as string,
                      });
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="enabled"
                        name="enabled"
                        defaultChecked={autoResponseConfig.enabled}
                      />
                      <label htmlFor="enabled" className="font-medium">
                        Habilitar respuestas automáticas
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Hora de inicio
                        </label>
                        <input 
                          type="time" 
                          name="businessHoursStart"
                          defaultValue={autoResponseConfig.businessHoursStart}
                          className="w-full border rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Hora de fin
                        </label>
                        <input 
                          type="time" 
                          name="businessHoursEnd"
                          defaultValue={autoResponseConfig.businessHoursEnd}
                          className="w-full border rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Días laborables
                      </label>
                      <input 
                        type="text" 
                        name="workingDays"
                        defaultValue={autoResponseConfig.workingDays}
                        placeholder="Ejemplo: 1,2,3,4,5 (Lun-Vie)"
                        className="w-full border rounded-md px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        0 = Domingo, 1 = Lunes, ..., 6 = Sábado. Separados por comas.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Mensaje de bienvenida
                      </label>
                      <textarea 
                        name="greetingMessage"
                        defaultValue={autoResponseConfig.greetingMessage}
                        rows={3}
                        className="w-full border rounded-md px-3 py-2"
                      ></textarea>
                      <p className="text-xs text-gray-500 mt-1">
                        Este mensaje se enviará en horario de atención.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Mensaje fuera de horario
                      </label>
                      <textarea 
                        name="outOfHoursMessage"
                        defaultValue={autoResponseConfig.outOfHoursMessage}
                        rows={3}
                        className="w-full border rounded-md px-3 py-2"
                      ></textarea>
                      <p className="text-xs text-gray-500 mt-1">
                        Este mensaje se enviará fuera del horario de atención.
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        type="submit"
                        className="w-full"
                        disabled={updateConfigMutation.isPending}
                      >
                        {updateConfigMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Guardar configuración
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-center text-gray-500">
                    No se pudo cargar la configuración
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}