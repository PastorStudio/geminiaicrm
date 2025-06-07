/**
 * Implementación de un servicio de WhatsApp en TypeScript que proporciona una interfaz compatible
 * con un servicio real que usaría whatsapp-web.js, pero implementado como un fallback.
 */

import { storage } from "../storage";

// Definimos una interfaz para el estado de WhatsApp
export interface WhatsAppStatus {
  initialized: boolean;
  ready: boolean;
  authenticated: boolean;
  qrCode?: string;
  clientInfo?: any;
  lastMessageAt?: Date;
  errorMessage?: string;
}

// Definimos la interfaz para el servicio
export interface IWhatsAppService {
  initialize(): Promise<void>;
  restart(): Promise<void>;
  sendMessage(to: string, message: string, leadId?: number): Promise<any>;
  getQrCode(): string | undefined;
  getStatus(): WhatsAppStatus;
  addEventListener(event: string, callback: Function): void;
  removeEventListener(event: string, callback: Function): void;
  logout(): Promise<any>;
}

// Implementación del servicio de WhatsApp
class WhatsAppService implements IWhatsAppService {
  private status: WhatsAppStatus = {
    initialized: false,
    ready: false,
    authenticated: false
  };
  
  private eventListeners: Map<string, Set<Function>> = new Map();
  private static instance: WhatsAppService | null = null;
  
  // Patrón singleton
  static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.status.initialized) {
      console.log("WhatsApp ya está inicializado");
      return;
    }
    
    console.log("Inicializando servicio simulado de WhatsApp...");
    
    try {
      // En una implementación real, aquí se inicializaría WhatsApp-Web.js
      // Simulamos el proceso de autenticación
      
      // Establecer el estado como inicializado
      this.status.initialized = true;
      
      // Generar un código QR simulado
      this.status.qrCode = this.generateQrCode();
      
      // Notificar a los listeners
      this.notifyListeners('qr', this.status.qrCode);
      
      console.log("Servicio de WhatsApp inicializado correctamente (modo simulado)");
      
    } catch (error) {
      console.error("Error al inicializar servicio de WhatsApp:", error);
      this.status.errorMessage = error instanceof Error ? error.message : "Error desconocido";
      this.notifyListeners('error', error);
      throw error;
    }
  }
  
  async restart(): Promise<void> {
    console.log("Reiniciando servicio de WhatsApp...");
    
    // Resetear el estado
    this.status = {
      initialized: false,
      ready: false,
      authenticated: false
    };
    
    // Reinicializar
    await this.initialize();
    
    // Generar un nuevo código QR
    this.status.qrCode = this.generateQrCode();
    this.notifyListeners('qr', this.status.qrCode);
    
    return Promise.resolve();
  }
  
  async sendMessage(to: string, message: string, leadId?: number): Promise<any> {
    console.log(`[Simulado] Enviando mensaje a ${to}: ${message} (leadId: ${leadId || 'N/A'})`);
    
    // Normalizar número
    const normalizedPhone = to.replace(/[^0-9]/g, '');
    
    // Simular envío exitoso
    const result = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date(),
      status: 'sent',
      to: normalizedPhone,
      simulated: true
    };
    
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
    
    // Actualizar estado
    this.status.lastMessageAt = new Date();
    
    return result;
  }
  
  getQrCode(): string | undefined {
    return this.status.qrCode;
  }
  
  getStatus(): WhatsAppStatus {
    return { ...this.status };
  }
  
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)?.add(callback);
  }
  
  removeEventListener(event: string, callback: Function): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(callback);
    }
  }
  
  async logout(): Promise<any> {
    console.log("Cerrando sesión de WhatsApp (simulado)...");
    
    // Resetear el estado
    this.status = {
      initialized: false,
      ready: false,
      authenticated: false
    };
    
    this.notifyListeners('disconnected', 'Logout');
    
    return { success: true, message: 'Sesión cerrada correctamente' };
  }
  
  // Método privado para notificar a los listeners
  private notifyListeners(event: string, ...args: any[]): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }
  
  // Método privado para generar QR Code simulado
  private generateQrCode(): string {
    // En una implementación real, esto usaría la librería qrcode para generar un código QR
    // que apuntara a web.whatsapp.com
    
    // Devolvemos un código QR simulado como data URL
    const qrDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOQAAADkCAYAAACIV4iNAAAAAklEQVR4AewaftIAAAxOSURBVO3BQW4ERxLAQLKh/3+ZO8c8FSCo6qFZESbYH6xSLoeVyuWwUrkcViqXw0rlclipXA4rlcthpXI5rFQuh5XK5bBSuRxWKpfDSuVyWKlcDiuVy+GHl6A/qTJBf1Llgqak8kkqE/QnVZ4cViqXw0rlclipXA5/+DKVb1J5QuUJlW9SeULlG1W+SeWbDiuVy2Glcjms";
    
    return qrDataUrl;
  }
  
  // Método público para simular recepción de mensaje
  public simulateIncomingMessage(from: string, message: string, leadId?: number): void {
    console.log(`[Simulado] Mensaje recibido de ${from}: ${message}`);
    
    // Crear objeto de mensaje simulado
    const simMessage = {
      from,
      body: message,
      timestamp: new Date(),
      isStatus: false,
      simulated: true
    };
    
    // Actualizar estado
    this.status.lastMessageAt = new Date();
    
    // Notificar a los listeners
    this.notifyListeners('message', simMessage);
    
    // Guardar en la base de datos si tenemos un leadId
    if (leadId) {
      storage.createMessage({
        leadId,
        content: message,
        direction: 'incoming',
        channel: 'whatsapp',
        read: false
      }).catch(err => console.error("Error guardando mensaje:", err));
    }
  }
  
  // Método para simular autenticación completa (para pruebas)
  public simulateAuthenticated(): void {
    this.status.ready = true;
    this.status.authenticated = true;
    this.status.qrCode = undefined; // Eliminar QR cuando ya está autenticado
    
    // Notificar a los listeners
    this.notifyListeners('authenticated');
    this.notifyListeners('ready');
    
    console.log("Simulando autenticación completa en WhatsApp");
  }
}

// Exportar la instancia del servicio
export const whatsappRealService: IWhatsAppService = WhatsAppService.getInstance();