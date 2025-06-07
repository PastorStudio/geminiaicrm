import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Message, Lead } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useGemini } from "@/hooks/useGemini";

interface ChatInterfaceProps {
  leadId?: number;
}

export default function ChatInterface({ leadId }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("chat");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { generateMessage, isLoading: isGenerating } = useGemini();
  
  // Fetch messages for the selected lead
  const { 
    data: messages, 
    isLoading: messagesLoading 
  } = useQuery<Message[]>({
    queryKey: ["/api/messages", { leadId }],
    enabled: !!leadId
  });
  
  // Fetch lead information
  const { 
    data: lead,
    isLoading: leadLoading
  } = useQuery<Lead>({
    queryKey: [`/api/leads/${leadId}`],
    enabled: !!leadId
  });
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Mutación para enviar mensaje a través del sistema de mensajería interno
  const { mutate: sendInternalMessage, isPending: isSendingInternal } = useMutation({
    mutationFn: async (content: string) => {
      if (!leadId) throw new Error("No lead selected");
      
      const messageData = {
        leadId,
        userId: 1, // Current user ID
        direction: "outgoing",
        channel: selectedChannel,
        content,
      };
      
      return apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      setInputValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para enviar mensaje por WhatsApp
  const { mutate: sendWhatsAppMessage, isPending: isSendingWhatsApp } = useMutation({
    mutationFn: async (content: string) => {
      if (!leadId || !lead) throw new Error("No lead selected");
      
      // Verificar que el lead tenga un número de teléfono para WhatsApp
      const phone = lead.whatsappPhone || lead.phone;
      if (!phone) throw new Error("Lead doesn't have a phone number for WhatsApp");
      
      const messageData = {
        phone,
        message: content,
        leadId
      };
      
      return apiRequest("POST", "/api/integrations/whatsapp/send", messageData);
    },
    onSuccess: () => {
      setInputValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "WhatsApp message sent",
        description: "Your message has been sent via WhatsApp",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to send WhatsApp message: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para enviar mensaje por Telegram
  const { mutate: sendTelegramMessage, isPending: isSendingTelegram } = useMutation({
    mutationFn: async (content: string) => {
      if (!leadId || !lead) throw new Error("No lead selected");
      
      // Verificar que el lead tenga un chat ID de Telegram
      if (!lead.telegramChatId) throw new Error("Lead is not connected to Telegram");
      
      const messageData = {
        chatId: lead.telegramChatId,
        message: content,
        leadId
      };
      
      return apiRequest("POST", "/api/integrations/telegram/send", messageData);
    },
    onSuccess: () => {
      setInputValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Telegram message sent",
        description: "Your message has been sent via Telegram",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to send Telegram message: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Check if sending is in progress for any channel
  const isSending = isSendingInternal || isSendingWhatsApp || isSendingTelegram;
  
  // Handle sending a message based on selected channel
  const handleSendMessage = () => {
    const content = inputValue.trim();
    if (!content || isSending) return;
    
    switch (selectedChannel) {
      case 'whatsapp':
        sendWhatsAppMessage(content);
        break;
      case 'telegram':
        sendTelegramMessage(content);
        break;
      default:
        sendInternalMessage(content);
        break;
    }
  };
  
  // Handle pressing Enter in the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };
  
  // Handle generating a message with AI
  const handleGenerateMessage = async (type: string) => {
    if (!leadId) return;
    
    try {
      const generatedContent = await generateMessage(leadId, type);
      setInputValue(generatedContent);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate message",
        variant: "destructive",
      });
    }
  };
  
  // Format timestamp for display
  const formatMessageTime = (timestamp?: Date | string) => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return "";
    }
  };
  
  // Mostrar instrucciones específicas por canal
  const getChannelInstructions = () => {
    if (!lead) return null;
    
    switch (selectedChannel) {
      case 'whatsapp':
        if (!lead.whatsappPhone && !lead.phone) {
          return (
            <div className="p-3 mb-2 bg-yellow-50 border-l-4 border-yellow-500 text-sm text-yellow-700">
              <p className="font-medium">No phone number available</p>
              <p>Add a WhatsApp phone number to the lead profile to enable messaging.</p>
            </div>
          );
        }
        break;
      case 'telegram':
        if (!lead.telegramChatId) {
          return (
            <div className="p-3 mb-2 bg-yellow-50 border-l-4 border-yellow-500 text-sm text-yellow-700">
              <p className="font-medium">No Telegram connection</p>
              <p>This lead is not connected to your Telegram bot. They need to scan your bot QR code first.</p>
            </div>
          );
        }
        break;
    }
    
    return null;
  };
  
  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-medium text-lg">
            {leadLoading ? "Loading..." : lead ? lead.fullName : "Select a lead"}
          </h3>
          {lead && (
            <p className="text-sm text-gray-500">{lead.company}</p>
          )}
        </div>
        <Tabs
          value={selectedChannel}
          onValueChange={setSelectedChannel}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="chat" className="flex items-center">
              <span className="material-icons text-sm mr-1">chat</span>
              Chat
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center">
              <span className="material-icons text-sm mr-1">email</span>
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center">
              <span className="material-icons text-sm mr-1">whatsapp</span>
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex items-center">
              <span className="material-icons text-sm mr-1">send</span>
              Telegram
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <ScrollArea className="flex-grow p-4">
        {!leadId ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a lead to view messages
          </div>
        ) : messagesLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="animate-pulse flex flex-col max-w-xs">
                  <div className={`h-8 w-32 ${i % 2 === 0 ? "bg-gray-200" : "bg-primary-100"} rounded-lg mb-1`}></div>
                  <div className="h-3 w-16 bg-gray-100 rounded self-end"></div>
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages
              .filter(msg => !selectedChannel || msg.channel === selectedChannel)
              .map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`py-2 px-4 rounded-lg max-w-xs ${
                      message.direction === "outgoing" 
                        ? "bg-primary-100" 
                        : "bg-gray-100"
                    }`}
                  >
                    <p className="text-sm text-gray-800">{message.content}</p>
                    <p className="text-xs text-gray-500 text-right mt-1">
                      {message.sentAt ? formatMessageTime(message.sentAt) : ''}
                    </p>
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            No messages yet. Start a conversation!
          </div>
        )}
      </ScrollArea>
      
      {leadId && (
        <>
          <Separator />
          <div className="p-4">
            {getChannelInstructions()}
            <div className="mb-2 flex flex-wrap -mx-1">
              <div className="px-1 py-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleGenerateMessage("follow-up")}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <span className="material-icons animate-spin mr-1 text-sm">refresh</span>
                  ) : (
                    <span className="material-icons mr-1 text-sm">auto_awesome</span>
                  )}
                  Follow-up
                </Button>
              </div>
              <div className="px-1 py-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleGenerateMessage("proposal")}
                  disabled={isGenerating}
                >
                  <span className="material-icons mr-1 text-sm">description</span>
                  Proposal
                </Button>
              </div>
              <div className="px-1 py-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleGenerateMessage("meeting-request")}
                  disabled={isGenerating}
                >
                  <span className="material-icons mr-1 text-sm">event</span>
                  Meeting
                </Button>
              </div>
            </div>
            
            <div className="flex">
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Type your ${selectedChannel} message...`}
                disabled={isSending || isGenerating}
                className="rounded-r-none"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSending || isGenerating}
                className="rounded-l-none bg-primary-600 hover:bg-primary-700"
              >
                {isSending ? (
                  <span className="material-icons animate-spin">refresh</span>
                ) : (
                  <span className="material-icons text-white">send</span>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}