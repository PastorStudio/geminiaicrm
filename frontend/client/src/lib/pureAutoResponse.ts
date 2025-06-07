/**
 * Sistema de Auto-Respuesta Puro - Sin Validaciones Complejas
 * 
 * Este sistema funciona de manera directa:
 * 1. Detecta mensajes nuevos
 * 2. Genera respuesta con el agente asignado
 * 3. Envía la respuesta automáticamente
 */

let isSystemActive = false;
let monitoringTimer: NodeJS.Timeout | null = null;
let lastKnownMessageId = '';

export interface PureAutoConfig {
  accountId: number;
  chatId: string;
  agentId: string;
}

/**
 * Función principal de monitoreo
 */
async function monitorForNewMessages(config: PureAutoConfig) {
  if (!isSystemActive) return;

  try {
    // 1. Obtener mensajes del chat
    const response = await fetch(`/api/whatsapp-accounts/${config.accountId}/messages/${config.chatId}`);
    const messages = await response.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }

    // 2. Encontrar el último mensaje entrante
    const incomingMessages = messages.filter((msg: any) => !msg.fromMe);
    if (incomingMessages.length === 0) {
      return;
    }

    const latestMessage = incomingMessages[incomingMessages.length - 1];

    // 3. Verificar si es un mensaje nuevo
    if (latestMessage.id === lastKnownMessageId) {
      return; // No hay mensajes nuevos
    }

    // 4. ¡MENSAJE NUEVO! Procesar inmediatamente
    console.log('🎯 ¡NUEVO MENSAJE DETECTADO!');
    console.log('📱 Mensaje:', latestMessage.body?.substring(0, 100));
    
    lastKnownMessageId = latestMessage.id;

    // 5. Generar y enviar respuesta automática
    await processNewMessage(latestMessage.body, config);

  } catch (error) {
    console.error('❌ Error monitoreando mensajes:', error);
  }
}

/**
 * Procesar mensaje nuevo y generar respuesta
 */
async function processNewMessage(messageText: string, config: PureAutoConfig) {
  try {
    console.log('🤖 Generando respuesta automática...');

    // 1. Llamar al agente externo
    const response = await fetch('/api/ai/chat-with-external-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: config.agentId,
        message: messageText
      })
    });

    const result = await response.json();

    if (result.success && result.response) {
      console.log('✅ Respuesta generada exitosamente');
      
      // 2. Enviar respuesta al chat
      await sendResponseToChat(result.response, config);
      
    } else {
      console.log('❌ Error generando respuesta:', result.error);
    }

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
  }
}

/**
 * Enviar respuesta al chat de WhatsApp
 */
async function sendResponseToChat(responseText: string, config: PureAutoConfig) {
  try {
    console.log('📤 Enviando respuesta al chat usando endpoint real...');

    // Usar el endpoint correcto que realmente envía mensajes a WhatsApp
    const response = await fetch('/api/whatsapp/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: config.chatId,
        accountId: config.accountId,
        message: responseText,
        automated: true
      })
    });

    if (response.ok) {
      console.log('✅ Respuesta enviada exitosamente al chat real');
    } else {
      const errorText = await response.text();
      console.log('❌ Error enviando respuesta al chat:', errorText);
      
      // Intentar endpoint alternativo si el primero falla
      console.log('🔄 Intentando endpoint alternativo...');
      const altResponse = await fetch(`/api/whatsapp-accounts/${config.accountId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: config.chatId,
          message: responseText
        })
      });
      
      if (altResponse.ok) {
        console.log('✅ Respuesta enviada con endpoint alternativo');
      } else {
        console.log('❌ Error en ambos endpoints:', await altResponse.text());
      }
    }

  } catch (error) {
    console.error('❌ Error enviando respuesta:', error);
  }
}

/**
 * Iniciar el sistema de auto-respuesta puro
 */
export function startPureAutoResponse(config: PureAutoConfig): () => void {
  console.log('🚀 INICIANDO SISTEMA DE AUTO-RESPUESTA PURO');
  console.log('⚙️ Configuración:', config);

  if (isSystemActive) {
    console.log('⚠️ Sistema ya está activo');
    return () => {};
  }

  isSystemActive = true;
  lastKnownMessageId = ''; // Resetear para detectar nuevos mensajes

  // Monitorear cada 2 segundos
  monitoringTimer = setInterval(() => {
    monitorForNewMessages(config);
  }, 2000);

  console.log('✅ Sistema activado - Monitoreando cada 2 segundos');

  // Función para detener el sistema
  return () => {
    console.log('🛑 DETENIENDO SISTEMA DE AUTO-RESPUESTA PURO');
    isSystemActive = false;
    
    if (monitoringTimer) {
      clearInterval(monitoringTimer);
      monitoringTimer = null;
    }
    
    console.log('✅ Sistema detenido completamente');
  };
}

/**
 * Verificar si el sistema está activo
 */
export function isPureAutoResponseActive(): boolean {
  return isSystemActive;
}