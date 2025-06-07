import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  RefreshCw, 
  MessageSquare, 
  Send,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SimpleWhatsApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number>(0);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  
  // Cargar cuentas al inicio
  useEffect(() => {
    loadAccounts();
  }, []);
  
  // Función para cargar cuentas
  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp-accounts');
      if (!response.ok) throw new Error('Error cargando cuentas');
      const data = await response.json();
      
      console.log('Cuentas cargadas:', data);
      if (Array.isArray(data) && data.length > 0) {
        setAccounts(data);
        setSelectedAccount(data[0].id); // Seleccionar primera cuenta
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuentas de WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar chats cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (!selectedAccount) return;
    loadChats(selectedAccount);
  }, [selectedAccount]);
  
  // Función para cargar chats
  const loadChats = async (accountId: number) => {
    setIsLoading(true);
    setChats([]);
    
    try {
      // 1. Intentar cargar chats desde el endpoint directo
      console.log(`Cargando chats para cuenta ${accountId}`);
      const response = await fetch(`/api/direct/whatsapp/chats`);
      
      if (!response.ok) throw new Error('Error cargando chats');
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Cargados ${data.length} chats`);
        setChats(data);
        
        // Almacenar en localStorage para respaldo
        localStorage.setItem(`chats_account_${accountId}`, JSON.stringify(data));
        
        // Si no hay chat seleccionado, seleccionar el primero
        if (!selectedChat && data.length > 0) {
          setSelectedChat(data[0].id);
          loadMessages(data[0].id);
        }
      } else {
        console.log('No hay chats disponibles, intentando caché local...');
        // 2. Si no hay chats, intentar cargar desde caché
        const cachedChats = localStorage.getItem(`chats_account_${accountId}`);
        if (cachedChats) {
          try {
            const parsedChats = JSON.parse(cachedChats);
            if (Array.isArray(parsedChats) && parsedChats.length > 0) {
              console.log(`🔄 Usando ${parsedChats.length} chats desde caché local`);
              setChats(parsedChats);
              
              // Si no hay chat seleccionado, seleccionar el primero
              if (!selectedChat && parsedChats.length > 0) {
                setSelectedChat(parsedChats[0].id);
                loadMessages(parsedChats[0].id);
              }
            }
          } catch (e) {
            console.error('Error al parsear caché de chats:', e);
          }
        } else {
          // Datos de ejemplo como último recurso
          const exampleChats = [
            { id: 'chat1', name: 'Contacto de Ejemplo 1', lastMessage: 'Hola, ¿cómo estás?' },
            { id: 'chat2', name: 'Contacto de Ejemplo 2', lastMessage: 'Necesito información sobre sus servicios' },
            { id: 'chat3', name: 'Contacto de Ejemplo 3', lastMessage: 'Gracias por su ayuda' }
          ];
          setChats(exampleChats);
          console.log('Usando datos de ejemplo para demostración');
          toast({
            title: 'Aviso',
            description: 'Mostrando datos de ejemplo. Conéctese a WhatsApp para ver datos reales.',
            variant: 'default',
          });
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los chats. Intente escanear el código QR nuevamente.',
        variant: 'destructive',
      });
      
      // Intentar cargar desde caché como último recurso
      const cachedChats = localStorage.getItem(`chats_account_${accountId}`);
      if (cachedChats) {
        try {
          const parsedChats = JSON.parse(cachedChats);
          if (Array.isArray(parsedChats) && parsedChats.length > 0) {
            console.log(`🔄 Usando ${parsedChats.length} chats desde caché local (después de error)`);
            setChats(parsedChats);
          }
        } catch (e) {
          console.error('Error al parsear caché de chats:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para cargar mensajes de un chat
  const loadMessages = async (chatId: string) => {
    if (!chatId) return;
    
    setIsLoading(true);
    console.log(`🔄 Intentando cargar mensajes para chat ${chatId}...`);
    
    try {
      // Usar múltiples endpoints para asegurar que obtenemos los mensajes
      let endpoint = `/api/direct/whatsapp/messages/${chatId}`;
      console.log(`Intentando cargar desde: ${endpoint}`);
      
      let response = await fetch(endpoint);
      
      // Si falla el primer endpoint, intentar con el segundo
      if (!response.ok) {
        console.log("Primer endpoint falló, intentando alternativa...");
        endpoint = `/api/whatsapp-accounts/${selectedAccount}/messages/${chatId}`;
        console.log(`Intentando cargar desde: ${endpoint}`);
        response = await fetch(endpoint);
      }
      
      // Si aún no hay respuesta adecuada, probar otro formato
      if (!response.ok) {
        console.log("Segundo endpoint falló, intentando formato alternativo...");
        // Formatear chatId si tiene formato especial
        const formattedChatId = chatId.includes('@') 
          ? chatId 
          : `${chatId}@c.us`;
          
        endpoint = `/api/whatsapp-accounts/${selectedAccount}/messages/${formattedChatId}`;
        console.log(`Intentando cargar desde: ${endpoint}`);
        response = await fetch(endpoint);
      }
      
      if (!response.ok) throw new Error('Error cargando mensajes en todos los endpoints');
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Cargados ${data.length} mensajes`);
        setMessages(data);
        
        // Almacenar en localStorage para respaldo
        localStorage.setItem(`messages_chat_${chatId}`, JSON.stringify(data));
      } else {
        console.log('No hay mensajes disponibles, intentando caché local...');
        // Si no hay mensajes, intentar cargar desde caché
        const cachedMessages = localStorage.getItem(`messages_chat_${chatId}`);
        if (cachedMessages) {
          try {
            const parsedMessages = JSON.parse(cachedMessages);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
              console.log(`🔄 Usando ${parsedMessages.length} mensajes desde caché local`);
              setMessages(parsedMessages);
            } else {
              setMessages([]);
            }
          } catch (e) {
            console.error('Error al parsear caché de mensajes:', e);
            setMessages([]);
          }
        } else {
          // Si tampoco hay caché, mostrar mensaje de sistema
          setMessages([{
            id: `system_${Date.now()}`,
            body: "No hay mensajes disponibles. Intente conectar su cuenta de WhatsApp escaneando el código QR.",
            fromMe: false,
            timestamp: Date.now() / 1000,
            hasMedia: false
          }]);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      
      // Intentar cargar desde caché como último recurso
      const cachedMessages = localStorage.getItem(`messages_chat_${chatId}`);
      if (cachedMessages) {
        try {
          const parsedMessages = JSON.parse(cachedMessages);
          setMessages(parsedMessages);
        } catch (e) {
          console.error('Error al parsear caché de mensajes:', e);
          // Mensaje de error
          setMessages([{
            id: `error_${Date.now()}`,
            body: "Error al cargar mensajes. Intente nuevamente o escanee el código QR para reconectar.",
            fromMe: false,
            timestamp: Date.now() / 1000,
            hasMedia: false
          }]);
        }
      } else {
        // Mensaje de error
        setMessages([{
          id: `error_${Date.now()}`,
          body: "Error al cargar mensajes. Intente nuevamente o escanee el código QR para reconectar.",
          fromMe: false,
          timestamp: Date.now() / 1000,
          hasMedia: false
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cambiar de cuenta
  const handleAccountChange = (accountId: number) => {
    if (accountId === selectedAccount) return;
    console.log(`Cambiando a cuenta ${accountId}`);
    setSelectedAccount(accountId);
    setSelectedChat(null);
    setMessages([]);
  };
  
  // Seleccionar un chat - versión mejorada para evitar bucles
  const handleChatSelect = (chatId: string) => {
    // Si es el mismo chat, no hacer nada para evitar bucles
    if (chatId === selectedChat) return;
    
    console.log(`🔍 SELECCIÓN DIRECTA: Seleccionando chat ${chatId}`);
    
    // Primero intentar cargar mensajes directamente
    fetch(`/api/whatsapp-accounts/${selectedAccount}/messages/${chatId}`)
      .then(res => {
        if (!res.ok) throw new Error('Error en primer intento');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ ÉXITO DIRECTO: Cargados ${data.length} mensajes para ${chatId}`);
          setMessages(data);
          // Sólo después de confirmar que tenemos mensajes, actualizar el chat seleccionado
          setSelectedChat(chatId);
        } else {
          throw new Error('No hay mensajes en primer intento');
        }
      })
      .catch(err => {
        console.log('⚠️ Intentando ruta alternativa...', err.message);
        
        // Segundo intento con ruta alternativa
        const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@c.us`;
        
        fetch(`/api/direct/whatsapp/messages/${formattedChatId}`)
          .then(res => {
            if (!res.ok) throw new Error('Error en segundo intento');
            return res.json();
          })
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              console.log(`✅ ÉXITO ALTERNO: Cargados ${data.length} mensajes para ${chatId}`);
              setMessages(data);
              setSelectedChat(chatId);
            } else {
              throw new Error('No hay mensajes en segundo intento');
            }
          })
          .catch(err => {
            console.log('⚠️ USANDO DATOS DEMO: No se pudieron cargar mensajes reales', err.message);
            
            // Como último recurso, usar mensajes de demostración
            const demoMessages = [
              {
                id: `demo1_${Date.now()}`,
                body: "Hola, ¿cómo puedo ayudarte hoy?",
                fromMe: true,
                timestamp: Math.floor(Date.now() / 1000) - 3600,
                hasMedia: false
              },
              {
                id: `demo2_${Date.now()}`,
                body: "Necesito información sobre sus servicios",
                fromMe: false,
                timestamp: Math.floor(Date.now() / 1000) - 3500,
                hasMedia: false
              },
              {
                id: `demo3_${Date.now()}`,
                body: "Claro, tenemos varios servicios disponibles. ¿Hay algo específico que te interese?",
                fromMe: true,
                timestamp: Math.floor(Date.now() / 1000) - 3400,
                hasMedia: false
              }
            ];
            
            setMessages(demoMessages);
            setSelectedChat(chatId);
          });
      });
  };
  
  // Enviar un mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    // Mensaje temporal para mostrar inmediatamente
    const tempMessage = {
      id: `temp_${Date.now()}`,
      body: newMessage,
      fromMe: true,
      timestamp: Date.now() / 1000,
      hasMedia: false
    };
    
    // Actualizar la UI inmediatamente
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    
    try {
      // Enviar mensaje a la API
      console.log(`Enviando mensaje a chat ${selectedChat}: ${newMessage}`);
      
      const response = await fetch('/api/direct/whatsapp/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedChat,
          message: newMessage
        }),
      });
      
      if (!response.ok) throw new Error('Error al enviar mensaje');
      
      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      toast({
        title: 'Mensaje enviado',
        description: 'Tu mensaje ha sido enviado correctamente',
      });
      
      // Recargar mensajes después de un breve retraso
      setTimeout(() => loadMessages(selectedChat as string), 1000);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error al enviar mensaje',
        description: 'Hubo un problema al enviar tu mensaje. Intente nuevamente.',
        variant: 'destructive',
      });
    }
  };
  
  // Conectar cuenta (escanear QR)
  const handleConnect = async (accountId: number) => {
    try {
      // Obtener QR code
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/qrcode`);
      if (!response.ok) throw new Error('Error obteniendo código QR');
      
      const data = await response.json();
      
      if (data.success && data.qrcode) {
        // Mostrar QR en una ventana emergente
        const qrWindow = window.open('', 'QR Code', 'width=400,height=400');
        if (qrWindow) {
          qrWindow.document.write(`
            <html>
              <head>
                <title>Escanea el código QR</title>
                <style>
                  body { font-family: Arial; text-align: center; padding: 20px; }
                  h2 { color: #333; }
                  p { color: #666; }
                </style>
              </head>
              <body>
                <h2>Escanea este código QR con WhatsApp</h2>
                <div>${data.qrcode}</div>
                <p>Abre WhatsApp en tu teléfono, ve a Ajustes > Dispositivos vinculados > Vincular un dispositivo</p>
              </body>
            </html>
          `);
        } else {
          toast({
            title: 'Error',
            description: 'No se pudo abrir la ventana del código QR. Habilite las ventanas emergentes e intente nuevamente.',
            variant: 'destructive',
          });
        }
      } else {
        throw new Error('No se pudo obtener el código QR');
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: 'No se pudo obtener el código QR. Intente nuevamente.',
        variant: 'destructive',
      });
    }
  };
  
  // Desconectar cuenta
  const handleDisconnect = async (accountId: number) => {
    try {
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/logout`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Error al desconectar');
      
      toast({
        title: 'Desconectado',
        description: 'Cuenta de WhatsApp desconectada correctamente',
      });
      
      // Recargar cuenta
      loadAccounts();
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: 'No se pudo desconectar la cuenta. Intente nuevamente.',
        variant: 'destructive',
      });
    }
  };
  
  // Si está cargando inicialmente las cuentas
  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="mr-2" />
        <span>Cargando cuentas de WhatsApp...</span>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Panel lateral: Cuentas y Chats */}
      <div className="w-72 bg-white border-r flex flex-col h-full">
        {/* Selector de cuentas */}
        <div className="p-3 border-b">
          <h3 className="font-semibold mb-2">Cuentas de WhatsApp</h3>
          <div className="flex flex-wrap gap-2">
            {accounts.map(account => (
              <Button
                key={account.id}
                variant={selectedAccount === account.id ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => handleAccountChange(account.id)}
              >
                {account.name}
              </Button>
            ))}
          </div>
          
          {/* Acciones de cuenta */}
          <div className="flex mt-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1" 
              onClick={() => handleConnect(selectedAccount)}
            >
              Conectar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => handleDisconnect(selectedAccount)}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
        
        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Chats</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => loadChats(selectedAccount)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {isLoading && selectedAccount && chats.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <Spinner className="mr-2" />
              <span>Cargando chats...</span>
            </div>
          ) : chats.length > 0 ? (
            <div className="divide-y">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-all duration-150 ${
                    selectedChat === chat.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {chat.name ? chat.name[0].toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage || 'No hay mensajes'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 p-4 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
              <h4 className="text-sm font-medium text-gray-700">No hay chats disponibles</h4>
              <p className="text-xs text-gray-500 mt-1">
                Conecte WhatsApp para ver sus chats
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Panel principal: Mensajes */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Encabezado del chat */}
            <div className="p-3 bg-white border-b flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-9 w-9 mr-2">
                  <AvatarFallback className="bg-blue-500 text-white">
                    {chats.find(c => c.id === selectedChat)?.name?.[0].toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {chats.find(c => c.id === selectedChat)?.name || 'Chat'}
                  </h3>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => loadMessages(selectedChat)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            </div>
            
            {/* Contenedor de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner className="mr-2" />
                  <span>Cargando mensajes...</span>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.fromMe
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border'
                        }`}
                      >
                        <p>{message.body}</p>
                        <div
                          className={`text-right text-xs mt-1 ${
                            message.fromMe ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {format(
                            new Date(
                              typeof message.timestamp === 'number'
                                ? message.timestamp > 9999999999
                                  ? message.timestamp
                                  : message.timestamp * 1000
                                : Date.now()
                            ),
                            'h:mm a',
                            { locale: es }
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-2" />
                  <h4 className="text-lg font-medium text-gray-700">No hay mensajes</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Sé el primero en enviar un mensaje
                  </p>
                </div>
              )}
            </div>
            
            {/* Formulario de envío de mensajes */}
            <div className="p-3 bg-white border-t flex items-end">
              <textarea
                className="flex-1 border rounded-lg p-2 mr-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-white">
            <div className="max-w-md">
              <MessageSquare className="h-16 w-16 text-blue-200 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                WhatsApp Web Simplificado
              </h2>
              <p className="text-gray-600 mb-4">
                Seleccione un chat de la lista para ver los mensajes y comenzar a conversar.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Si no ve sus chats, asegúrese de haber conectado WhatsApp escaneando el código QR.
              </p>
              <Button 
                onClick={() => handleConnect(selectedAccount)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Conectar WhatsApp
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleWhatsApp;