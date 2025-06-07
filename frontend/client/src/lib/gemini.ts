import { GoogleGenerativeAI } from '@google/generative-ai';
// Importamos nuestro cliente personalizado para la API v1
import { GeminiV1Client } from './geminiV1Client';
// Importamos la función de OpenAI
import { generateAutoResponseWithOpenAI } from './openai';
// Importamos el contexto de chat para acceder a las configuraciones
import { chatContext, ChatConfig } from './chatContext';

// Variables para almacenar la configuración dinámica de Gemini
let API_KEY = '';
let MODEL_NAME = 'gemini-pro'; // Modelo por defecto (más estable y con más cuota)
let PREFERRED_MODEL = 'gemini-pro'; // Modelo preferido (si está disponible)
// Nota: 'gemini-1.5-pro' fue reemplazado porque generaba error 404

// Cliente personalizado para la API v1
let geminiV1Client: GeminiV1Client | null = null;

// Función para cargar la clave API dinámicamente desde el servidor
async function loadApiKey() {
  try {
    const response = await fetch('/api/settings/gemini-client-key');
    
    if (!response.ok) {
      throw new Error('No se pudo obtener la clave API de Gemini');
    }
    
    const data = await response.json();
    
    if (data.success && data.apiKey) {
      API_KEY = data.apiKey;
      // Inicializar nuestro cliente personalizado para la API v1
      geminiV1Client = new GeminiV1Client(API_KEY);
      
      // Si el servidor indica qué modelo usar, lo actualizamos
      if (data.model) {
        // Guardamos el modelo preferido (de alta capacidad pero con posibles límites de cuota)
        PREFERRED_MODEL = data.model;
        
        // Usamos el modelo recomendado si se proporciona uno
        if (data.recommendedModel) {
          MODEL_NAME = data.recommendedModel;
        } else {
          // Si no hay modelo recomendado, intentamos con el preferido
          MODEL_NAME = PREFERRED_MODEL;
        }
      }
      console.log('Estado de la clave API de Gemini: Configurada');
      console.log('Modelo Gemini a utilizar:', MODEL_NAME);
      return true;
    } else {
      console.warn('No se encontró una clave API válida para Gemini');
      return false;
    }
  } catch (error) {
    console.error('Error cargando clave API de Gemini:', error);
    return false;
  }
}

// Variable para rastrear el último modelo usado
let lastUsedModel = '';

// Cargar la clave API al inicializar
loadApiKey().then(success => {
  if (success) {
    lastUsedModel = MODEL_NAME;
    console.log('Modelo inicial de Gemini:', MODEL_NAME);
  }
}).catch(err => {
  console.error('Error inicializando Gemini:', err);
});

/**
 * Verifica si la API key de Gemini está configurada y es válida
 * @returns True si la API key es válida
 */
export async function checkGeminiKeyStatus(): Promise<boolean> {
  try {
    // Intentar cargar la API key primero
    const loaded = await loadApiKey();
    if (!loaded) return false;
    
    // Obtener el cliente personalizado para la API v1
    const client = getGeminiV1Client();
    
    // Intentar hacer una llamada simple para verificar que la API key funciona
    const response = await client.generateContent(
      "Hello",
      MODEL_NAME,
      { 
        temperature: 0.1,
        maxOutputTokens: 5 
      }
    );
    
    return !!response;
  } catch (error) {
    console.error("Error al verificar API key de Gemini:", error);
    return false;
  }
}

// Función para obtener una instancia de Gemini con la clave API actual
function getGeminiInstance() {
  if (!API_KEY) {
    throw new Error('No hay una clave API de Gemini configurada');
  }
  return new GoogleGenerativeAI(API_KEY);
}

// Función para obtener nuestro cliente personalizado para la API v1
function getGeminiV1Client() {
  if (!geminiV1Client) {
    if (!API_KEY) {
      throw new Error('No hay una clave API de Gemini configurada');
    }
    geminiV1Client = new GeminiV1Client(API_KEY);
  }
  return geminiV1Client;
}

// Configuración para el modelo de generación de texto
const textModelConfig = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
};

/**
 * Genera una respuesta automática basada en el mensaje del usuario y el historial de chat
 * @param message El mensaje del usuario
 * @param chatId ID del chat para obtener la configuración
 * @param chatHistory Historial de conversación (opcional)
 * @returns La respuesta generada por el modelo de IA seleccionado
 */
export async function generateAutoResponse(
  message: string,
  chatId: string,
  chatHistory: string[] = []
): Promise<string> {
  try {
    // Obtener la configuración del chat
    const conversation = chatContext.getConversation(chatId);
    const config = conversation.config;
    
    // Determinar qué proveedor usar
    const provider = config.provider || 'gemini';
    
    console.log(`Generando respuesta con proveedor: ${provider}, modelo: ${config.modelName}`);
    
    // Usar OpenAI si está configurado como proveedor
    if (provider === 'openai') {
      return await generateAutoResponseWithOpenAI(chatId, message, config);
    } 
    
    // De lo contrario, usar Gemini (opción por defecto)
    
    // Guardar el modelo actual antes de recargar
    const previousModel = MODEL_NAME;
    
    // Siempre intentar recargar la clave API para tener la más actualizada
    // y el modelo recomendado según disponibilidad de cuota
    const loaded = await loadApiKey();
    if (!loaded && !API_KEY) {
      return "No se pudo generar respuesta automática. API Key de Gemini no configurada.";
    }

    // Obtener instancia actualizada de Gemini
    const genAI = getGeminiInstance();
    
    // Notificar si hubo un cambio de modelo automático
    if (previousModel !== MODEL_NAME && previousModel && window.notifyModelChange) {
      window.notifyModelChange(previousModel, MODEL_NAME);
    }
    
    // Obtener nuestro cliente personalizado para la API v1
    const client = getGeminiV1Client();

    // Usar el prompt personalizado si está disponible, o el predeterminado
    let systemPrompt = config.customPrompt || `
    Estás actuando como un asistente de atención al cliente profesional y útil. 
    Responde al siguiente mensaje del cliente. Tu respuesta debe ser:
    - Concisa y directa
    - Profesional y atenta
    - Útil y orientada a resolver la consulta del cliente
    - En español y con un tono amigable pero profesional
    
    IMPORTANTE: Mantén la continuidad de la conversación. Si te preguntan por algo mencionado anteriormente,
    haz referencia a ello en tu respuesta. Si te preguntan por detalles de un producto o servicio mencionado
    en mensajes anteriores, incluye esa información en tu respuesta.
    `;

    // Crear mensaje de usuario
    const userMessage = message;

    // Preparar el contenido con formato adecuado para nuestro cliente personalizado
    let promptText = `${systemPrompt}\n\n`;
    
    // Añadir historial previo si existe
    if (chatHistory.length > 0) {
      promptText += "Conversación anterior:\n";
      
      for (let i = 0; i < chatHistory.length; i += 2) {
        if (i < chatHistory.length) {
          promptText += `Cliente: ${chatHistory[i]}\n`;
        }
        
        if (i + 1 < chatHistory.length) {
          promptText += `Asistente: ${chatHistory[i + 1]}\n`;
        }
      }
      
      promptText += "\n";
    }
    
    // Añadir mensaje actual e instrucciones específicas para mejorar la variabilidad
    promptText += `Cliente: ${userMessage}\n\n`;
    promptText += "Por favor, proporciona una respuesta personalizada y variada basándote en el contexto de la conversación. " +
                  "No repitas contenido exacto de respuestas anteriores. Proporciona información útil y concreta. " +
                  "Incluye ocasionalmente preguntas para mantener la conversación fluida.\n\n";
    promptText += "Asistente:";
    
    console.log("Prompt para generación directa v1:", promptText.substring(0, 100) + "...");
    
    // Utilizar nuestro cliente personalizado para generar respuesta
    const response = await client.generateContent(
      promptText,
      config.modelName || MODEL_NAME,
      {
        temperature: config.temperature || 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1000
      }
    );
    return response;
  } catch (error: any) {
    console.error("Error generando respuesta automática:", error);
    return "Lo siento, no pude generar una respuesta automática en este momento. Detalles del error: " + error.message;
  }
}

/**
 * Analiza un mensaje para extraer información relevante
 * @param message El mensaje a analizar
 * @returns Objetos con información extraída del mensaje
 */
export async function analyzeMessage(message: string): Promise<any> {
  try {
    // Siempre intentar recargar la clave API para tener la más actualizada
    // y el modelo recomendado según disponibilidad de cuota
    const loaded = await loadApiKey();
    if (!loaded && !API_KEY) {
      return { success: false, error: "API Key de Gemini no configurada" };
    }

    // Obtener nuestro cliente personalizado para la API v1
    const client = getGeminiV1Client();
    
    // Registrar qué modelo estamos usando para debug
    console.log(`Analizando mensaje con cliente directo v1 y modelo: ${MODEL_NAME}`);
    
    const prompt = `
    Analiza el siguiente mensaje y extrae toda la información relevante.
    Organiza la información en formato JSON con las siguientes claves:
    - intención (consulta, queja, compra, información, otro)
    - sentimiento (positivo, negativo, neutral)
    - urgencia (alta, media, baja)
    - productos_mencionados (array)
    - cantidades_mencionadas (array)
    - precios_mencionados (array)
    - fechas_mencionadas (array)
    
    Mensaje: "${message}"
    
    Responde ÚNICAMENTE con un objeto JSON válido sin explicaciones adicionales.
    `;

    // Usar nuestro cliente directo v1 
    const response = await client.generateContent(
      prompt,
      MODEL_NAME,
      {
        temperature: 0.3, // Valor bajo para mejor precisión en análisis
        maxOutputTokens: 800
      }
    );
    
    try {
      // Intentar parsear la respuesta como JSON
      const jsonResponse = JSON.parse(response.replace(/```json|```/g, '').trim());
      return { success: true, analysis: jsonResponse };
    } catch (parseError) {
      console.error("Error parseando respuesta JSON de Gemini:", parseError);
      return { success: false, error: "Formato de respuesta inválido", rawResponse: response };
    }
  } catch (error: any) {
    console.error("Error analizando mensaje con Gemini:", error);
    return { success: false, error: error.message };
  }
}