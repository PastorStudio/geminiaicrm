/**
 * Gestor de claves API para servicios de IA
 * Este módulo centraliza la gestión de claves API para diferentes proveedores
 * y proporciona métodos para obtener las claves adecuadas para cada servicio.
 */

// Función para obtener la clave API de Gemini
export function getGeminiApiKey(): { key: string | null, isClientKey: boolean } {
  // Primero intentar obtener la clave API de servidor (variable de entorno)
  const serverKey = process.env.GEMINI_API_KEY || null;
  
  // Verificar si es una clave de cliente (comienza con AIzaSy)
  const isClientKey = serverKey ? serverKey.startsWith('AIzaSy') : false;
  
  if (serverKey) {
    if (isClientKey) {
      console.warn('ADVERTENCIA: La clave GEMINI_API_KEY parece ser una clave de cliente, no de servidor.');
      console.warn('Esto puede causar errores 404 en las llamadas a la API desde el servidor.');
    } else {
      console.log('Usando clave API de servidor para Gemini');
    }
    return { key: serverKey, isClientKey };
  }
  
  console.warn('No se encontró una clave API válida para Gemini');
  return { key: null, isClientKey: false };
}

// Función para obtener la clave API de OpenAI
export function getOpenAIApiKey(): string | null {
  const apiKey = process.env.OPENAI_API_KEY || null;
  
  if (!apiKey) {
    console.warn('No se encontró una clave API válida para OpenAI');
    return null;
  }
  
  console.log('Usando clave API para OpenAI');
  return apiKey;
}

// Comprobar la disponibilidad de claves API al iniciar
export function checkApiKeysAvailability(): { 
  gemini: { available: boolean, isClientKey: boolean },
  openai: { available: boolean }
} {
  const geminiKey = getGeminiApiKey();
  const openaiKey = getOpenAIApiKey();
  
  return {
    gemini: {
      available: !!geminiKey.key,
      isClientKey: geminiKey.isClientKey
    },
    openai: {
      available: !!openaiKey
    }
  };
}