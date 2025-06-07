/**
 * Funciones automáticas para WhatsApp
 * 1. Auto-click del botón A.E. después de detectar mensaje nuevo (2 segundos)
 * 2. Auto-envío mejorado del área de input (3-5 segundos)
 */

// Variables globales para control de estado
let autoAEEnabled = false;
let autoSendEnabled = false;
let lastMessageCount = 0;
let messageMonitorInterval: any = null;
let autoSendTimer: any = null;

/**
 * 1. FUNCIÓN AUTO-CLICK BOTÓN A.E.
 */

// Detectar nuevos mensajes entrantes
function detectNewIncomingMessage(): boolean {
  try {
    const messageElements = document.querySelectorAll('[data-testid="msg-container"], .message, [class*="message"]');
    const currentCount = messageElements.length;
    
    if (currentCount > lastMessageCount) {
      console.log(`📨 NUEVO MENSAJE DETECTADO (${lastMessageCount} → ${currentCount})`);
      lastMessageCount = currentCount;
      return true;
    }
    
    lastMessageCount = Math.max(lastMessageCount, currentCount);
    return false;
  } catch (error) {
    console.error('❌ Error detectando mensajes:', error);
    return false;
  }
}

// Buscar y hacer click en botón A.E. azul
function clickAEButton(): boolean {
  try {
    console.log('🔍 Buscando botón A.E. azul...');
    
    // Buscar botón A.E. por texto
    const buttons = Array.from(document.querySelectorAll('button'));
    
    for (const button of buttons) {
      const buttonElement = button as HTMLButtonElement;
      const text = buttonElement.textContent || '';
      
      if (text.includes('A.E') && !buttonElement.disabled) {
        console.log('🎯 BOTÓN A.E. ENCONTRADO - HACIENDO CLICK');
        buttonElement.click();
        return true;
      }
    }
    
    console.log('❌ No se encontró botón A.E. disponible');
    return false;
  } catch (error) {
    console.error('❌ Error haciendo click en A.E.:', error);
    return false;
  }
}

// Monitorear mensajes y activar A.E. automáticamente
function startAutoAEMonitoring() {
  if (messageMonitorInterval) {
    clearInterval(messageMonitorInterval);
  }
  
  console.log('🚀 INICIANDO MONITOREO AUTO A.E.');
  
  messageMonitorInterval = setInterval(() => {
    if (!autoAEEnabled) return;
    
    const hasNewMessage = detectNewIncomingMessage();
    
    if (hasNewMessage) {
      console.log('⏰ Nuevo mensaje detectado, esperando 2 segundos para A.E...');
      
      setTimeout(() => {
        if (autoAEEnabled) {
          clickAEButton();
        }
      }, 2000);
    }
  }, 1000);
}

/**
 * 2. FUNCIÓN AUTO-ENVÍO MEJORADA
 */

// Buscar y enviar mensaje del input
function autoSendFromInput(): boolean {
  try {
    console.log('📤 Buscando área de input para auto-envío...');
    
    // Buscar input con texto
    const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]'));
    let inputElement: any = null;
    
    for (const input of inputs) {
      const element = input as HTMLInputElement | HTMLTextAreaElement;
      const value = element.value || element.textContent || '';
      if (value.trim().length > 0) {
        inputElement = element;
        break;
      }
    }
    
    if (!inputElement) {
      console.log('📝 No hay texto en el input para enviar');
      return false;
    }
    
    const messageText = inputElement.value || inputElement.textContent || '';
    console.log(`📨 Texto encontrado: "${messageText.substring(0, 50)}..."`);
    
    // Buscar botón de envío
    const buttons = Array.from(document.querySelectorAll('button'));
    
    for (const button of buttons) {
      const buttonElement = button as HTMLButtonElement;
      const text = buttonElement.textContent || '';
      
      if ((text.toLowerCase().includes('enviar') || text.toLowerCase().includes('send') || 
           buttonElement.className.includes('bg-green') || buttonElement.className.includes('bg-blue')) 
           && !buttonElement.disabled) {
        console.log('🚀 BOTÓN ENVIAR ENCONTRADO - ENVIANDO MENSAJE');
        buttonElement.click();
        
        // Limpiar input después de enviar
        setTimeout(() => {
          if ('value' in inputElement) {
            inputElement.value = '';
          } else {
            inputElement.textContent = '';
          }
          const event = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(event);
        }, 500);
        
        return true;
      }
    }
    
    console.log('❌ No se encontró botón de envío disponible');
    return false;
  } catch (error) {
    console.error('❌ Error en auto-envío:', error);
    return false;
  }
}

// Programar auto-envío aleatorio entre 3-5 segundos
function scheduleNextAutoSend() {
  if (autoSendTimer) {
    clearTimeout(autoSendTimer);
  }
  
  if (!autoSendEnabled) return;
  
  const randomDelay = Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
  console.log(`⏰ Próximo auto-envío en ${randomDelay/1000} segundos`);
  
  autoSendTimer = setTimeout(() => {
    if (autoSendEnabled) {
      const sent = autoSendFromInput();
      if (sent) {
        console.log('✅ Auto-envío completado');
      }
      scheduleNextAutoSend();
    }
  }, randomDelay);
}

/**
 * FUNCIONES PÚBLICAS DE CONTROL
 */

export function enableAutoAE() {
  console.log('🟢 ACTIVANDO AUTO A.E.');
  autoAEEnabled = true;
  startAutoAEMonitoring();
}

export function disableAutoAE() {
  console.log('🔴 DESACTIVANDO AUTO A.E.');
  autoAEEnabled = false;
  if (messageMonitorInterval) {
    clearInterval(messageMonitorInterval);
    messageMonitorInterval = null;
  }
}

export function enableAutoSend() {
  console.log('🟢 ACTIVANDO AUTO-ENVÍO (3-5 segundos)');
  autoSendEnabled = true;
  scheduleNextAutoSend();
}

export function disableAutoSend() {
  console.log('🔴 DESACTIVANDO AUTO-ENVÍO');
  autoSendEnabled = false;
  if (autoSendTimer) {
    clearTimeout(autoSendTimer);
    autoSendTimer = null;
  }
}

export function getAutoFunctionsStatus() {
  return {
    autoAE: autoAEEnabled,
    autoSend: autoSendEnabled
  };
}

export function toggleAutoAE() {
  if (autoAEEnabled) {
    disableAutoAE();
  } else {
    enableAutoAE();
  }
  return autoAEEnabled;
}

export function toggleAutoSend() {
  if (autoSendEnabled) {
    disableAutoSend();
  } else {
    enableAutoSend();
  }
  return autoSendEnabled;
}

export function cleanupAutoFunctions() {
  disableAutoAE();
  disableAutoSend();
}

// Auto-limpiar solo al cerrar completamente la ventana (no en tabs/blur)
if (typeof window !== 'undefined') {
  // Solo limpiar en cierre real de ventana, no en cambio de pestañas
  window.addEventListener('beforeunload', (event) => {
    // Solo limpiar si realmente se está cerrando la ventana
    if (event.returnValue === undefined) {
      console.log('🧹 Limpieza solo por cierre real de ventana');
      cleanupAutoFunctions();
    }
  });
  
  // Exponer funciones globalmente para evitar conflictos
  (window as any).getAutoFunctionsStatus = getAutoFunctionsStatus;
  (window as any).toggleAutoAE = toggleAutoAE;
  (window as any).toggleAutoSend = toggleAutoSend;
}