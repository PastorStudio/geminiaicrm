/**
 * Servicio de WhatsApp que genera código QR real mediante integración con WhatsApp Web
 * Utiliza la instalación de Chromium en el entorno Replit
 */

const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const EventEmitter = require('events');
const { storage } = require('../storage');
const { createBrowser } = require('./puppeteerConfig');

// Directorio temporal para archivos de WhatsApp
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Directorio para sesión de WhatsApp
const SESSION_DIR = path.join(TEMP_DIR, '.wwebjs_auth');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Cliente de WhatsApp con WhatsApp-Web.js
class WhatsAppClient extends EventEmitter {
  constructor() {
    super();
    this.qrCodePath = path.join(TEMP_DIR, 'whatsapp-qr.png');
    this.status = {
      initialized: false,
      ready: false,
      authenticated: false
    };
    this.client = null;
  }
  
  // Inicializar cliente
  async initialize() {
    try {
      console.log('Iniciando WhatsAppRealService con Chromium...');
      
      // Obtener navegador configurado
      const browser = await createBrowser();
      
      // Inicializar cliente de WhatsApp-Web.js
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: SESSION_DIR
        }),
        // Configurar opciones de Puppeteer
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
          ],
          headless: true,
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
        }
      });
      
      // Configurar eventos
      this.client.on('qr', async (qr) => {
        console.log('Código QR recibido de WhatsApp Web');
        
        // Generar imagen QR y guardarla
        try {
          // Convertir QR a imagen y guardarla
          const qrDataURL = await qrcode.toDataURL(qr, {
            errorCorrectionLevel: 'H',
            margin: 1,
            scale: 8,
            color: {
              dark: '#122e31',  // Color oscuro del QR
              light: '#ffffff'  // Color claro del QR
            }
          });
          
          // Actualizar estado
          this.status.qrCode = qrDataURL;
          this.emit('qr', qrDataURL);
          
          // Guardar la imagen del QR para depuración
          await qrcode.toFile(this.qrCodePath, qr);
          
          // También guardar en formato de texto por si se necesita
          fs.writeFileSync(
            this.qrCodePath + '.txt', 
            `QR Code content: ${qr}\nTimestamp: ${new Date().toISOString()}`
          );
          
          console.log('Código QR real de WhatsApp Web generado y guardado');
        } catch (error) {
          console.error('Error al generar código QR:', error);
        }
      });
      
      this.client.on('ready', () => {
        console.log('Cliente de WhatsApp listo');
        this.status.ready = true;
        this.status.authenticated = true;
        this.status.qrCode = undefined; // Limpiar QR al estar autenticado
        this.emit('ready');
      });
      
      this.client.on('authenticated', () => {
        console.log('Autenticado en WhatsApp Web');
        this.status.authenticated = true;
      });
      
      this.client.on('auth_failure', (err) => {
        console.error('Error de autenticación:', err);
        this.status.authenticated = false;
        this.status.errorMessage = 'Error de autenticación en WhatsApp';
        this.emit('auth_failure', err);
      });
      
      this.client.on('disconnected', (reason) => {
        console.log('Desconectado de WhatsApp:', reason);
        this.status.ready = false;
        this.status.authenticated = false;
        this.emit('disconnected', reason);
      });
      
      this.client.on('message', (message) => {
        console.log('Mensaje recibido:', message.body);
        this.status.lastMessageAt = new Date();
        this.emit('message', message);
      });
      
      // Iniciar el cliente
      await this.client.initialize();
      this.status.initialized = true;
      
    } catch (error) {
      console.error('Error inicializando cliente real de WhatsApp:', error);
      this.status.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.emit('error', error);
      throw error;
    }
  }
  
  // Enviar mensaje
  async sendMessage(to, message) {
    if (!this.client || !this.status.ready) {
      throw new Error('Cliente de WhatsApp no está listo');
    }
    
    try {
      // Normalizar número
      const normalizedPhone = to.replace(/[^0-9]/g, '');
      const chatId = normalizedPhone + '@c.us';
      
      console.log(`Enviando mensaje a ${chatId}: ${message}`);
      
      // Enviar mensaje
      const result = await this.client.sendMessage(chatId, message);
      
      return {
        id: result.id.id,
        timestamp: new Date(),
        status: 'sent',
        to: chatId
      };
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }
  
  // Obtener información del cliente
  getClientInfo() {
    if (!this.client || !this.status.ready) {
      return null;
    }
    
    return {
      info: this.client.info
    };
  }
  
  // Obtener estado actual
  getStatus() {
    if (this.client && this.status.initialized) {
      // Actualizar información del cliente si está disponible
      const clientInfo = this.getClientInfo();
      if (clientInfo) {
        this.status.clientInfo = clientInfo;
      }
    }
    
    return { ...this.status };
  }
  
  // Cerrar cliente
  async logout() {
    try {
      if (this.client) {
        console.log('Cerrando sesión de WhatsApp...');
        await this.client.logout();
        await this.client.destroy();
      }
      
      this.client = null;
      this.status = {
        initialized: false,
        ready: false,
        authenticated: false
      };
      
      this.emit('disconnected', 'Logout');
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }
}

// Servicio de WhatsApp (Singleton)
class WhatsAppRealService {
  constructor() {
    this.client = null;
    this.eventListeners = new Map();
  }
  
  static getInstance() {
    if (!WhatsAppRealService.instance) {
      WhatsAppRealService.instance = new WhatsAppRealService();
    }
    return WhatsAppRealService.instance;
  }
  
  // Inicializar servicio
  async initialize() {
    if (this.client) {
      console.log('WhatsApp ya está inicializado');
      return;
    }
    
    try {
      this.client = new WhatsAppClient();
      
      // Configurar listeners
      this.client.on('qr', (qr) => {
        this.notifyListeners('qr', qr);
      });
      
      this.client.on('ready', () => {
        this.notifyListeners('ready');
      });
      
      this.client.on('message', (msg) => {
        this.notifyListeners('message', msg);
      });
      
      this.client.on('disconnected', (reason) => {
        this.notifyListeners('disconnected', reason);
      });
      
      this.client.on('auth_failure', (err) => {
        this.notifyListeners('auth_failure', err);
      });
      
      // Inicializar el cliente
      await this.client.initialize();
      
    } catch (error) {
      console.error('Error inicializando WhatsApp Real Service:', error);
      this.client = null;
      throw error;
    }
  }
  
  // Reiniciar servicio
  async restart() {
    if (this.client) {
      await this.client.logout().catch(err => console.error('Error al cerrar sesión:', err));
      this.client = null;
    }
    
    await this.initialize();
  }
  
  // Enviar mensaje
  async sendMessage(to, message, leadId) {
    if (!this.client) {
      throw new Error('Cliente de WhatsApp no inicializado');
    }
    
    try {
      // Normalizar número
      const normalizedPhone = to.replace(/[^0-9]/g, '');
      
      // Enviar mensaje
      const result = await this.client.sendMessage(normalizedPhone, message);
      
      // Guardar mensaje en la base de datos
      if (leadId) {
        await storage.createMessage({
          leadId,
          content: message,
          direction: 'outgoing',
          channel: 'whatsapp',
          read: true
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error al enviar mensaje WhatsApp:', error);
      throw error;
    }
  }
  
  // Obtener QR Code
  getQrCode() {
    if (!this.client) {
      return undefined;
    }
    
    return this.client.getStatus().qrCode;
  }
  
  // Obtener estado actual
  getStatus() {
    if (!this.client) {
      return {
        initialized: false,
        ready: false,
        authenticated: false
      };
    }
    
    return this.client.getStatus();
  }
  
  // Añadir listener de eventos
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event).add(callback);
  }
  
  // Quitar listener de eventos
  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }
  
  // Notificar a todos los listeners de un evento
  notifyListeners(event, ...args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }
  
  // Cerrar sesión
  async logout() {
    if (!this.client) {
      return { success: true, message: 'No hay sesión activa' };
    }
    
    try {
      await this.client.logout();
      return { success: true, message: 'Sesión cerrada correctamente' };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return { success: false, message: 'Error al cerrar sesión', error };
    }
  }
}

// Inicializar la instancia
WhatsAppRealService.instance = null;

// Exportar instancia del servicio
const whatsappRealService = WhatsAppRealService.getInstance();
module.exports = { whatsappRealService };