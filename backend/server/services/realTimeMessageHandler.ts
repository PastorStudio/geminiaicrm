/**
 * Manejador de mensajes en tiempo real para A.E AI
 * Procesa ÚNICAMENTE el último mensaje recibido
 */

import { SmartMessageDetector } from './smartMessageDetector.js';

interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  chatId: string;
  type?: string;
}

// Estado global para rastrear A.E AI por chat
const aeaiActiveChats = new Map<string, boolean>();

export class RealTimeMessageHandler {
  
  /**
   * Activa A.E AI para un chat específico
   */
  static activateAEAI(chatId: string): void {
    aeaiActiveChats.set(chatId, true);
    console.log(`🟢 A.E AI ACTIVADO para chat: ${chatId}`);
  }
  
  /**
   * Desactiva A.E AI para un chat específico
   */
  static deactivateAEAI(chatId: string): void {
    aeaiActiveChats.set(chatId, false);
    console.log(`🔴 A.E AI DESACTIVADO para chat: ${chatId}`);
  }
  
  /**
   * Verifica si A.E AI está activo para un chat
   */
  static isAEAIActive(chatId: string): boolean {
    return aeaiActiveChats.get(chatId) === true;
  }
  
  /**
   * Procesa un mensaje entrante nuevo ÚNICAMENTE si es el más reciente
   */
  static async handleIncomingMessage(
    chatId: string, 
    message: WhatsAppMessage,
    whatsappInstance?: any
  ): Promise<boolean> {
    
    // Verificar si A.E AI está activo para este chat
    if (!this.isAEAIActive(chatId)) {
      console.log(`⏸️ A.E AI inactivo para chat ${chatId}, ignorando mensaje`);
      return false;
    }
    
    // Verificar si el mensaje debe ser procesado (solo mensajes nuevos del usuario)
    const shouldProcess = SmartMessageDetector.shouldProcessMessage({
      id: message.id,
      body: message.body,
      fromMe: message.fromMe,
      timestamp: message.timestamp,
      chatId: message.chatId,
      isLatest: true
    });
    
    if (!shouldProcess) {
      return false;
    }
    
    try {
      console.log(`🤖 Procesando mensaje A.E AI para chat ${chatId}: "${message.body.substring(0, 50)}..."`);
      
      // Generar respuesta A.E AI
      const response = await this.generateAEAIResponse(message.body, chatId);
      
      if (response) {
        // Enviar respuesta (si hay instancia de WhatsApp disponible)
        if (whatsappInstance && whatsappInstance.sendMessage) {
          await whatsappInstance.sendMessage(chatId, response);
          console.log(`📤 Respuesta A.E AI enviada a ${chatId}: "${response.substring(0, 50)}..."`);
        } else {
          console.log(`📝 Respuesta A.E AI generada (simulación): "${response.substring(0, 50)}..."`);
        }
        
        // Marcar mensaje como procesado
        SmartMessageDetector.markAsProcessed(chatId, message.id);
        
        return true;
      }
      
    } catch (error) {
      console.error(`❌ Error procesando mensaje A.E AI para chat ${chatId}:`, error);
    }
    
    return false;
  }
  
  /**
   * Genera respuesta usando OpenAI A.E AI
   */
  private static async generateAEAIResponse(messageText: string, chatId: string): Promise<string | null> {
    try {
      // Verificar clave API
      const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
      if (!openaiKey) {
        console.log(`❌ No hay clave OpenAI disponible para chat ${chatId}`);
        return null;
      }
      
      // Importar y usar OpenAI
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openaiKey });
      
      // Contexto inteligente del agente
      const agentContext = `Eres un asistente de atención al cliente profesional llamado "A.E AI Smartbots".
      
      Características:
      - Respondes de manera amigable, clara y profesional
      - Ofreces ayuda específica según la consulta del usuario
      - Mantienes respuestas concisas pero informativas (máximo 2-3 líneas)
      - Si no tienes información específica, ofreces derivar con un agente humano
      - Respondes siempre en español
      - Usas un tono conversacional pero profesional`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: agentContext },
          { role: "user", content: messageText }
        ],
        max_tokens: 200,
        temperature: 0.7
      });
      
      const response = completion.choices[0].message.content;
      console.log(`✅ Respuesta A.E AI generada exitosamente`);
      
      return response;
      
    } catch (error) {
      console.error(`❌ Error generando respuesta A.E AI:`, error);
      return null;
    }
  }
  
  /**
   * Obtiene estado de todos los chats con A.E AI activo
   */
  static getActiveChats(): string[] {
    const activeChats: string[] = [];
    for (const [chatId, isActive] of aeaiActiveChats.entries()) {
      if (isActive) {
        activeChats.push(chatId);
      }
    }
    return activeChats;
  }
  
  /**
   * Limpia estados antiguos para evitar acumulación en memoria
   */
  static cleanup(): void {
    if (aeaiActiveChats.size > 100) {
      console.log(`🧹 Limpiando estados A.E AI antiguos...`);
      // Mantener solo los últimos 50 chats activos
      const entries = Array.from(aeaiActiveChats.entries());
      const activeEntries = entries.filter(([_, isActive]) => isActive).slice(-50);
      
      aeaiActiveChats.clear();
      activeEntries.forEach(([chatId, isActive]) => {
        aeaiActiveChats.set(chatId, isActive);
      });
    }
  }
}

// Limpieza automática cada hora
setInterval(() => {
  RealTimeMessageHandler.cleanup();
}, 60 * 60 * 1000);