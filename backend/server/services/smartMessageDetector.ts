/**
 * Detector inteligente de mensajes para A.E AI
 * Solo procesa el último mensaje recibido, no todo el historial
 */

interface MessageInfo {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  chatId: string;
  isLatest: boolean;
}

// Cache para rastrear el último mensaje procesado por chat
const lastProcessedMessages = new Map<string, string>();

export class SmartMessageDetector {
  /**
   * Determina si un mensaje debe ser procesado por A.E AI
   * Solo procesa mensajes nuevos (no procesados anteriormente)
   */
  static shouldProcessMessage(message: MessageInfo): boolean {
    const { chatId, id, fromMe, timestamp } = message;
    
    // No procesar mensajes enviados por nosotros
    if (fromMe) {
      console.log(`🚫 Ignorando mensaje propio: ${id}`);
      return false;
    }
    
    // Verificar si ya procesamos este mensaje
    const lastProcessedId = lastProcessedMessages.get(chatId);
    if (lastProcessedId === id) {
      console.log(`🚫 Mensaje ya procesado: ${id} para chat ${chatId}`);
      return false;
    }
    
    // Verificar que es realmente el mensaje más reciente (últimos 5 minutos)
    const now = Date.now();
    const messageAge = now - timestamp;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (messageAge > fiveMinutes) {
      console.log(`🚫 Mensaje muy antiguo (${Math.round(messageAge/1000)}s): ${id}`);
      return false;
    }
    
    console.log(`✅ Mensaje nuevo detectado para procesamiento: ${id} en chat ${chatId}`);
    return true;
  }
  
  /**
   * Marca un mensaje como procesado para evitar duplicados
   */
  static markAsProcessed(chatId: string, messageId: string): void {
    lastProcessedMessages.set(chatId, messageId);
    console.log(`📝 Mensaje marcado como procesado: ${messageId} en chat ${chatId}`);
  }
  
  /**
   * Obtiene el último mensaje de una conversación
   */
  static getLatestMessage(messages: MessageInfo[]): MessageInfo | null {
    if (!messages || messages.length === 0) {
      return null;
    }
    
    // Filtrar solo mensajes del usuario (no propios)
    const userMessages = messages.filter(msg => !msg.fromMe);
    
    if (userMessages.length === 0) {
      return null;
    }
    
    // Ordenar por timestamp descendente y tomar el más reciente
    const sortedMessages = userMessages.sort((a, b) => b.timestamp - a.timestamp);
    const latestMessage = sortedMessages[0];
    
    console.log(`🔍 Último mensaje del usuario: ${latestMessage.id} - "${latestMessage.body.substring(0, 50)}..."`);
    
    return latestMessage;
  }
  
  /**
   * Limpia mensajes procesados antiguos (para evitar acumulación en memoria)
   */
  static cleanupOldProcessedMessages(): void {
    // Mantener solo los últimos 100 chats en memoria
    if (lastProcessedMessages.size > 100) {
      const entries = Array.from(lastProcessedMessages.entries());
      const toKeep = entries.slice(-50); // Mantener solo los últimos 50
      
      lastProcessedMessages.clear();
      toKeep.forEach(([chatId, messageId]) => {
        lastProcessedMessages.set(chatId, messageId);
      });
      
      console.log(`🧹 Limpieza de memoria: mantenidos ${toKeep.length} chats en cache`);
    }
  }
  
  /**
   * Verifica si A.E AI está activo para un chat específico
   */
  static isAEAIActiveForChat(chatId: string): boolean {
    // Aquí puedes implementar la lógica para verificar si A.E AI está activo
    // Por ahora, simulamos que está activo
    return true;
  }
}

// Limpieza automática cada 30 minutos
setInterval(() => {
  SmartMessageDetector.cleanupOldProcessedMessages();
}, 30 * 60 * 1000);