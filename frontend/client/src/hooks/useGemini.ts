import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

// Definición de tipos para las respuestas de la API
interface GenerateMessageResponse {
  success: boolean;
  message: string;
}

interface AnalyzeLeadResponse {
  success: boolean;
  analysis: string;
}

interface SuggestActionResponse {
  success: boolean;
  action: {
    type: string;
    description: string;
    priority: string;
    timeframe: string;
    reasoning?: string;
    script?: string;
  };
}

// Exportamos el tipo para poder usarlo en otros componentes
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  success: boolean;
  response: ChatMessage;
}

export function useGemini() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Genera un mensaje para un lead específico
   * @param leadId ID del lead para el cual generar el mensaje
   * @param messageType Tipo de mensaje a generar (follow-up, welcome, proposal, etc.)
   * @returns Texto del mensaje generado
   */
  const generateMessage = async (leadId: number, messageType: string): Promise<string> => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/gemini/generate-message", {
        leadId,
        messageType
      });
      
      const data = await response.json();
      
      if (!data || !data.success) {
        throw new Error("Error generando mensaje");
      }
      
      return data.message || "";
    } catch (error) {
      console.error("Error en useGemini.generateMessage:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el mensaje. La API de Gemini puede estar configurada incorrectamente.",
        variant: "destructive"
      });
      return ""; // Retornamos string vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Analiza un lead utilizando la API de Gemini
   * @param leadId ID del lead a analizar
   * @returns Análisis detallado del lead
   */
  const analyzeLead = async (leadId: number): Promise<string> => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/gemini/analyze-lead", { leadId });
      
      const data = await response.json();
      
      if (!data || !data.success) {
        throw new Error("Error analizando lead");
      }
      
      return data.analysis || "";
    } catch (error) {
      console.error("Error en useGemini.analyzeLead:", error);
      toast({
        title: "Error",
        description: "No se pudo analizar el lead. La API de Gemini puede estar configurada incorrectamente.",
        variant: "destructive"
      });
      return ""; // Retornamos string vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtiene una sugerencia de acción para un lead específico
   * @param leadId ID del lead para obtener sugerencias
   * @returns Objeto con la acción sugerida
   */
  const suggestAction = async (leadId: number) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/gemini/suggest-action", { leadId });
      
      const data = await response.json();
      
      if (!data || !data.success) {
        throw new Error("Error obteniendo sugerencia");
      }

      return data.action || {};
    } catch (error) {
      console.error("Error en useGemini.suggestAction:", error);
      toast({
        title: "Error",
        description: "No se pudo obtener sugerencias para el lead.",
        variant: "destructive"
      });
      return {
        type: "",
        description: "",
        priority: "medium",
        timeframe: ""
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Realiza una consulta de chat con Gemini
   * @param message Mensaje del usuario
   * @param history Historial de conversación anterior (opcional)
   * @returns Respuesta del asistente
   */
  const chat = async (message: string, history?: ChatMessage[]): Promise<ChatMessage> => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/gemini/chat", {
        message,
        history
      });
      
      const data = await response.json();
      
      if (!data || !data.success) {
        throw new Error("Error en chat con Gemini");
      }
      
      return data.response || {
        role: 'assistant',
        content: "Lo siento, ha ocurrido un error al obtener respuesta."
      };
    } catch (error) {
      console.error("Error en useGemini.chat:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu mensaje. Por favor, inténtalo más tarde.",
        variant: "destructive"
      });
      
      // Devolvemos un mensaje de error para que la interfaz pueda mostrar algo
      return {
        role: 'assistant',
        content: "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo más tarde."
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Actualiza un lead basado en información de la conversación
   * @param leadId ID del lead a actualizar
   * @param updates Cambios a realizar al lead
   * @returns Lead actualizado
   */
  const updateLeadFromConversation = async (leadId: number, updates: Partial<any>) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, updates);
      
      const data = await response.json();
      
      toast({
        title: "Lead actualizado",
        description: "Se ha actualizado la información del lead con éxito.",
      });
      
      return data;
    } catch (error) {
      console.error("Error en useGemini.updateLeadFromConversation:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el lead. Intenta nuevamente más tarde.",
        variant: "destructive"
      });
      return null; // Retornamos null en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateMessage,
    analyzeLead,
    suggestAction,
    chat,
    updateLeadFromConversation,
    isLoading
  };
}