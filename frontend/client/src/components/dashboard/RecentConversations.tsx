import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Message, Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentConversations() {
  // Fetch WhatsApp conversations directly using the direct API
  const { data: whatsappConversations, isLoading: whatsappLoading } = useQuery({
    queryKey: ["/api/direct/whatsapp/chats"],
    queryFn: async () => {
      const response = await fetch('/api/direct/whatsapp/chats');
      if (!response.ok) {
        return []; // Return empty array for now to handle unauthorized state
      }
      return response.json();
    },
    refetchInterval: 10000 // Refetch every 10 seconds for real-time updates
  });
  
  // Fetch recent messages from the internal database
  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", { recent: true, limit: 5 }],
    queryFn: async () => {
      const response = await fetch(`/api/messages?recent=true&limit=5`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    }
  });

  // For each message, fetch the associated lead
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    enabled: !!messages
  });

  // Get associated lead for a message
  const getLeadForMessage = (leadId: number | null) => {
    if (leadId === null) return undefined;
    return leads?.find(lead => lead.id === leadId);
  };

  // Format the time for display (e.g., "10:23 AM" or "Yesterday")
  const formatMessageTime = (timestamp?: Date | string | null) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } else {
      return formatDistanceToNow(date, { addSuffix: false });
    }
  };

  // Get channel icon and color
  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return { icon: "whatsapp", color: "text-green-500" };
      case "email":
        return { icon: "email", color: "text-blue-500" };
      case "chat":
        return { icon: "chat", color: "text-indigo-500" };
      case "system":
        return { icon: "integration_instructions", color: "text-purple-500" };
      default:
        return { icon: "message", color: "text-gray-500" };
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-5 sm:px-6">
        <div>
          <CardTitle className="text-lg">Recent Conversations</CardTitle>
          <CardDescription>
            Latest messages from leads and clients
          </CardDescription>
        </div>
        <Button variant="link" className="text-primary-600 flex items-center p-0">
          <span className="material-icons mr-1">message</span>
          <span className="text-sm">View All</span>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t border-gray-200">
          {messagesLoading || leadsLoading || whatsappLoading ? (
            <div className="animate-pulse space-y-4 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {/* Mostrar chats de WhatsApp directamente si están disponibles */}
              {whatsappConversations && whatsappConversations.length > 0 && 
                whatsappConversations
                  .filter(chat => !chat.isGroup) // Filtrar grupos
                  .slice(0, 5).map((chat) => {
                  // Intentar obtener el último mensaje de diferentes formas
                  const lastMsg = chat.messages && chat.messages.length > 0 
                    ? chat.messages[chat.messages.length - 1] 
                    : null;
                  
                  // Obtener el último mensaje de la forma más confiable posible
                  let messageBody = 'Sin mensajes';
                  let timestamp = null;
                  
                  // Prioridad 1: Si tenemos el último mensaje en el array de mensajes
                  if (lastMsg && lastMsg.body) {
                    messageBody = lastMsg.body;
                    timestamp = lastMsg.timestamp;
                  } 
                  // Prioridad 2: Si tenemos lastMessage como una propiedad del chat
                  else if (chat.lastMessage) {
                    if (typeof chat.lastMessage === 'string') {
                      messageBody = chat.lastMessage;
                    } else if (typeof chat.lastMessage === 'object' && chat.lastMessage.body) {
                      messageBody = chat.lastMessage.body;
                      timestamp = chat.lastMessage.timestamp;
                    }
                  }
                  // Prioridad 3: Usar timestamp y un mensaje genérico
                  else if (chat.timestamp) {
                    messageBody = 'Mensaje reciente';
                    timestamp = chat.timestamp * 1000; // Convertir a milisegundos
                  }
                  
                  return (
                    <li key={chat.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full mr-4 bg-green-100 flex items-center justify-center">
                              <span className="material-icons text-green-600">whatsapp</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {chat.name || chat.id.split('@')[0] || "Contacto"}
                              </p>
                              <p className="text-sm text-gray-500 truncate max-w-[98%] overflow-hidden text-ellipsis">
                                {messageBody}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500">
                              {timestamp ? formatMessageTime(new Date(timestamp * 1000)) : ""}
                            </span>
                            {chat.unreadCount > 0 && (
                              <Badge className="mt-1 bg-green-600">{chat.unreadCount}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="flex items-center">
                            <span className="material-icons text-gray-400 text-sm mr-1">phone</span>
                            <p className="text-xs text-gray-500 truncate max-w-[95%] overflow-hidden text-ellipsis">
                              {chat.id.split('@')[0]}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className="material-icons text-green-500 text-sm mr-1">whatsapp</span>
                            <p className="text-xs text-gray-500">WhatsApp</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              }
              
              {/* Mensajes del sistema de CRM */}
              {messages && messages.length > 0 && 
                messages.slice(0, 5 - (whatsappConversations?.length || 0)).map((message) => {
                  const lead = getLeadForMessage(message.leadId);
                  const { icon, color } = getChannelInfo(message.channel);
                  const isAI = message.userId === 0 || message.aiGenerated;
                  
                  return (
                    <li key={`crm-${message.id}`}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {isAI ? (
                              <div className="h-10 w-10 rounded-full mr-4 bg-secondary-100 flex items-center justify-center">
                                <span className="material-icons text-secondary-600">smart_toy</span>
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-full mr-4 bg-gray-200 flex items-center justify-center">
                                <span className="material-icons text-gray-500">person</span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {isAI ? "AI Assistant" : lead?.fullName || `Lead #${message.leadId}`}
                              </p>
                              <p className="text-sm text-gray-500 truncate max-w-[98%] overflow-hidden text-ellipsis">
                                {message.content}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(message.sentAt)}
                            </span>
                            {!message.read && message.direction === "incoming" && (
                              <Badge className="mt-1 bg-primary-600">New</Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="flex items-center">
                            <span className="material-icons text-gray-400 text-sm mr-1">business</span>
                            <p className="text-xs text-gray-500 truncate max-w-[95%] overflow-hidden text-ellipsis">
                              {lead?.company || "Unknown Company"}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className={`material-icons ${color} text-sm mr-1`}>{icon}</span>
                            <p className="text-xs text-gray-500">{message.channel}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              }
              
              {/* Mensaje cuando no hay conversaciones */}
              {(!messages || messages.length === 0) && (!whatsappConversations || whatsappConversations.length === 0) && (
                <li>
                  <div className="p-4 text-center text-gray-500">
                    No hay conversaciones recientes
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
