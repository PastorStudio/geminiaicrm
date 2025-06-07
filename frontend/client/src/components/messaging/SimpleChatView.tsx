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
  PhoneCall
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Componente ultra simplificado para visualización de chats
const SimpleChatView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number>(0);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  
  // Cargar cuentas al inicio
  useEffect(() => {
    const loadAccounts = async () => {
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
        setError('No se pudieron cargar las cuentas de WhatsApp');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAccounts();
  }, []);
  
  // Cargar chats cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (!selectedAccount) return;
    
    const loadChats = async () => {
      setIsLoading(true);
      setChats([]);
      
      try {
        const response = await fetch(`/api/direct/whatsapp/chats`);
        if (!response.ok) throw new Error('Error cargando chats');
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`Cargados ${data.length} chats`);
          setChats(data);
          
          // Si no hay chat seleccionado, seleccionar el primero
          if (!selectedChat && data.length > 0) {
            setSelectedChat(data[0].id);
            loadMessages(data[0].id);
          }
        } else {
          console.log('No hay chats disponibles');
          setChats([]);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar los chats');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChats();
  }, [selectedAccount]);
  
  // Función para cargar mensajes de un chat
  const loadMessages = async (chatId: string) => {
    if (!chatId) return;
    
    setIsLoading(true);
    setMessages([]);
    
    try {
      console.log(`Cargando mensajes para chat ${chatId}`);
      const response = await fetch(`/api/direct/whatsapp/messages/${chatId}`);
      if (!response.ok) throw new Error('Error cargando mensajes');
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Cargados ${data.length} mensajes`);
        setMessages(data);
      } else {
        console.log('No hay mensajes disponibles');
        setMessages([]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cambiar de cuenta
  const handleAccountChange = (accountId: number) => {
    setSelectedAccount(accountId);
    setSelectedChat(null);
    setMessages([]);
  };
  
  // Seleccionar un chat
  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    loadMessages(chatId);
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
      
      toast({
        title: 'Mensaje enviado',
        description: 'Tu mensaje ha sido enviado correctamente',
      });
      
      // Recargar mensajes después de un breve retraso
      setTimeout(() => loadMessages(selectedChat), 1000);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error al enviar mensaje',
        description: 'Hubo un problema al enviar tu mensaje',
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
  
  // Si hay un error general
  if (error && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-center">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-2">Intenta recargar la página o escanear el código QR de nuevo.</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recargar página
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Panel lateral izquierdo - Cuentas */}
      <div className="w-20 bg-gray-900 flex flex-col items-center py-4">
        {accounts.map(account => (
          <button
            key={account.id}
            className={`w-12 h-12 rounded-full mb-2 flex items-center justify-center ${
              selectedAccount === account.id ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200'
            }`}
            onClick={() => handleAccountChange(account.id)}
          >
            <span className="text-lg font-bold">{account.name[0]}</span>
          </button>
        ))}
      </div>
      
      {/* Panel de chats */}
      <div className="w-72 border-r overflow-hidden flex flex-col">
        <div className="p-3 border-b">
          <h3 className="font-semibold">
            Chats - {accounts.find(a => a.id === selectedAccount)?.name || 'Cuenta'}
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading && chats.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Spinner className="mr-2" />
              <span>Cargando chats...</span>
            </div>
          ) : chats.length > 0 ? (
            <div className="divide-y">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer ${
                    selectedChat === chat.id ? 'bg-green-50 border-l-4 border-green-500' : ''
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
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-2" />
              <h4 className="text-lg font-medium text-gray-700">No hay chats disponibles</h4>
              <p className="text-sm text-gray-500 mt-1">
                Escanea el código QR para conectar WhatsApp
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Panel de mensajes */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            {/* Encabezado del chat */}
            <div className="p-3 border-b flex items-center justify-between">
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
              
              <Button variant="ghost" size="sm">
                <PhoneCall className="h-4 w-4 mr-1" />
                <span>Llamar</span>
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
                            ? 'bg-green-500 text-white'
                            : 'bg-white border'
                        }`}
                      >
                        <p>{message.body}</p>
                        <div
                          className={`text-right text-xs mt-1 ${
                            message.fromMe ? 'text-green-100' : 'text-gray-400'
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
            <div className="p-3 border-t flex items-end">
              <textarea
                className="flex-1 border rounded-lg p-2 mr-2 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
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
                className="bg-green-500 hover:bg-green-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="max-w-md">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                WhatsApp Web Simplificado
              </h2>
              <p className="text-gray-600 mb-4">
                Selecciona un chat de la lista para ver los mensajes y comenzar a conversar.
              </p>
              <p className="text-sm text-gray-500">
                Si no ves tus chats, asegúrate de haber escaneado el código QR para conectar WhatsApp.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleChatView;