import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Download, FileImage, FileText, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  type: string;
  author?: string;
  quotedMsg?: {
    id: string;
    body: string;
  };
}

interface RealWhatsAppMessagesProps {
  chatId: string;
  accountId: number;
  chatName: string;
  isGroup: boolean;
}

export function RealWhatsAppMessages({ 
  chatId, 
  accountId, 
  chatName, 
  isGroup 
}: RealWhatsAppMessagesProps) {
  const [newMessage, setNewMessage] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar mensajes del chat
  const { 
    data: messages = [], 
    isLoading, 
    error,
    refetch: refetchMessages 
  } = useQuery({
    queryKey: ['real-whatsapp-messages', chatId, accountId],
    queryFn: async () => {
      console.log(`🔄 Cargando mensajes para chat ${chatId} de cuenta ${accountId}...`);
      
      // Intentar múltiples endpoints para obtener mensajes
      const endpoints = [
        `/api/direct/whatsapp/messages/${chatId}`,
        `/api/whatsapp-accounts/${accountId}/messages/${chatId}`,
        `/api/whatsapp-accounts/${accountId}/chats/${chatId}/messages`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Intentando endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
              console.log(`✅ Cargados ${data.length} mensajes desde ${endpoint}`);
              
              // Procesar y validar mensajes
              const processedMessages = data
                .filter(msg => msg && msg.id)
                .map(msg => ({
                  id: msg.id,
                  body: msg.body || '',
                  fromMe: Boolean(msg.fromMe),
                  timestamp: msg.timestamp || Date.now() / 1000,
                  hasMedia: Boolean(msg.hasMedia),
                  type: msg.type || 'chat',
                  author: msg.author || null,
                  quotedMsg: msg.quotedMsg || null
                }))
                .sort((a, b) => a.timestamp - b.timestamp);
              
              return processedMessages;
            } else if (response.status === 200) {
              console.log(`📭 Chat ${chatId} sin mensajes desde ${endpoint}`);
              return [];
            }
          }
        } catch (error) {
          console.warn(`Error en endpoint ${endpoint}:`, error);
          continue;
        }
      }
      
      // Si ningún endpoint funciona, retornar array vacío
      console.log('⚠️ No se pudieron cargar mensajes desde ningún endpoint');
      return [];
    },
    enabled: !!(chatId && accountId),
    refetchInterval: autoRefresh ? 3000 : false, // Refrescar cada 3 segundos si está habilitado
    retry: 2,
    retryDelay: 1000
  });

  // Mutation para enviar mensajes
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      console.log(`📤 Enviando mensaje a chat ${chatId}:`, message);
      
      const endpoints = [
        {
          url: `/api/whatsapp-accounts/${accountId}/send-message`,
          body: { chatId, message }
        },
        {
          url: `/api/direct/whatsapp/send-message`,
          body: { chatId, message, accountId }
        }
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(endpoint.body)
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Mensaje enviado exitosamente desde ${endpoint.url}`);
            return result;
          }
        } catch (error) {
          console.warn(`Error enviando desde ${endpoint.url}:`, error);
          continue;
        }
      }
      
      throw new Error('No se pudo enviar el mensaje');
    },
    onSuccess: () => {
      setNewMessage('');
      
      // Actualizar cache inmediatamente agregando el mensaje optimistamente
      const optimisticMessage: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        body: newMessage,
        fromMe: true,
        timestamp: Date.now() / 1000,
        hasMedia: false,
        type: 'chat'
      };
      
      queryClient.setQueryData(
        ['real-whatsapp-messages', chatId, accountId],
        (oldData: WhatsAppMessage[] = []) => [...oldData, optimisticMessage]
      );
      
      // Refrescar después de un breve delay
      setTimeout(() => {
        refetchMessages();
      }, 1000);
      
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje se ha enviado correctamente"
      });
    },
    onError: (error) => {
      console.error('Error enviando mensaje:', error);
      toast({
        title: "Error al enviar",
        description: "No se pudo enviar el mensaje. Verifica la conexión.",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Formatear timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Renderizar contenido del mensaje
  const renderMessageContent = (message: WhatsAppMessage) => {
    if (message.hasMedia) {
      const iconMap = {
        image: <FileImage className="h-4 w-4" />,
        video: <FileImage className="h-4 w-4" />,
        audio: <Mic className="h-4 w-4" />,
        document: <FileText className="h-4 w-4" />
      };
      
      return (
        <div className="flex items-center gap-2 text-sm">
          {iconMap[message.type as keyof typeof iconMap] || <FileText className="h-4 w-4" />}
          <span>{message.body || `${message.type} file`}</span>
          <Button variant="ghost" size="sm">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    return <p className="text-sm whitespace-pre-wrap">{message.body}</p>;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error al cargar mensajes</p>
          <Button variant="outline" onClick={() => refetchMessages()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header del chat */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {getInitials(chatName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{chatName}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">
                {isGroup ? 'Grupo' : 'Chat personal'}
              </p>
              {messages.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {messages.length} mensajes
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pausar' : 'Reanudar'} actualización
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMessages()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄'}
          </Button>
        </div>
      </div>

      {/* Área de mensajes */}
      <ScrollArea className="flex-1 p-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando mensajes...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay mensajes en este chat</p>
            <p className="text-sm mt-1">Inicia la conversación enviando un mensaje</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const showDate = index === 0 || 
                new Date(messages[index - 1].timestamp * 1000).toDateString() !== 
                new Date(message.timestamp * 1000).toDateString();
              
              return (
                <div key={message.id}>
                  {/* Separador de fecha */}
                  {showDate && (
                    <div className="text-center my-4">
                      <Badge variant="secondary" className="text-xs">
                        {new Date(message.timestamp * 1000).toLocaleDateString()}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Mensaje */}
                  <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex items-end gap-2 max-w-[70%]">
                      {!message.fromMe && isGroup && (
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(message.author || 'A')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`px-4 py-2 rounded-lg ${
                        message.fromMe 
                          ? 'bg-blue-500 text-white rounded-br-sm' 
                          : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                      }`}>
                        {/* Autor en grupos */}
                        {!message.fromMe && isGroup && message.author && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.author}
                          </p>
                        )}
                        
                        {/* Mensaje citado */}
                        {message.quotedMsg && (
                          <div className="bg-black/10 p-2 rounded mb-2 border-l-2 border-white/30">
                            <p className="text-xs opacity-70 truncate">
                              {message.quotedMsg.body}
                            </p>
                          </div>
                        )}
                        
                        {/* Contenido del mensaje */}
                        {renderMessageContent(message)}
                        
                        {/* Timestamp */}
                        <p className={`text-xs mt-1 ${
                          message.fromMe ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input para enviar mensajes */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="icon"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}