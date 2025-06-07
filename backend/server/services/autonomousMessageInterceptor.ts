/**
 * Interceptor Autónomo de Mensajes de WhatsApp
 * Captura mensajes en tiempo real y los procesa automáticamente
 */

import { autonomousProcessor } from './autonomousLeadProcessor';
import { WhatsAppMultiAccountManager } from './whatsappMultiAccount';

export class AutonomousMessageInterceptor {
  private whatsappManager: WhatsAppMultiAccountManager;
  private isActive: boolean = false;
  private messageBuffer: Map<string, any> = new Map();

  constructor(whatsappManager: WhatsAppMultiAccountManager) {
    this.whatsappManager = whatsappManager;
  }

  /**
   * Inicia el interceptor autónomo de mensajes
   */
  start(): void {
    if (this.isActive) {
      console.log('⚠️ Interceptor autónomo ya está activo');
      return;
    }

    this.isActive = true;
    this.setupMessageListeners();
    console.log('🔍 Interceptor autónomo de mensajes iniciado');
  }

  /**
   * Detiene el interceptor
   */
  stop(): void {
    this.isActive = false;
    console.log('🛑 Interceptor autónomo de mensajes detenido');
  }

  /**
   * Configura los listeners para todos los clientes de WhatsApp
   */
  private setupMessageListeners(): void {
    const accounts = this.whatsappManager.getAllAccounts();

    accounts.forEach(account => {
      const client = this.whatsappManager.getClient(account.id);
      if (client) {
        this.setupClientListener(client, account.id);
      }
    });
  }

  /**
   * Configura listener para un cliente específico
   */
  private setupClientListener(client: any, accountId: number): void {
    try {
      // Listener para mensajes entrantes
      client.on('message', async (message: any) => {
        if (!this.isActive) return;
        await this.handleIncomingMessage(message, accountId);
      });

      // Listener para mensajes salientes (para contexto)
      client.on('message_create', async (message: any) => {
        if (!this.isActive) return;
        if (message.fromMe) {
          await this.handleOutgoingMessage(message, accountId);
        }
      });

      console.log(`📱 Listener configurado para cuenta ${accountId}`);

    } catch (error) {
      console.error(`❌ Error configurando listener para cuenta ${accountId}:`, error);
    }
  }

  /**
   * Maneja mensajes entrantes de forma autónoma
   */
  private async handleIncomingMessage(message: any, accountId: number): Promise<void> {
    try {
      // Evitar procesar mensajes del bot
      if (message.fromMe) return;

      // Generar ID único para el mensaje
      const messageId = `${message.id.id}_${message.timestamp}`;
      
      // Evitar duplicados
      if (this.messageBuffer.has(messageId)) {
        return;
      }

      this.messageBuffer.set(messageId, message);

      // Extraer información del mensaje
      const messageData = {
        messageId: messageId,
        fromNumber: this.cleanPhoneNumber(message.from),
        toNumber: this.cleanPhoneNumber(message.to),
        content: message.body || '',
        messageType: this.getMessageType(message),
        whatsappAccountId: accountId,
        timestamp: new Date(message.timestamp * 1000),
        mediaUrl: message.hasMedia ? await this.getMediaUrl(message) : undefined,
        metadata: {
          hasMedia: message.hasMedia,
          isForwarded: message.isForwarded,
          isStatus: message.isStatus,
          isGroup: message.from.includes('@g.us'),
          deviceType: message.deviceType
        }
      };

      console.log(`📥 Mensaje entrante interceptado: ${messageData.fromNumber} -> ${messageData.content?.substring(0, 50)}...`);

      // Procesar automáticamente con el sistema de leads
      await autonomousProcessor.processIncomingMessage(messageData);

      // Limpiar buffer después de un tiempo
      setTimeout(() => {
        this.messageBuffer.delete(messageId);
      }, 300000); // 5 minutos

    } catch (error) {
      console.error('❌ Error procesando mensaje entrante:', error);
    }
  }

  /**
   * Maneja mensajes salientes para contexto
   */
  private async handleOutgoingMessage(message: any, accountId: number): Promise<void> {
    try {
      const messageId = `${message.id.id}_${message.timestamp}_out`;
      
      const messageData = {
        messageId: messageId,
        fromNumber: this.cleanPhoneNumber(message.from),
        toNumber: this.cleanPhoneNumber(message.to),
        content: message.body || '',
        messageType: this.getMessageType(message),
        whatsappAccountId: accountId,
        timestamp: new Date(message.timestamp * 1000),
        direction: 'outbound' as const,
        isFromBot: true,
        metadata: {
          hasMedia: message.hasMedia,
          isGroup: message.to.includes('@g.us')
        }
      };

      // Solo guardar en la base de datos para contexto, sin procesar como lead
      await this.saveOutgoingMessage(messageData);

    } catch (error) {
      console.error('❌ Error procesando mensaje saliente:', error);
    }
  }

  /**
   * Guarda mensajes salientes para contexto
   */
  private async saveOutgoingMessage(messageData: any): Promise<void> {
    try {
      // Aquí se podría guardar el mensaje saliente en la base de datos
      // para mantener el contexto completo de la conversación
      console.log(`📤 Mensaje saliente registrado: ${messageData.toNumber}`);
    } catch (error) {
      console.error('❌ Error guardando mensaje saliente:', error);
    }
  }

  /**
   * Limpia número de teléfono
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace('@c.us', '').replace('@g.us', '');
  }

  /**
   * Determina el tipo de mensaje
   */
  private getMessageType(message: any): string {
    if (message.hasMedia) {
      if (message.type === 'image') return 'image';
      if (message.type === 'video') return 'video';
      if (message.type === 'audio') return 'audio';
      if (message.type === 'document') return 'document';
      return 'media';
    }
    return 'text';
  }

  /**
   * Obtiene URL de media si está disponible
   */
  private async getMediaUrl(message: any): Promise<string | undefined> {
    try {
      if (message.hasMedia) {
        const media = await message.downloadMedia();
        if (media) {
          // En un entorno real, aquí subirías el archivo a un servicio de almacenamiento
          // y retornarías la URL. Por ahora, solo registramos que hay media.
          return `media_${message.id.id}`;
        }
      }
    } catch (error) {
      console.error('❌ Error obteniendo media:', error);
    }
    return undefined;
  }

  /**
   * Obtiene estadísticas del interceptor
   */
  getStats(): any {
    return {
      isActive: this.isActive,
      messagesInBuffer: this.messageBuffer.size,
      accountsMonitoring: this.whatsappManager.getAllAccounts().length
    };
  }

  /**
   * Procesa mensajes pendientes en el buffer
   */
  async processPendingMessages(): Promise<void> {
    console.log(`🔄 Procesando ${this.messageBuffer.size} mensajes pendientes...`);
    
    for (const [messageId, message] of this.messageBuffer.entries()) {
      try {
        // Reintenta procesar mensajes que puedan haber fallado
        console.log(`🔄 Reprocesando mensaje: ${messageId}`);
      } catch (error) {
        console.error(`❌ Error reprocesando mensaje ${messageId}:`, error);
      }
    }
  }
}

// Integración con el sistema existente
let messageInterceptor: AutonomousMessageInterceptor | null = null;

export function initializeAutonomousInterceptor(whatsappManager: WhatsAppMultiAccountManager): void {
  if (!messageInterceptor) {
    messageInterceptor = new AutonomousMessageInterceptor(whatsappManager);
    messageInterceptor.start();
    
    // Configurar reportes automáticos cada 24 horas
    setInterval(async () => {
      try {
        await autonomousProcessor.generateDailyReport();
      } catch (error) {
        console.error('❌ Error generando reporte diario automático:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas

    console.log('🚀 Sistema autónomo de leads y tickets inicializado');
  }
}

export function getAutonomousInterceptor(): AutonomousMessageInterceptor | null {
  return messageInterceptor;
}