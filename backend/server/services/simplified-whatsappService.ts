/**
 * Implementación simplificada del servicio de WhatsApp
 * Este archivo contiene una versión funcional y optimizada del servicio
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Tipos básicos necesarios
export interface WhatsAppStatus {
  authenticated: boolean;
  status: string;
  qrCode?: string | null;
  timestamp: string;
}

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: string | null;
  lastMessage: {
    body: string;
    fromMe: boolean;
    timestamp: string | null;
  } | null;
}

export interface WhatsAppMessage {
  id: string;
  body: string;
  timestamp: string | null;
  fromMe: boolean;
  author: string;
  hasMedia: boolean;
  type: string;
}

export interface IWhatsAppService extends EventEmitter {
  initialize(): Promise<void>;
  getStatus(): WhatsAppStatus;
  restart(): Promise<void>;
  logout(): Promise<void>;
  sendMessage(phoneNumber: string, message: string): Promise<any>;
  getContacts(): Promise<any[]>;
  getChats(): Promise<WhatsAppChat[]>;
  getMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]>;
  markChatAsRead(chatId: string): Promise<boolean>;
  getCustomTags(): Promise<any[]>;
  saveCustomTag(tag: any): Promise<any>;
}

// Directorio temporal para almacenar datos
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Asegúrate de que el directorio existe
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Implementación simplificada del servicio de WhatsApp
 * Esta versión simula las respuestas para desarrollo y pruebas
 */
class SimplifiedWhatsAppService extends EventEmitter implements IWhatsAppService {
  private status: WhatsAppStatus = {
    authenticated: false,
    status: 'disconnected',
    qrCode: null,
    timestamp: new Date().toISOString()
  };
  
  private customTags: any[] = [];
  private customTagsFile: string = path.join(TEMP_DIR, 'custom-tags.json');
  private simulatedDelay: number = 1000; // Simular retrasos de red

  constructor() {
    super();
    
    // Intentamos cargar las etiquetas personalizadas al inicio
    try {
      if (fs.existsSync(this.customTagsFile)) {
        this.customTags = JSON.parse(fs.readFileSync(this.customTagsFile, 'utf-8'));
      }
    } catch (error) {
      console.error('Error al cargar etiquetas personalizadas:', error);
      this.customTags = [];
    }
  }

  /**
   * Inicializa el servicio de WhatsApp
   */
  async initialize(): Promise<void> {
    console.log('Inicializando servicio de WhatsApp simplificado...');
    
    // Simular tiempo de inicialización
    await this.delay(this.simulatedDelay);
    
    // Generar un código QR para simular la autenticación
    this.status = {
      authenticated: false,
      status: 'qr_received',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WhatsAppSimulatedConnection',
      timestamp: new Date().toISOString()
    };
    
    // Emitir evento de QR
    this.emit('qr', this.status.qrCode);
    
    console.log('Servicio inicializado. Código QR generado.');
  }

  /**
   * Obtiene el estado actual del servicio
   */
  getStatus(): WhatsAppStatus {
    return this.status;
  }

  /**
   * Reinicia el servicio
   */
  async restart(): Promise<void> {
    console.log('Reiniciando servicio de WhatsApp...');
    
    // Simular reinicio
    this.status = {
      authenticated: false,
      status: 'disconnected',
      qrCode: null,
      timestamp: new Date().toISOString()
    };
    
    await this.initialize();
    
    console.log('Servicio reiniciado correctamente.');
  }

  /**
   * Cierra la sesión del servicio
   */
  async logout(): Promise<void> {
    console.log('Cerrando sesión de WhatsApp...');
    
    // Simular cierre de sesión
    await this.delay(this.simulatedDelay);
    
    this.status = {
      authenticated: false,
      status: 'disconnected',
      qrCode: null,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sesión cerrada correctamente.');
  }

  /**
   * Simula el envío de un mensaje
   */
  async sendMessage(phoneNumber: string, message: string): Promise<any> {
    console.log(`Enviando mensaje a ${phoneNumber}: ${message}`);
    
    // Validar que estamos autenticados
    if (!this.status.authenticated && this.status.status !== 'connected') {
      // Si no estamos autenticados, simulamos una autenticación para propósitos de desarrollo
      await this.simulateAuthentication();
    }
    
    // Simular envío
    await this.delay(this.simulatedDelay);
    
    // Simular respuesta
    const response = {
      id: `msg_${Date.now()}`,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    
    console.log('Mensaje enviado correctamente:', response);
    return response;
  }

  /**
   * Obtiene los contactos disponibles
   */
  async getContacts(): Promise<any[]> {
    console.log('Obteniendo contactos...');
    
    // Validar que estamos autenticados
    if (!this.status.authenticated && this.status.status !== 'connected') {
      // Si no estamos autenticados, simulamos una autenticación para propósitos de desarrollo
      await this.simulateAuthentication();
    }
    
    // Simular tiempo de carga
    await this.delay(this.simulatedDelay);
    
    // Generar contactos de ejemplo
    const contacts = [
      {
        id: '123456789@c.us',
        name: 'Cliente Potencial 1',
        number: '123456789',
        isGroup: false,
        isMyContact: true
      },
      {
        id: '987654321@c.us',
        name: 'Juan Pérez',
        number: '987654321',
        isGroup: false,
        isMyContact: true
      },
      {
        id: '555555555@c.us',
        name: 'María García (Marketing)',
        number: '555555555',
        isGroup: false,
        isMyContact: true
      },
      {
        id: '111222333@g.us',
        name: 'Equipo de Ventas',
        isGroup: true,
        isMyContact: false
      }
    ];
    
    console.log(`${contacts.length} contactos obtenidos.`);
    return contacts;
  }

  /**
   * Obtiene los chats disponibles
   */
  async getChats(): Promise<WhatsAppChat[]> {
    console.log('Obteniendo chats...');
    
    // Validar que estamos autenticados
    if (!this.status.authenticated && this.status.status !== 'connected') {
      // Si no estamos autenticados, simulamos una autenticación para propósitos de desarrollo
      await this.simulateAuthentication();
    }
    
    // Simular tiempo de carga
    await this.delay(this.simulatedDelay);
    
    // Generar chats de ejemplo
    const now = Date.now();
    const chats: WhatsAppChat[] = [
      {
        id: '123456789@c.us',
        name: 'Cliente Potencial 1',
        isGroup: false,
        unreadCount: 2,
        timestamp: new Date(now - 10 * 60 * 1000).toISOString(),
        lastMessage: {
          body: 'Me interesa el producto que ofrecen, ¿podrían darme más información?',
          fromMe: false,
          timestamp: new Date(now - 10 * 60 * 1000).toISOString()
        }
      },
      {
        id: '555555555@c.us',
        name: 'María García (Marketing)',
        isGroup: false,
        unreadCount: 0,
        timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        lastMessage: {
          body: 'Necesito revisar la propuesta antes de la reunión de mañana',
          fromMe: false,
          timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        id: '987654321@c.us',
        name: 'Juan Pérez',
        isGroup: false,
        unreadCount: 1,
        timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
        lastMessage: {
          body: '¿Cuándo podríamos agendar una demostración del producto?',
          fromMe: false,
          timestamp: new Date(now - 30 * 60 * 1000).toISOString()
        }
      },
      {
        id: '111222333@g.us',
        name: 'Equipo de Ventas',
        isGroup: true,
        unreadCount: 5,
        timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
        lastMessage: {
          body: 'Hemos cerrado la venta con el cliente XYZ',
          fromMe: false,
          timestamp: new Date(now - 15 * 60 * 1000).toISOString()
        }
      }
    ];
    
    console.log(`${chats.length} chats obtenidos.`);
    return chats;
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  async getMessages(chatId: string, limit: number = 100): Promise<WhatsAppMessage[]> {
    console.log(`Obteniendo mensajes reales del chat ${chatId}...`);
    
    // Validar que estamos autenticados
    if (!this.status.authenticated && this.status.status !== 'connected') {
      // Si no estamos autenticados, simulamos una autenticación para propósitos de desarrollo
      await this.simulateAuthentication();
    }
    
    try {
      // Consultamos la base de datos para obtener los mensajes reales
      const accountId = 1; // ID de la cuenta principal de WhatsApp
      
      // Realizamos una llamada al microservicio de base de datos para obtener los mensajes reales
      const response = await fetch(`http://localhost:5003/messages/${accountId}/${chatId}`);
      
      if (response.ok) {
        const messagesData = await response.json();
        
        if (Array.isArray(messagesData) && messagesData.length > 0) {
          // Convertimos los mensajes al formato esperado por la aplicación
          const messages: WhatsAppMessage[] = messagesData.map(msg => ({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            body: msg.body || msg.message || '',
            fromMe: msg.fromMe || false,
            timestamp: msg.timestamp || new Date().toISOString(),
            author: msg.fromMe ? 'Tú' : (msg.author || msg.contact || 'Contacto'),
            hasMedia: msg.hasMedia || false,
            type: msg.type || 'chat'
          }));
          
          // Limitamos el número de mensajes si es necesario
          const limitedMessages = messages.slice(0, limit);
          console.log(`${limitedMessages.length} mensajes reales obtenidos de la base de datos.`);
          return limitedMessages;
        }
      }
      
      console.log('No se encontraron mensajes en la base de datos, retornando arreglo vacío');
      return [];
      
    } catch (error) {
      console.error('Error al obtener mensajes reales:', error);
      // En caso de error, retornamos un arreglo vacío en lugar de datos simulados
      return [];
    }
  }

  /**
   * Marca un chat como leído
   */
  async markChatAsRead(chatId: string): Promise<boolean> {
    console.log(`Marcando chat ${chatId} como leído...`);
    
    // Validar que estamos autenticados
    if (!this.status.authenticated && this.status.status !== 'connected') {
      // Si no estamos autenticados, simulamos una autenticación para propósitos de desarrollo
      await this.simulateAuthentication();
    }
    
    // Simular tiempo de procesamiento
    await this.delay(this.simulatedDelay);
    
    console.log('Chat marcado como leído correctamente.');
    return true;
  }

  /**
   * Obtiene las etiquetas personalizadas
   */
  async getCustomTags(): Promise<any[]> {
    console.log('Obteniendo etiquetas personalizadas...');
    
    // Simular tiempo de carga
    await this.delay(this.simulatedDelay / 2);
    
    return this.customTags;
  }

  /**
   * Guarda una etiqueta personalizada
   */
  async saveCustomTag(tag: any): Promise<any> {
    console.log('Guardando etiqueta personalizada:', tag);
    
    // Simular tiempo de procesamiento
    await this.delay(this.simulatedDelay);
    
    // Verificar si la etiqueta ya existe
    const existingIndex = this.customTags.findIndex(t => t.id === tag.id);
    
    // Nueva etiqueta con ID generado si no existe
    const newTag = {
      id: tag.id || Date.now().toString(),
      ...tag
    };
    
    if (existingIndex >= 0) {
      // Actualizar etiqueta existente
      this.customTags[existingIndex] = newTag;
    } else {
      // Agregar nueva etiqueta
      this.customTags.push(newTag);
    }
    
    // Guardar en archivo
    try {
      fs.writeFileSync(this.customTagsFile, JSON.stringify(this.customTags, null, 2));
    } catch (error) {
      console.error('Error al guardar etiquetas personalizadas:', error);
    }
    
    console.log('Etiqueta guardada correctamente.');
    return newTag;
  }

  /**
   * Simula la autenticación del servicio
   */
  private async simulateAuthentication(): Promise<void> {
    console.log('Simulando autenticación...');
    
    // Generar un código QR para simular la autenticación
    this.status = {
      authenticated: false,
      status: 'qr_received',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WhatsAppSimulatedConnection',
      timestamp: new Date().toISOString()
    };
    
    // Emitir evento de QR
    this.emit('qr', this.status.qrCode);
    
    // Simular escaneo y autenticación después de un tiempo
    await this.delay(this.simulatedDelay * 2);
    
    // Actualizar estado a autenticado
    this.status = {
      authenticated: true,
      status: 'connected',
      qrCode: null,
      timestamp: new Date().toISOString()
    };
    
    // Emitir evento de autenticación
    this.emit('authenticated');
    this.emit('ready');
    
    console.log('Autenticación simulada completada.');
  }

  /**
   * Función de utilidad para simular retrasos
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportar una instancia única del servicio
export const whatsappService = new SimplifiedWhatsAppService();
export default whatsappService;