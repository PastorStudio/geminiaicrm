/**
 * Implementación optimizada del servicio de WhatsApp
 * Version funcional y simplificada
 */

import { EventEmitter } from 'events';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as path from 'path';
import * as fs from 'fs';
import { IWhatsAppService, WhatsAppStatus, WhatsAppChat, WhatsAppMessage } from '../types/whatsapp-types';

// Directorio temporal para almacenar las sesiones y archivos relacionados con WhatsApp
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Asegúrate de que el directorio existe
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Implementación del servicio de WhatsApp usando la biblioteca whatsapp-web.js
 */
class WhatsAppServiceImpl extends EventEmitter implements IWhatsAppService {
  private client: Client | null = null;
  private status: WhatsAppStatus = {
    authenticated: false,
    status: 'disconnected',
    qrCode: null,
    timestamp: new Date().toISOString()
  };
  
  private chatCache: Map<string, WhatsAppChat> = new Map();
  private messageCache: Map<string, WhatsAppMessage[]> = new Map();
  private customTags: any[] = [];
  private customTagsFile: string = path.join(TEMP_DIR, 'custom-tags.json');

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
   * Inicializa el cliente de WhatsApp Web
   */
  async initialize(): Promise<void> {
    try {
      console.log('Inicializando cliente de WhatsApp Web...');
      
      // Configuración del cliente con autenticación local persistente
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: TEMP_DIR }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Configurar los eventos del cliente
      this.setupClientEvents();
      
      // Iniciar el cliente
      await this.client.initialize();
      
      console.log('Cliente de WhatsApp Web inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar el cliente de WhatsApp Web:', error);
      this.status = {
        ...this.status,
        status: 'error',
        timestamp: new Date().toISOString()
      };
      
      throw error;
    }
  }

  /**
   * Configura los eventos del cliente de WhatsApp Web
   */
  private setupClientEvents(): void {
    if (!this.client) return;

    this.client.on('qr', (qr) => {
      console.log('Código QR recibido');
      this.status = {
        ...this.status,
        qrCode: qr,
        status: 'qr_received',
        timestamp: new Date().toISOString()
      };
      
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      console.log('Cliente de WhatsApp Web listo');
      this.status = {
        ...this.status,
        authenticated: true,
        status: 'connected',
        qrCode: null,
        timestamp: new Date().toISOString()
      };
      
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      console.log('Autenticación exitosa');
      this.status = {
        ...this.status,
        authenticated: true,
        status: 'authenticated',
        timestamp: new Date().toISOString()
      };
      
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (error) => {
      console.error('Error de autenticación:', error);
      this.status = {
        ...this.status,
        authenticated: false,
        status: 'auth_failure',
        timestamp: new Date().toISOString()
      };
      
      this.emit('auth_failure', error);
    });

    this.client.on('disconnected', (reason) => {
      console.log('Cliente desconectado:', reason);
      this.status = {
        ...this.status,
        authenticated: false,
        status: 'disconnected',
        timestamp: new Date().toISOString()
      };
      
      this.emit('disconnected', reason);
    });
    
    // Más eventos que podrían ser útiles en el futuro
    this.client.on('message', async (message) => {
      console.log('Mensaje recibido:', message.body);
      
      try {
        // Convertir el mensaje al formato de nuestra aplicación
        const convertedMessage = await this.convertToWhatsAppMessage(message);
        
        // Actualizar la caché de mensajes
        const chatId = message.from;
        const messages = this.messageCache.get(chatId) || [];
        messages.unshift(convertedMessage);
        this.messageCache.set(chatId, messages);
        
        // Emitir el evento de mensaje para que otros componentes puedan reaccionar
        this.emit('message', convertedMessage);
      } catch (error) {
        console.error('Error al procesar mensaje recibido:', error);
      }
    });
  }

  /**
   * Convierte un mensaje de WhatsApp Web al formato de nuestra aplicación
   */
  private async convertToWhatsAppMessage(message: any): Promise<WhatsAppMessage> {
    // Obtener información del chat y autor
    let author = 'Desconocido';
    
    try {
      if (message.fromMe) {
        author = 'Tú';
      } else {
        const contact = await message.getContact();
        author = contact.name || contact.pushname || contact.number || 'Desconocido';
      }
    } catch (error) {
      console.error('Error al obtener información del autor:', error);
    }
    
    // Convertir el mensaje
    return {
      id: message.id._serialized || message.id,
      body: message.body,
      fromMe: message.fromMe,
      timestamp: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
      author: author,
      hasMedia: message.hasMedia || false,
      type: message.type
    };
  }

  /**
   * Obtiene el estado actual del servicio
   */
  getStatus(): WhatsAppStatus {
    return this.status;
  }

  /**
   * Reinicia el servicio de WhatsApp
   */
  async restart(): Promise<void> {
    try {
      console.log('Reiniciando cliente de WhatsApp Web...');
      
      // Cerrar el cliente actual si existe
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
      
      // Reinicializar
      await this.initialize();
      
      console.log('Cliente de WhatsApp Web reiniciado correctamente');
    } catch (error) {
      console.error('Error al reiniciar el cliente de WhatsApp Web:', error);
      throw error;
    }
  }

  /**
   * Cierra la sesión actual de WhatsApp
   */
  async logout(): Promise<void> {
    try {
      console.log('Cerrando sesión de WhatsApp Web...');
      
      if (this.client) {
        await this.client.logout();
        await this.client.destroy();
        this.client = null;
      }
      
      this.status = {
        authenticated: false,
        status: 'disconnected',
        qrCode: null,
        timestamp: new Date().toISOString()
      };
      
      console.log('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  /**
   * Envía un mensaje de WhatsApp al número especificado
   */
  async sendMessage(phoneNumber: string, message: string): Promise<any> {
    if (!this.client || !this.status.authenticated) {
      throw new Error('Cliente no inicializado o no autenticado');
    }
    
    try {
      console.log(`Enviando mensaje a ${phoneNumber}...`);
      
      // Asegurarse de que el número tiene el formato correcto (añadir @c.us si es necesario)
      const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
      
      // Enviar el mensaje
      const response = await this.client.sendMessage(chatId, message);
      
      console.log('Mensaje enviado correctamente');
      return response;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de contactos de WhatsApp
   */
  async getContacts(): Promise<any[]> {
    if (!this.client || !this.status.authenticated) {
      throw new Error('Cliente no inicializado o no autenticado');
    }
    
    try {
      console.log('Obteniendo contactos...');
      const contacts = await this.client.getContacts();
      console.log(`${contacts.length} contactos obtenidos`);
      return contacts;
    } catch (error) {
      console.error('Error al obtener contactos:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de chats disponibles
   */
  async getChats(): Promise<WhatsAppChat[]> {
    if (!this.client || !this.status.authenticated) {
      // Para desarrollo, generamos algunos chats de ejemplo
      if (process.env.NODE_ENV === 'development') {
        return this.generateDemoChats();
      }
      
      throw new Error('Cliente no inicializado o no autenticado');
    }
    
    try {
      console.log('Obteniendo chats...');
      const chats = await this.client.getChats();
      
      // Convertir los chats al formato de nuestra aplicación
      const convertedChats: WhatsAppChat[] = [];
      
      for (const chat of chats) {
        try {
          const lastMessage = chat.lastMessage ? {
            body: chat.lastMessage.body,
            fromMe: chat.lastMessage.fromMe,
            timestamp: chat.lastMessage.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : null
          } : null;
          
          const convertedChat: WhatsAppChat = {
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            timestamp: chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : null,
            lastMessage
          };
          
          convertedChats.push(convertedChat);
          
          // Actualizar la caché
          this.chatCache.set(convertedChat.id, convertedChat);
        } catch (error) {
          console.error('Error al convertir chat:', error);
        }
      }
      
      console.log(`${convertedChats.length} chats obtenidos`);
      return convertedChats;
    } catch (error) {
      console.error('Error al obtener chats:', error);
      
      // Para desarrollo, generamos algunos chats de ejemplo
      if (process.env.NODE_ENV === 'development') {
        return this.generateDemoChats();
      }
      
      throw error;
    }
  }

  /**
   * Genera chats de ejemplo para desarrollo
   */
  private generateDemoChats(): WhatsAppChat[] {
    const now = Date.now();
    return [
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
        name: 'Equipo de Ventas',
        isGroup: true,
        unreadCount: 5,
        timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
        lastMessage: {
          body: 'Hemos cerrado la venta con el cliente XYZ',
          fromMe: false,
          timestamp: new Date(now - 30 * 60 * 1000).toISOString()
        }
      }
    ];
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  async getMessages(chatId: string, limit: number = 100): Promise<WhatsAppMessage[]> {
    if (!this.client || !this.status.authenticated) {
      // Para desarrollo, generamos algunos mensajes de ejemplo
      if (process.env.NODE_ENV === 'development') {
        return this.generateDemoMessages(chatId);
      }
      
      throw new Error('Cliente no inicializado o no autenticado');
    }
    
    try {
      console.log(`Obteniendo mensajes del chat ${chatId}...`);
      
      // Obtener el chat
      const chat = await this.client.getChatById(chatId);
      
      // Obtener los mensajes
      const messages = await chat.fetchMessages({ limit });
      
      // Convertir los mensajes al formato de nuestra aplicación
      const convertedMessages: WhatsAppMessage[] = [];
      
      for (const message of messages) {
        try {
          const convertedMessage = await this.convertToWhatsAppMessage(message);
          convertedMessages.push(convertedMessage);
        } catch (error) {
          console.error('Error al convertir mensaje:', error);
        }
      }
      
      // Actualizar la caché
      this.messageCache.set(chatId, convertedMessages);
      
      console.log(`${convertedMessages.length} mensajes obtenidos`);
      return convertedMessages;
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      
      // Para desarrollo, generamos algunos mensajes de ejemplo
      if (process.env.NODE_ENV === 'development') {
        return this.generateDemoMessages(chatId);
      }
      
      throw error;
    }
  }

  /**
   * Genera mensajes de ejemplo para desarrollo
   */
  private generateDemoMessages(chatId: string): WhatsAppMessage[] {
    const now = Date.now();
    
    if (chatId === '123456789@c.us') {
      return [
        {
          id: `demo-msg-1-${chatId}`,
          body: 'Hola, estoy interesado en sus servicios. ¿Podrían darme más información?',
          fromMe: false,
          timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          author: 'Cliente Potencial 1',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-2-${chatId}`,
          body: '¡Claro! Nuestros servicios incluyen consultoría de marketing, desarrollo web y estrategias de redes sociales. ¿En cuál está más interesado?',
          fromMe: true,
          timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          author: 'Tú',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-3-${chatId}`,
          body: 'Me interesa principalmente el desarrollo web. ¿Cuáles son sus tarifas?',
          fromMe: false,
          timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
          author: 'Cliente Potencial 1',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-4-${chatId}`,
          body: 'Tenemos varios planes según sus necesidades. ¿Le parece bien si agendamos una llamada para discutir los detalles?',
          fromMe: true,
          timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
          author: 'Tú',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-5-${chatId}`,
          body: 'Me parece perfecto. ¿Podríamos hablar mañana a las 10am?',
          fromMe: false,
          timestamp: new Date(now - 10 * 60 * 1000).toISOString(),
          author: 'Cliente Potencial 1',
          hasMedia: false,
          type: 'chat'
        }
      ];
    } else if (chatId === '555555555@c.us') {
      return [
        {
          id: `demo-msg-1-${chatId}`,
          body: '¿Recibiste mi correo sobre la propuesta?',
          fromMe: false,
          timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
          author: 'María García',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-2-${chatId}`,
          body: 'Sí, lo revisé. Tengo algunas sugerencias para mejorarla.',
          fromMe: true,
          timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
          author: 'Tú',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-3-${chatId}`,
          body: '¿Podemos revisarla juntos antes de la presentación?',
          fromMe: false,
          timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          author: 'María García',
          hasMedia: false,
          type: 'chat'
        }
      ];
    } else {
      // Chat grupal u otros chats
      return [
        {
          id: `demo-msg-1-${chatId}`,
          body: 'Hemos cerrado la venta con el cliente XYZ',
          fromMe: false,
          timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          author: 'Juan Pérez',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-2-${chatId}`,
          body: '¡Excelente trabajo equipo!',
          fromMe: true,
          timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
          author: 'Tú',
          hasMedia: false,
          type: 'chat'
        },
        {
          id: `demo-msg-3-${chatId}`,
          body: 'La comisión debería reflejarse en el próximo cierre',
          fromMe: false,
          timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
          author: 'Ana Gómez',
          hasMedia: false,
          type: 'chat'
        }
      ];
    }
  }

  /**
   * Marca un chat como leído
   */
  async markChatAsRead(chatId: string): Promise<boolean> {
    if (!this.client || !this.status.authenticated) {
      return false;
    }
    
    try {
      console.log(`Marcando chat ${chatId} como leído...`);
      
      // Obtener el chat
      const chat = await this.client.getChatById(chatId);
      
      // Marcar como leído
      await chat.sendSeen();
      
      // Actualizar la caché si existe
      if (this.chatCache.has(chatId)) {
        const cachedChat = this.chatCache.get(chatId);
        if (cachedChat) {
          cachedChat.unreadCount = 0;
          this.chatCache.set(chatId, cachedChat);
        }
      }
      
      console.log('Chat marcado como leído correctamente');
      return true;
    } catch (error) {
      console.error('Error al marcar chat como leído:', error);
      return false;
    }
  }

  /**
   * Obtiene las etiquetas personalizadas para contactos
   */
  async getCustomTags(): Promise<any[]> {
    try {
      return this.customTags;
    } catch (error) {
      console.error('Error al obtener etiquetas personalizadas:', error);
      return [];
    }
  }

  /**
   * Guarda una nueva etiqueta personalizada
   */
  async saveCustomTag(tag: any): Promise<any> {
    try {
      // Verificar si la etiqueta ya existe
      const existingIndex = this.customTags.findIndex(t => t.id === tag.id);
      
      if (existingIndex >= 0) {
        // Actualizar la etiqueta existente
        this.customTags[existingIndex] = {
          ...this.customTags[existingIndex],
          ...tag
        };
      } else {
        // Agregar nueva etiqueta
        const newTag = {
          id: tag.id || Date.now().toString(),
          ...tag
        };
        this.customTags.push(newTag);
      }
      
      // Guardar en el archivo
      fs.writeFileSync(this.customTagsFile, JSON.stringify(this.customTags, null, 2));
      
      return tag;
    } catch (error) {
      console.error('Error al guardar etiqueta personalizada:', error);
      throw error;
    }
  }
}

// Exportar una instancia única del servicio
export const whatsappService = new WhatsAppServiceImpl();
export const whatsappServiceImpl = whatsappService;
export default whatsappService;