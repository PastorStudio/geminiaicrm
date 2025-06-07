import OpenAI from 'openai';
import { ChatConfig } from './chatContext';

// Variable para almacenar la API key
let API_KEY: string | null = null;

// Función para cargar o actualizar la API key de OpenAI
export async function loadOpenAIApiKey(): Promise<boolean> {
  try {
    // Obtener la clave API desde el servidor (que la obtiene de las variables de entorno)
    const response = await fetch('/api/settings/openai-key-status');
    const data = await response.json();
    
    if (data.success && data.hasKey) {
      API_KEY = data.apiKey || process.env.OPENAI_API_KEY || '';
      console.log('Estado de la clave API de OpenAI: Configurada');
      return true;
    } else {
      console.warn('No se encontró una clave API válida para OpenAI');
      return false;
    }
  } catch (error) {
    console.error('Error cargando clave API de OpenAI:', error);
    return false;
  }
}

// Intentar cargar la clave al inicializar
loadOpenAIApiKey().catch(err => {
  console.error('Error inicializando OpenAI:', err);
});

// Función para obtener una instancia de OpenAI con la clave API actual
function getOpenAIInstance() {
  if (!API_KEY) {
    throw new Error('No hay una clave API de OpenAI configurada');
  }
  return new OpenAI({ apiKey: API_KEY });
}

/**
 * Genera una respuesta automática usando OpenAI
 * @param chatId ID del chat
 * @param message Mensaje del usuario
 * @param config Configuración del chat
 * @returns Respuesta generada
 */
export async function generateAutoResponseWithOpenAI(
  chatId: string, 
  message: string, 
  config: ChatConfig
): Promise<string> {
  try {
    // Verificar si tenemos una API key válida
    const loaded = await loadOpenAIApiKey();
    if (!loaded) {
      return "Error: No se ha configurado una API key para OpenAI. Por favor, configúrala en la sección de ajustes.";
    }

    // Obtener la instancia de OpenAI con la API key actual
    const openai = getOpenAIInstance();

    const systemPrompt = config.customPrompt || 
      "Eres un asistente de atención al cliente profesional y útil. Responde de manera clara, concisa y amable.";

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const model = config.modelName || 'gpt-4o';
    
    console.log(`Generando respuesta con OpenAI, modelo: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: config.temperature || 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "No se pudo generar una respuesta.";
  } catch (error) {
    console.error("Error al generar respuesta con OpenAI:", error);
    return `Error al generar la respuesta: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Verifica si la API key de OpenAI está configurada y es válida
 * @returns True si la API key es válida
 */
export async function checkOpenAIKeyStatus(): Promise<boolean> {
  try {
    // Intentar cargar la API key primero
    const loaded = await loadOpenAIApiKey();
    if (!loaded) return false;
    
    // Obtener instancia de OpenAI
    const openai = getOpenAIInstance();
    
    // Intentar hacer una llamada simple para verificar que la API key funciona
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5
    });
    
    return !!response.choices[0].message.content;
  } catch (error) {
    console.error("Error al verificar API key de OpenAI:", error);
    return false;
  }
}