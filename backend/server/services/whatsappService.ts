/**
 * Servicio de WhatsApp para abstraer la implementación concreta
 * Permite integrar mensajería con respuestas automáticas y base de datos
 */

import { whatsappService } from './whatsappServiceImpl';
import { storage } from '../storage';

// Este servicio expone métodos de alto nivel para trabajar con WhatsApp
export default {
  // Enviar mensaje a un contacto/grupo
  async sendMessage(to: string, body: string, options: any = {}): Promise<any> {
    try {
      // Enviar mensaje a través del servicio de implementación
      const result = await whatsappService.sendMessage(to, body, options);
      
      // Registrar mensaje en la base de datos
      await storage.createMessage({
        leadId: 1, // Por defecto usamos el primer lead, pero podría ser personalizado
        content: body,
        direction: "outgoing", // Mensaje saliente
        channel: "whatsapp",
        read: true
      });
      
      console.log(`Mensaje enviado a ${to}: "${body.substring(0, 50)}${body.length > 50 ? '...' : ''}"`);
      
      return result;
    } catch (error) {
      console.error('Error enviando mensaje de WhatsApp:', error);
      throw error;
    }
  },
  
  // Obtener estado del servicio de WhatsApp
  getStatus() {
    return whatsappService.getStatus();
  },
  
  // Obtener el código QR más reciente
  getLatestQR() {
    return whatsappService.getLatestQR();
  },
  
  // Método para procesar mensajes entrantes y manejar respuestas automáticas
  async processIncomingMessage(message: any): Promise<void> {
    try {
      console.log('Procesando mensaje entrante:', message.body);
      
      // Guardar mensaje en la base de datos
      await storage.createMessage({
        leadId: 1, // ID de lead por defecto
        content: message.body || '',
        direction: "incoming", // Mensaje entrante
        channel: "whatsapp",
        read: false
      });
      
      // Importar el servicio de respuestas automáticas
      const { autoResponseService } = await import('./autoResponseManager');
      
      // Procesar respuesta automática si está configurada
      if (autoResponseService) {
        console.log('Enviando mensaje a servicio de respuestas automáticas');
        await autoResponseService.handleIncomingMessage(message);
      } else {
        console.log('Servicio de respuestas automáticas no disponible');
      }
    } catch (error) {
      console.error('Error procesando mensaje entrante:', error);
    }
  }
};