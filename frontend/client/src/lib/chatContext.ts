/**
 * Sistema de gestión de conversaciones para Gemini
 * Mantiene el historial de conversaciones y configuración de prompts por chat
 */

// Interfaz para la configuración del chat
export interface ChatConfig {
  customPrompt?: string;  // Prompt personalizado para este chat
  systemRole?: string;    // Rol del sistema (por defecto "asistente")
  userName?: string;      // Nombre del usuario en la conversación
  modelName?: string;     // Nombre del modelo a usar (default: gemini-1.5-pro)
  temperature?: number;   // Temperatura para generación (0-1)
  provider?: 'gemini' | 'openai'; // Proveedor de IA a usar
}

// Interfaz para el mensaje
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Interfaz para la conversación completa
export interface Conversation {
  chatId: string;         // ID del chat (corresponde con el ID de WhatsApp)
  config: ChatConfig;     // Configuración del chat
  messages: ChatMessage[]; // Historial de mensajes
  lastUpdated: number;    // Timestamp de la última actualización
}

// Clase para gestionar las conversaciones
class ChatContextManager {
  private conversations: Map<string, Conversation>;
  private static instance: ChatContextManager;
  
  private constructor() {
    this.conversations = new Map();
    this.loadFromLocalStorage();
  }
  
  // Singleton pattern
  public static getInstance(): ChatContextManager {
    if (!ChatContextManager.instance) {
      ChatContextManager.instance = new ChatContextManager();
    }
    return ChatContextManager.instance;
  }
  
  // Guardar en localStorage
  private saveToLocalStorage() {
    const serialized = JSON.stringify(Array.from(this.conversations.entries()));
    localStorage.setItem('gemini_conversations', serialized);
  }
  
  // Cargar desde localStorage
  private loadFromLocalStorage() {
    try {
      const serialized = localStorage.getItem('gemini_conversations');
      if (serialized) {
        const parsed = JSON.parse(serialized);
        this.conversations = new Map(parsed);
      }
    } catch (error) {
      console.error('Error loading conversations from localStorage:', error);
    }
  }
  
  // Inicializar una conversación si no existe
  private ensureConversation(chatId: string): Conversation {
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, {
        chatId,
        config: {
          modelName: 'gemini-1.5-pro',
          temperature: 0.7,
          systemRole: 'asistente',
          provider: 'gemini'
        },
        messages: [],
        lastUpdated: Date.now()
      });
    }
    return this.conversations.get(chatId)!;
  }
  
  // Obtener una conversación
  getConversation(chatId: string): Conversation {
    return this.ensureConversation(chatId);
  }
  
  // Actualizar la configuración de un chat
  updateConfig(chatId: string, config: Partial<ChatConfig>) {
    const conversation = this.ensureConversation(chatId);
    conversation.config = { ...conversation.config, ...config };
    conversation.lastUpdated = Date.now();
    this.saveToLocalStorage();
    return conversation;
  }
  
  // Añadir un mensaje a la conversación
  addMessage(chatId: string, role: 'user' | 'assistant' | 'system', content: string) {
    const conversation = this.ensureConversation(chatId);
    conversation.messages.push({
      role,
      content,
      timestamp: Date.now()
    });
    conversation.lastUpdated = Date.now();
    this.saveToLocalStorage();
    return conversation;
  }
  
  // Obtener los últimos n mensajes de una conversación
  getLastMessages(chatId: string, count: number = 10): ChatMessage[] {
    const conversation = this.ensureConversation(chatId);
    return conversation.messages.slice(-count);
  }
  
  // Convertir el historial al formato que espera la API de Gemini
  getHistoryForGemini(chatId: string, count: number = 10): string[] {
    const messages = this.getLastMessages(chatId, count);
    return messages.map(msg => msg.content);
  }
  
  // Obtener el prompt personalizado para un chat
  getCustomPrompt(chatId: string): string | undefined {
    const conversation = this.ensureConversation(chatId);
    return conversation.config.customPrompt;
  }
  
  // Borrar el historial de un chat
  clearHistory(chatId: string) {
    const conversation = this.ensureConversation(chatId);
    conversation.messages = [];
    conversation.lastUpdated = Date.now();
    this.saveToLocalStorage();
  }
  
  // Borrar todas las conversaciones
  clearAll() {
    this.conversations.clear();
    this.saveToLocalStorage();
  }
}

// Exportar la instancia única
export const chatContext = ChatContextManager.getInstance();