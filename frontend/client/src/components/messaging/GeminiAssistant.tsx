import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGemini, ChatMessage } from "@/hooks/useGemini";
import { MessageSquare, Send, Brain, RotateCw, Sparkles, MessageCircle } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";

interface GeminiAssistantProps {
  leadId?: number;
  onMessageGenerated?: (message: string) => void;
  compact?: boolean;
}

export function GeminiAssistant({ leadId, onMessageGenerated, compact = false }: GeminiAssistantProps) {
  const [selectedAction, setSelectedAction] = useState<string>('follow-up');
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [leadAnalysis, setLeadAnalysis] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const messageTypes = [
    { id: 'follow-up', label: 'Seguimiento' },
    { id: 'welcome', label: 'Bienvenida' },
    { id: 'proposal', label: 'Propuesta' },
    { id: 'meeting', label: 'Reunión' },
    { id: 'custom', label: 'Personalizado' }
  ];

  const { generateMessage, analyzeLead, chat, suggestAction, updateLeadFromConversation, isLoading: isGeminiLoading } = useGemini();
  
  const handleGenerateMessage = async () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un lead primero",
        variant: "destructive"
      });
      return;
    }

    try {
      const message = await generateMessage(leadId, selectedAction);
      setGeneratedMessage(message);
      toast({
        title: "Mensaje generado",
        description: "Se ha generado un mensaje con IA",
      });
    } catch (error) {
      console.error("Error generando mensaje:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el mensaje. Intenta de nuevo más tarde.",
        variant: "destructive"
      });
    }
  };

  const handleAnalyzeLead = async () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un lead primero",
        variant: "destructive"
      });
      return;
    }

    try {
      const analysis = await analyzeLead(leadId);
      setLeadAnalysis(analysis);
      toast({
        title: "Análisis completado",
        description: "Se ha realizado el análisis del lead con IA",
      });
    } catch (error) {
      console.error("Error analizando lead:", error);
      toast({
        title: "Error",
        description: "No se pudo analizar el lead. Intenta de nuevo más tarde.",
        variant: "destructive"
      });
    }
  };

  const handleUseMessage = () => {
    if (onMessageGenerated && generatedMessage) {
      onMessageGenerated(generatedMessage);
      toast({
        title: "Mensaje insertado",
        description: "Se ha insertado el mensaje en el área de texto",
      });
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput
    };
    
    // Actualizar el historial con el mensaje del usuario
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    
    try {
      // Enviar el mensaje y obtener respuesta
      const response = await chat(userMessage.content, chatHistory);
      
      // Actualizar el historial con la respuesta
      setChatHistory(prev => [...prev, response]);
      
      // Verificar si el mensaje del usuario podría contener información para actualizar el lead
      if (leadId && shouldAnalyzeForLeadUpdate(userMessage.content)) {
        // Analizamos el mensaje para extraer datos relevantes
        await analyzeConversationAndUpdateLead(userMessage.content, leadId);
      }
    } catch (error) {
      console.error("Error en chat con Gemini:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu mensaje. Intenta de nuevo más tarde.",
        variant: "destructive"
      });
    }
  };
  
  // Función para determinar si un mensaje debe ser analizado para actualización de lead
  const shouldAnalyzeForLeadUpdate = (message: string): boolean => {
    // Palabras clave que podrían indicar información actualizable del lead
    const keywords = [
      'email', 'correo', 'teléfono', 'celular', 'empresa', 'compañía', 
      'cambió', 'actualizar', 'nuevo', 'nueva', 'diferente', 'modificar',
      'contacto', 'dirección', 'trabajo', 'posición', 'cargo', 'rol'
    ];
    
    const lowercaseMessage = message.toLowerCase();
    return keywords.some(keyword => lowercaseMessage.includes(keyword));
  };
  
  // Función para analizar la conversación y actualizar el lead
  const analyzeConversationAndUpdateLead = async (message: string, leadId: number) => {
    if (!leadId) return;
    
    try {
      // Extraer información relevante del mensaje
      // Creamos regex para detectar patrones comunes
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const phoneRegex = /(\+?[\d\s]{10,15})/g;
      const companyRegex = /(empresa|compañía|trabajo en|trabajando para|trabaja para|trabajando en)[\s:]?([A-Za-z0-9\s]+)/i;
      const positionRegex = /(cargo|puesto|posición|rol|trabajo como)[\s:]?([A-Za-z0-9\s]+)/i;
      
      // Intentamos extraer la información
      const emails = message.match(emailRegex);
      const phones = message.match(phoneRegex);
      const companyMatch = message.match(companyRegex);
      const positionMatch = message.match(positionRegex);
      
      // Preparamos objeto con actualizaciones potenciales
      const updates: Record<string, string> = {};
      
      if (emails && emails.length > 0) {
        updates.email = emails[0];
      }
      
      if (phones && phones.length > 0) {
        updates.phone = phones[0].replace(/\s/g, ''); // Eliminar espacios
      }
      
      if (companyMatch && companyMatch[2]) {
        updates.company = companyMatch[2].trim();
      }
      
      if (positionMatch && positionMatch[2]) {
        updates.position = positionMatch[2].trim();
      }
      
      // Si encontramos algo para actualizar, procedemos
      if (Object.keys(updates).length > 0) {
        // Mostrar confirmación al usuario
        const detectedChanges = Object.entries(updates)
          .map(([field, value]) => `${field}: ${value}`)
          .join(', ');
          
        // Actualizar el lead con la nueva información
        await updateLeadFromConversation(leadId, updates);
        
        // Añadir mensaje del sistema para informar al usuario
        const systemMessage: ChatMessage = {
          role: 'assistant',
          content: `He detectado nueva información para este lead: ${detectedChanges}. La información ha sido actualizada.`
        };
        
        // Actualizar el historial con el mensaje del sistema
        setChatHistory(prev => [...prev, systemMessage]);
      }
    } catch (error) {
      console.error("Error al analizar y actualizar lead:", error);
    }
  };

  const handleSuggestAction = async () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un lead primero",
        variant: "destructive"
      });
      return;
    }

    try {
      const action = await suggestAction(leadId);
      
      // Formateamos el resultado para mostrarlo en el análisis
      const formattedAction = `
📋 ACCIÓN SUGERIDA

Tipo: ${action.type}
Descripción: ${action.description}
Prioridad: ${action.priority}
Plazo: ${action.timeframe}
${action.reasoning ? `\nJustificación:\n${action.reasoning}` : ''}
${action.script ? `\nScript sugerido:\n${action.script}` : ''}
      `;
      
      setLeadAnalysis(formattedAction);
      
      toast({
        title: "Sugerencia generada",
        description: "Se ha generado una sugerencia de acción para este lead",
      });
    } catch (error) {
      console.error("Error obteniendo sugerencia:", error);
      toast({
        title: "Error",
        description: "No se pudo obtener una sugerencia para este lead.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={`w-full border-teal-500/20 shadow-md ${compact ? 'compact' : ''}`}>
      <CardHeader className={`bg-gradient-to-r from-teal-500/10 to-transparent ${compact ? 'p-3 pb-2' : ''}`}>
        <CardTitle className="flex items-center gap-2 text-teal-700">
          <Brain size={compact ? 16 : 20} />
          Asistente Gemini
        </CardTitle>
        {!compact && (
          <CardDescription>
            Utiliza IA para analizar leads, generar mensajes y obtener asistencia
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "p-3 pt-0" : "pt-4"}>
        <Tabs defaultValue="generate">
          <TabsList className={`w-full ${compact ? 'h-8' : ''}`}>
            <TabsTrigger value="generate" className="flex-1">
              <MessageSquare size={compact ? 14 : 16} className="mr-2" />
              {compact ? 'Generar' : 'Generar Mensaje'}
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex-1">
              <Sparkles size={compact ? 14 : 16} className="mr-2" />
              {compact ? 'Analizar' : 'Analizar Lead'}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">
              <MessageCircle size={compact ? 14 : 16} className="mr-2" />
              Chat
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className={`${compact ? 'mt-2' : 'mt-4'} space-y-${compact ? '2' : '4'}`}>
            <div className="grid grid-cols-2 gap-2">
              {messageTypes.map(type => (
                <Button
                  key={type.id}
                  variant={selectedAction === type.id ? "default" : "outline"}
                  onClick={() => setSelectedAction(type.id)}
                  className="h-10"
                >
                  {type.label}
                </Button>
              ))}
            </div>

            <div className="mt-4">
              <Button 
                onClick={handleGenerateMessage} 
                disabled={isGeminiLoading || !leadId}
                className="w-full"
              >
                {isGeminiLoading ? <Spinner size="sm" className="mr-2" /> : <RotateCw size={16} className="mr-2" />}
                Generar mensaje {selectedAction}
              </Button>
            </div>

            {generatedMessage && (
              <div className="mt-4">
                <Textarea 
                  value={generatedMessage} 
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  className="h-32"
                />
                <Button 
                  onClick={handleUseMessage}
                  className="w-full mt-2"
                  variant="outline"
                >
                  <Send size={16} className="mr-2" />
                  Usar este mensaje
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analyze" className={`${compact ? 'mt-2' : 'mt-4'}`}>
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={handleAnalyzeLead} 
                disabled={isGeminiLoading || !leadId}
                className="flex-1"
              >
                {isGeminiLoading ? <Spinner size="sm" className="mr-2" /> : <Sparkles size={16} className="mr-2" />}
                Analizar lead
              </Button>
              
              <Button 
                onClick={handleSuggestAction} 
                disabled={isGeminiLoading || !leadId}
                className="flex-1"
                variant="outline"
              >
                {isGeminiLoading ? <Spinner size="sm" className="mr-2" /> : <RotateCw size={16} className="mr-2" />}
                Sugerir acción
              </Button>
            </div>

            {leadAnalysis ? (
              <div className="border rounded-md p-4 bg-teal-50/50 max-h-[300px] overflow-y-auto">
                <div className="whitespace-pre-wrap">{leadAnalysis}</div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Utiliza los botones superiores para obtener información valiosa basada en IA
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="chat" className={`${compact ? 'mt-2' : 'mt-4'}`}>
            {leadId ? (
              <div className="text-xs bg-blue-50 p-2 rounded-md mb-3 border border-blue-200">
                <p className="font-medium text-blue-800">Actualización inteligente:</p>
                <p className="text-blue-700">
                  Menciona detalles como correos electrónicos, teléfonos o empresa durante la conversación 
                  y actualizaré automáticamente la información del lead.
                </p>
              </div>
            ) : (
              <div className="text-xs bg-amber-50 p-2 rounded-md mb-3 border border-amber-200">
                <p className="font-medium text-amber-800">Selecciona un lead:</p>
                <p className="text-amber-700">
                  Para habilitar la actualización inteligente y análisis personalizado, 
                  selecciona un lead primero.
                </p>
              </div>
            )}
            
            <div className="border rounded-md p-3 bg-gray-50 max-h-[300px] overflow-y-auto mb-3">
              {chatHistory.length > 0 ? (
                <div className="space-y-3">
                  {chatHistory.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-teal-100 ml-8' 
                          : 'bg-white border mr-8'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1">
                        {msg.role === 'user' ? 'Tú' : 'Asistente IA'}
                      </div>
                      <div className="whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Haz una pregunta para comenzar la conversación con el asistente Gemini AI
                </div>
              )}
            </div>
            
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={leadId 
                  ? "Escribe tu mensaje (puedo actualizar info del lead automáticamente)..." 
                  : "Escribe tu mensaje..."}
                disabled={isGeminiLoading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={isGeminiLoading || !chatInput.trim()}
              >
                {isGeminiLoading ? <Spinner size="sm" /> : <Send size={16} />}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-gradient-to-r from-transparent to-teal-500/10 text-xs text-gray-500 italic justify-end">
        Potenciado por Google Gemini AI
      </CardFooter>
    </Card>
  );
}