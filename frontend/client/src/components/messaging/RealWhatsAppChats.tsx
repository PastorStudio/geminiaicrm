import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Loader2, MessageCircle, Users, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppAccount {
  id: number;
  name: string;
  description: string;
  status: string;
  phone?: string;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
  lastMessage: string;
  accountId: number;
}

interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  type: string;
  author?: string;
}

interface RealWhatsAppChatsProps {
  onChatSelect?: (chatId: string, accountId: number) => void;
}

export function RealWhatsAppChats({ onChatSelect }: RealWhatsAppChatsProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar todas las cuentas de WhatsApp
  const { data: accountsResponse, isLoading: loadingAccounts } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: async () => {
      const response = await fetch('/api/whatsapp-accounts');
      if (!response.ok) throw new Error('Error al cargar cuentas');
      return response.json();
    },
    refetchInterval: 5000 // Refrescar cada 5 segundos
  });

  const accounts = accountsResponse?.accounts || [];

  // Cargar estado de conexión para cada cuenta
  const { data: connectionStatuses = {} } = useQuery({
    queryKey: ['whatsapp-connection-statuses'],
    queryFn: async () => {
      const statuses: Record<number, any> = {};
      
      for (const account of accounts) {
        try {
          const response = await fetch(`/api/whatsapp-accounts/${account.id}/status`);
          if (response.ok) {
            const status = await response.json();
            statuses[account.id] = status;
          }
        } catch (error) {
          console.warn(`Error obteniendo estado de cuenta ${account.id}:`, error);
          statuses[account.id] = { authenticated: false, status: 'disconnected' };
        }
      }
      
      return statuses;
    },
    enabled: accounts.length > 0,
    refetchInterval: 10000 // Refrescar cada 10 segundos
  });

  // Cargar chats para la cuenta seleccionada
  const { data: chats = [], isLoading: loadingChats, refetch: refetchChats } = useQuery({
    queryKey: ['whatsapp-chats', selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      
      console.log(`Cargando chats para cuenta ${selectedAccountId}...`);
      
      // Intentar obtener chats desde la API directa
      try {
        const response = await fetch('/api/direct/whatsapp/chats');
        if (response.ok) {
          const chats = await response.json();
          if (Array.isArray(chats) && chats.length > 0) {
            const processedChats = chats.map(chat => ({
              ...chat,
              accountId: selectedAccountId
            }));
            console.log(`✅ Cargados ${processedChats.length} chats reales para cuenta ${selectedAccountId}`);
            return processedChats;
          }
        }
      } catch (error) {
        console.warn('Error con API directa, intentando API específica de cuenta:', error);
      }
      
      // Fallback a la API específica de cuenta
      try {
        const response = await fetch(`/api/whatsapp-accounts/${selectedAccountId}/chats`);
        if (response.ok) {
          const chats = await response.json();
          if (Array.isArray(chats)) {
            console.log(`✅ Cargados ${chats.length} chats desde API específica`);
            return chats;
          }
        }
      } catch (error) {
        console.warn('Error con API específica de cuenta:', error);
      }
      
      console.log('⚠️ No se pudieron cargar chats');
      return [];
    },
    enabled: !!selectedAccountId,
    refetchInterval: 15000 // Refrescar cada 15 segundos
  });

  // Cargar mensajes para el chat seleccionado
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['whatsapp-messages', selectedChatId, selectedAccountId],
    queryFn: async () => {
      if (!selectedChatId || !selectedAccountId) return [];
      
      console.log(`Cargando mensajes para chat ${selectedChatId}...`);
      
      // Intentar API directa primero
      try {
        const response = await fetch(`/api/direct/whatsapp/messages/${selectedChatId}`);
        if (response.ok) {
          const messages = await response.json();
          if (Array.isArray(messages) && messages.length > 0) {
            console.log(`✅ Cargados ${messages.length} mensajes reales`);
            return messages;
          }
        }
      } catch (error) {
        console.warn('Error con API directa de mensajes:', error);
      }
      
      // Fallback a API específica
      try {
        const response = await fetch(`/api/whatsapp-accounts/${selectedAccountId}/messages/${selectedChatId}`);
        if (response.ok) {
          const messages = await response.json();
          if (Array.isArray(messages)) {
            console.log(`✅ Cargados ${messages.length} mensajes desde API específica`);
            return messages;
          }
        }
      } catch (error) {
        console.warn('Error con API específica de mensajes:', error);
      }
      
      return [];
    },
    enabled: !!(selectedChatId && selectedAccountId),
    refetchInterval: 5000 // Refrescar cada 5 segundos
  });

  // Mutation para enviar mensajes
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message, accountId }: { chatId: string; message: string; accountId: number }) => {
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message })
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      refetchMessages();
      refetchChats();
      toast({
        title: "Mensaje enviado",
        description: "El mensaje se ha enviado correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  });

  // Seleccionar cuenta automáticamente si solo hay una conectada
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0 && connectionStatuses) {
      const connectedAccounts = accounts.filter(account => 
        connectionStatuses[account.id]?.authenticated
      );
      
      if (connectedAccounts.length === 1) {
        setSelectedAccountId(connectedAccounts[0].id);
      }
    }
  }, [accounts, connectionStatuses, selectedAccountId]);

  // Filtrar chats por búsqueda
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Obtener información de la cuenta seleccionada
  const selectedAccount = accounts.find(account => account.id === selectedAccountId);
  const connectionStatus = connectionStatuses[selectedAccountId || 0];

  const handleChatSelect = (chat: WhatsAppChat) => {
    setSelectedChatId(chat.id);
    if (onChatSelect) {
      onChatSelect(chat.id, chat.accountId);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatId || !selectedAccountId) return;
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      message: newMessage.trim(),
      accountId: selectedAccountId
    });
  };

  return (
    <div className="h-full flex">
      {/* Panel izquierdo: Cuentas y Chats */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Selector de cuentas */}
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Cuentas WhatsApp
          </h2>
          
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map(account => {
                const status = connectionStatuses[account.id];
                const isConnected = status?.authenticated;
                const isSelected = selectedAccountId === account.id;
                
                return (
                  <Card 
                    key={account.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.description}</div>
                        </div>
                        <Badge variant={isConnected ? "default" : "secondary"}>
                          {isConnected ? "Conectado" : "Desconectado"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de chats */}
        {selectedAccountId && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">
                  Chats - {selectedAccount?.name}
                </span>
                {connectionStatus?.authenticated && (
                  <Badge variant="outline" className="text-green-600">
                    ● En línea
                  </Badge>
                )}
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loadingChats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando chats...</span>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {connectionStatus?.authenticated ? 
                    "No hay chats disponibles" : 
                    "Cuenta no conectada"
                  }
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredChats.map(chat => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedChatId === chat.id 
                          ? 'bg-blue-100 border border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {chat.isGroup ? (
                              <Users className="h-5 w-5" />
                            ) : (
                              chat.name.charAt(0).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{chat.name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(chat.timestamp * 1000).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {chat.lastMessage || 'Sin mensajes'}
                          </p>
                          
                          {chat.unreadCount > 0 && (
                            <Badge variant="default" className="mt-1 text-xs">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Panel derecho: Mensajes */}
      <div className="flex-1 flex flex-col">
        {selectedChatId && selectedAccountId ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {filteredChats.find(c => c.id === selectedChatId)?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {filteredChats.find(c => c.id === selectedChatId)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {filteredChats.find(c => c.id === selectedChatId)?.isGroup ? 'Grupo' : 'Chat personal'}
                  </p>
                </div>
              </div>
            </div>

            {/* Área de mensajes */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando mensajes...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay mensajes en este chat
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.fromMe 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.body}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp * 1000).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input para nuevos mensajes */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona un chat para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}