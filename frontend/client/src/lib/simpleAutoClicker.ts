/**
 * Sistema ultra-simple de auto-click que funciona SIN APIs
 * Simplemente presiona botones en la interfaz automáticamente
 */

let isAutoClickActive = false;
let autoClickInterval: NodeJS.Timeout | null = null;
let lastMessageCount = 0;

/**
 * Detectar si hay mensajes nuevos contando elementos en el DOM
 */
function detectNewMessages(): boolean {
  try {
    // Contar mensajes en la interfaz
    const messageElements = document.querySelectorAll('[data-message-id], .message, .chat-message, [class*="message"]');
    const currentCount = messageElements.length;
    
    if (currentCount > lastMessageCount) {
      console.log(`📨 Nuevos mensajes detectados: ${lastMessageCount} → ${currentCount}`);
      lastMessageCount = currentCount;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error detectando mensajes:', error);
    return false;
  }
}

/**
 * Buscar y hacer click en el botón 🤖 A.E
 */
function clickAEButton(): boolean {
  try {
    console.log('🎯 Buscando botón 🤖 A.E...');
    
    // Buscar botones que contengan "A.E" o el emoji
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent || '';
      return text.includes('🤖') || text.includes('A.E') || text.includes('AE');
    });
    
    if (buttons.length === 0) {
      console.log('❌ No se encontró botón 🤖 A.E');
      return false;
    }
    
    const aeButton = buttons[0] as HTMLButtonElement;
    console.log('✅ Botón 🤖 A.E encontrado, haciendo click...');
    
    // Simular click real
    aeButton.click();
    
    return true;
  } catch (error) {
    console.error('❌ Error clickeando botón A.E:', error);
    return false;
  }
}

/**
 * Buscar y hacer click en el botón de envío después de un delay
 */
function clickSendButton(): boolean {
  try {
    console.log('🔍 Buscando botón de envío...');
    
    // Buscar botones de envío
    const sendButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('send') || text.includes('enviar') || 
             btn.querySelector('svg') || btn.querySelector('[data-icon]');
    });
    
    if (sendButtons.length === 0) {
      console.log('❌ No se encontró botón de envío');
      return false;
    }
    
    const sendButton = sendButtons[sendButtons.length - 1] as HTMLButtonElement; // Usar el último (más probable)
    console.log('✅ Botón de envío encontrado, haciendo click...');
    
    // Simular click real
    sendButton.click();
    
    return true;
  } catch (error) {
    console.error('❌ Error clickeando botón envío:', error);
    return false;
  }
}

/**
 * Proceso completo de auto-respuesta
 */
async function processAutoResponse(): Promise<void> {
  if (!isAutoClickActive) return;
  
  try {
    // Detectar mensajes nuevos
    const hasNewMessage = detectNewMessages();
    
    if (!hasNewMessage) {
      return; // No hay mensajes nuevos
    }
    
    console.log('🚀 INICIANDO AUTO-RESPUESTA...');
    
    // Paso 1: Click en botón 🤖 A.E
    const aeClicked = clickAEButton();
    if (!aeClicked) {
      console.log('❌ No se pudo hacer click en A.E');
      return;
    }
    
    // Paso 2: Esperar que se genere la respuesta
    console.log('⏳ Esperando generación de respuesta...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Paso 3: Click en botón de envío
    const sendClicked = clickSendButton();
    if (sendClicked) {
      console.log('🎉 ¡RESPUESTA AUTOMÁTICA ENVIADA EXITOSAMENTE!');
    } else {
      console.log('❌ No se pudo enviar la respuesta');
    }
    
  } catch (error) {
    console.error('❌ Error en proceso de auto-respuesta:', error);
  }
}

/**
 * Iniciar el sistema de auto-click
 */
export function startSimpleAutoClicker(): () => void {
  if (isAutoClickActive) {
    console.log('⚠️ Auto-clicker ya está activo');
    return () => {};
  }
  
  console.log('🎯 INICIANDO AUTO-CLICKER SIMPLE');
  isAutoClickActive = true;
  
  // Inicializar contador de mensajes
  const messageElements = document.querySelectorAll('[data-message-id], .message, .chat-message, [class*="message"]');
  lastMessageCount = messageElements.length;
  console.log(`📊 Mensajes actuales: ${lastMessageCount}`);
  
  // Ejecutar cada 5 segundos
  autoClickInterval = setInterval(() => {
    processAutoResponse();
  }, 5000);
  
  console.log('✅ Auto-clicker activado - Monitoreando cada 5 segundos');
  
  // Función para detener
  return () => {
    console.log('🛑 DETENIENDO AUTO-CLICKER');
    isAutoClickActive = false;
    
    if (autoClickInterval) {
      clearInterval(autoClickInterval);
      autoClickInterval = null;
    }
    
    console.log('✅ Auto-clicker detenido');
  };
}

/**
 * Verificar si está activo
 */
export function isSimpleAutoClickerActive(): boolean {
  return isAutoClickActive;
}

/**
 * Detener manualmente
 */
export function stopSimpleAutoClicker(): void {
  if (autoClickInterval) {
    clearInterval(autoClickInterval);
    autoClickInterval = null;
  }
  isAutoClickActive = false;
  console.log('🛑 Auto-clicker detenido manualmente');
}