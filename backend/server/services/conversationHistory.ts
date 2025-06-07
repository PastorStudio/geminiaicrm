/**
 * Servicio para gestionar el historial de conversaciones con agentes externos
 * Mantiene el contexto completo de cada chat para respuestas auténticas
 */

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId?: string;
}

interface ChatHistory {
  chatId: string;
  agentId: string;
  messages: ConversationMessage[];
  lastUpdate: Date;
}

class ConversationHistoryManager {
  private histories = new Map<string, ChatHistory>();
  
  /**
   * Obtiene el historial completo de una conversación
   */
  getHistory(chatId: string, agentId: string): ConversationMessage[] {
    const key = `${chatId}-${agentId}`;
    const history = this.histories.get(key);
    return history ? history.messages : [];
  }
  
  /**
   * Agrega un mensaje del usuario al historial
   */
  addUserMessage(chatId: string, agentId: string, content: string, messageId?: string) {
    const key = `${chatId}-${agentId}`;
    const history = this.histories.get(key) || {
      chatId,
      agentId,
      messages: [],
      lastUpdate: new Date()
    };
    
    history.messages.push({
      role: 'user',
      content,
      timestamp: new Date(),
      messageId
    });
    
    history.lastUpdate = new Date();
    this.histories.set(key, history);
    
    // Limitar historial a últimos 20 mensajes para eficiencia
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
  }
  
  /**
   * Agrega una respuesta del asistente al historial
   */
  addAssistantMessage(chatId: string, agentId: string, content: string) {
    const key = `${chatId}-${agentId}`;
    const history = this.histories.get(key) || {
      chatId,
      agentId,
      messages: [],
      lastUpdate: new Date()
    };
    
    history.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date()
    });
    
    history.lastUpdate = new Date();
    this.histories.set(key, history);
  }
  
  /**
   * Obtiene el contexto completo para enviar al agente externo
   */
  async getFullContext(chatId: string, agentId: string): Promise<ConversationMessage[]> {
    try {
      // Obtener historial de mensajes reales del chat
      const messagesResponse = await fetch(`http://localhost:5173/api/whatsapp-accounts/1/messages/${chatId}`);
      if (!messagesResponse.ok) {
        return this.getHistory(chatId, agentId);
      }
      
      const messages = await messagesResponse.json();
      const key = `${chatId}-${agentId}`;
      
      // Sincronizar con mensajes reales más recientes
      const history = this.histories.get(key) || {
        chatId,
        agentId,
        messages: [],
        lastUpdate: new Date()
      };
      
      // Agregar mensajes nuevos que no estén en el historial
      const lastKnownMessageId = history.messages.length > 0 
        ? history.messages[history.messages.length - 1].messageId 
        : null;
      
      let foundLastMessage = !lastKnownMessageId;
      
      for (const msg of messages.reverse()) {
        if (!foundLastMessage) {
          if (msg.id === lastKnownMessageId) {
            foundLastMessage = true;
          }
          continue;
        }
        
        if (msg.id !== lastKnownMessageId && !msg.fromMe) {
          history.messages.push({
            role: 'user',
            content: msg.body || msg.type,
            timestamp: new Date(msg.timestamp * 1000),
            messageId: msg.id
          });
        }
      }
      
      this.histories.set(key, history);
      return history.messages;
      
    } catch (error) {
      console.error('Error obteniendo contexto completo:', error);
      return this.getHistory(chatId, agentId);
    }
  }
  
  /**
   * Limpia historiales antiguos (más de 24 horas)
   */
  cleanOldHistories() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [key, history] of this.histories.entries()) {
      if (history.lastUpdate < twentyFourHoursAgo) {
        this.histories.delete(key);
      }
    }
  }
  
  /**
   * Obtiene estadísticas del historial
   */
  getStats() {
    return {
      totalChats: this.histories.size,
      totalMessages: Array.from(this.histories.values())
        .reduce((total, history) => total + history.messages.length, 0)
    };
  }
}

export const conversationHistory = new ConversationHistoryManager();

// Limpiar historiales antiguos cada hora
setInterval(() => {
  conversationHistory.cleanOldHistories();
}, 60 * 60 * 1000);