/**
 * Sistema directo para enviar mensajes a WhatsApp sin interceptación de Vite
 * Usa el botón 🤖 A.E existente para enviar respuestas automáticamente
 */

let isSystemActive = false;
let directSenderInterval: NodeJS.Timeout | null = null;
let lastProcessedMessageId = '';

export interface DirectSenderConfig {
  accountId: number;
  chatId: string;
  agentId: string;
}

/**
 * Simular click en el botón 🤖 A.E para generar y enviar respuesta
 */
async function simulateAEButtonClick(): Promise<boolean> {
  try {
    console.log('🎯 Buscando botón 🤖 A.E para activar...');
    
    // Buscar el botón 🤖 A.E por su texto
    const aeButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
      btn.textContent?.includes('🤖 A.E') || btn.textContent?.includes('A.E')
    );
    
    if (aeButtons.length === 0) {
      console.log('❌ No se encontró el botón 🤖 A.E');
      return false;
    }
    
    const aeButton = aeButtons[0] as HTMLButtonElement;
    console.log('✅ Botón 🤖 A.E encontrado, simulando click...');
    
    // Simular click real en el botón
    aeButton.click();
    
    console.log('⏳ Esperando que se genere la respuesta...');
    
    // Esperar un momento para que se genere la respuesta
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Buscar botón de envío (Send/Enviar)
    console.log('🔍 Buscando botón de envío...');
    
    const sendButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('send') || text.includes('enviar') || 
             btn.querySelector('svg[data-testid="send"]') || 
             btn.querySelector('[data-icon="send"]');
    });
    
    if (sendButtons.length > 0) {
      const sendButton = sendButtons[0] as HTMLButtonElement;
      console.log('✅ Botón de envío encontrado, enviando mensaje...');
      sendButton.click();
      
      console.log('🎉 Respuesta automática enviada exitosamente');
      return true;
    } else {
      console.log('❌ No se encontró botón de envío');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error simulando click del botón A.E:', error);
    return false;
  }
}

/**
 * Verificar si hay nuevos mensajes
 */
async function checkForNewMessages(): Promise<boolean> {
  try {
    // Obtener mensajes del DOM actual
    const messageElements = document.querySelectorAll('[data-testid="msg-container"]');
    
    if (messageElements.length === 0) {
      return false;
    }
    
    // Obtener el último mensaje
    const lastMessage = messageElements[messageElements.length - 1];
    const messageId = lastMessage.getAttribute('data-id') || `msg-${messageElements.length}`;
    
    // Verificar si es un mensaje nuevo y no es nuestro mensaje
    const isIncoming = lastMessage.querySelector('[data-testid="msg-meta-out"]') === null;
    
    if (messageId !== lastProcessedMessageId && isIncoming) {
      console.log('📨 Nuevo mensaje detectado:', messageId);
      lastProcessedMessageId = messageId;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error verificando mensajes:', error);
    return false;
  }
}

/**
 * Monitorear y responder automáticamente
 */
async function monitorAndRespond() {
  if (!isSystemActive) {
    return;
  }
  
  try {
    const hasNewMessage = await checkForNewMessages();
    
    if (hasNewMessage) {
      console.log('🚀 Procesando nuevo mensaje con respuesta automática...');
      await simulateAEButtonClick();
    }
  } catch (error) {
    console.error('❌ Error en monitoreo automático:', error);
  }
}

/**
 * Iniciar el sistema de envío directo
 */
export function startDirectWhatsAppSender(config: DirectSenderConfig): () => void {
  if (isSystemActive) {
    console.log('⚠️ Sistema directo ya está activo');
    return () => {};
  }
  
  console.log('🎯 Iniciando sistema de envío directo para WhatsApp');
  console.log('📋 Configuración:', config);
  
  isSystemActive = true;
  lastProcessedMessageId = '';
  
  // Monitorear cada 3 segundos
  directSenderInterval = setInterval(() => {
    monitorAndRespond();
  }, 3000);
  
  console.log('✅ Sistema directo activado - Monitoreando cada 3 segundos');
  
  // Función para detener
  return () => {
    console.log('🛑 Deteniendo sistema de envío directo');
    isSystemActive = false;
    
    if (directSenderInterval) {
      clearInterval(directSenderInterval);
      directSenderInterval = null;
    }
    
    console.log('✅ Sistema directo detenido');
  };
}

/**
 * Verificar si el sistema está activo
 */
export function isDirectSenderActive(): boolean {
  return isSystemActive;
}

/**
 * Detener el sistema manualmente
 */
export function stopDirectSender(): void {
  if (directSenderInterval) {
    clearInterval(directSenderInterval);
    directSenderInterval = null;
  }
  isSystemActive = false;
  console.log('🛑 Sistema directo detenido manualmente');
}