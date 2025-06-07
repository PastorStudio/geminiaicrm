/**
 * Sistema de Auto-Respuesta Inteligente - Versión Funcional
 * 
 * Este sistema detecta mensajes nuevos y genera respuestas automáticas
 * usando el agente externo asignado en el selector de la interfaz.
 */

let isAutoResponseActive = false;
let lastProcessedMessageId = '';
let monitoringInterval: NodeJS.Timeout | null = null;

export interface AutoResponseConfig {
  accountId: number;
  chatId: string;
  assignedAgentId: string;
}

/**
 * Detectar el último mensaje entrante y procesarlo
 */
async function detectAndProcessNewMessage(config: AutoResponseConfig) {
  try {
    // 1. Obtener mensajes del chat
    const response = await fetch(`/api/whatsapp-accounts/${config.accountId}/messages/${config.chatId}`);
    
    if (!response.ok) {
      console.log('❌ Error obteniendo mensajes para auto-respuesta');
      return;
    }

    const messages = await response.json();
    
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('📭 No hay mensajes en el chat');
      return;
    }

    // 2. Buscar el último mensaje entrante (no enviado por nosotros)
    const incomingMessages = messages.filter((msg: any) => !msg.fromMe);
    
    if (incomingMessages.length === 0) {
      console.log('📤 Solo hay mensajes salientes');
      return;
    }

    const lastIncomingMessage = incomingMessages[incomingMessages.length - 1];

    // 3. Verificar si es un mensaje nuevo (diferente al último procesado)
    if (lastIncomingMessage.id === lastProcessedMessageId) {
      console.log('⏭️ Mensaje ya procesado anteriormente');
      return;
    }

    // 4. ¡MENSAJE NUEVO DETECTADO! Procesar automáticamente
    console.log('🎯 ¡NUEVO MENSAJE DETECTADO! Generando respuesta automática...');
    console.log('📩 Mensaje:', lastIncomingMessage.body?.substring(0, 50) + '...');
    
    // Actualizar el ID del último mensaje procesado
    lastProcessedMessageId = lastIncomingMessage.id;

    // 5. Generar respuesta usando el agente externo asignado
    await generateAutoResponse(lastIncomingMessage.body, config);

  } catch (error) {
    console.error('❌ Error en detección de mensajes:', error);
  }
}

/**
 * Generar respuesta automática usando el agente externo
 */
async function generateAutoResponse(messageText: string, config: AutoResponseConfig) {
  try {
    console.log(`🤖 Generando respuesta con agente ${config.assignedAgentId}...`);

    // 1. Enviar mensaje al agente externo
    const response = await fetch('/api/ai/chat-with-external-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: config.assignedAgentId,
        message: messageText
      })
    });

    const result = await response.json();

    if (result.success && result.response) {
      console.log('✅ Respuesta generada:', result.response.substring(0, 50) + '...');
      
      // 2. Enviar la respuesta automáticamente al chat
      await sendAutoMessage(result.response, config);
      
    } else {
      console.log('❌ Error generando respuesta:', result.error || 'Sin respuesta');
    }

  } catch (error) {
    console.error('❌ Error generando auto-respuesta:', error);
  }
}

/**
 * Enviar mensaje automático al chat de WhatsApp
 */
async function sendAutoMessage(messageText: string, config: AutoResponseConfig) {
  try {
    console.log('📤 Enviando respuesta automática al chat...');

    const response = await fetch(`/api/whatsapp-accounts/${config.accountId}/chats/${config.chatId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText
      })
    });

    if (response.ok) {
      console.log('✅ Respuesta automática enviada exitosamente');
    } else {
      console.log('❌ Error enviando respuesta automática');
    }

  } catch (error) {
    console.error('❌ Error enviando mensaje automático:', error);
  }
}

/**
 * Iniciar el sistema de auto-respuesta
 */
export function startSmartAutoResponse(config: AutoResponseConfig): () => void {
  console.log('🚀 INICIANDO SISTEMA DE AUTO-RESPUESTA INTELIGENTE');
  console.log('📋 Configuración:', {
    accountId: config.accountId,
    chatId: config.chatId,
    agentId: config.assignedAgentId
  });

  if (isAutoResponseActive) {
    console.log('⚠️ Auto-respuesta ya está activa');
    return () => {};
  }

  isAutoResponseActive = true;
  lastProcessedMessageId = ''; // Resetear para detectar mensajes

  // Monitorear cada 3 segundos para detectar mensajes nuevos
  monitoringInterval = setInterval(() => {
    if (isAutoResponseActive) {
      detectAndProcessNewMessage(config);
    }
  }, 3000);

  console.log('✅ Sistema de auto-respuesta activado - Monitoreando cada 3 segundos');

  // Retornar función para detener el sistema
  return () => {
    console.log('🛑 DETENIENDO SISTEMA DE AUTO-RESPUESTA');
    isAutoResponseActive = false;
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    
    console.log('✅ Sistema de auto-respuesta desactivado');
  };
}

/**
 * Verificar si el sistema está activo
 */
export function isSmartAutoResponseActive(): boolean {
  return isAutoResponseActive;
}