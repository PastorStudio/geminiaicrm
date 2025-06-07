/**
 * Interfaz común para el servicio de WhatsApp
 * Define los métodos y tipos necesarios para la integración con WhatsApp
 * Incluye soporte para chats, mensajes y mantenimiento de conexión permanente
 */

/**
 * Estado del servicio de WhatsApp
 */
export interface WhatsAppStatus {
  initialized: boolean;
  ready: boolean;
  authenticated: boolean;
  error?: string;
  qrCode?: string;
  qrDataUrl?: string;  // URL de datos para mostrar directamente en frontend
  lastConnectionCheck?: Date;
  connectionState?: string;
}

/**
 * Mensaje de WhatsApp
 */
export interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  to: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia: boolean;
  type: string;
  isStatus: boolean;
  isForwarded: boolean;
  isStarred: boolean;
  mediaUrl?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    description?: string;
  };
  vcard?: string;
  containsEmoji: boolean;
  timeZoneInfo?: {
    detected?: boolean;
    timeZone?: string;
    offset?: number;
    formattedTime?: string;
    source?: string;
    location?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    error?: boolean;
  };
}

/**
 * Chat de WhatsApp
 */
export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;  // Última actividad
  unreadCount: number;
  lastMessage?: string;
  profilePicUrl?: string;
  participants?: string[];
}

/**
 * Interfaz del servicio de WhatsApp
 */
export interface IWhatsAppService {
  /**
   * Inicializa el cliente de WhatsApp
   */
  initialize(): Promise<void>;
  
  /**
   * Obtiene el estado actual del servicio
   */
  getStatus(): WhatsAppStatus;
  
  /**
   * Obtiene el cliente de WhatsApp para operaciones avanzadas
   */
  getClient(): any;
  
  /**
   * Reinicia el servicio de WhatsApp
   */
  restart(): Promise<void>;
  
  /**
   * Cierra la sesión actual
   */
  logout(): Promise<void>;
  
  /**
   * Envía un mensaje de WhatsApp al número especificado
   * @param phoneNumber Número de teléfono del destinatario
   * @param message Mensaje a enviar
   */
  sendMessage(phoneNumber: string, message: string): Promise<any>;
  
  /**
   * Obtiene los chats disponibles (contactos y grupos)
   */
  getChats(): Promise<WhatsAppChat[]>;
  
  /**
   * Obtiene los contactos de WhatsApp
   */
  getContacts(): Promise<any[]>;
  
  /**
   * Obtiene los mensajes de un chat específico
   * @param chatId ID del chat del cual obtener mensajes
   * @param limit Número máximo de mensajes a obtener (opcional)
   */
  getMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]>;
  
  /**
   * Activa la conexión permanente y configura los mecanismos para mantenerla activa
   */
  activatePermanentConnection(): Promise<void>;
  
  /**
   * Activa el modo de conexión ultra-persistente con WhatsApp
   * Esta función configura opciones adicionales para garantizar que la conexión se mantenga
   * activa incluso en situaciones adversas
   */
  activateUnbreakableConnection(): Promise<boolean>;
  
  /**
   * Desactiva el modo de conexión ultra-persistente
   */
  deactivateUnbreakableConnection(): boolean;
  
  /**
   * Verifica el estado de la conexión y la reactiva si es necesario
   */
  checkConnection(): Promise<boolean>;
  
  /**
   * Marca los mensajes de un chat como leídos
   * @param chatId ID del chat a marcar como leído
   */
  markChatAsRead(chatId: string): Promise<void>;
  
  /**
   * Obtiene las etiquetas personalizadas para contactos
   * @returns Lista de etiquetas personalizadas
   */
  getCustomTags(): Promise<any[]>;
  
  /**
   * Guarda una nueva etiqueta personalizada
   * @param tag Datos de la etiqueta a guardar
   * @returns Etiqueta guardada con su ID
   */
  saveCustomTag(tag: any): Promise<any>;
}