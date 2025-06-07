import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Filter, 
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Info,
  UserPlus,
  Ticket,
  MessageCircle,
  Bot,
  BarChart3,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Zap,
  Target
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  type: 'individual' | 'group';
  phoneNumber?: string;
  isArchived?: boolean;
}

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  status: 'sent' | 'delivered' | 'read';
}

interface ChatAssignment {
  id: number;
  chatId: string;
  assignedToId: number;
  assignedTo?: {
    id: number;
    fullName: string;
    avatar?: string;
  };
  status: string;
  priority: string;
  category: string;
  notes?: string;
}

interface ChatComment {
  id: number;
  chatId: string;
  content: string;
  user: {
    id: number;
    fullName: string;
    avatar?: string;
  };
  createdAt: string;
  isPrivate: boolean;
}

interface ModernTicket {
  id: number;
  chatId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo?: {
    id: number;
    fullName: string;
  };
  createdAt: string;
  dueDate?: string;
}

interface ConversationAnalytics {
  messageCount: number;
  responseTime: number;
  sentiment: string;
  sentimentScore: number;
  intent: string;
  salesStage: string;
  conversionProbability: number;
}

export function ModernMessagingSystem() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [showAutoResponseConfig, setShowAutoResponseConfig] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'support',
    dueDate: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // WebSocket for real-time messaging
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // WhatsApp Account Management
  const [selectedWhatsAppAccount, setSelectedWhatsAppAccount] = useState<number | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  const { data: whatsappAccounts = [] } = useQuery({
    queryKey: ['/api/whatsapp-accounts'],
    enabled: true
  });

  // Queries
  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['/api/modern-messaging/chats', selectedWhatsAppAccount],
    queryFn: () => selectedWhatsAppAccount ? 
      fetch(`/api/modern-messaging/chats?accountId=${selectedWhatsAppAccount}`).then(res => res.json()) : 
      Promise.resolve([]),
    enabled: !!selectedWhatsAppAccount
  });

  const { data: messagesResponse, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/modern-messaging/messages', selectedChat?.id, selectedWhatsAppAccount],
    queryFn: () => selectedChat?.id && selectedWhatsAppAccount ? 
      fetch(`/api/modern-messaging/messages/${selectedChat.id}?accountId=${selectedWhatsAppAccount}`).then(res => res.json()) : 
      Promise.resolve({ success: true, messages: [] }),
    enabled: !!selectedChat?.id && !!selectedWhatsAppAccount
  });

  // Extract real messages from API response
  const messages = messagesResponse?.messages || [];

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: true
  });

  const { data: assignment } = useQuery({
    queryKey: ['/api/modern-messaging/assignment', selectedChat?.id],
    enabled: !!selectedChat?.id
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['/api/modern-messaging/comments', selectedChat?.id],
    enabled: !!selectedChat?.id
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['/api/modern-messaging/tickets', selectedChat?.id],
    enabled: !!selectedChat?.id
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/modern-messaging/analytics', selectedChat?.id],
    enabled: !!selectedChat?.id
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: true
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (data: { chatId: string; content: string; accountId: number }) =>
      apiRequest('/api/modern-messaging/send-message', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/messages'] });
      setMessageInput('');
    }
  });

  const assignChatMutation = useMutation({
    mutationFn: (data: { chatId: string; assignedToId: number; category: string; priority: string }) =>
      apiRequest('/api/modern-messaging/assign', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/assignment'] });
      setShowAssignmentDialog(false);
      toast({ title: 'Chat asignado exitosamente' });
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: (data: { chatId: string; content: string; isPrivate: boolean }) =>
      apiRequest('/api/modern-messaging/comments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/comments'] });
      setNewComment('');
      toast({ title: 'Comentario agregado' });
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/modern-messaging/tickets', {
        method: 'POST',
        body: JSON.stringify({ ...data, chatId: selectedChat?.id })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/tickets'] });
      setShowTicketDialog(false);
      setNewTicket({ title: '', description: '', priority: 'medium', category: 'support', dueDate: '' });
      toast({ title: 'Ticket creado exitosamente' });
    }
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => apiRequest('/api/modern-messaging/auto-assign', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/chats'] });
      toast({ title: 'Auto-asignación completada' });
    }
  });

  const analyzeConversationsMutation = useMutation({
    mutationFn: () => apiRequest('/api/modern-messaging/analyze-conversations', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/analytics'] });
      toast({ title: 'Análisis de conversaciones completado' });
    }
  });

  // WebSocket connection for real-time messaging
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/modern-messaging-ws`;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('🔗 Conectado al WebSocket de mensajería moderna');
          setWsConnected(true);
          
          // Subscribe to chat updates if we have a selected chat
          if (selectedChat && selectedWhatsAppAccount) {
            ws.send(JSON.stringify({
              type: 'subscribe',
              accountId: selectedWhatsAppAccount,
              chatId: selectedChat.id
            }));
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'welcome':
                console.log('🎉 Conectado al sistema de mensajería:', data.message);
                break;
                
              case 'message_sent':
                // Message was sent successfully
                console.log('✅ Mensaje enviado exitosamente:', data.message);
                queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/messages'] });
                queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/chats'] });
                break;
                
              case 'new_message':
                // New message received
                queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/messages'] });
                queryClient.invalidateQueries({ queryKey: ['/api/modern-messaging/chats'] });
                
                // Show notification for incoming messages
                if (data.message && !data.message.fromMe) {
                  toast({
                    title: 'Nuevo mensaje',
                    description: `De: ${selectedChat?.name || 'Usuario'}`
                  });
                }
                break;
                
              case 'subscribed':
                console.log(`✅ Suscrito a chat ${data.chatId} de cuenta ${data.accountId}`);
                break;
                
              case 'error':
                console.error('❌ Error WebSocket:', data.message);
                toast({
                  title: 'Error',
                  description: data.message,
                  variant: 'destructive'
                });
                break;
                
              default:
                console.log('Mensaje WebSocket no reconocido:', data);
            }
          } catch (error) {
            console.error('Error procesando mensaje WebSocket:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 WebSocket desconectado');
          setWsConnected(false);
          
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ Error WebSocket:', error);
          setWsConnected(false);
        };
        
      } catch (error) {
        console.error('Error iniciando WebSocket:', error);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // Subscribe to chat when selection changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedChat && selectedWhatsAppAccount) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        accountId: selectedWhatsAppAccount,
        chatId: selectedChat.id
      }));
    }
  }, [selectedChat, selectedWhatsAppAccount]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!selectedChat || !messageInput.trim() || !selectedWhatsAppAccount) return;
    
    // Send via WebSocket for real-time delivery
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        chatId: selectedChat.id,
        content: messageInput.trim(),
        accountId: selectedWhatsAppAccount
      }));
      setMessageInput('');
    } else {
      // Fallback to API if WebSocket is not available
      sendMessageMutation.mutate({
        chatId: selectedChat.id,
        content: messageInput.trim(),
        accountId: selectedWhatsAppAccount
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter only real WhatsApp chats (exclude any demo data)
  const realChats = Array.isArray(chats) ? chats.filter((chat: Chat) => 
    chat.id && chat.id.includes('@c.us') // Only show real WhatsApp chat IDs
  ) : [];

  const filteredChats = realChats.filter((chat: Chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.phoneNumber?.includes(searchTerm)
  );

  const unreadNotifications = Array.isArray(notifications) ? notifications.filter((n: any) => !n.read).length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Banner */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Mensajería CRM</h1>
          <Badge variant="outline" className="text-green-600 border-green-600">
            {filteredChats.length} Chats Activos
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* WhatsApp Account Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Cuenta WhatsApp:</span>
            <Select 
              value={selectedWhatsAppAccount?.toString() || ""} 
              onValueChange={(value) => setSelectedWhatsAppAccount(parseInt(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(whatsappAccounts) ? whatsappAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${account.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{account.name || `Cuenta ${account.id}`}</span>
                    </div>
                  </SelectItem>
                )) : []}
              </SelectContent>
            </Select>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={autoAssignMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Asignar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Asignar automáticamente chats sin asignar</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeConversationsMutation.mutate()}
                  disabled={analyzeConversationsMutation.isPending}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analizar conversaciones con IA</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAutoResponseConfig(true)}
          >
            <Bot className="h-4 w-4 mr-2" />
            IA Config
          </Button>

          <div className="relative">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
          </div>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat List - 30% width */}
        <div className="w-[30%] bg-white border-r border-gray-200 flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {chatsLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3 p-3 rounded-lg">
                        <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <AnimatePresence>
                  {filteredChats.map((chat: Chat) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                        selectedChat?.id === chat.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={chat.avatar} />
                            <AvatarFallback>
                              {chat.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(chat.status)}`}></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                            <span className="text-xs text-gray-500">{chat.timestamp}</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate mt-1">{chat.lastMessage}</p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-1">
                              {chat.type === 'group' && (
                                <Users className="h-3 w-3 text-gray-400" />
                              )}
                              <span className="text-xs text-gray-500">{chat.phoneNumber}</span>
                            </div>
                            
                            {chat.unreadCount > 0 && (
                              <Badge className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Area - 70% width */}
        <div className="w-[70%] flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedChat.avatar} />
                      <AvatarFallback>
                        {selectedChat.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(selectedChat.status)}`}></div>
                  </div>
                  
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedChat.name}</h2>
                    <p className="text-sm text-gray-500">{selectedChat.phoneNumber}</p>
                  </div>

                  {assignment && (
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(assignment.priority)}>
                        {assignment.priority}
                      </Badge>
                      <Badge variant="outline">
                        Asignado a: {assignment.assignedTo?.fullName}
                      </Badge>
                    </div>
                  )}

                  {analytics && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getSentimentColor(analytics.sentiment)}>
                        <Star className="h-3 w-3 mr-1" />
                        {analytics.sentiment}
                      </Badge>
                      <Badge variant="outline">
                        {analytics.salesStage}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setShowAssignmentDialog(true)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Asignar chat</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setShowTicketDialog(true)}>
                          <Ticket className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Crear ticket</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowCommentsDialog(true)}
                          className="relative"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {comments.length > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs">
                              {comments.length}
                            </Badge>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver comentarios</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs p-3 rounded-lg ${i % 2 === 0 ? 'bg-blue-200' : 'bg-gray-200'}`}>
                              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    Array.isArray(messages) ? messages.map((message: Message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex mx-1 mb-1 ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                        style={{ marginLeft: '8px', marginRight: '8px' }}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.fromMe 
                            ? 'bg-blue-500 text-white rounded-br-md' 
                            : 'bg-green-500 text-white rounded-bl-md'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs ${
                              message.fromMe ? 'text-blue-100' : 'text-green-100'
                            }`}>
                              {message.timestamp}
                            </span>
                            {message.fromMe && (
                              <div className="flex items-center space-x-1">
                                {message.status === 'read' && (
                                  <CheckCircle className="h-3 w-3 text-blue-200" />
                                )}
                                {message.status === 'delivered' && (
                                  <CheckCircle className="h-3 w-3 text-blue-300" />
                                )}
                                {message.status === 'sent' && (
                                  <Clock className="h-3 w-3 text-blue-300" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )) : [])
                  }
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1">
                    <Textarea
                      placeholder="Escribe un mensaje..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[40px] max-h-32 resize-none"
                      rows={1}
                    />
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <Smile className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Selecciona un chat para comenzar
                </h3>
                <p className="text-gray-500">
                  Elige una conversación de la lista para ver los mensajes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignee">Asignar a</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar agente" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="support">Soporte</SelectItem>
                  <SelectItem value="technical">Técnico</SelectItem>
                  <SelectItem value="consultation">Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => assignChatMutation.mutate({
                chatId: selectedChat?.id || '',
                assignedToId: 1,
                category: 'support',
                priority: 'medium'
              })}>
                Asignar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comentarios del Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {Array.isArray(comments) ? comments.map((comment: ChatComment) => (
                  <div key={comment.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback>
                        {comment.user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{comment.user.fullName}</span>
                        <span className="text-xs text-gray-500">{comment.createdAt}</span>
                        {comment.isPrivate && (
                          <Badge variant="secondary" className="text-xs">Privado</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                )) : []}
              </div>
            </ScrollArea>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Agregar comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="private" />
                  <Label htmlFor="private" className="text-sm">Comentario privado</Label>
                </div>
                <Button
                  onClick={() => createCommentMutation.mutate({
                    chatId: selectedChat?.id || '',
                    content: newComment,
                    isPrivate: true
                  })}
                  disabled={!newComment.trim()}
                >
                  Agregar Comentario
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Título del ticket"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del ticket"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridad</Label>
                <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Ventas</SelectItem>
                    <SelectItem value="support">Soporte</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="billing">Facturación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="dueDate">Fecha límite</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTicket.dueDate}
                onChange={(e) => setNewTicket({ ...newTicket, dueDate: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createTicketMutation.mutate(newTicket)}
                disabled={!newTicket.title.trim()}
              >
                Crear Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}