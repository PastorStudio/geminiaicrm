/**
 * Interceptor de mensajes para A.E AI
 * Detecta mensajes nuevos y genera respuestas automáticas
 */

import { processIncomingMessage } from './autoResponseProcessor.js';

// Storage para rastrear mensajes ya procesados
const processedMessages = new Set<string>();

// Función para interceptar y procesar mensajes nuevos
export async function interceptMessage(
  chatId: string,
  messageId: string,
  messageText: string,
  isFromUser: boolean,
  accountId: number
) {
  // Evitar procesar el mismo mensaje múltiples veces
  if (processedMessages.has(messageId)) {
    return;
  }

  // Solo procesar mensajes de usuarios
  if (!isFromUser) {
    return;
  }

  console.log(`🎯 INTERCEPTANDO MENSAJE: ${chatId} - "${messageText}"`);
  
  // Marcar como procesado inmediatamente
  processedMessages.add(messageId);
  
  // Obtener instancia de WhatsApp para responder
  const { whatsappMultiAccountManager } = await import('./whatsappMultiAccountManager.js');
  
  // Procesar con A.E AI
  const processed = await processIncomingMessage(
    chatId,
    messageId,
    messageText,
    isFromUser,
    {
      sendMessage: async (to: string, message: string) => {
        try {
          console.log(`📤 Enviando respuesta A.E AI a ${to}: "${message}"`);
          const result = await whatsappMultiAccountManager.sendMessage(accountId, to, message);
          console.log(`✅ Respuesta A.E AI enviada exitosamente`);
          return result;
        } catch (error) {
          console.error(`❌ Error enviando respuesta A.E AI:`, error);
          throw error;
        }
      }
    }
  );

  if (processed) {
    console.log(`✅ Mensaje procesado con A.E AI: ${chatId}`);
  }
}