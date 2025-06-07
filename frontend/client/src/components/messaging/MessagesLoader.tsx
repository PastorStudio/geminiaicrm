import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageText } from '@/components/ui/message-text';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

// Tipos de mensaje que podemos manejar
interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
  caption?: string;
  mimetype?: string;
  filename?: string;
}

// Propiedades del componente
interface MessagesLoaderProps {
  chatId: string | null;
  currentAccountId: number;
  currentChatName?: string;
}

const MessagesLoader: React.FC<MessagesLoaderProps> = ({ 
  chatId, 
  currentAccountId,
  currentChatName = 'Chat' 
}) => {
  // Estado local para los mensajes
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Referencia para el scroll automático
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Función para cargar mensajes
  const loadMessages = async () => {
    if (!chatId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Cargando mensajes para chat ${chatId}...`);
      
      // Verificar si es un chat de demostración (generado por modo multi-cuenta)
      if (chatId.startsWith('demo-chat-')) {
        console.log('Detectado chat de demostración, generando mensajes simulados');
        
        // Extraer ID de cuenta y número de chat del ID
        const parts = chatId.split('-');
        const accountId = parts[2];
        const chatNum = parts[3];
        
        // Generar mensajes de demostración (15 mensajes)
        const demoMessages = [];
        for (let i = 1; i <= 15; i++) {
          const isFromMe = i % 3 === 0; // Algunos son enviados por el usuario
          const timestamp = Date.now() / 1000 - (15 - i) * 3600; // Últimas 15 horas
          
          demoMessages.push({
            id: `demo-msg-${accountId}-${chatNum}-${i}`,
            body: isFromMe 
              ? `Este es un mensaje enviado por ti (cuenta ${accountId}) al chat ${chatNum}` 
              : `Este es un mensaje recibido en la cuenta ${accountId} del chat ${chatNum}`,
            fromMe: isFromMe,
            timestamp: timestamp,
            hasMedia: false
          });
        }
        
        // Ordenar mensajes por tiempo
        const sortedMessages = demoMessages.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`✅ Generados ${sortedMessages.length} mensajes de demostración para chat ${chatId}`);
        setMessages(sortedMessages);
        setIsLoading(false);
        return; // No continuar con el resto del código
      }
      
      // Para chats reales, intentar obtener mensajes desde la API
      const response = await fetch(`/api/direct/whatsapp/messages/${chatId}`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Cargados ${data.length} mensajes reales para chat ${chatId}`);
        setMessages(data);
        
        // Guardar en caché local
        localStorage.setItem(`whatsapp_messages_${chatId}`, JSON.stringify(data));
      } else {
        // Sin mensajes desde API, intentar cargar desde caché
        console.log('Sin mensajes desde API, intentando caché local...');
        const cachedMessages = localStorage.getItem(`whatsapp_messages_${chatId}`);
        
        if (cachedMessages) {
          try {
            const parsedMessages = JSON.parse(cachedMessages);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
              console.log(`🔄 Usando ${parsedMessages.length} mensajes desde caché local`);
              setMessages(parsedMessages);
            } else {
              // Caché no válida
              setMessages([]);
            }
          } catch (e) {
            console.error('Error al parsear caché de mensajes:', e);
            setMessages([]);
          }
        } else {
          // No hay mensajes ni en API ni en caché
          setMessages([{
            id: `empty_${Date.now()}`,
            body: 'No hay mensajes disponibles para este chat.',
            fromMe: false,
            timestamp: Date.now() / 1000,
            hasMedia: false
          }]);
        }
      }
    } catch (err) {
      console.error(`Error al cargar mensajes:`, err);
      setError('Error al cargar mensajes. Intente nuevamente.');
      
      // Intentar cargar desde caché como respaldo
      const cachedMessages = localStorage.getItem(`whatsapp_messages_${chatId}`);
      if (cachedMessages) {
        try {
          const parsedMessages = JSON.parse(cachedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages);
          }
        } catch (e) {
          // Error al parsear caché, usar mensaje de error
          setMessages([{
            id: `error_${Date.now()}`,
            body: 'Error al cargar mensajes. Intente recargar la página o escanear el código QR para reconectar.',
            fromMe: false,
            timestamp: Date.now() / 1000,
            hasMedia: false
          }]);
        }
      } else {
        // Sin caché disponible, mostrar mensaje de error
        setMessages([{
          id: `error_${Date.now()}`,
          body: 'Error al cargar mensajes. Intente recargar la página o escanear el código QR para reconectar.',
          fromMe: false,
          timestamp: Date.now() / 1000,
          hasMedia: false
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar mensajes cuando cambia el chatId
  useEffect(() => {
    if (chatId) {
      loadMessages();
    } else {
      // Limpiar mensajes si no hay chat seleccionado
      setMessages([]);
    }
  }, [chatId, currentAccountId]);
  
  // Hacer scroll automático al final de los mensajes cuando llegan nuevos
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Si no hay chat seleccionado
  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-50 rounded-full mx-auto flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Mensajería WhatsApp</h3>
          <p className="text-gray-600 mb-4">
            Selecciona un chat para ver los mensajes y comenzar a responder a tus contactos directamente desde esta interfaz.
          </p>
          <div className="text-sm text-gray-500">
            Puedes cambiar entre cuentas de WhatsApp usando el selector en la parte superior izquierda.
          </div>
        </div>
      </div>
    );
  }
  
  // Mostrar spinner mientras se cargan los mensajes
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <div className="flex flex-col items-center">
          <Spinner className="mb-4" />
          <p className="text-gray-600">Cargando mensajes...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 messages-container">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-red-700 text-sm">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={() => loadMessages()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reintentar
          </Button>
        </div>
      )}
      
      {messages.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="flex justify-center mb-3">
              <MessageSquare className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No hay mensajes</h3>
            <p className="text-gray-500 text-sm mb-3">
              Aún no hay mensajes en esta conversación.
            </p>
            <Button variant="outline" size="sm" onClick={() => loadMessages()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, index) => {
            // Determinar si este mensaje es parte de una secuencia del mismo remitente
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSequential = prevMsg && prevMsg.fromMe === msg.fromMe;
            
            // Verificar si necesitamos mostrar separador de fecha
            const showDateSeparator = () => {
              if (index === 0) return true;
              
              const prevDate = new Date(typeof prevMsg?.timestamp === 'number' ? 
                (prevMsg.timestamp > 9999999999 ? prevMsg.timestamp : prevMsg.timestamp * 1000) : 
                Date.now());
              
              const currentDate = new Date(typeof msg.timestamp === 'number' ? 
                (msg.timestamp > 9999999999 ? msg.timestamp : msg.timestamp * 1000) : 
                Date.now());
              
              return prevDate.toDateString() !== currentDate.toDateString();
            };
            
            return (
              <div key={msg.id || index}>
                {showDateSeparator() && (
                  <div className="flex justify-center my-3">
                    <div className="bg-gray-100 text-gray-500 text-xs rounded-full px-3 py-1 font-medium">
                      {format(new Date(typeof msg.timestamp === 'number' ? 
                        (msg.timestamp > 9999999999 ? msg.timestamp : msg.timestamp * 1000) : 
                        Date.now()), 'EEEE, d MMMM', { locale: es })}
                    </div>
                  </div>
                )}
                
                <div 
                  className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} ${isSequential ? 'mt-1' : 'mt-3'} w-full`}
                >
                  {!msg.fromMe && !isSequential && (
                    <Avatar className="h-8 w-8 mr-2 mt-2 flex-shrink-0 border shadow-sm">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs">
                        {currentChatName ? getInitials(currentChatName) : 'UN'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {!msg.fromMe && isSequential && <div className="w-10 flex-shrink-0"></div>}
                  
                  <div 
                    className={`max-w-[95%] w-fit rounded-lg p-3 ${
                      msg.fromMe 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md ml-auto' 
                        : 'bg-white border shadow-sm mr-auto'
                    } ${isSequential && msg.fromMe ? 'rounded-tr-sm' : ''} ${isSequential && !msg.fromMe ? 'rounded-tl-sm' : ''}`}
                  >
                    {/* Mensaje de texto */}
                    {msg.body && (
                      <MessageText
                        text={msg.body}
                        className={msg.fromMe ? 'text-white' : 'text-gray-800'}
                      />
                    )}
                    
                    {/* Footer del mensaje con hora */}
                    <div className={`flex justify-end mt-1 gap-1 items-center ${msg.fromMe ? 'text-green-100' : 'text-gray-400'} text-xs`}>
                      {format(new Date(typeof msg.timestamp === 'number' ? 
                        (msg.timestamp > 9999999999 ? msg.timestamp : msg.timestamp * 1000) : 
                        Date.now()), 'h:mm a', { locale: es })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Elemento para hacer scroll automático al final */}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default MessagesLoader;