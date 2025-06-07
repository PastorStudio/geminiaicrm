/**
 * Cliente personalizado para la API de Gemini v1
 * Esta implementación evita los problemas con v1beta que tiene la biblioteca oficial
 */

// Tipos para las solicitudes y respuestas
interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

interface GeminiContent {
  parts: Array<{text?: string}>;
}

interface GeminiMessage {
  role: string;
  parts: Array<{text: string}>;
}

interface GeminiRequest {
  contents: any[];
  generationConfig: GenerationConfig;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{text: string}>;
    };
  }>;
}

export class GeminiV1Client {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Genera contenido con el modelo Gemini usando directamente el endpoint v1
   */
  async generateContent(prompt: string, model: string = 'gemini-pro', config: GenerationConfig = {}): Promise<string> {
    try {
      // Usar directamente la URL v1 para evitar problemas con v1beta
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.apiKey}`;
      
      console.log("Usando endpoint v1 directo:", url.replace(this.apiKey, '***'));
      
      const requestBody: GeminiRequest = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          topP: config.topP ?? 0.8,
          topK: config.topK ?? 40,
          maxOutputTokens: config.maxOutputTokens ?? 800,
          stopSequences: config.stopSequences
        }
      };
      
      // Realizar la solicitud a la API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en API Gemini v1:", errorData);
        throw new Error(`Error en API Gemini: ${response.status} ${response.statusText}`);
      }
      
      const data: GeminiResponse = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const content = data.candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          return content.parts[0].text || '';
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error generando contenido con Gemini v1:', error);
      throw error;
    }
  }
  
  /**
   * Implementación simplificada de chat con Gemini
   */
  async chat(messages: GeminiMessage[], model: string = 'gemini-pro', config: GenerationConfig = {}): Promise<string> {
    try {
      // Usar directamente la URL v1 para evitar problemas con v1beta
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.apiKey}`;
      
      console.log("Usando endpoint v1 para chat:", url.replace(this.apiKey, '***'));
      
      const requestBody: GeminiRequest = {
        contents: messages,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          topP: config.topP ?? 0.8,
          topK: config.topK ?? 40,
          maxOutputTokens: config.maxOutputTokens ?? 800,
          stopSequences: config.stopSequences
        }
      };
      
      // Realizar la solicitud a la API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en API Gemini v1 (chat):", errorData);
        throw new Error(`Error en API Gemini chat: ${response.status} ${response.statusText}`);
      }
      
      const data: GeminiResponse = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const content = data.candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          return content.parts[0].text || '';
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error en chat con Gemini v1:', error);
      throw error;
    }
  }
}