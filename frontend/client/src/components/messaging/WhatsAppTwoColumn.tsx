import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { WhatsAppConnectionStatus } from './WhatsAppConnectionStatus';

// Función de detección automática de idioma
const detectLanguageFromMessage = (text: string) => {
  const lowerText = text.toLowerCase();
  
  // Patrones básicos para detectar idiomas comunes
  const patterns = {
    en: /\b(hello|hi|how are you|thank you|thanks|please|good|yes|no|the|and|is|are|was|were)\b/g,
    fr: /\b(bonjour|salut|merci|s'il vous plaît|oui|non|le|la|les|et|est|sont|était|étaient|comment allez-vous)\b/g,
    de: /\b(hallo|danke|bitte|ja|nein|der|die|das|und|ist|sind|war|waren|wie geht es ihnen)\b/g,
    it: /\b(ciao|grazie|prego|sì|no|il|la|i|le|e|è|sono|era|erano|come stai)\b/g,
    pt: /\b(olá|obrigado|obrigada|por favor|sim|não|o|a|os|as|e|é|são|era|eram|como está)\b/g,
    zh: /[\u4e00-\u9fff]/g,
    ja: /[\u3040-\u309f\u30a0-\u30ff]/g,
    ar: /[\u0600-\u06ff]/g,
    ru: /[\u0400-\u04ff]/g
  };
  
  let maxMatches = 0;
  let detectedLang = 'es'; // Por defecto español
  
  Object.entries(patterns).forEach(([lang, pattern]) => {
    const matches = (text.match(pattern) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedLang = lang;
    }
  });
  
  // Mapeo de códigos a nombres y banderas
  const languageMap: Record<string, {name: string, flag: string}> = {
    en: { name: 'Inglés', flag: '🇺🇸' },
    fr: { name: 'Francés', flag: '🇫🇷' },
    de: { name: 'Alemán', flag: '🇩🇪' },
    it: { name: 'Italiano', flag: '🇮🇹' },
    pt: { name: 'Portugués', flag: '🇵🇹' },
    zh: { name: 'Chino', flag: '🇨🇳' },
    ja: { name: 'Japonés', flag: '🇯🇵' },
    ar: { name: 'Árabe', flag: '🇸🇦' },
    ru: { name: 'Ruso', flag: '🇷🇺' },
    es: { name: 'Español', flag: '🇪🇸' }
  };
  
  return {
    code: detectedLang,
    name: languageMap[detectedLang]?.name || 'Español',
    flag: languageMap[detectedLang]?.flag || '🇪🇸'
  };
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIResponseGenerator } from '@/components/AIResponseGenerator';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  User,
  Building,
  MessageSquareMore,
  Phone,
  Target,
  FileText,
  UserCheck,
  Bot,
  MessageSquareText,
  Users,
  Clock, 
  Smartphone,
  Wifi,
  WifiOff,
  Star,
  MessageSquare,
  UserPlus,
  Settings,
  Bell,
  Tag,
  AlertCircle,
  CheckCircle2,
  Smile,
  Paperclip,
  Languages,
  Image,
  Video,
  File,
  Loader2,
  Ticket,
  Play,
  RefreshCw,
  Zap
} from 'lucide-react';

// Import components
import { AccountSelector } from './AccountSelector';
import ChatAssignmentDialog from './ChatAssignmentDialog';
import { AutoResponseFixed } from './AutoResponseFixed';
import { ChatCommentsDialog } from './ChatCommentsDialog';
import { ExternalAgentButton } from './ExternalAgentButton';
import { AgentSelector } from './AgentSelector';

import { VoiceNoteMessage } from './VoiceNoteMessage';
import { WhatsAppProfilePicture } from './WhatsAppProfilePicture';

// Importar funciones automáticas
import { 
  enableAutoAE, 
  disableAutoAE, 
  enableAutoSend, 
  disableAutoSend, 
  getAutoFunctionsStatus,
  toggleAutoAE,
  toggleAutoSend 
} from '@/lib/autoFunctions';

// Sistema de traducción simple usando Google Translate API (igual que mensajes enviados)
const translationCache = new Map<string, string>();

function MessageTranslation({ text, messageId, translationEnabled, messages }: { 
  text: string; 
  messageId: string; 
  translationEnabled: boolean;
  messages?: any[];
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!translationEnabled || !text || text.trim().length === 0) {
      setTranslation(null);
      return;
    }

    // Solo traducir los últimos 2 mensajes recibidos
    if (!messages || messages.length === 0) return;
    
    const incomingMessages = messages.filter(msg => !msg.fromMe);
    if (incomingMessages.length === 0) return;
    
    const lastIncomingMessage = incomingMessages[incomingMessages.length - 1];
    const secondLastIncomingMessage = incomingMessages[incomingMessages.length - 2];
    
    const shouldTranslate = messageId === lastIncomingMessage.id || 
                           (secondLastIncomingMessage && messageId === secondLastIncomingMessage.id);
    
    if (!shouldTranslate) {
      setTranslation(null);
      return;
    }

    const trimmedText = text.trim();

    // Verificar cache
    if (translationCache.has(trimmedText)) {
      setTranslation(translationCache.get(trimmedText) || null);
      return;
    }

    // Detectar español básico localmente
    const spanishPattern = /[áéíóúñ¿¡]|hola|gracias|buenos|días|noches|como|estas|que|tal|por|favor|bien|mal|muy|pero|con|una|para|esta|todo|desde|hasta/i;
    if (spanishPattern.test(trimmedText) || trimmedText.length < 4) {
      return; // No traducir texto en español
    }

    const translateMessage = async () => {
      setIsLoading(true);
      try {
        console.log('🌐 Iniciando traducción para:', trimmedText);
        
        // Primero intentar con Google Translate API directa
        try {
          const googleTranslateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(trimmedText)}`;
          
          const response = await fetch(googleTranslateUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data && data[0] && data[0][0] && data[0][0][0]) {
              const translatedText = data[0][0][0];
              console.log('✅ Traducción exitosa:', translatedText);
              
              // Solo mostrar si realmente se tradujo
              if (translatedText !== trimmedText && translatedText.toLowerCase() !== trimmedText.toLowerCase()) {
                translationCache.set(trimmedText, translatedText);
                setTranslation(translatedText);
                return;
              }
            }
          }
        } catch (corsError) {
          console.log('❌ Error CORS con Google Translate API directa');
        }

        // Si falla Google Translate directo, usar nuestra API como respaldo
        console.log('🔄 Usando API de respaldo para traducción');
        const fallbackResponse = await fetch('/api/translate-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmedText, messageId })
        });

        if (fallbackResponse.ok) {
          const result = await fallbackResponse.json();
          console.log('✅ Traducción de respaldo exitosa:', result);
          
          if (result.success && result.translatedText && result.detectedLanguage !== 'es') {
            translationCache.set(trimmedText, result.translatedText);
            setTranslation(result.translatedText);
          }
        }
        
      } catch (error) {
        console.log('❌ Error en traducción:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay para evitar spam
    const timeout = setTimeout(translateMessage, 500);
    return () => clearTimeout(timeout);
  }, [text, messageId, translationEnabled, messages]);

  if (!translationEnabled) return null;
  if (isLoading) return <div className="text-xs text-gray-500 mt-1">Traduciendo...</div>;
  if (!translation) return null;

  return (
    <div className="mt-2 p-2 bg-blue-50 rounded-md border-l-4 border-blue-300">
      <div className="flex items-start gap-2">
        <span className="text-blue-600 text-xs font-medium">🌐 → 🇪🇸</span>
        <p className="text-blue-700 text-xs leading-relaxed flex-1">
          {translation}
        </p>
      </div>
    </div>
  );
}

function ChatAssignmentBadge({ chatId, accountId }: { chatId: string; accountId: number }) {
  const { data: assignmentResponse } = useQuery({
    queryKey: ['/api/chat-assignments', chatId],
    queryFn: () => fetch(`/api/chat-assignments/${encodeURIComponent(chatId)}`).then(res => res.json()),
    enabled: !!chatId,
    refetchInterval: 3000, // Refrescar cada 3 segundos
    refetchOnWindowFocus: true
  });

  // Cargar lista de agentes para obtener el nombre
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 60000, // Cache por 1 minuto
  });

  console.log('🔍 Debug Badge - Assignment:', assignmentResponse);
  console.log('🔍 Debug Badge - Users:', usersResponse);

  const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.users || []);
  const assignment = assignmentResponse;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Disparar evento para abrir el diálogo de asignación
    window.dispatchEvent(new CustomEvent('openAssignmentDialog', { detail: { chatId, accountId } }));
  };

  // Si no hay asignación, mostrar solo el muñequito sin texto
  if (!assignment || !assignment.assignedToId) {
    return (
      <Badge 
        variant="secondary" 
        className="bg-purple-100 text-purple-800 text-xs cursor-pointer hover:bg-purple-200 transition-colors"
        onClick={handleClick}
        title="Haz clic para asignar agente"
      >
        <UserPlus className="h-3 w-3" />
      </Badge>
    );
  }

  // Usar el nombre del agente que viene en la respuesta de asignación
  const agentName = assignment.agentName || 'Agente';
  
  console.log('🔍 Debug Badge - Assigned Agent Name:', agentName);
  console.log('🔍 Debug Badge - Assignment ID:', assignment.assignedToId);

  return (
    <Badge 
      variant="secondary" 
      className="bg-purple-100 text-purple-800 text-xs cursor-pointer hover:bg-purple-200 transition-colors"
      onClick={handleClick}
      title={`Asignado a: ${agentName}. Haz clic para modificar`}
    >
      <UserPlus className="h-3 w-3 mr-1" />
      {agentName}
    </Badge>
  );
}

function AgentAssignmentDisplay({ chatId }: { chatId: string }) {
  const { data: assignmentResponse } = useQuery({
    queryKey: ['/api/chat-assignments', chatId],
    queryFn: () => fetch(`/api/chat-assignments/${encodeURIComponent(chatId)}`).then(res => res.json()),
    enabled: !!chatId,
    refetchInterval: 3000, // Refrescar cada 3 segundos
    refetchOnWindowFocus: true
  });

  // Cargar lista de agentes para obtener el nombre
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 60000, // Cache por 1 minuto
  });

  console.log('🔍 Debug Header - Assignment:', assignmentResponse);
  console.log('🔍 Debug Header - Users:', usersResponse);

  const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.users || []);
  const assignment = assignmentResponse;

  // Si no hay asignación, mostrar badge "Sin asignar"
  if (!assignment || !assignment.assignedToId) {
    return (
      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
        <span className="mr-1">⭕</span>
        Sin asignar
      </Badge>
    );
  }

  // Usar el nombre del agente que viene en la respuesta de asignación
  const agentName = assignment.agentName || 'Agente';
  const agentStatus = assignment.status === 'active' ? 'Asignado' : 'Inactivo';
  
  console.log('🔍 Debug Header - Assigned Agent:', agentName);
  console.log('🔍 Debug Header - Assignment ID:', assignment.assignedToId);

  return (
    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
      <span className="mr-1">👤</span>
      {agentName}
    </Badge>
  );
}

function ChatCategorizationBadge({ chatId, accountId }: { chatId: string; accountId: number }) {
  const { data: category, error } = useQuery({
    queryKey: ['/api/chat-categories', chatId],
    enabled: !!chatId,
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Debug para verificar qué está recibiendo
  console.log('🎫 Debug Badge Category - chatId:', chatId, 'data:', category, 'error:', error);

  // Solo mostrar si hay un ticket real (no mostrar "Sin ticket")
  if (!category) {
    return null;
  }

  const getTicketColor = (status: string) => {
    switch (status) {
      case 'nuevos': return 'bg-green-50 text-green-700 border-green-200';
      case 'interesados': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'no-leidos': return 'bg-red-50 text-red-700 border-red-200';
      case 'pendiente-demo': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'completados': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'no-interesados': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getTicketIcon = (status: string) => {
    switch (status) {
      case 'nuevos': return '📋';
      case 'interesados': return '💡';
      case 'no-leidos': return '📧';
      case 'pendiente-demo': return '🎯';
      case 'completados': return '✅';
      case 'no-interesados': return '❌';
      default: return '📋';
    }
  };

  const status = category?.status;

  // Solo mostrar el badge si hay un ticket asignado (status existe y no es 'sin-ticket')
  if (!status || status === 'sin-ticket') {
    return null;
  }

  return (
    <Badge variant="outline" className={`text-xs ${getTicketColor(status)}`}>
      <span className="mr-1">{getTicketIcon(status)}</span>
      {status === 'nuevos' ? 'Nuevos' :
       status === 'interesados' ? 'Interesados' :
       status === 'no-leidos' ? 'No Leidos' :
       status === 'pendiente-demo' ? 'Pendiente Demo' :
       status === 'completados' ? 'Completados' :
       status === 'no-interesados' ? 'No Interesados' :
       'Sin ticket'}
    </Badge>
  );
}

function TicketStatusBadge({ chatId }: { chatId: string }) {
  const { data: assignment } = useQuery({
    queryKey: ['/api/chat-assignments', chatId],
    enabled: !!chatId,
    refetchInterval: 3000, // Refrescar cada 3 segundos
    refetchOnWindowFocus: true
  });

  console.log('🎫 Debug Ticket Badge - chatId:', chatId, 'assignment:', assignment);

  const getTicketColor = (category: string) => {
    switch (category) {
      case 'nuevos': return 'bg-green-50 text-green-700 border-green-200';
      case 'interesados': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'no-leidos': return 'bg-red-50 text-red-700 border-red-200';
      case 'pendiente-demo': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'completados': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'no-interesados': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'general': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getTicketIcon = (category: string) => {
    switch (category) {
      case 'nuevos': return '🆕';
      case 'interesados': return '👍';
      case 'no-leidos': return '📬';
      case 'pendiente-demo': return '⏳';
      case 'completados': return '✅';
      case 'no-interesados': return '❌';
      case 'general': return '🎫';
      default: return '📋';
    }
  };

  const getTicketLabel = (category: string) => {
    switch (category) {
      case 'nuevos': return 'Nuevos';
      case 'interesados': return 'Interesados';
      case 'no-leidos': return 'No Leídos';
      case 'pendiente-demo': return 'Pendiente Demo';
      case 'completados': return 'Completados';
      case 'no-interesados': return 'No Interesados';
      case 'general': return 'General';
      default: return 'Ticket';
    }
  };

  // Solo mostrar si hay un ticket asignado activo
  if (!assignment || assignment.status !== 'active') {
    return null;
  }

  const ticketCategory = assignment.category || 'general';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Abrir el diálogo de asignación para este chat
    const assignmentDialog = document.querySelector('[data-assignment-dialog-trigger]') as HTMLButtonElement;
    if (assignmentDialog) {
      // Establecer el chat actual
      window.dispatchEvent(new CustomEvent('openAssignmentDialog', { detail: { chatId } }));
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`text-xs cursor-pointer transition-colors hover:shadow-md ${getTicketColor(ticketCategory)}`}
      onClick={handleClick}
      title="Haz clic para modificar el ticket"
    >
      <span className="mr-1">{getTicketIcon(ticketCategory)}</span>
      {getTicketLabel(ticketCategory)}
    </Badge>
  );
}

function ChatCommentsIndicator({ chatId }: { chatId: string }) {
  const { data: comments = [] } = useQuery({
    queryKey: ['/api/chat-comments', chatId],
    enabled: !!chatId
  });

  // Solo mostrar si hay comentarios
  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center relative">
      <MessageSquareMore className="h-4 w-4 text-orange-600" />
      <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
        {comments.length > 99 ? '99+' : comments.length}
      </div>
    </div>
  );
}

function WhatsAppAccountBadge({ accountId }: { accountId: number }) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/whatsapp/accounts'],
    staleTime: 30000, // Cache por 30 segundos
  });

  const account = accounts.find((acc: any) => acc.id === accountId);
  
  if (!account) {
    return (
      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
        #{accountId}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
      <Smartphone className="h-3 w-3 mr-1" />
      {account.name || `#${accountId}`}
    </Badge>
  );
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
  lastMessage: string;
  accountId: number;
  isOnline?: boolean;
  lastSeen?: number;
  messageRead?: boolean;
  profilePicUrl?: string;
}

interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  type: string;
  author?: string;
  chatId: string;
  authorProfilePic?: string;
  authorNumber?: string;
}

interface WhatsAppAccount {
  id: number;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastSeen?: Date;
  messageCount?: number;
  profilePicUrl?: string;
}

export function WhatsAppTwoColumn() {
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [assignmentChatId, setAssignmentChatId] = useState<string>('');
  const [assignmentAccountId, setAssignmentAccountId] = useState<number>(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [translatorEnabled, setTranslatorEnabled] = useState(false);
  const [smartBotsEnabled, setSmartBotsEnabled] = useState(false);
  const [selectedExternalAgent, setSelectedExternalAgent] = useState<string>('');
  
  // Estados para auto-envío con delay de 5 segundos
  const [autoSendTimer, setAutoSendTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAutoSending, setIsAutoSending] = useState(false);
  
  // Estados para R.A. AI
  const [raAiEnabled, setRaAiEnabled] = useState(false);
  const [raAiProcessing, setRaAiProcessing] = useState(false);
  
  // Estado para almacenar mensajes originales de envíos traducidos
  const [sentMessageOrigins, setSentMessageOrigins] = useState<Record<string, string>>({});

  // Estados para Auto-Click con configuración personalizada
  const [autoClickTimers, setAutoClickTimers] = useState<{ ae: NodeJS.Timeout | null; send: NodeJS.Timeout | null }>({ ae: null, send: null });
  const [autoClickEnabled, setAutoClickEnabled] = useState(false);
  const [showAutoClickConfig, setShowAutoClickConfig] = useState(false);
  const [showAutoAEConfig, setShowAutoAEConfig] = useState(false);
  const [autoClickSettings, setAutoClickSettings] = useState({
    aeWaitTime: 4000,  // Tiempo de espera después del clic A.E (milisegundos)
    sendWaitTime: 8000, // Tiempo entre ciclos de auto-clic (milisegundos)
    enabled: false
  });
  const [autoAEConfig, setAutoAEConfig] = useState({
    delay: 2000,
    selectedAgentId: '',
    enabled: false
  });
  
  // Estados para auto-clics (ya definidos arriba con configuración)
  const [autoClickActive, setAutoClickActive] = useState(false);
  const [autoClickStopFunction, setAutoClickStopFunction] = useState<(() => void) | null>(null);

  // Función DIRECTA: CLIC A.E → ESPERAR → CLIC ENVIAR
  // VERSIÓN SIMPLIFICADA SIN VALIDACIONES RESTRICTIVAS
  const startAutoClicks = () => {
    console.log('🚀 INICIANDO AUTO-CLIC SIMPLIFICADO');
    
    const timer = setInterval(() => {
      console.log('🔄 Ejecutando auto-clic simplificado...');
      
      // Solo verificar que hay un chat seleccionado y SmartBots habilitado
      console.log('🔍 DEBUG Auto-click:', {
        selectedChat: selectedChat ? selectedChat.id : 'NULL',
        smartBotsEnabled,
        autoClickEnabled
      });
      
      if (!selectedChat || !smartBotsEnabled) {
        console.log('⚠️ No hay chat seleccionado o SmartBots deshabilitado', {
          hasSelectedChat: !!selectedChat,
          smartBotsEnabled,
          chatId: selectedChat?.id || 'none'
        });
        return;
      }

      // Verificar si hay texto "ÚLTIMO RECIBIDO" en la página
      const bodyText = document.body.innerText || '';
      const hasLastReceived = bodyText.includes('ÚLTIMO RECIBIDO') || bodyText.includes('último recibido');
      
      if (!hasLastReceived) {
        console.log('⚠️ No hay indicador "ÚLTIMO RECIBIDO" visible');
        return;
      }
      
      console.log('✅ Condiciones cumplidas, ejecutando auto-click (sin validación de timestamp)...');
      
      // BUSCAR Y HACER CLIC EN BOTÓN A.E
      const aeButtons = document.querySelectorAll('button');
      let aeButtonFound = false;
      
      aeButtons.forEach(button => {
        if (button.textContent?.includes('🤖 A.E') && !button.disabled) {
          console.log('✅ Haciendo clic en botón A.E...');
          aeButtonFound = true;
          button.click();
          
          // ESPERAR Y BUSCAR BOTÓN ENVIAR CON MÚLTIPLES MÉTODOS
          setTimeout(() => {
            console.log('⏱️ Buscando botón Enviar con múltiples métodos...');
            let sendButtonFound = false;
            
            // MÉTODO 1: Buscar por texto
            const textButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
              (btn.textContent?.includes('Enviar') || btn.textContent?.includes('Send')) && !btn.disabled
            );
            
            if (textButtons.length > 0) {
              console.log('🔴 MÉTODO 1 - Encontrado botón por texto, haciendo clic...');
              textButtons[0].click();
              sendButtonFound = true;
            }
            
            // MÉTODO 2: Buscar por clase CSS (botón verde)
            if (!sendButtonFound) {
              const greenButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.className?.includes('bg-green') && !btn.disabled
              );
              
              if (greenButtons.length > 0) {
                console.log('🔴 MÉTODO 2 - Encontrado botón verde, haciendo clic...');
                greenButtons[0].click();
                sendButtonFound = true;
              }
            }
            
            // MÉTODO 3: Buscar por ícono SVG (Send icon)
            if (!sendButtonFound) {
              const svgButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                const svg = btn.querySelector('svg');
                return svg && !btn.disabled;
              });
              
              // Tomar el último botón con SVG (probablemente el Send)
              if (svgButtons.length > 0) {
                const lastSvgButton = svgButtons[svgButtons.length - 1];
                console.log('🔴 MÉTODO 3 - Encontrado botón con ícono, haciendo clic...');
                lastSvgButton.click();
                sendButtonFound = true;
              }
            }
            
            // MÉTODO 4: Buscar en el área de input específicamente
            if (!sendButtonFound) {
              const inputArea = document.querySelector('.flex.space-x-2') || document.querySelector('[class*="input"]');
              if (inputArea) {
                const inputButtons = inputArea.querySelectorAll('button');
                if (inputButtons.length > 0) {
                  const sendButton = inputButtons[inputButtons.length - 1]; // Último botón del área de input
                  if (!sendButton.disabled) {
                    console.log('🔴 MÉTODO 4 - Encontrado botón en área de input, haciendo clic...');
                    sendButton.click();
                    sendButtonFound = true;
                  }
                }
              }
            }
            
            if (sendButtonFound) {
              console.log('✅ SECUENCIA COMPLETADA: A.E → Enviar');
            } else {
              console.log('❌ No se encontró botón Enviar con ningún método');
            }
          }, autoClickSettings.aeWaitTime); // Tiempo configurable para que se genere la respuesta
        }
      });
      
      if (!aeButtonFound) {
        console.log('❌ No se encontró botón A.E');
      }
      
    }, 8000); // Cada 8 segundos

    setAutoClickTimers({ ae: timer, send: null });
    setAutoClickEnabled(true);
    
    console.log("✅ Auto-Clic simplificado activado");
    
    /*
    const timer = setInterval(() => {
      console.log('⏰ Timer ejecutándose cada 4 segundos...');
      
      // Buscar todos los botones
      const allButtons = document.querySelectorAll('button');
      console.log(`🔍 Total botones encontrados: ${allButtons.length}`);
      
      // 1. BUSCAR Y HACER CLIC EN A.E
      let aeButtonFound = false;
      allButtons.forEach((btn, index) => {
        const buttonText = btn.textContent || '';
        console.log(`Botón ${index}: "${buttonText}"`);
        
        if (buttonText.includes('A.E')) {
          console.log('🎯 ENCONTRADO BOTÓN A.E - HACIENDO CLIC');
          aeButtonFound = true;
          btn.click();
          
          // 2. ESPERAR 2 SEGUNDOS Y BUSCAR ENVIAR
          setTimeout(() => {
            console.log('⏱️ Buscando botón Enviar...');
            const sendButtons = document.querySelectorAll('button');
            let sendButtonFound = false;
            
            sendButtons.forEach(sendBtn => {
              const sendText = sendBtn.textContent || '';
              if (sendText.includes('Enviar')) {
                console.log('📤 ENCONTRADO BOTÓN ENVIAR - HACIENDO CLIC');
                sendButtonFound = true;
                sendBtn.click();
              }
            });
            
            if (!sendButtonFound) {
              console.log('❌ No se encontró botón Enviar');
            }
          }, 2000);
        }
      });
      
      if (!aeButtonFound) {
        console.log('❌ No se encontró botón A.E');
      }
      
    }, autoClickSettings.sendWaitTime); // Intervalo configurable entre ciclos

    setAutoClickTimers({ ae: timer, send: null });
    setAutoClickEnabled(true);
    
    console.log("✅ Auto-Clic configurado y activado");
    */
  };

  // Función para detener auto-clics
  const stopAutoClicks = () => {
    console.log('🛑 DETENIENDO AUTO-CLICS');
    
    if (autoClickTimers.ae) {
      clearInterval(autoClickTimers.ae);
    }
    if (autoClickTimers.send) {
      clearInterval(autoClickTimers.send);
    }
    
    setAutoClickTimers({ ae: null, send: null });
    setAutoClickEnabled(false);
    
    // toast desactivado para evitar errores
    console.log("🛑 Auto-Clics Desactivados - Sistema manual reactivado");
  };

  // Función para configurar auto-click
  const configureAutoClick = () => {
    if (autoClickEnabled) {
      console.log('⏹️ Deteniendo auto-clic...');
      stopAutoClicks();
    } else {
      console.log('▶️ Iniciando auto-clic...');
      startAutoClicks();
    }
  };

  // Función para guardar configuración de auto-click
  const saveAutoClickSettings = (newSettings: typeof autoClickSettings) => {
    setAutoClickSettings(newSettings);
    setShowAutoClickConfig(false);
    
    // Si auto-click está activo, reiniciarlo con nueva configuración
    if (autoClickEnabled) {
      stopAutoClicks();
      setTimeout(() => startAutoClicks(), 500);
    }
  };

  // Estados para A.E AI (Agentes Externos)
  const [externalAgentActive, setExternalAgentActive] = useState(false);
  const [externalAgentProcessing, setExternalAgentProcessing] = useState(false);
  const [externalAgentUrl, setExternalAgentUrl] = useState<string>('');

  // Cargar estado del agente externo al seleccionar chat
  useEffect(() => {
    const loadAgentStatus = async () => {
      if (!selectedChat) return;
      
      try {
        const response = await fetch(`/api/whatsapp-accounts/${selectedChat.accountId}/agent-config`);
        const data = await response.json();
        
        if (data.success && data.config) {
          const isActive = data.config.autoResponseEnabled && data.config.assignedExternalAgentId;
          setExternalAgentActive(isActive);
          console.log(`📊 Estado A.E AI cargado: ${isActive ? 'ACTIVO' : 'INACTIVO'}`);
        }
      } catch (error) {
        console.error('Error cargando estado A.E AI:', error);
      }
    };

    loadAgentStatus();
  }, [selectedChat]);

  // Función para alternar A.E AI (Agentes Externos)
  const toggleExternalAgent = async () => {
    console.log('🚀 USUARIO PRESIONÓ BOTÓN A.E AI');
    
    if (!selectedChat) {
      console.log('❌ No hay chat seleccionado');
      toast({
        title: "Error",
        description: "Selecciona un chat primero",
        variant: "destructive"
      });
      return;
    }

    try {
      setExternalAgentProcessing(true);
      const newState = !externalAgentActive;
      
      console.log('📤 Enviando solicitud A.E AI:', {
        chatId: selectedChat.id,
        accountId: selectedChat.accountId,
        active: newState
      });
      
      const response = await fetch('/api/ae-ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId: selectedChat.id,
          accountId: selectedChat.accountId,
          active: newState
        })
      });
      
      console.log('📥 Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error HTTP:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Resultado procesado:', result);
      
      if (result.success) {
        setExternalAgentActive(result.active);
        setExternalAgentUrl(result.agentUrl || '');
        
        // Si se activó, abrir el enlace del agente externo
        if (result.active && result.agentUrl) {
          window.open(result.agentUrl, '_blank');
        }
        
        toast({
          title: `🤖 A.E AI ${result.active ? 'Activado' : 'Desactivado'}`,
          description: result.active 
            ? `Agente externo conectado para ${selectedChat.name}`
            : `Agente externo desconectado`,
        });
      } else {
        console.log('❌ Respuesta sin éxito:', result);
        toast({
          title: "Error",
          description: result.message || "No se pudo activar el agente externo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 ERROR CRÍTICO A.E AI:', error);
      toast({
        title: "Error de Conexión",
        description: "No se pudo conectar con el servidor. Verifica tu conexión.",
        variant: "destructive"
      });
      setExternalAgentActive(false);
      setExternalAgentUrl('');
    } finally {
      setExternalAgentProcessing(false);
    }
  };

  // Función para alternar R.A. AI
  const toggleRaAi = async () => {
    try {
      setRaAiProcessing(true);
      const newState = !raAiEnabled;
      
      const response = await fetch('/api/ra-ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setRaAiEnabled(result.active);
        toast({
          title: `🤖 R.A. AI ${result.active ? 'Activado' : 'Desactivado'}`,
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo cambiar el estado de R.A. AI",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggle R.A. AI:', error);
      toast({
        title: "Error",
        description: "Error de conexión con R.A. AI",
        variant: "destructive"
      });
    } finally {
      setRaAiProcessing(false);
    }
  };

  // Función para procesar mensaje con R.A. AI
  const processWithRaAi = async () => {
    if (!selectedChat) {
      toast({
        title: "Error",
        description: "Selecciona un chat primero",
        variant: "destructive"
      });
      return;
    }

    try {
      setRaAiProcessing(true);
      
      const response = await fetch('/api/ra-ai/process-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId: selectedChat.id, 
          accountId: selectedChat.accountId 
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.response) {
        if (result.sent) {
          toast({
            title: "🤖 R.A. AI Respondió",
            description: "Respuesta enviada automáticamente",
          });
        } else {
          // Mostrar la respuesta en el campo de texto para que el usuario pueda editarla
          setNewMessage(result.response);
          toast({
            title: "🤖 R.A. AI Generó Respuesta",
            description: "Puedes editarla antes de enviar",
          });
        }
      } else {
        toast({
          title: "R.A. AI",
          description: result.error || "No se pudo generar respuesta",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error procesando con R.A. AI:', error);
      toast({
        title: "Error",
        description: "Error al procesar con R.A. AI",
        variant: "destructive"
      });
    } finally {
      setRaAiProcessing(false);
    }
  };
  
  // Estados para respuestas automáticas a mensajes recibidos
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);



  // Función para enviar mensaje automático
  const sendAutoMessage = async (message: string) => {
    if (!selectedChat) return;
    
    try {
      console.log('📤 Enviando respuesta automática:', message);
      
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedChat.id,
          accountId: selectedChat.accountId,
          message: message
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Respuesta automática enviada exitosamente:', result);
        
        toast({
          title: "🤖 Respuesta automática enviada",
          description: "SmartBots ha respondido al mensaje recibido",
          duration: 3000
        });
        
        // Actualizar los mensajes del chat para mostrar el mensaje enviado
        queryClient.invalidateQueries({
          queryKey: ['/api/whatsapp-accounts', selectedChat.accountId, 'chats', selectedChat.id, 'messages']
        });
        
        // También actualizar la lista de chats
        queryClient.invalidateQueries({
          queryKey: ['/api/whatsapp-accounts', selectedChat.accountId, 'chats']
        });
        
      } else {
        const errorData = await response.json();
        console.error('❌ Error enviando respuesta automática:', errorData);
        
        toast({
          title: "❌ Error enviando respuesta",
          description: errorData.error || "No se pudo enviar la respuesta automática",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error en envío de respuesta automática:', error);
      
      toast({
        title: "❌ Error de conexión",
        description: "No se pudo conectar para enviar la respuesta",
        variant: "destructive"
      });
    }
  };

  // Función para manejar mensajes de audio con traducción
  const handleAudioMessageWithTranslation = async (audioMessage: any) => {
    if (!selectedChat) return;
    
    try {
      console.log('🎤 Procesando mensaje de audio...');
      
      // Verificar si el mensaje tiene URL de audio
      if (!audioMessage.mediaUrl && !audioMessage._data?.mediaUrl) {
        console.log('⚠️ Mensaje de audio sin URL disponible');
        return;
      }
      
      const audioUrl = audioMessage.mediaUrl || audioMessage._data?.mediaUrl;
      
      // Transcribir el audio usando OpenAI Whisper
      const transcriptionResponse = await fetch('/api/audio/transcribe-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: audioUrl,
          chatId: selectedChat.id,
          accountId: selectedChat.accountId,
          messageId: audioMessage.id
        })
      });

      if (transcriptionResponse.ok) {
        const transcriptionData = await transcriptionResponse.json();
        console.log('✅ Audio transcrito exitosamente:', transcriptionData.transcription);
        
        // Mostrar la transcripción al usuario
        toast({
          title: "🎤 Audio transcrito",
          description: `Transcripción: "${transcriptionData.transcription}"`,
          duration: 5000
        });
        
        // Si SmartBots está habilitado, generar respuesta automática basada en la transcripción
        if (smartBotsEnabled) {
          console.log('🤖 Generando respuesta automática para audio transcrito...');
          
          setTimeout(async () => {
            try {
              // Auto response functionality removed
              console.log('Audio transcription completed - auto response disabled');
            } catch (error) {
              console.error('❌ Error generando respuesta para audio:', error);
            }
          }, 2000);
        }
        
      } else {
        const errorData = await transcriptionResponse.json();
        console.error('❌ Error transcribiendo audio:', errorData);
        
        toast({
          title: "❌ Error transcribiendo audio",
          description: errorData.error || "No se pudo transcribir el mensaje de audio",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ Error procesando mensaje de audio:', error);
      
      toast({
        title: "❌ Error procesando audio",
        description: "No se pudo procesar el mensaje de audio",
        variant: "destructive"
      });
    }
  };

  // Función para generar respuesta manual con SmartBots
  const generateSmartBotsResponse = async (userMessage: string, contactName: string, isIncomingMessage = false) => {
    try {
      console.log('🤖 Generando respuesta SmartBots para:', userMessage);
      console.log('🔍 Agente seleccionado:', selectedExternalAgent);
      
      // Usar agente específico si está seleccionado, o endpoint genérico si no
      const endpoint = selectedExternalAgent && selectedExternalAgent !== 'none'
        ? '/api/external-agents/chat'
        : '/api/smartbots/generate-response';
      
      const requestBody = selectedExternalAgent && selectedExternalAgent !== 'none' 
        ? {
            agentId: selectedExternalAgent,
            message: userMessage,
            context: `Conversación de WhatsApp con ${contactName}`
          }
        : {
            message: userMessage,
            contactName: contactName,
            context: `Conversación de WhatsApp con ${contactName}`
          };

      console.log('🔗 Usando endpoint:', endpoint);
      console.log('📦 Datos enviados:', requestBody);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        console.log('✅ Respuesta SmartBots:', data.response);
        
        if (isIncomingMessage) {
          // Para mensajes entrantes (burbujas verdes), enviar respuesta automática
          console.log('🟢 Mensaje recibido (burbuja verde) - enviando respuesta automática');
          
          // Enviar la respuesta automáticamente al servidor
          setTimeout(async () => {
            try {
              const response = await fetch(`/api/whatsapp-accounts/${selectedChat.accountId}/send-message`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                  chatId: selectedChat.id,
                  message: data.response,
                  isAutoResponse: true
                })
              });

              if (response.ok) {
                console.log('✅ Respuesta automática enviada exitosamente');
                toast({
                  title: "Respuesta automática enviada",
                  description: "SmartBots ha respondido automáticamente al mensaje recibido",
                  duration: 3000
                });
                
                // Actualizar los mensajes del chat
                queryClient.invalidateQueries({
                  queryKey: ['/api/whatsapp-accounts', selectedChat.accountId, 'chats', selectedChat.id, 'messages']
                });
              } else {
                console.error('❌ Error enviando respuesta automática');
              }
            } catch (error) {
              console.error('❌ Error en respuesta automática:', error);
            }
          }, 2000); // Delay de 2 segundos para parecer más natural
          setNewMessage(data.response);
          
          toast({
            title: "🤖 Respuesta AI preparada",
            description: `SmartBots sugiere responder: "${data.response.substring(0, 50)}..."`,
          });
        } else {
          // Mostrar notificación de que se generó una respuesta
          toast({
            title: "🤖 Respuesta AI generada",
            description: `SmartBots sugiere: "${data.response.substring(0, 50)}..."`,
          });
        }
        
        return data.response;
      } else {
        console.error('❌ Error en SmartBots:', data.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error conectando con SmartBots:', error);
      return null;
    }
  };

  // Función para limpiar timer de auto-envío
  const clearAutoSendTimer = () => {
    if (autoSendTimer) {
      clearTimeout(autoSendTimer);
      setAutoSendTimer(null);
      setIsAutoSending(false);
    }
  };

  // Función para limpiar input después de auto-envío
  const clearInputAfterAutoSend = () => {
    setNewMessage('');
    clearAutoSendTimer();
  };

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch WhatsApp accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['/api/whatsapp/accounts'],
    refetchInterval: 5000 // Refresh every 5 seconds to check status
  });

  // Fetch external agents for AI selection
  const { data: externalAgentsResponse } = useQuery({
    queryKey: ['/api/external-agents'],
    enabled: smartBotsEnabled,
    retry: false,
    staleTime: 60000
  });

  const externalAgents = (externalAgentsResponse as any)?.agents || [];

  // Debug logs for AI selector
  console.log('🔍 Debug AI Selector:', {
    smartBotsEnabled,
    externalAgentsResponse,
    externalAgents,
    agentsCount: externalAgents.length
  });

  // Fetch chats based on selected accounts
  const { data: chats = [], isLoading: loadingChats } = useQuery({
    queryKey: ['/api/whatsapp/chats', selectedAccounts],
    enabled: selectedAccounts.length > 0,
    queryFn: async () => {
      if (selectedAccounts.length === 0) return [];
      
      const allChats = [];
      for (const accountId of selectedAccounts) {
        try {
          const response = await fetch(`/api/whatsapp-accounts/${accountId}/chats`);
          if (response.ok) {
            const accountChats = await response.json();
            allChats.push(...accountChats);
          }
        } catch (error) {
          console.error(`Error fetching chats for account ${accountId}:`, error);
        }
      }
      return allChats;
    }
  });

  // Fetch messages for selected chat
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['/api/whatsapp/messages', selectedChat?.id],
    enabled: !!selectedChat?.id,
    queryFn: async () => {
      if (!selectedChat?.id) return [];
      
      console.log('🔄 Obteniendo mensajes reales para chat:', selectedChat.id);
      
      try {
        // Usar el endpoint que devuelve mensajes REALES de WhatsApp
        const response = await fetch(`/api/whatsapp-accounts/${selectedChat.accountId}/messages/${selectedChat.id}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            console.log(`✅ ${data.length} mensajes REALES obtenidos para chat ${selectedChat.id}`);
            return data;
          }
        }
        
        // Fallback: intentar con API directa de WhatsApp
        const directResponse = await fetch(`/api/direct/whatsapp/messages/${selectedChat.id}`);
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (Array.isArray(directData) && directData.length > 0) {
            console.log(`✅ ${directData.length} mensajes DIRECTOS obtenidos para chat ${selectedChat.id}`);
            return directData;
          }
        }
        
        console.log('⚠️ No se encontraron mensajes reales para este chat');
        return [];
      } catch (error) {
        console.error('❌ Error obteniendo mensajes reales:', error);
        return [];
      }
    },
    refetchInterval: 5000 // Refresh messages every 5 seconds
  });

  // Fetch auto response config
  const { data: autoResponseConfig } = useQuery({
    queryKey: ['/api/auto-response/config', selectedChat?.id],
    enabled: !!selectedChat?.id
  });

  // Fetch chat comments
  const { data: chatComments = [] } = useQuery({
    queryKey: ['/api/chat-comments', selectedChat?.id],
    enabled: !!selectedChat?.id
  });

  // Handle chat selection and mark messages as read
  // Función para identificar el último mensaje recibido (no enviado por nosotros)
  const getLastIncomingMessageId = (messages: WhatsAppMessage[]): string | null => {
    if (!messages || messages.length === 0) return null;
    
    // Buscar el último mensaje que NO fue enviado por nosotros (fromMe: false)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].fromMe) {
        return messages[i].id;
      }
    }
    return null;
  };

  // Event listener para abrir el diálogo de asignación desde los badges
  useEffect(() => {
    const handleOpenAssignmentDialog = (event: CustomEvent) => {
      const { chatId, accountId } = event.detail;
      setAssignmentChatId(chatId);
      setAssignmentAccountId(accountId);
      setAssignmentDialogOpen(true);
    };

    window.addEventListener('openAssignmentDialog', handleOpenAssignmentDialog as EventListener);

    return () => {
      window.removeEventListener('openAssignmentDialog', handleOpenAssignmentDialog as EventListener);
    };
  }, []);

  const handleChatSelect = async (chat: WhatsAppChat) => {
    setSelectedChat(chat);
    setNewMessage(''); // Clear input when switching chats
    
    // Cargar estado del agente externo A.E AI para el chat seleccionado
    try {
      const response = await fetch(`/api/external-agents/status/${encodeURIComponent(chat.id)}/${chat.accountId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExternalAgentActive(data.active || false);
        setExternalAgentUrl(data.agentUrl || '');
      } else {
        setExternalAgentActive(false);
        setExternalAgentUrl('');
      }
    } catch (error) {
      console.error('Error cargando estado A.E AI:', error);
      setExternalAgentActive(false);
      setExternalAgentUrl('');
    }
    
    // Mark chat as read and reset unread count
    if (chat.unreadCount > 0) {
      try {
        console.log(`📖 Marcando chat ${chat.id} como leído (${chat.unreadCount} mensajes no leídos)`);
        
        // Call API to mark messages as read
        await fetch(`/api/whatsapp-accounts/${chat.accountId}/chats/${chat.id}/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        // Update chat list to show zero unread count immediately
        queryClient.setQueryData(
          [`/api/whatsapp-accounts/${chat.accountId}/chats`],
          (oldChats: any) => {
            if (Array.isArray(oldChats)) {
              return oldChats.map((c: any) => 
                c.id === chat.id 
                  ? { ...c, unreadCount: 0, messageRead: true }
                  : c
              );
            }
            return oldChats;
          }
        );
        
        console.log(`✅ Chat ${chat.id} marcado como leído exitosamente`);
        
      } catch (error) {
        console.error('❌ Error marcando chat como leído:', error);
      }
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { chatId: string; accountId: number; message: string }) => {
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages', selectedChat?.id] });
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado exitosamente"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  });

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('🔔 Conectado a notificaciones en tiempo real');
      socket.send(JSON.stringify({ type: 'subscribe' }));
    };

    socket.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        
        // Show toast notification
        toast({
          title: notification.title,
          description: notification.message,
          duration: 5000
        });

        // Refresh relevant queries based on notification type
        if (notification.type === 'new_message' && notification.chatId) {
          queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages', notification.chatId] });
          queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/chats'] });
        } else if (notification.type === 'new_assignment') {
          queryClient.invalidateQueries({ queryKey: ['/api/chat-assignments'] });
        } else if (notification.type === 'chat_categorized') {
          queryClient.invalidateQueries({ queryKey: ['/api/chat-categories'] });
        } else if (notification.type === 'account_status') {
          queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/accounts'] });
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    };

    socket.onclose = () => {
      console.log('🔌 Desconectado de notificaciones');
    };

    return () => {
      socket.close();
    };
  }, [queryClient]);

  // Estados para traducción mejorada
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  
  // Estados para grabación de notas de voz
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Idiomas disponibles para traducción
  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' }
  ];

  // Función para traducir texto usando OpenAI
  const translateMessage = async (text: string, targetLanguage: string) => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          targetLanguage: targetLanguage,
          sourceLanguage: 'auto'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.translatedText;
      }
      throw new Error('Translation failed');
    } catch (error) {
      console.warn('Traducción fallida, usando texto original:', error);
      return text;
    }
  };

  // Funciones para grabación de voz
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks([]);
      recorder.start();
      
      toast({
        title: "🎤 Grabando nota de voz",
        description: "Haz clic en el botón otra vez para detener la grabación",
      });
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      toast({
        title: "Error al acceder al micrófono",
        description: "Verifica que hayas dado permisos para usar el micrófono",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Crear FormData para enviar el archivo de audio
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice_note.wav');
        formData.append('chatId', selectedChat?.id || '');
        formData.append('accountId', selectedChat?.accountId.toString() || '');
        
        try {
          const response = await fetch('/api/whatsapp/send-voice-note', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: formData
          });
          
          if (response.ok) {
            toast({
              title: "✅ Nota de voz enviada",
              description: "Tu nota de voz se ha enviado correctamente",
            });
            
            // Actualizar mensajes del chat
            queryClient.invalidateQueries({
              queryKey: ['/api/whatsapp-accounts', selectedChat?.accountId, 'chats', selectedChat?.id, 'messages']
            });
          } else {
            throw new Error('Error al enviar nota de voz');
          }
        } catch (error) {
          console.error('Error enviando nota de voz:', error);
          toast({
            title: "Error al enviar nota de voz",
            description: "No se pudo enviar la nota de voz. Inténtalo de nuevo.",
            variant: "destructive"
          });
        }
        
        setAudioChunks([]);
      };
      
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Detectar mensajes nuevos y activar SmartBots automáticamente
  useEffect(() => {
    console.log('🔍 Estado SmartBots:', {
      messages: !!messages,
      smartBotsEnabled,
      selectedChat: !!selectedChat,
      messagesLength: Array.isArray(messages) ? messages.length : 0
    });
    
    if (!messages || !smartBotsEnabled || !selectedChat) return;

    const currentMessages = Array.isArray(messages) ? messages : [];
    const currentCount = currentMessages.length;

    // Si hay mensajes nuevos
    if (currentCount > lastMessageCount && lastMessageCount > 0) {
      console.log(`🔍 Detectando mensajes: ${currentCount} actual vs ${lastMessageCount} anterior`);
      
      const newMessages = currentMessages.slice(lastMessageCount);
      console.log('📥 Mensajes nuevos encontrados:', newMessages.length);
      
      // Buscar mensajes entrantes (no enviados por nosotros)
      const incomingMessages = newMessages.filter((msg: any) => !msg.fromMe);
      
      if (incomingMessages.length > 0) {
        const lastIncomingMessage = incomingMessages[incomingMessages.length - 1];
        
        // Verificar si es un mensaje de audio
        if (lastIncomingMessage.type === 'ptt' || lastIncomingMessage.type === 'audio') {
          console.log('🎤 Mensaje de audio detectado:', lastIncomingMessage);
          handleAudioMessage(lastIncomingMessage);
        } else {
          console.log('🤖 Mensaje entrante detectado:', lastIncomingMessage.body);
        }
        
        // Solo procesar si no hemos procesado este mensaje antes
        if (lastIncomingMessage.id !== lastProcessedMessageId) {
          console.log('🔄 Procesando nuevo mensaje ID:', lastIncomingMessage.id);
          
          // Reordenar chats para mostrar este chat al principio
          handleNewMessageReceived(selectedChat.id);
          
          // Procesar automáticamente con agente externo (similar al botón A.E)
          setTimeout(async () => {
            await processWithExternalAgent(lastIncomingMessage);
          }, 2000);
          
          setLastProcessedMessageId(lastIncomingMessage.id);
        } else {
          console.log('⏭️ Mensaje ya procesado anteriormente');
        }
      } else {
        console.log('📤 Solo mensajes salientes detectados');
      }
    } else if (currentCount === lastMessageCount) {
      console.log('📊 Sin cambios en cantidad de mensajes');
    }

    setLastMessageCount(currentCount);
  }, [messages, smartBotsEnabled, selectedChat, lastMessageCount, lastProcessedMessageId]);

  // Función para procesar automáticamente con agente externo (A.E automático)
  const processWithExternalAgent = async (message: WhatsAppMessage) => {
    try {
      console.log('🤖 PROCESAMIENTO AUTOMÁTICO A.E - Mensaje recibido:', message.body);
      
      // Obtener agente asignado
      const response = await fetch(`/api/whatsapp-accounts/${selectedChat?.accountId}/agent-config`);
      if (!response.ok) {
        console.log('❌ Error obteniendo configuración del agente');
        return;
      }

      const config = await response.json();
      if (!config.success || !config.config?.assignedExternalAgentId) {
        console.log('❌ No hay agente externo asignado');
        return;
      }

      const agentId = config.config.assignedExternalAgentId;
      
      // Obtener información del agente
      const agentsResponse = await fetch('/api/external-agents');
      const agentsData = await agentsResponse.json();
      
      if (!agentsData.success) {
        console.log('❌ Error obteniendo agentes externos');
        return;
      }
      
      const agent = agentsData.agents.find((a: any) => a.id === agentId);
      if (!agent) {
        console.log('❌ Agente no encontrado');
        return;
      }

      console.log(`🤖 GENERANDO RESPUESTA AUTOMÁTICA CON ${agent.name.toUpperCase()}...`);

      let messageText = message.body;

      // Detectar idioma y traducir si es necesario
      const hasEnglishWords = /\b(hello|hi|how|are|you|what|where|when|why|please|thank|thanks|good|morning|afternoon|evening|night|yes|no|ok|okay|can|do|help|need|want|time|day|work|problem|issue|question|answer|service|customer|support|business|company|price|cost|buy|sell|pay|money|dollar|email|phone|call|message|text|send|receive|order|product|delivery|shipping|return|refund|cancel|confirm|appointment|meeting|schedule|available|busy|sorry|excuse|understand|know|think|believe|sure|maybe|probably|definitely|absolutely|exactly|correct|wrong|right|left|up|down|inside|outside)/i.test(messageText);
      
      if (hasEnglishWords) {
        console.log('🌐 DETECTADO MENSAJE EN INGLÉS - Traduciendo automáticamente...');
        
        try {
          const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'Traduce el siguiente texto al español de manera natural y conversacional. Responde únicamente con la traducción, sin explicaciones adicionales.'
                },
                {
                  role: 'user',
                  content: messageText
                }
              ],
              max_tokens: 200,
              temperature: 0.3
            })
          });

          if (translationResponse.ok) {
            const translationData = await translationResponse.json();
            const translatedText = translationData.choices[0]?.message?.content;
            if (translatedText) {
              messageText = translatedText;
              console.log('✅ TEXTO TRADUCIDO AUTOMÁTICAMENTE:', messageText);
            }
          }
        } catch (error) {
          console.log('⚠️ Error en traducción automática, usando texto original');
        }
      }

      // Generar respuesta con OpenAI usando el agente externo
      console.log('🔥 GENERANDO RESPUESTA CON OPENAI...');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Eres ${agent.name}, un asistente virtual inteligente y profesional especializado en atención al cliente. Responde de manera amigable, útil y profesional en español.`
            },
            {
              role: 'user',
              content: messageText
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        console.log('❌ Error de OpenAI:', errorData.error?.message);
        toast({
          title: "❌ Error",
          description: "No se pudo generar respuesta del agente externo automáticamente",
          duration: 3000
        });
        return;
      }

      const openaiData = await openaiResponse.json();
      const aiResponse = openaiData.choices[0]?.message?.content;

      if (!aiResponse) {
        console.log('❌ No se pudo generar respuesta automática');
        return;
      }

      console.log('✅ RESPUESTA AUTOMÁTICA GENERADA:', aiResponse.substring(0, 50) + '...');

      // *** CLAVE: Colocar la respuesta en el input automáticamente (no enviar) ***
      console.log('📝 COLOCANDO RESPUESTA EN INPUT AUTOMÁTICAMENTE...');
      setNewMessage(aiResponse);

      toast({
        title: "🤖 A.E Automático",
        description: `${agent.name} generó respuesta automática y la colocó en el input`,
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Error en A.E automático:', error);
      toast({
        title: "❌ Error A.E Automático",
        description: "No se pudo procesar automáticamente el mensaje",
        duration: 3000
      });
    }
  };

  // Detectar y traducir mensajes en inglés automáticamente
  useEffect(() => {
    if (!messages || !translatorEnabled) return;

    const currentMessages = Array.isArray(messages) ? messages : [];
    const currentCount = currentMessages.length;
    
    // Solo verificar los mensajes más recientes para evitar procesar repetidamente
    if (currentCount > lastMessageCount && lastMessageCount > 0) {
      const newMessages = currentMessages.slice(lastMessageCount);
      
      // Buscar mensajes en inglés que no son nuestros
      const englishMessages = newMessages.filter((msg: any) => 
        !msg.fromMe && 
        /\b(hello|hi|how|are|you|what|where|when|why|please|thank|thanks|good|morning|afternoon|evening|night|yes|no|ok|okay|can|can't|do|it|system)\b/i.test(msg.body)
      );

      if (englishMessages.length > 0) {
        const lastEnglishMessage = englishMessages[englishMessages.length - 1];
        
        // Mostrar traducción automática para mensajes nuevos
        if (lastEnglishMessage.body.length > 3) {
          console.log('🌐 Mensaje en inglés detectado:', lastEnglishMessage.body);
          
          // Traducción básica automática mejorada
          let spanishTranslation = lastEnglishMessage.body
            .replace(/hello|hi/gi, 'hola')
            .replace(/how are you/gi, 'cómo estás')
            .replace(/good morning/gi, 'buenos días')
            .replace(/good afternoon/gi, 'buenas tardes')
            .replace(/good evening|good night/gi, 'buenas noches')
            .replace(/thank you|thanks/gi, 'gracias')
            .replace(/please/gi, 'por favor')
            .replace(/what/gi, 'qué')
            .replace(/where/gi, 'dónde')
            .replace(/when/gi, 'cuándo')
            .replace(/why/gi, 'por qué')
            .replace(/how/gi, 'cómo')
            .replace(/yes/gi, 'sí')
            .replace(/\bno\b/gi, 'no')
            .replace(/ok|okay/gi, 'está bien')
            .replace(/can't/gi, 'no puedes')
            .replace(/can/gi, 'puedes')
            .replace(/\bdo\b/gi, 'hacer')
            .replace(/\bit\b/gi, 'eso')
            .replace(/system/gi, 'sistema')
            .replace(/\bor\b/gi, 'o');

          if (spanishTranslation !== lastEnglishMessage.body) {
            console.log('🌐 Traducción:', `"${lastEnglishMessage.body}" → "${spanishTranslation}"`);
            
            // Crear un mensaje de traducción interno (solo para nuestro sistema)
            const translationMessage = {
              id: `translation_${lastEnglishMessage.id}_${Date.now()}`,
              body: `🌐 Traducción: "${spanishTranslation}"`,
              fromMe: false,
              timestamp: new Date().toISOString(),
              isTranslation: true, // Marcador especial para mensajes de traducción
              originalMessageId: lastEnglishMessage.id
            };
            
            // Agregar el mensaje de traducción a la lista de mensajes localmente
            // (esto no se envía a WhatsApp, solo aparece en nuestra interfaz)
            if (Array.isArray(messages) && selectedChat) {
              const updatedMessages = [...messages, translationMessage];
              // Esto actualizará la vista local pero no enviará nada a WhatsApp
              queryClient.setQueryData(
                [`/api/whatsapp-accounts/${selectedChat.accountId}/messages/${selectedChat.id}`],
                updatedMessages
              );
            }
          }
        }
      }
    }
  }, [messages, translatorEnabled, lastMessageCount]);

  // Initialize with all accounts selected by default
  useEffect(() => {
    if ((accounts as any[])?.length > 0 && selectedAccounts.length === 0) {
      // Select all accounts by default
      const allAccountIds = (accounts as any[]).map((acc: any) => acc.id);
      setSelectedAccounts(allAccountIds);
    }
  }, [accounts, selectedAccounts]);

  // 1. FUNCIONALIDAD: ASIGNACIÓN PERMANENTE DE AGENTE EXTERNO (RAYO + A.E)
  const handlePermanentAgentAssignment = async () => {
    if (!selectedChat) {
      toast({
        title: "Error",
        description: "Selecciona un chat primero",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('⚡ INICIANDO ASIGNACIÓN PERMANENTE DE AGENTE EXTERNO...');
      
      // Obtener agentes externos disponibles
      const agentsResponse = await fetch('/api/external-agents');
      const agentsData = await agentsResponse.json();
      
      if (!agentsData.success || !agentsData.agents?.length) {
        toast({
          title: "No hay agentes disponibles",
          description: "No se encontraron agentes externos configurados",
          variant: "destructive"
        });
        return;
      }

      // Usar el primer agente disponible o el agente por defecto
      const selectedAgent = agentsData.agents[0];

      // Asignar permanentemente el agente a la cuenta
      const assignResponse = await fetch('/api/whatsapp-accounts/assign-permanent-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedChat.accountId,
          chatId: selectedChat.id,
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          isPermanent: true
        })
      });

      if (assignResponse.ok) {
        const result = await assignResponse.json();
        
        toast({
          title: "⚡ Agente Asignado Permanentemente",
          description: `${selectedAgent.name} ahora está asignado permanentemente a esta cuenta`,
          duration: 4000
        });

        console.log('✅ AGENTE ASIGNADO PERMANENTEMENTE:', selectedAgent.name);
        
        // Actualizar estado local para reflejar la asignación
        queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-accounts'] });
        
      } else {
        throw new Error('Error en la asignación');
      }

    } catch (error) {
      console.error('❌ Error en asignación permanente:', error);
      toast({
        title: "Error en Asignación",
        description: "No se pudo asignar el agente permanentemente",
        variant: "destructive"
      });
    }
  };

  // 2. FUNCIONALIDAD: GENERAR RESPUESTA CON ROBOT A.E (TRADUCCIÓN + RESPUESTA)
  const handleRobotResponseGeneration = async () => {
    if (!selectedChat || !messages?.length) {
      toast({
        title: "Error",
        description: "Selecciona un chat con mensajes primero",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🤖 INICIANDO GENERACIÓN DE RESPUESTA CON ROBOT A.E...');

      // Obtener el último mensaje recibido (no enviado por nosotros)
      const lastIncomingMessage = (messages as any[])
        .filter(msg => !msg.fromMe)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (!lastIncomingMessage) {
        toast({
          title: "No hay mensajes entrantes",
          description: "No se encontró un mensaje entrante para procesar",
          variant: "destructive"
        });
        return;
      }

      let messageText = lastIncomingMessage.body;

      // Detectar si el mensaje está en inglés y traducir automáticamente
      const hasEnglishWords = /\b(hello|hi|how|are|you|what|where|when|why|please|thank|thanks|good|morning|afternoon|evening|night|yes|no|ok|okay|can|do|help|need|want|time|day|work|problem|issue|question|answer|service|customer|support|business|company|price|cost|buy|sell|pay|money|dollar|email|phone|call|message|text|send|receive|order|product|delivery|shipping|return|refund|cancel|confirm|appointment|meeting|schedule|available|busy|sorry|excuse|understand|know|think|believe|sure|maybe|probably|definitely|absolutely|exactly|correct|wrong|right|left|up|down|inside|outside)/i.test(messageText);
      
      if (hasEnglishWords) {
        console.log('🌐 MENSAJE EN INGLÉS DETECTADO - Traduciendo...');
        
        try {
          const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'Traduce el siguiente texto al español de manera natural y conversacional. Responde únicamente con la traducción, sin explicaciones adicionales.'
                },
                {
                  role: 'user',
                  content: messageText
                }
              ],
              max_tokens: 150,
              temperature: 0.3
            })
          });

          if (translationResponse.ok) {
            const translationData = await translationResponse.json();
            messageText = translationData.choices[0]?.message?.content || messageText;
            console.log('✅ MENSAJE TRADUCIDO:', messageText);
          }
        } catch (translationError) {
          console.warn('⚠️ Error en traducción, usando mensaje original:', translationError);
        }
      }

      // Generar respuesta usando OpenAI
      const responseGenerationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente de atención al cliente profesional y amigable. Responde de manera útil, concisa y personalizada al mensaje del cliente. Mantén un tono cordial y profesional.'
            },
            {
              role: 'user',
              content: messageText
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (responseGenerationResponse.ok) {
        const responseData = await responseGenerationResponse.json();
        const generatedResponse = responseData.choices[0]?.message?.content;

        if (generatedResponse) {
          // Colocar la respuesta generada en el input (NO auto-enviar)
          setNewMessage(generatedResponse);
          
          toast({
            title: "🤖 Respuesta Robot A.E Generada",
            description: "Respuesta colocada en el input. Puedes editarla antes de enviar.",
            duration: 4000
          });

          console.log('✅ RESPUESTA ROBOT A.E GENERADA Y COLOCADA EN INPUT');
        }
      } else {
        throw new Error('Error generando respuesta');
      }

    } catch (error) {
      console.error('❌ Error en Robot A.E:', error);
      toast({
        title: "Error Robot A.E",
        description: "No se pudo generar la respuesta automática",
        variant: "destructive"
      });
    }
  };

  // 3. FUNCIONALIDAD: AUTO-ENVÍO INTELIGENTE
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  
  const handleAutoSendToggle = () => {
    setAutoSendEnabled(!autoSendEnabled);
    toast({
      title: autoSendEnabled ? "Auto-envío Desactivado" : "Auto-envío Activado",
      description: autoSendEnabled 
        ? "Los mensajes no se enviarán automáticamente" 
        : "Los mensajes con contenido se enviarán automáticamente",
      duration: 3000
    });
  };

  // Efecto para auto-envío cuando hay contenido generado
  useEffect(() => {
    if (autoSendEnabled && newMessage && newMessage.trim().length > 0 && selectedChat) {
      // Detectar si el mensaje fue generado por Robot A.E (contiene palabras clave de respuesta automática)
      const isGeneratedResponse = /\b(gracias|hola|buenos días|buenas tardes|atención|cliente|servicio|ayuda|consulta|información)/i.test(newMessage);
      
      if (isGeneratedResponse) {
        console.log('🚀 AUTO-ENVÍO ACTIVADO - Enviando mensaje generado automáticamente...');
        
        // Enviar mensaje después de una pequeña pausa
        setTimeout(() => {
          handleSendMessage();
          toast({
            title: "🚀 Mensaje Auto-enviado",
            description: "El mensaje fue enviado automáticamente",
            duration: 3000
          });
        }, 1500);
      }
    }
  }, [newMessage, autoSendEnabled, selectedChat]);





  // Función para manejar mensajes de audio (transcripción)
  const handleAudioMessage = async (message: any) => {
    try {
      toast({
        title: "🎧 Procesando audio...",
        description: "Transcribiendo mensaje de voz...",
      });

      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          audioUrl: message.mediaUrl || message._data?.mediaUrl
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "✅ Audio transcrito",
          description: `Transcripción: "${result.text}"`,
          duration: 5000
        });
      } else {
        throw new Error('Error en la transcripción');
      }
    } catch (error) {
      console.error('Error transcribiendo audio:', error);
      toast({
        title: "Error",
        description: "No se pudo transcribir el audio",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sendMessageMutation.isPending) return;
    
    const originalMessage = newMessage.trim();
    let finalMessage = originalMessage;
    let wasTranslated = false;
    
    // Limpiar el campo de mensaje inmediatamente para evitar envíos duplicados
    setNewMessage('');
    
    // Si el traductor está activado, traducir el mensaje antes de enviarlo
    if (translationEnabled) {
      try {
        console.log('🌐 Traduciendo mensaje al:', selectedLanguage);
        
        // Usar el idioma seleccionado del dropdown
        const sourceLanguage = 'auto'; // Detección automática
        const targetLanguage = selectedLanguage;
        
        // Usar Google Translate API directamente
        const googleTranslateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(finalMessage)}`;
        
        const response = await fetch(googleTranslateUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const translatedText = data[0]?.map((item: any) => item[0]).join('') || finalMessage;
          
          if (translatedText && translatedText !== finalMessage) {
            finalMessage = translatedText;
            wasTranslated = true;
            console.log('✅ Mensaje traducido:', finalMessage);
            
            toast({
              title: "Mensaje traducido",
              description: `Traducido a ${targetLanguage === 'es' ? 'Español' : 'Inglés'}`,
            });
          } else {
            throw new Error('No se pudo obtener traducción');
          }
        } else {
          throw new Error('Error en Google Translate API');
        }
        
      } catch (translateError) {
        console.warn('Google Translate falló, usando traducción básica:', translateError);
        
        // Traducción básica de respaldo
        const isSpanish = /[áéíóúñ¿¡]|hola|como|que|para|con|una|este|todo|pero|muy|cuando|hasta|donde|gracias|por favor/i.test(finalMessage);
        
        if (isSpanish && selectedLanguage === 'en') {
          finalMessage = finalMessage
            .replace(/hola/gi, 'hello')
            .replace(/como estas/gi, 'how are you')
            .replace(/como/gi, 'how')
            .replace(/que tal/gi, 'how are you')
            .replace(/que/gi, 'what')
            .replace(/donde/gi, 'where')
            .replace(/cuando/gi, 'when')
            .replace(/por favor/gi, 'please')
            .replace(/gracias/gi, 'thank you')
            .replace(/buenos días/gi, 'good morning')
            .replace(/buenas tardes/gi, 'good afternoon')
            .replace(/buenas noches/gi, 'good night');
          wasTranslated = true;
        } else if (!isSpanish && selectedLanguage === 'es') {
          finalMessage = finalMessage
            .replace(/hello/gi, 'hola')
            .replace(/how are you/gi, 'como estas')
            .replace(/how/gi, 'como')
            .replace(/what/gi, 'que')
            .replace(/where/gi, 'donde')
            .replace(/when/gi, 'cuando')
            .replace(/please/gi, 'por favor')
            .replace(/thank you/gi, 'gracias')
            .replace(/good morning/gi, 'buenos días')
            .replace(/good afternoon/gi, 'buenas tardes')
            .replace(/good night/gi, 'buenas noches');
          wasTranslated = true;
        }
        
        if (wasTranslated) {
          toast({
            title: "Traducción básica aplicada",
            description: "Se usó traducción simplificada",
          });
        }
      }
    }
    
    // Si el mensaje fue traducido, almacenar el texto original para mostrarlo después
    if (wasTranslated && originalMessage !== finalMessage) {
      setSentMessageOrigins(prev => ({
        ...prev,
        [finalMessage]: originalMessage
      }));
    }

    // Enviar el mensaje una sola vez
    sendMessageMutation.mutate({
      chatId: selectedChat.id,
      accountId: selectedChat.accountId,
      message: finalMessage
    });
    
    // Si SmartBots está activado, generar respuesta automática sugerida
    if (smartBotsEnabled && selectedChat) {
      setTimeout(async () => {
        try {
          const aiResponse = await generateSmartBotsResponse(finalMessage, selectedChat.name);
          if (aiResponse) {
            setNewMessage(aiResponse);
            
            toast({
              title: "🤖 Respuesta AI lista",
              description: "SmartBots ha generado una respuesta sugerida. Puedes editarla antes de enviar.",
            });
          }
        } catch (error) {
          console.error('Error generando respuesta SmartBots:', error);
        }
      }, 1000);
    }
  };

  const handleAccountsChange = (accountIds: number[]) => {
    setSelectedAccounts(accountIds);
    setSelectedChat(null); // Clear selected chat when accounts change
  };

  const handleAccountClick = (accountId: number) => {
    // Focus on specific account
    setSelectedAccounts([accountId]);
    setSelectedChat(null);
  };

  const formatTime = (timestamp: number) => {
    // WhatsApp envía timestamps en segundos Unix, convertir a milisegundos para JavaScript
    return new Date(timestamp * 1000).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };



  const isContactOnline = (chat: WhatsAppChat) => {
    if (chat.isOnline) return true;
    if (chat.lastSeen) {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      return chat.lastSeen > fiveMinutesAgo;
    }
    return false;
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.id === selectedChat?.accountId);
  };

  // Sort chats by activity: unread messages first, then by most recent timestamp
  const sortedChats = useMemo(() => {
    if (!Array.isArray(chats)) return [];
    
    return [...chats].sort((a, b) => {
      // Priority 1: Chats with unread messages first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      
      // Priority 2: Currently selected chat should stay visible but not necessarily at top
      // Priority 3: Most recent activity (highest timestamp first)
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampB - timestampA;
    });
  }, [chats]);

  // Function to reorder chats when new message arrives
  const handleNewMessageReceived = useCallback((chatId: string) => {
    // Force chat list refresh to reorder by latest activity
    queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/chats'] });
    
    // Also refresh the chat list for specific accounts to ensure real-time updates
    if (selectedAccounts.length > 0) {
      selectedAccounts.forEach(accountId => {
        queryClient.invalidateQueries({ queryKey: [`/api/whatsapp-accounts/${accountId}/chats`] });
      });
    }
  }, [queryClient, selectedAccounts]);

  const filteredChats = sortedChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Cargando cuentas WhatsApp...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen bg-gray-50">
      {/* Left Panel - Chat List (30%) */}
      <div className="w-[30%] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Header with Account Selector */}
        <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-red-600 via-black to-red-600 flex-shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">WhatsApp Business</h2>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {selectedAccounts.length}/{(accounts as any[])?.length || 0} seleccionadas
              </Badge>
            </div>
            
            <AccountSelector
              accounts={accounts as any}
              selectedAccounts={selectedAccounts}
              onAccountsChange={handleAccountsChange}
              onAccountClick={handleAccountClick}
            />
            

          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <Input
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>



        {/* Chat List */}
        <ScrollArea className="flex-1">
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Cargando chats...</span>
            </div>
          ) : (filteredChats as any[])?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {selectedAccounts.length === 0 
                ? "Selecciona una cuenta para ver los chats"
                : "No hay chats disponibles"
              }
            </div>
          ) : (
            <div className="space-y-1 p-2 text-[12px]">
              <AnimatePresence>
                {(filteredChats as any[])?.map((chat: any, index: number) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 text-[12px]"
                    onClick={() => handleChatSelect?.(chat)}
                  >
                    <div className="flex items-center space-x-3 pl-[-20px] pr-[-20px] ml-[-13px] mr-[-13px] text-[12px]">
                      <div className="relative">
                        <WhatsAppProfilePicture
                          contactId={chat.id}
                          accountId={chat.accountId}
                          contactName={chat.name}
                          isGroup={chat.isGroup}
                          size="lg"
                          className="h-12 w-12"
                        />
                        {isContactOnline(chat) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 ml-[15px] mr-[15px] pl-[-6px] pr-[-6px]">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 truncate">{chat.name}</span>
                            {chat.isGroup && <Users className="h-4 w-4 text-gray-400" />}
                          </div>
                          <div className="flex items-center space-x-1">
                            <WhatsAppAccountBadge accountId={chat.accountId} />
                            <span className="text-xs text-gray-500">
                              {formatTime(chat.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            {/* Chat Assignment Info - Cada chat maneja su propio agente */}
                            <ChatAssignmentBadge chatId={chat.id} accountId={chat.accountId} />
                            
                            {/* Ticket Badge Individual - Cada chat maneja su propio ticket */}
                            <ChatCategorizationBadge chatId={chat.id} accountId={chat.accountId} />
                            
                            {/* Comments Indicator */}
                            <ChatCommentsIndicator chatId={chat.id} />
                          </div>
                          
                          {chat.unreadCount > 0 && (
                            <Badge className="bg-green-500 text-white ml-2">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>


                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </div>
      {/* Middle Panel - Chat Messages (50%) */}
      <div className="w-[50%] flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-black flex-shrink-0 pt-[28px] pb-[28px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <WhatsAppProfilePicture
                      contactId={selectedChat.id}
                      accountId={selectedChat.accountId}
                      contactName={selectedChat.name}
                      isGroup={selectedChat.isGroup}
                      size="md"
                      className="h-10 w-10"
                    />
                    {isContactOnline(selectedChat) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-white">{selectedChat.name}</h3>
                      {selectedChat.isGroup && <Users className="h-4 w-4 text-red-400" />}
                      <WhatsAppAccountBadge accountId={selectedChat.accountId} />
                      <TicketStatusBadge chatId={selectedChat.id} />
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-red-400">
                      {isContactOnline(selectedChat) ? (
                        <span className="flex items-center space-x-1 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>En línea</span>
                        </span>
                      ) : selectedChat.lastSeen ? (
                        <span>Última vez: {formatTime(selectedChat.lastSeen)}</span>
                      ) : (
                        <AgentAssignmentDisplay chatId={selectedChat.id} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">

                  {/* BOTÓN CONFIGURACIÓN A.E - AGENTES EXTERNOS */}

                  
                  {/* A.E AI SWITCH - RESPUESTAS AUTOMÁTICAS */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Button
                      size="sm"
                      variant={externalAgentActive ? "default" : "outline"}
                      className="hidden" // Ocultar el botón A.E AI original
                      onClick={async () => {
                        console.log('🚀 A.E AI TOGGLE PRESIONADO');
                        
                        if (!selectedChat) {
                          toast({
                            title: "Error",
                            description: "Selecciona un chat primero",
                            variant: "destructive"
                          });
                          return;
                        }

                        try {
                          setExternalAgentProcessing(true);
                          const newState = !externalAgentActive;
                          
                          console.log(`📡 ${newState ? 'ACTIVANDO' : 'DESACTIVANDO'} A.E AI para ${selectedChat.id}`);
                          
                          // Usar el mismo endpoint que funciona en configuración de cuentas
                          const response = await fetch(`/api/whatsapp-accounts/${selectedChat.accountId}/assign-external-agent`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              externalAgentId: newState ? "2" : null, // Usar agente 2 que ya está configurado
                              autoResponseEnabled: newState
                            })
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            console.log('✅ Resultado:', result);
                            
                            if (result.success) {
                              setExternalAgentActive(newState);
                              
                              toast({
                                title: `🤖 A.E AI ${newState ? 'Activado' : 'Desactivado'}`,
                                description: newState 
                                  ? `Agente externo activado - responderá automáticamente a mensajes`
                                  : `Agente externo desactivado`,
                              });
                              
                              console.log(`✅ A.E AI ${newState ? 'ACTIVADO' : 'DESACTIVADO'} exitosamente`);
                            } else {
                              throw new Error(result.message || 'Error en la configuración');
                            }
                          } else {
                            const errorText = await response.text();
                            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
                          }
                        } catch (error) {
                          console.error('❌ Error A.E AI:', error);
                          toast({
                            title: "Error",
                            description: "No se pudo cambiar el estado del A.E AI",
                            variant: "destructive"
                          });
                        } finally {
                          setExternalAgentProcessing(false);
                        }
                      }}
                      disabled={externalAgentProcessing}
                    >
                      {externalAgentProcessing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4 mr-2" />
                      )}
                      A.E AI
                      {externalAgentActive && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                      )}
                    </Button>
                  </motion.div>

                  {/* SELECTOR DE AGENTE EXTERNO REMOVIDO */}





                  {/* BOTÓN DE PRUEBA A.E AI - ELIMINADO COMPLETAMENTE */}
                  {false && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="hidden border-green-600 text-green-600 hover:bg-green-50 transition-all duration-300"
                        onClick={async () => {
                          if (!selectedChat) return;
                          
                          try {
                            console.log('🧪 PROBANDO A.E AI');
                            
                            const response = await fetch('/api/debug-ae-ai/probe', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                chatId: selectedChat.id,
                                message: "Hola, necesito ayuda con información sobre productos",
                                accountId: selectedChat.accountId
                              })
                            });
                            
                            if (response.ok) {
                              const result = await response.json();
                              console.log('📋 Resultado completo de A.E AI:', result);
                              
                              if (result.success && result.processed) {
                                toast({
                                  title: "✅ A.E AI Funcionando",
                                  description: `Respuesta generada por ${result.config?.agentName || 'Smartbots'}. Revisa la consola del servidor para ver la respuesta completa.`,
                                  duration: 8000,
                                });
                              } else if (result.needsActivation) {
                                toast({
                                  title: "⚠️ A.E AI Inactivo",
                                  description: "Activa primero el A.E AI presionando el botón morado.",
                                  variant: "destructive",
                                  duration: 5000,
                                });
                              } else {
                                toast({
                                  title: "❌ Error A.E AI",
                                  description: result.message || "No se pudo procesar el mensaje",
                                  variant: "destructive",
                                  duration: 5000,
                                });
                              }
                            } else {
                              throw new Error(`HTTP ${response.status}`);
                            }
                          } catch (error) {
                            console.error('❌ Error probando A.E AI:', error);
                            toast({
                              title: "❌ Error de Conexión",
                              description: "No se pudo conectar con el servidor A.E AI",
                              variant: "destructive",
                              duration: 5000,
                            });
                          }
                        }}
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        Probar
                      </Button>
                    </motion.div>
                  )}
                  



                  
                  {/* Comments Button - OCULTO */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="hidden"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-50 shadow-sm transition-all duration-300 relative"
                      onClick={() => setCommentsDialogOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Comentarios
                      {chatComments.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                          {chatComments.length}
                        </span>
                      )}
                    </Button>
                  </motion.div>
                  

                  


                  {/* Profile Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserProfile(true)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area - Aligned with Header */}
            <ScrollArea className="flex-1 py-4 text-[12px]">
              <div className="px-0">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Cargando mensajes...</span>
                  </div>
                ) : (!messages || !Array.isArray(messages) || messages.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
                    <p>No hay mensajes en este chat</p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    {/* Messages Container - Centered in message area */}
                    <div className="w-full max-w-4xl space-y-4 px-4 py-4 text-[10px] text-left overflow-hidden">
                  {messages.map((message, index) => {
                    const showAvatar = selectedChat.isGroup && !message.fromMe;
                    const isFirstFromAuthor = index === 0 || 
                      messages[index - 1].author !== message.author || 
                      messages[index - 1].fromMe !== message.fromMe;
                    
                    // Identificar si este es el último mensaje recibido (no enviado por nosotros)
                    const lastIncomingMessageId = getLastIncomingMessageId(messages);
                    const isLastIncomingMessage = !message.fromMe && message.id === lastIncomingMessageId;
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex mb-1 ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                        style={{ marginLeft: '5px', marginRight: '5px' }}
                      >
                        <div className={`flex space-x-2 ${message.fromMe ? 'max-w-[75%] flex-row-reverse space-x-reverse' : 'max-w-[75%]'}`}>
                          {showAvatar && isFirstFromAuthor && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={message.authorProfilePic} />
                              <AvatarFallback className="text-xs bg-gray-200">
                                {message.author?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className={`${showAvatar && !isFirstFromAuthor ? 'ml-10' : ''}`}>
                            {selectedChat.isGroup && !message.fromMe && isFirstFromAuthor && (
                              <div className="text-xs text-gray-500 mb-1 px-3">
                                {message.author || message.authorNumber}
                              </div>
                            )}
                            
                            <div className={`flex items-end gap-1 ${message.fromMe ? 'justify-end' : 'flex-row'}`}>
                              {message.fromMe && (
                                <div className="text-xs text-gray-500 flex-shrink-0">
                                  {formatTime(message.timestamp)}
                                </div>
                              )}
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  message.fromMe
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-green-500 text-white rounded-bl-md'
                                }`}
                              >
                                {/* Mensajes de audio/nota de voz con transcripción */}
                                {(message.type === 'ptt' || message.type === 'audio') ? (
                                  <VoiceNoteMessage 
                                    messageId={message.id} 
                                    chatId={selectedChat.id}
                                    accountId={selectedChat.accountId}
                                  />
                                ) : message.type === 'image' ? (
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="bg-gray-600 rounded-full p-2">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-600">Nota de voz</span>
                                        <div className="flex items-center space-x-2">
                                          <audio 
                                            controls 
                                            className="max-w-[200px] h-8"
                                            src={`/api/whatsapp-accounts/${selectedChat.accountId}/messages/${selectedChat.id}/audio/${message.id}`}
                                            onLoadStart={() => console.log('🎵 Cargando audio...')}
                                            onCanPlay={() => console.log('✅ Audio listo para reproducir')}
                                            onError={(e) => {
                                              console.log('❌ Error cargando audio:', e);
                                              // Mostrar mensaje de error al usuario
                                              const audioElement = e.currentTarget;
                                              audioElement.style.display = 'none';
                                              if (audioElement.nextElementSibling) {
                                                (audioElement.nextElementSibling as HTMLElement).style.display = 'block';
                                              }
                                            }}
                                            >
                                              Tu navegador no soporta audio.
                                            </audio>
                                          <div style={{ display: 'none' }} className="text-xs text-red-500">
                                            ⚠️ Audio no disponible
                                          </div>
                                        </div>
                                        {(message.mediaUrl || message._data?.mediaUrl) && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => handleAudioMessage(message)}
                                          >
                                            📝 Transcribir
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : message.type === 'image' ? (
                                  /* Mensajes de imagen */
                                  (<div className="space-y-2">
                                    {message.mediaUrl || message._data?.mediaUrl ? (
                                      <img 
                                        src={message.mediaUrl || message._data?.mediaUrl} 
                                        alt="Imagen enviada"
                                        className="max-w-[250px] max-h-[250px] rounded-lg object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.nextElementSibling.style.display = 'block';
                                        }}
                                      />
                                    ) : null}
                                    <div style={{ display: 'none' }} className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                                      📸 Imagen no disponible
                                    </div>
                                    {message.body && (
                                      <div>
                                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                                        {!message.fromMe && (
                                          <MessageTranslation 
                                            text={message.body} 
                                            messageId={message.id}
                                            translationEnabled={translationEnabled}
                                            messages={messages}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>)
                                ) : (
                                  /* Mensajes de texto normales */
                                  (<div>
                                    <p className="text-sm whitespace-pre-wrap">{message.body || '[Mensaje sin contenido]'}</p>
                                    {!message.fromMe && message.body && (
                                      <MessageTranslation 
                                        text={message.body} 
                                        messageId={message.id}
                                        translationEnabled={translationEnabled}
                                        messages={messages}
                                      />
                                    )}
                                    {/* Mostrar texto original debajo del traducido para mensajes enviados */}
                                    {message.fromMe && translationEnabled && (sentMessageOrigins[message.id] || sentMessageOrigins[message.body]) && (
                                      <div className="mt-2 p-2 bg-gray-50 rounded-md border-l-4 border-gray-300">
                                        <div className="flex items-start gap-2">
                                          <span className="text-gray-600 text-xs font-medium">📝</span>
                                          <p className="text-gray-700 text-xs leading-relaxed flex-1">
                                            {sentMessageOrigins[message.id] || sentMessageOrigins[message.body]}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>)
                                )}
                              </div>
                              {!message.fromMe && (
                                <div className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-1">
                                  {formatTime(message.timestamp)}
                                  {isLastIncomingMessage && (
                                    <>
                                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium animate-pulse">
                                        ÚLTIMO RECIBIDO
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                              {message.fromMe && (
                                <div className="text-xs pt-[10px] pb-[10px] ml-[2px] mr-[8px] flex-shrink-0">
                                  <span className={`${
                                    message.messageRead 
                                      ? 'text-blue-500' 
                                      : message.type === 'delivered' 
                                        ? 'text-gray-500' 
                                        : 'text-gray-400'
                                  }`}>
                                    {message.messageRead 
                                      ? '✓✓' 
                                      : (message.type === 'delivered' || message.type === 'received') 
                                        ? '✓✓' 
                                        : '✓'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Enhanced Message Input with Tools */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Toolbar */}
              <div className="flex items-center space-x-2 mb-3">

                {/* Emoji Picker */}
                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid grid-cols-8 gap-2 p-2">
                      {['😊', '😂', '❤️', '👍', '👋', '🙏', '😘', '😍', '🤔', '😅', '👌', '🔥', '💯', '✨', '🎉', '🚀', '💪', '🙌', '👏', '💝', '🌟', '⭐', '💖', '💕'].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg"
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setEmojiPickerOpen(false);
                          }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* File Attachment Menu */}
                <Popover open={fileMenuOpen} onOpenChange={setFileMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          // Trigger file input for images
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              toast({
                                title: "Imagen seleccionada",
                                description: `${file.name} listo para enviar`,
                              });
                            }
                          };
                          input.click();
                          setFileMenuOpen(false);
                        }}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Imagen
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          // Trigger file input for videos
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'video/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              toast({
                                title: "Video seleccionado",
                                description: `${file.name} listo para enviar`,
                              });
                            }
                          };
                          input.click();
                          setFileMenuOpen(false);
                        }}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          // Trigger file input for documents
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.pptx';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              toast({
                                title: "Documento seleccionado",
                                description: `${file.name} listo para enviar`,
                              });
                            }
                          };
                          input.click();
                          setFileMenuOpen(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Documento
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          // Trigger file input for any file
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              toast({
                                title: "Archivo seleccionado",
                                description: `${file.name} listo para enviar`,
                              });
                            }
                          };
                          input.click();
                          setFileMenuOpen(false);
                        }}
                      >
                        <File className="h-4 w-4 mr-2" />
                        Archivo
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Botón R.A AI eliminado según solicitud del usuario */}

                {/* Voice Note Button with Sound Waves */}
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  className={`h-9 px-3 ${isRecording ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={!selectedChat}
                >
                  {isRecording ? (
                    <div className="flex items-center space-x-1">
                      <span>🎤</span>
                      {/* Animated Sound Waves */}
                      <div className="flex items-center space-x-0.5">
                        <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                        <div className="w-0.5 h-4 bg-white rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                        <div className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                        <div className="w-0.5 h-5 bg-white rounded-full animate-pulse" style={{animationDelay: '450ms'}}></div>
                        <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{animationDelay: '600ms'}}></div>
                      </div>
                    </div>
                  ) : (
                    <span>🎤</span>
                  )}
                </Button>

                {/* Translator with Language Selector */}
                <Popover open={languageSelectorOpen} onOpenChange={setLanguageSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={translationEnabled ? "default" : "outline"}
                      size="sm"
                      className={`h-9 px-3 ${translationEnabled ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    >
                      <Languages className="h-4 w-4 mr-1" />
                      {translationEnabled ? 
                        availableLanguages.find(lang => lang.code === selectedLanguage)?.flag : 
                        '🌐'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Traductor</h4>
                        <Button
                          variant={translationEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setTranslationEnabled(!translationEnabled);
                            toast({
                              title: translationEnabled ? "Traductor desactivado" : "Traductor activado",
                              description: translationEnabled 
                                ? "Las respuestas automáticas se enviarán en español" 
                                : `Las respuestas automáticas se traducirán al ${availableLanguages.find(l => l.code === selectedLanguage)?.name}`,
                            });
                          }}
                        >
                          {translationEnabled ? 'ON' : 'OFF'}
                        </Button>
                      </div>
                      
                      {translationEnabled && (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-600 font-medium">Idioma de destino:</label>
                          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                            {availableLanguages.map((language) => (
                              <Button
                                key={language.code}
                                variant={selectedLanguage === language.code ? "default" : "ghost"}
                                size="sm"
                                className="justify-start text-xs p-2 h-8"
                                onClick={() => {
                                  setSelectedLanguage(language.code);
                                  toast({
                                    title: "Idioma seleccionado",
                                    description: `Las respuestas automáticas se traducirán al ${language.name}`,
                                    duration: 2000
                                  });
                                  setLanguageSelectorOpen(false);
                                }}
                              >
                                <span className="mr-1">{language.flag}</span>
                                <span className="truncate">{language.name}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        {translationEnabled ? 
                          `🤖 Las respuestas automáticas se enviarán en ${availableLanguages.find(l => l.code === selectedLanguage)?.name}` :
                          'Las respuestas automáticas se enviarán en español'
                        }
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder={translatorEnabled ? "Escribe un mensaje (se traducirá automáticamente)..." : isAutoSending ? "Auto-enviando en 5 segundos..." : "Escribe un mensaje..."}
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewMessage(value);
                    
                    // Auto-envío con delay de 5 segundos
                    if (autoSendTimer) {
                      clearTimeout(autoSendTimer);
                      setAutoSendTimer(null);
                      setIsAutoSending(false);
                    }
                    
                    if (value.trim().length > 0) {
                      setIsAutoSending(true);
                      const timer = setTimeout(() => {
                        if (newMessage.trim().length > 0) {
                          handleSendMessage();
                        }
                        setIsAutoSending(false);
                        setAutoSendTimer(null);
                      }, 5000);
                      setAutoSendTimer(timer);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // Cancelar auto-envío si el usuario presiona Enter manualmente
                      if (autoSendTimer) {
                        clearTimeout(autoSendTimer);
                        setAutoSendTimer(null);
                        setIsAutoSending(false);
                      }
                      handleSendMessage();
                    }
                  }}
                  className={`flex-1 ${isAutoSending ? 'border-orange-400 bg-orange-50' : ''}`}
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
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
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Selecciona una conversación</h3>
              <p>Elige un chat de la lista para empezar a conversar</p>
            </div>
          </div>
        )}
      </div>
      {/* Dialogs */}
      {selectedChat && (
        <ChatAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          chatId={assignmentChatId || selectedChat.id}
          accountId={assignmentAccountId || selectedChat.accountId}
        />
      )}
      {/* Right Panel - Contact Information (20%) */}
      <div className="w-[20%] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        {selectedChat ? (
          <ContactInfoPanel chat={selectedChat} setCommentsDialogOpen={setCommentsDialogOpen} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Información del Contacto</h3>
              <p>Selecciona un chat para ver los datos del contacto</p>
            </div>
          </div>
        )}
      </div>
      {selectedChat && (
        <ChatCommentsDialog
          open={commentsDialogOpen}
          onOpenChange={setCommentsDialogOpen}
          chatId={selectedChat.id}
          chatName={selectedChat.name}
        />
      )}
      {/* Diálogo de Configuración de Auto-Click */}
      <AutoClickConfigDialog
        open={showAutoClickConfig}
        onOpenChange={setShowAutoClickConfig}
        settings={autoClickSettings}
        onSave={saveAutoClickSettings}
      />
      {/* Diálogo de Configuración de Auto A.E. */}
      <AutoAEConfigDialog
        open={showAutoAEConfig}
        onOpenChange={setShowAutoAEConfig}
        config={autoAEConfig}
        onSave={(newConfig) => {
          setAutoAEConfig(newConfig);
          if (newConfig.enabled) {
            enableAutoAE();
            toast({
              title: "Auto A.E. Configurado",
              description: `Activado con delay de ${newConfig.delay/1000}s${newConfig.selectedAgentId ? ` usando agente ${newConfig.selectedAgentId}` : ''}`,
            });
          } else {
            disableAutoAE();
            toast({
              title: "Auto A.E. Desactivado",
              description: "Auto-click del botón A.E. desactivado",
            });
          }
        }}
        selectedChat={selectedChat}
      />
    </div>
  );
}

// Componente del Panel de Información del Contacto
function ContactInfoPanel({ chat, setCommentsDialogOpen }: { chat: WhatsAppChat; setCommentsDialogOpen: (open: boolean) => void }) {
  const { data: chatAssignment } = useQuery({
    queryKey: [`/api/chat-assignments/${chat.id}`],
    enabled: !!chat.id
  });
  
  const { data: chatComments } = useQuery({
    queryKey: [`/api/chat-comments/${chat.id}`],
    enabled: !!chat.id
  });
  
  const { data: externalAgentsResponse } = useQuery({
    queryKey: ['/api/external-agents'],
  });
  
  const { data: accounts } = useQuery({
    queryKey: ['/api/whatsapp/accounts']
  });
  
  // Función para obtener el nombre del agente asignado del sistema
  const getSystemAgentName = () => {
    if (chatAssignment && (chatAssignment as any).assignedToId) {
      return `Usuario ${(chatAssignment as any).assignedToId}`;
    }
    return "Sin asignar";
  };
  
  // Función para obtener el agente de respuesta automática
  const getAutoResponseAgent = () => {
    const account = (accounts as any[])?.find(acc => acc.id === chat.accountId);
    if (account?.assignedExternalAgentId) {
      const agent = (externalAgentsResponse as any)?.agents?.find((agent: any) => agent.id === account.assignedExternalAgentId);
      return agent ? agent.name : "Agente desconocido";
    }
    return "Sin agente automático";
  };
  
  // Simular datos de mensajes (en una implementación real, esto vendría del backend)
  const getMessageStats = () => {
    // Aquí deberías obtener las estadísticas reales de mensajes desde el backend
    return {
      sent: 12,
      replied: 8
    };
  };
  
  const messageStats = getMessageStats();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-black pt-[28px] pb-[28px]">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={chat.profilePicUrl} />
            <AvatarFallback className="bg-red-600 text-white font-semibold">
              {chat.isGroup ? <Users className="h-6 w-6" /> : chat.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-lg">{chat.name}</h3>
            <p className="text-red-400 text-sm">{chat.isGroup ? 'Grupo' : 'Contacto individual'}</p>
            <div className="mt-2">
              <WhatsAppAccountBadge accountId={chat.accountId} />
            </div>
          </div>
        </div>
      </div>
      {/* Contact Information */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          
          {/* a. Nombre */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Nombre</span>
            </div>
            <p className="text-gray-900 font-medium">{chat.name}</p>
          </div>

          {/* b. Número */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Número</span>
            </div>
            <p className="text-gray-900 font-mono">{chat.id.replace('@c.us', '').replace('@g.us', '')}</p>
          </div>

          {/* c. Leads */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Leads</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">Potencial cliente</span>
              <Badge variant="outline" className="text-xs">
                Activo
              </Badge>
            </div>
          </div>

          {/* d. Tickets */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Tickets</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">
                {(chatAssignment as any)?.category || 'Sin categoría'}
              </span>
              <Badge variant="secondary" className="text-xs">
                {(chatAssignment as any)?.status || 'Pendiente'}
              </Badge>
            </div>
          </div>

          {/* e. Agente del Sistema */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <UserCheck className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Agente del Sistema</span>
            </div>
            <p className="text-gray-900">{getSystemAgentName()}</p>
          </div>

          {/* f. Agente de Respuesta Automática */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Bot className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Agente de Respuesta Automática</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">{getAutoResponseAgent()}</span>
              <Badge variant={getAutoResponseAgent() !== "Sin agente automático" ? "default" : "secondary"} className="text-xs">
                {getAutoResponseAgent() !== "Sin agente automático" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>

          {/* g. Sección de Comentarios - CLICKEABLE */}
          <div className="bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200" onClick={() => setCommentsDialogOpen(true)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MessageSquareText className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm text-gray-700">Comentarios</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {(chatComments as any)?.length || 0}
              </Badge>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(chatComments as any)?.length > 0 ? (
                (chatComments as any).map((comment: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded-lg text-xs border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-blue-600 text-xs">
                        {comment.createdBy || comment.agentName || 'Agente'}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(comment.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Sin comentarios</p>
                  <p className="text-gray-400 text-xs mt-1">Los comentarios aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>

          {/* h. Cantidad de Mensajes */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <MessageCircle className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm text-gray-700">Estadísticas de Mensajes</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-100 p-2 rounded text-center">
                <div className="text-green-700 font-semibold text-lg">{messageStats.sent}</div>
                <div className="text-green-600 text-xs">Enviados</div>
              </div>
              <div className="bg-blue-100 p-2 rounded text-center">
                <div className="text-blue-700 font-semibold text-lg">{messageStats.replied}</div>
                <div className="text-blue-600 text-xs">Respondidos</div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-500">
                Tasa de respuesta: {messageStats.sent > 0 ? Math.round((messageStats.replied / messageStats.sent) * 100) : 0}%
              </span>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

// Componente del Diálogo de Configuración de Auto-Click
function AutoClickConfigDialog({ 
  open, 
  onOpenChange, 
  settings, 
  onSave 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: {
    aeWaitTime: number;
    sendWaitTime: number;
    enabled: boolean;
  };
  onSave: (newSettings: typeof settings) => void;
}) {
  const [tempSettings, setTempSettings] = useState(settings);
  const [autoFunctionsStatus, setAutoFunctionsStatus] = useState(getAutoFunctionsStatus());

  useEffect(() => {
    setTempSettings(settings);
    setAutoFunctionsStatus(getAutoFunctionsStatus());
  }, [settings]);

  const handleSave = () => {
    onSave(tempSettings);
  };

  const handleToggleAutoAE = () => {
    // Verificar si las respuestas automáticas de la cuenta están activas
    const hasActiveAutoResponse = accounts?.some((acc: any) => 
      acc.autoResponseEnabled && acc.assignedExternalAgentId
    );
    
    if (hasActiveAutoResponse) {
      toast({
        title: "Conflicto Detectado",
        description: "Las respuestas automáticas de la cuenta están activas. Desactívalas primero para usar Auto A.E.",
        variant: "destructive"
      });
      return;
    }
    
    const newStatus = toggleAutoAE();
    setAutoFunctionsStatus(getAutoFunctionsStatus());
    toast({
      title: newStatus ? "🟢 Auto A.E. Activado" : "🔴 Auto A.E. Desactivado",
      description: newStatus 
        ? "Detectará mensajes nuevos y hará click en A.E. después de 2 segundos"
        : "Auto-click del botón A.E. desactivado",
    });
  };

  const handleToggleAutoSend = () => {
    const newStatus = toggleAutoSend();
    setAutoFunctionsStatus(getAutoFunctionsStatus());
    toast({
      title: newStatus ? "🟢 Auto-Envío Activado" : "🔴 Auto-Envío Desactivado", 
      description: newStatus
        ? "Auto-envío cada 3-5 segundos desde el área de input"
        : "Auto-envío desactivado",
    });
  };

  const presets = [
    { name: "Rápido", ae: 2000, send: 4000 },
    { name: "Normal", ae: 4000, send: 8000 },
    { name: "Lento", ae: 6000, send: 12000 },
    { name: "Muy Lento", ae: 10000, send: 20000 }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Funciones Automáticas</span>
          </DialogTitle>
          <DialogDescription>
            Configura las funciones automáticas inteligentes para WhatsApp
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* FUNCIONES AUTOMÁTICAS NUEVAS */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
            <h3 className="text-sm font-semibold mb-4 text-gray-800">🚀 Funciones Automáticas Mejoradas</h3>
            
            {/* Auto A.E. */}
            <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Auto A.E. (2 segundos)</span>
                  <Badge variant={autoFunctionsStatus.autoAE ? "default" : "secondary"} className="text-xs">
                    {autoFunctionsStatus.autoAE ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">
                  Detecta mensajes nuevos y hace click automático en botón A.E. azul después de 2 segundos
                </p>
              </div>
              <Button
                onClick={handleToggleAutoAE}
                variant={autoFunctionsStatus.autoAE ? "default" : "outline"}
                size="sm"
                className={autoFunctionsStatus.autoAE ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                {autoFunctionsStatus.autoAE ? "Desactivar" : "Activar"}
              </Button>
            </div>

            {/* Auto-Envío */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Send className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Auto-Envío (3-5 segundos)</span>
                  <Badge variant={autoFunctionsStatus.autoSend ? "default" : "secondary"} className="text-xs">
                    {autoFunctionsStatus.autoSend ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">
                  Envía automáticamente mensajes del área de input cada 3-5 segundos (aleatorio)
                </p>
              </div>
              <Button
                onClick={handleToggleAutoSend}
                variant={autoFunctionsStatus.autoSend ? "default" : "outline"}
                size="sm"
                className={autoFunctionsStatus.autoSend ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {autoFunctionsStatus.autoSend ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* CONFIGURACIÓN AVANZADA */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-800">⚙️ Configuración Avanzada (Sistema Anterior)</h3>
            
            {/* Presets Rápidos */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Presets Rápidos</label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setTempSettings({
                      ...tempSettings,
                      aeWaitTime: preset.ae,
                      sendWaitTime: preset.send
                    })}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tiempo de espera después del clic A.E */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Tiempo después del clic "🤖 A.E" (milisegundos)
              </label>
              <Input
                type="number"
                min="1000"
                max="30000"
                step="500"
                value={tempSettings.aeWaitTime}
                onChange={(e) => setTempSettings({
                  ...tempSettings,
                  aeWaitTime: parseInt(e.target.value) || 4000
                })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tiempo que espera para que se genere la respuesta del agente (1-30 segundos)
              </p>
            </div>

            {/* Intervalo entre ciclos */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Intervalo entre ciclos automáticos (milisegundos)
              </label>
              <Input
                type="number"
                min="2000"
                max="60000"
                step="1000"
                value={tempSettings.sendWaitTime}
                onChange={(e) => setTempSettings({
                  ...tempSettings,
                  sendWaitTime: parseInt(e.target.value) || 8000
                })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tiempo entre cada ejecución del auto-click (2-60 segundos)
              </p>
            </div>

            {/* Vista previa de tiempos */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Vista Previa Sistema Anterior:</h4>
              <div className="text-xs text-gray-700 space-y-1">
                <div>• Clic en "🤖 A.E" → Esperar {tempSettings.aeWaitTime / 1000}s → Clic en "Enviar"</div>
                <div>• Repetir cada {tempSettings.sendWaitTime / 1000} segundos</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente del Diálogo de Configuración de Auto A.E.
function AutoAEConfigDialog({ 
  open, 
  onOpenChange, 
  config, 
  onSave,
  selectedChat
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: {
    delay: number;
    selectedAgentId: string;
    enabled: boolean;
  };
  onSave: (newConfig: typeof config) => void;
  selectedChat: WhatsAppChat | null;
}) {
  const [tempConfig, setTempConfig] = useState(config);

  // Obtener agentes externos configurados
  const { data: externalAgentsResponse, isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/external-agents'],
    retry: false,
    staleTime: 60000
  });

  // Obtener configuración de respuestas automáticas de la cuenta
  const { data: autoResponseConfig } = useQuery({
    queryKey: ['/api/auto-response-config', selectedChat?.accountId],
    enabled: !!selectedChat?.accountId,
    retry: false
  });

  const externalAgents = externalAgentsResponse?.agents || [];
  
  console.log('🔍 Debug AutoAE Dialog:', {
    open,
    externalAgentsResponse,
    agentsCount: externalAgents.length,
    agentsLoading
  });

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  const handleSave = async () => {
    // Si se ha seleccionado un agente específico, asignarlo automáticamente a la cuenta
    if (tempConfig.selectedAgentId && tempConfig.selectedAgentId !== "none" && selectedChat) {
      try {
        const response = await fetch('/api/external-agents/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: selectedChat.accountId,
            externalAgentId: parseInt(tempConfig.selectedAgentId),
            autoResponseEnabled: true,
            responseDelay: 3
          }),
        });

        if (response.ok) {
          toast({
            title: "Agente Asignado Automáticamente",
            description: `El agente se ha asignado permanentemente a la cuenta WhatsApp ${selectedChat.accountId}`,
          });
        }
      } catch (error) {
        console.error('Error asignando agente automáticamente:', error);
      }
    }
    
    onSave(tempConfig);
    onOpenChange(false);
  };

  const delayPresets = [
    { name: "Instantáneo", delay: 500 },
    { name: "Rápido", delay: 1000 },
    { name: "Normal", delay: 2000 },
    { name: "Lento", delay: 3000 },
    { name: "Muy Lento", delay: 5000 }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <span>Configuración Auto A.E.</span>
          </DialogTitle>
          <DialogDescription>
            Configura el auto-click del botón A.E. con tiempo de tardanza y agente asignado
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Estado actual */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <span className="font-medium text-sm">Estado Actual</span>
              <p className="text-xs text-gray-600">
                {getAutoFunctionsStatus().autoAE ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <Badge variant={getAutoFunctionsStatus().autoAE ? "default" : "secondary"}>
              {getAutoFunctionsStatus().autoAE ? "FUNCIONANDO" : "DETENIDO"}
            </Badge>
          </div>

          {/* Toggle principal */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-sm">Activar Auto A.E.</label>
              <p className="text-xs text-gray-500">
                Detecta mensajes nuevos y hace click automático en A.E.
              </p>
            </div>
            <Button
              variant={tempConfig.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => setTempConfig({...tempConfig, enabled: !tempConfig.enabled})}
              className={tempConfig.enabled ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              {tempConfig.enabled ? "Activado" : "Desactivado"}
            </Button>
          </div>

          {/* Configuraciones solo si está activado */}
          {tempConfig.enabled && (
            <>
              {/* Tiempo de tardanza */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tiempo de Tardanza
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {delayPresets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant={tempConfig.delay === preset.delay ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTempConfig({
                        ...tempConfig,
                        delay: preset.delay
                      })}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="500"
                    max="10000"
                    step="100"
                    value={tempConfig.delay}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      delay: parseInt(e.target.value) || 2000
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">ms</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tiempo que espera después de detectar un mensaje nuevo ({tempConfig.delay/1000}s)
                </p>
              </div>

              {/* Selector de Agente */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Agente Asignado
                </label>
                {externalAgents.length > 0 ? (
                  <Select
                    value={tempConfig.selectedAgentId}
                    onValueChange={(value) => setTempConfig({
                      ...tempConfig,
                      selectedAgentId: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar agente externo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin agente específico</SelectItem>
                      {externalAgents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.isActive ? 'Activo' : 'Inactivo'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No hay agentes externos configurados</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ve a la página de Cuentas WhatsApp para configurar agentes
                    </p>
                  </div>
                )}
                
                {tempConfig.selectedAgentId && tempConfig.selectedAgentId !== "none" && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Usará el agente seleccionado para generar respuestas automáticas
                  </p>
                )}
              </div>

              {/* Información de la cuenta */}
              {selectedChat && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Chat Seleccionado</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>• Chat: {selectedChat.name}</div>
                    <div>• Cuenta: {selectedChat.accountId}</div>
                    {autoResponseConfig && (
                      <div>• Respuesta automática: {autoResponseConfig.enabled ? 'Activada' : 'Desactivada'}</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Aplicar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}