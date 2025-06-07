import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
// import { GeminiAssistant } from './GeminiAssistant';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Interfaz para los chats de WhatsApp
interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
  lastMessage?: string;
  profilePicUrl?: string;
  participants?: string[];
  numericId?: number; // ID numérico temporal para compatibilidad
}

// Interfaz para los mensajes de WhatsApp
interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  to: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  type: string;
  isStatus: boolean;
  isForwarded: boolean;
  isStarred: boolean;
  mediaUrl?: string;
  caption?: string;
  containsEmoji: boolean;
}

// Interfaz para leads del CRM
interface Lead {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  lastActive?: string;
  avatar?: string;
  status: string;
}

// Interfaz para mensajes del CRM
interface Message {
  id: number;
  leadId: number;
  content: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  channel: 'whatsapp' | 'telegram' | 'email' | 'sms';
  attachment?: string;
  aiGenerated?: boolean;
}

import {
  Search,
  Send,
  Paperclip,
  User,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Mic,
  Image,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Brain, // Reemplazamos BrainCircuit por Brain
  Zap
} from 'lucide-react';

interface WhatsAppInterfaceProps {
  selectedLeadId?: number;
  onSelectLead?: (leadId: number) => void;
}

export function WhatsAppInterface({ selectedLeadId, onSelectLead }: WhatsAppInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  // const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [selectedLeadData, setSelectedLeadData] = useState<Lead | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newMessagesReceived, setNewMessagesReceived] = useState<boolean>(false);
  const [lastMessageCount, setLastMessageCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenMessagesRef = useRef<{[chatId: string]: number}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consulta para obtener estado de WhatsApp
  const { data: whatsappStatus, isLoading: isLoadingWhatsappStatus } = useQuery({
    queryKey: ['whatsapp-status-direct'],
    queryFn: async () => {
      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/direct/whatsapp/status?t=${timestamp}`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Estado de WhatsApp recibido:', data);
        return data;
      } catch (error) {
        console.error('Error obteniendo estado de WhatsApp:', error);
        return {
          initialized: false,
          ready: false,
          authenticated: false,
          error: 'Error de conexión'
        };
      }
    },
    refetchInterval: 5000, // Refrescar cada 5 segundos
    refetchOnWindowFocus: true
  });
  
  // Consulta para obtener chats reales de WhatsApp
  const { data: whatsappChats = [], isLoading: isLoadingChats } = useQuery({
    queryKey: ['whatsapp-chats-direct'],
    queryFn: async () => {
      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/direct/whatsapp/chats?t=${timestamp}`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Chats de WhatsApp recibidos:', data);
        
        // Depuración: mostrar la estructura completa en la consola
        if (Array.isArray(data)) {
          console.log(`Número de chats cargados: ${data.length}`);
          
          // Asignar IDs numéricos a cada chat para compatibilidad con el sistema existente
          data.forEach((chat, index) => {
            chat.numericId = index + 1;
          });
        } else {
          console.log('Los datos recibidos no son un array:', typeof data);
        }
        
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error obteniendo chats de WhatsApp:', error);
        return [];
      }
    },
    enabled: whatsappStatus?.authenticated === true,
    refetchInterval: whatsappStatus?.authenticated ? 5000 : false,
    refetchOnWindowFocus: true,
    retry: 2
  });
  
  // Consulta para obtener mensajes de un chat específico de WhatsApp
  const { 
    data: whatsappMessages = [], 
    isLoading: isLoadingWhatsappMessages 
  } = useQuery({
    queryKey: ['whatsapp-messages-direct', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return [];
      
      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/direct/whatsapp/messages/${selectedChatId}?t=${timestamp}&limit=50`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Mensajes de WhatsApp para ${selectedChatId} recibidos:`, data);
        return data;
      } catch (error) {
        console.error(`Error obteniendo mensajes de WhatsApp para ${selectedChatId}:`, error);
        return [];
      }
    },
    enabled: !!selectedChatId && whatsappStatus?.authenticated === true,
    refetchInterval: selectedChatId && whatsappStatus?.authenticated ? 5000 : false
  });
  
  // Seleccionar automáticamente el primer chat cuando se cargan los chats
  useEffect(() => {
    if (Array.isArray(whatsappChats) && whatsappChats.length > 0 && !selectedChatId && whatsappStatus?.authenticated) {
      // Ordenar los chats por timestamp más reciente
      const sortedChats = [...whatsappChats].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      // Seleccionar el chat más reciente
      setSelectedChatId(sortedChats[0].id);
      if (onSelectLead && sortedChats[0].numericId) {
        onSelectLead(sortedChats[0].numericId);
      }
    }
  }, [whatsappChats, selectedChatId, whatsappStatus, onSelectLead]);
  
  // Consulta para obtener leads (contactos) del CRM - Modo fallback
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      return await apiRequest('/api/leads');
    }
  });

  // Filtrar leads según término de búsqueda
  const filteredLeads = leads.filter((lead: Lead) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.fullName?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.company?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(searchTerm)
    );
  });

  // Filtrar y ordenar chats según término de búsqueda y timestamp
  const filteredChats = Array.isArray(whatsappChats) 
    ? whatsappChats
        .filter((chat: WhatsAppChat) => {
          if (!chat) return false;
          
          if (!searchTerm) return true;
          
          const searchLower = searchTerm.toLowerCase();
          return (
            (chat.name && chat.name.toLowerCase().includes(searchLower)) ||
            (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchLower))
          );
        })
        .sort((a, b) => {
          // Ordenar por timestamp (más reciente primero)
          return (b.timestamp || 0) - (a.timestamp || 0);
        })
    : [];
  
  // Consulta para obtener mensajes del CRM (modo fallback)
  const { 
    data: crmMessages = [], 
    isLoading: isLoadingCrmMessages 
  } = useQuery({
    queryKey: ['/api/messages', { leadId: selectedLeadId }],
    queryFn: async () => {
      return await apiRequest(
        selectedLeadId ? `/api/messages?leadId=${selectedLeadId}` : '/api/messages/recent'
      );
    },
    enabled: activeTab === 'chats' && !whatsappStatus?.authenticated,
  });

  // Consulta para obtener detalles del lead seleccionado
  const { 
    data: leadDetails,
    isLoading: isLoadingLeadDetails 
  } = useQuery({
    queryKey: ['/api/leads', selectedLeadId],
    queryFn: async () => {
      return await apiRequest(`/api/leads/${selectedLeadId}`);
    },
    enabled: !!selectedLeadId && !whatsappStatus?.authenticated
  });
  
  // Usar useEffect para establecer selectedLeadData cuando cambie leadDetails
  React.useEffect(() => {
    if (leadDetails) {
      setSelectedLeadData(leadDetails);
    }
  }, [leadDetails]);

  // Mutación para enviar un mensaje
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string }) => {
      // Si WhatsApp está autenticado y hay un chat seleccionado, enviar por WhatsApp directo
      if (whatsappStatus?.authenticated && selectedChatId) {
        const timestamp = Date.now();
        const response = await fetch(`/api/direct/whatsapp/send-message?t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            to: selectedChatId,
            message: messageData.content
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return response.json();
      } else {
        // Modo fallback para CRM tradicional
        return await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            leadId: selectedLeadId,
            content: messageData.content,
            direction: 'outgoing',
            channel: 'whatsapp'
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
          }
          return response.json();
        });
      }
    },
    onSuccess: () => {
      setMessageText('');
      toast({
        title: "Mensaje enviado",
        description: "El mensaje ha sido enviado correctamente."
      });
      
      if (whatsappStatus?.authenticated && selectedChatId) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-direct', selectedChatId] });
      } else if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', { leadId: selectedLeadId }] });
      }
    }
  });

  // Reiniciar WhatsApp
  const restartWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/integrations/whatsapp/restart', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "WhatsApp reiniciado",
        description: "Se ha reiniciado la conexión con WhatsApp. Por favor, escanee el nuevo código QR."
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status-direct'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/whatsapp/status'] });
    }
  });

  // Manejar envío de mensaje
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    sendMessageMutation.mutate({
      content: messageText
    });
  };

  // Manejar click en chat de WhatsApp
  const handleChatSelect = (chat: WhatsAppChat) => {
    setSelectedChatId(chat.id);
    // Resetear el contador de mensajes cuando se cambia de chat
    setLastMessageCount(0);
    // Marcar el chat como visto
    if (Array.isArray(whatsappMessages) && whatsappMessages.length > 0) {
      const chatLastMessageTimestamp = Math.max(...whatsappMessages.map(msg => msg.timestamp || 0));
      lastSeenMessagesRef.current[chat.id] = chatLastMessageTimestamp;
    }
    
    if (onSelectLead && chat.numericId) {
      onSelectLead(chat.numericId);
    }
  };
  
  // Manejar click en lead (modo tradicional)
  const handleLeadSelect = (leadId: number) => {
    if (onSelectLead) {
      onSelectLead(leadId);
    }
  };

  // Obtener iniciales para avatar
  const getInitials = (name: string | undefined) => {
    if (!name) return 'UN'; // Unknown/Usuario No identificado
    
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Renderizar el estado del mensaje
  const renderMessageStatus = (status: string, timestamp: string) => {
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    switch (status) {
      case 'sent':
        return (
          <div className="flex items-center text-xs text-gray-400 gap-1">
            <Check size={14} />
            <span>{time}</span>
          </div>
        );
      case 'delivered':
        return (
          <div className="flex items-center text-xs text-gray-400 gap-1">
            <CheckCheck size={14} />
            <span>{time}</span>
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center text-xs text-green-500 gap-1">
            <CheckCheck size={14} />
            <span>{time}</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center text-xs text-red-500 gap-1">
            <AlertCircle size={14} />
            <span>{time}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-xs text-gray-400 gap-1">
            <Clock size={14} />
            <span>{time}</span>
          </div>
        );
    }
  };

  // Detectar nuevos mensajes y actualizar el estado
  useEffect(() => {
    if (Array.isArray(whatsappMessages) && whatsappMessages.length > 0) {
      // Si tenemos un chat seleccionado y hay mensajes
      if (selectedChatId) {
        // Comprobar si hay nuevos mensajes
        if (whatsappMessages.length > lastMessageCount) {
          // Hay nuevos mensajes
          setNewMessagesReceived(true);
          setLastMessageCount(whatsappMessages.length);
          
          // Actualizar el timestamp del último mensaje visto para este chat
          const chatLastMessageTimestamp = Math.max(...whatsappMessages.map(msg => msg.timestamp || 0));
          lastSeenMessagesRef.current[selectedChatId] = chatLastMessageTimestamp;
          
          // Actualizar el orden de los chats
          queryClient.invalidateQueries({ queryKey: ['whatsapp-chats-direct'] });
        }
      }
    }
  }, [whatsappMessages, selectedChatId, lastMessageCount, queryClient]);

  // Hacer scroll a la última mensaje cuando se cargan o envían mensajes
  useEffect(() => {
    if (messagesEndRef.current && newMessagesReceived) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setNewMessagesReceived(false);
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [whatsappMessages, crmMessages, newMessagesReceived]);
  
  // Formatear timestamp de mensaje
  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Renderizar el panel de mensajes
  const renderMessageArea = () => {
    // Si hay un estado de carga de WhatsApp
    if (isLoadingWhatsappStatus) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner className="mb-4 mx-auto" />
            <div className="text-gray-500">Cargando estado de WhatsApp...</div>
          </div>
        </div>
      );
    }
    
    // Si no hay estado de WhatsApp o no está inicializado
    if (!whatsappStatus || !whatsappStatus.initialized) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Error de conexión</div>
            <div className="text-gray-500 mb-4">No se pudo establecer conexión con WhatsApp.</div>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-status-direct'] })}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Reintentar
            </Button>
          </div>
        </div>
      );
    }
    
    // Si WhatsApp no está autenticado pero tiene código QR
    if (!whatsappStatus.authenticated && whatsappStatus.qrDataUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center mb-6">
            <div className="text-xl font-bold mb-2">Conectar WhatsApp</div>
            <div className="text-gray-500 mb-4">
              Escanea este código QR con tu WhatsApp para iniciar sesión.
              <br />
              <span className="text-sm">(Abre WhatsApp en tu teléfono ➝ Configuración ➝ Dispositivos vinculados ➝ Vincular dispositivo)</span>
            </div>
          </div>
          <div className="mb-6 border p-3 rounded-lg bg-white">
            <img src={whatsappStatus.qrDataUrl} alt="WhatsApp QR Code" width={200} height={200} />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-status-direct'] })}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Generar nuevo QR
          </Button>
        </div>
      );
    }
    
    // Si WhatsApp está autenticado y hay un chat seleccionado
    if (whatsappStatus.authenticated && selectedChatId) {
      // Información del chat actual
      const currentChat = whatsappChats.find((chat: WhatsAppChat) => chat.id === selectedChatId);
      
      return (
        <div className="flex flex-col h-full">
          {/* Cabecera del chat */}
          <div className="border-b p-2 flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {currentChat?.profilePicUrl ? (
                <AvatarImage src={currentChat.profilePicUrl} alt={currentChat.name} />
              ) : null}
              <AvatarFallback className="bg-green-500 text-white text-xs">
                {getInitials(currentChat?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{currentChat?.name || 'Chat'}</div>
              <div className="text-xs text-gray-500 truncate">
                {currentChat?.isGroup ? 'Grupo' : 'Contacto'}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Phone size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Video size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </div>
          </div>
          
          {/* Área de mensajes con scroll independiente */}
          <ScrollArea className="flex-1 pb-4">
            {isLoadingWhatsappMessages ? (
              <div className="flex justify-center p-8">
                <div className="text-center">
                  <Spinner className="mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Cargando mensajes...</p>
                </div>
              </div>
            ) : whatsappMessages.length > 0 ? (
              <div className="space-y-2 px-3 py-4">
                {whatsappMessages.map((msg: WhatsAppMessage, index: number) => {
                  // Verificar si debe mostrar separador de fecha
                  const showDateSeparator = index === 0 || 
                    new Date(msg.timestamp * 1000).toDateString() !== 
                    new Date(whatsappMessages[index - 1].timestamp * 1000).toDateString();
                  
                  // Verificar si es una secuencia de mensajes del mismo remitente
                  const isSequential = index > 0 && 
                    msg.fromMe === whatsappMessages[index - 1].fromMe;
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSeparator && (
                        <div className="flex justify-center my-4">
                          <div className="bg-gray-100 text-gray-500 text-xs rounded-full px-3 py-1 font-medium">
                            {format(new Date(msg.timestamp * 1000), 'EEEE, d MMMM', { 
                              locale: es
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div 
                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} ${isSequential ? 'mt-1' : 'mt-3'}`}
                      >
                        {!msg.fromMe && !isSequential && (
                          <Avatar className="h-8 w-8 mr-2 mt-2 flex-shrink-0 border shadow-sm">
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs">
                              {currentChat?.name ? getInitials(currentChat.name) : 'UN'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        {!msg.fromMe && isSequential && <div className="w-10 flex-shrink-0"></div>}
                        
                        <div 
                          className={`max-w-[75%] rounded-lg p-3 ${
                            msg.fromMe 
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' 
                              : 'bg-white border shadow-sm'
                          } ${isSequential && msg.fromMe ? 'rounded-tr-sm' : ''} ${isSequential && !msg.fromMe ? 'rounded-tl-sm' : ''}`}
                        >
                          {msg.hasMedia && (
                            <div className="mb-2">
                              {msg.mediaUrl ? (
                                <img 
                                  src={msg.mediaUrl} 
                                  alt={msg.caption || 'Imagen'} 
                                  className="rounded mb-1 w-full object-cover"
                                />
                              ) : (
                                <div className="bg-gray-100 rounded flex items-center justify-center h-32 w-full">
                                  <Image size={30} className="text-gray-400" />
                                </div>
                              )}
                              {msg.caption && <div className="text-xs mt-1">{msg.caption}</div>}
                            </div>
                          )}
                          
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {msg.body}
                          </div>
                          
                          <div className="text-right mt-1 flex justify-end items-center gap-1">
                            <span className={`text-[10px] ${msg.fromMe ? 'text-green-100' : 'text-gray-500'}`}>
                              {new Date(msg.timestamp * 1000).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                              })}
                            </span>
                            
                            {msg.fromMe && (
                              <CheckCheck size={14} className="text-green-100" />
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="p-4 rounded-full bg-gray-50 mb-4">
                  <MessageSquare size={35} className="text-gray-300" />
                </div>
                <p className="text-base font-medium text-gray-600 mb-1">No hay mensajes</p>
                <p className="text-sm text-gray-500 text-center">
                  Envía tu primer mensaje para iniciar la conversación
                </p>
              </div>
            )}
          </ScrollArea>
          
          {/* Área de escritura de mensajes */}
          <div className="border-t p-2">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="flex-1 rounded-lg bg-background border">
                
                <div className="flex items-end p-2 gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <Smile size={18} />
                  </Button>
                  
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="border-0 flex-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <Paperclip size={18} />
                  </Button>
                  
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <Mic size={18} />
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                size="icon" 
                className="h-9 w-9 rounded-full flex-shrink-0" 
                disabled={!messageText.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </form>
          </div>
        </div>
      );
    }
    
    // Si WhatsApp está autenticado pero no hay chat seleccionado
    if (whatsappStatus.authenticated && !selectedChatId) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <MessageSquare size={64} strokeWidth={1} className="mx-auto" />
            </div>
            <div className="text-xl font-bold mb-2">Mensajería de WhatsApp</div>
            <div className="text-gray-500">
              Selecciona un chat para comenzar a enviar mensajes.
            </div>
          </div>
        </div>
      );
    }
    
    // Fallback genérico
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-500">
            Algo salió mal. Por favor, actualiza la página.
          </div>
        </div>
      </div>
    );
  };

  // Renderizar el componente principal
  return (
    <Card className="h-[calc(100vh-8.5rem)] flex flex-col shadow-md">
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-green-500 text-white text-xs">
                WA
              </AvatarFallback>
            </Avatar>
            <span>WhatsApp</span>
          </div>
          
          <div className="flex items-center gap-1">
            {isLoadingWhatsappStatus ? (
              <Badge variant="outline" className="flex items-center gap-1 h-6">
                <Spinner className="h-3 w-3" />
                <span>Cargando...</span>
              </Badge>
            ) : whatsappStatus?.authenticated ? (
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 h-6">Conectado</Badge>
            ) : (
              <Badge variant="outline" className="h-6">Desconectado</Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => restartWhatsAppMutation.mutate()}
              disabled={restartWhatsAppMutation.isPending}
            >
              {restartWhatsAppMutation.isPending ? <Spinner className="h-3 w-3" /> : <RefreshCw size={14} />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {/* Contenedor principal dividido en 2 columnas */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMNA IZQUIERDA - Lista de chats */}
        <div className="w-1/3 border-r flex flex-col overflow-hidden">
          <div className="p-3">
            <div className="rounded-lg border mb-3">
              <div className="flex items-center p-2">
                <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar chats..."
                  className="border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full mb-3">
                <TabsTrigger value="chats" className="flex-1">Chats</TabsTrigger>
                <TabsTrigger value="contacts" className="flex-1">Contactos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Lista de chats */}
          {activeTab === 'chats' && (
            <ScrollArea className="flex-1">
              {isLoadingChats ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : !whatsappStatus?.authenticated ? (
                <div className="flex flex-col items-center justify-center p-4 h-full">
                  <div className="text-sm text-gray-500 text-center mb-3">
                    Escanea el código QR para ver tus chats de WhatsApp
                  </div>
                </div>
              ) : Array.isArray(whatsappChats) && whatsappChats.length > 0 ? (
                <div className="divide-y">
                  {whatsappChats.map((chat: WhatsAppChat) => (
                    <div
                      key={chat.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer ${
                        selectedChatId === chat.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      }`}
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 flex-shrink-0 border shadow-sm">
                          {chat.profilePicUrl ? (
                            <AvatarImage src={chat.profilePicUrl} alt={chat.name} />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                            {getInitials(chat.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="font-medium truncate">{chat.name}</div>
                          
                          {chat.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center ml-1 bg-green-500 text-white text-[11px] w-5 h-5 rounded-full">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <div className="mb-2">No hay chats disponibles</div>
                  <div className="text-xs">
                    Se ha establecido conexión con WhatsApp, pero no se encontraron chats.
                    Por favor, asegúrate de tener conversaciones activas en tu WhatsApp.
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
          
          {/* Lista de contactos */}
          {activeTab === 'contacts' && (
            <ScrollArea className="flex-1">
              {isLoadingLeads ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                <div className="divide-y">
                  {filteredLeads.map((lead: Lead) => (
                    <div
                      key={lead.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer ${
                        selectedLeadId === lead.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      }`}
                      onClick={() => handleLeadSelect(lead.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 flex-shrink-0 border shadow-sm">
                          {lead.avatar ? (
                            <AvatarImage src={lead.avatar} alt={lead.fullName} />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            {getInitials(lead.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="font-medium truncate">{lead.fullName}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No hay contactos disponibles
                </div>
              )}
            </ScrollArea>
          )}
        </div>
        
        {/* COLUMNA DERECHA - Área de mensajes */}
        <div className="w-2/3 flex flex-col overflow-hidden">
          {renderMessageArea()}
        </div>
      </div>
    </Card>
  );
}