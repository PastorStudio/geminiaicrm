/**
 * Módulo para interactuar directamente con la API de Gemini v1
 * Implementación personalizada para evitar los errores 404 de la biblioteca oficial
 * que sigue usando v1beta como valor predeterminado
 */

import axios from 'axios';
import { getGeminiApiKey } from './aiKeysManager';

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

export class GeminiV1Client {
  private apiKey: string | null;
  private baseUrl: string;
  private isClientKey: boolean;
  
  constructor(initialApiKey?: string) {
    // Intentar usar la clave proporcionada, pero verificar si es de cliente
    if (initialApiKey) {
      this.apiKey = initialApiKey;
      this.isClientKey = initialApiKey.startsWith('AIzaSy');
      
      if (this.isClientKey) {
        console.warn('AVISO: GeminiV1Client inicializado con una clave de cliente. Intentando usar clave de servidor.');
        // Intentar obtener la clave de servidor
        const { key, isClientKey } = getGeminiApiKey();
        if (key && !isClientKey) {
          console.log('GeminiV1Client: Se reemplazó la clave de cliente por una clave de servidor válida');
          this.apiKey = key;
          this.isClientKey = false;
        }
      }
    } else {
      // Si no se proporciona clave, intentar obtenerla del gestor
      const { key, isClientKey } = getGeminiApiKey();
      this.apiKey = key;
      this.isClientKey = isClientKey;
    }
    
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1';
  }
  
  /**
   * Genera contenido con el modelo Gemini
   */
  async generateContent(prompt: string, model: string = 'gemini-pro', config: GenerationConfig = {}): Promise<string> {
    try {
      // Si no tenemos apiKey, intentar obtenerla nuevamente
      if (!this.apiKey) {
        const { key, isClientKey } = getGeminiApiKey();
        if (key) {
          this.apiKey = key;
          this.isClientKey = isClientKey;
        } else {
          throw new Error("No hay una clave API configurada para Gemini");
        }
      }
      
      // Comprobar si la clave es de cliente y mostrar advertencia
      if (this.isClientKey) {
        console.warn("ADVERTENCIA: Usando clave de cliente para Gemini en el servidor.");
        console.warn("Esto puede causar errores 404 en las llamadas a la API.");
      }
      
      // Usar directamente la URL v1 evitando cualquier manipulación
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.apiKey}`;
      
      console.log("Modelo Gemini utilizado:", model);
      
      const requestBody = {
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
      
      console.log("Enviando solicitud a Gemini v1 con prompt:", prompt.substring(0, 100) + "...");
      
      const response = await axios.post(url, requestBody);
      
      if (response.data && response.data.candidates && response.data.candidates.length > 0) {
        const content = response.data.candidates[0].content;
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
      // Si no tenemos apiKey, intentar obtenerla nuevamente
      if (!this.apiKey) {
        const { key, isClientKey } = getGeminiApiKey();
        if (key) {
          this.apiKey = key;
          this.isClientKey = isClientKey;
        } else {
          throw new Error("No hay una clave API configurada para Gemini");
        }
      }
      
      // Comprobar si la clave es de cliente y mostrar advertencia
      if (this.isClientKey) {
        console.warn("ADVERTENCIA: Usando clave de cliente para Gemini en el servidor (modo chat).");
        console.warn("Esto puede causar errores 404 en las llamadas a la API.");
      }
      
      // Usar directamente la URL v1 evitando cualquier manipulación
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.apiKey}`;
      
      console.log("Modelo Gemini utilizado para chat:", model);
      
      const requestBody = {
        contents: messages,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          topP: config.topP ?? 0.8,
          topK: config.topK ?? 40,
          maxOutputTokens: config.maxOutputTokens ?? 800,
          stopSequences: config.stopSequences
        }
      };
      
      console.log("Enviando solicitud de chat a Gemini v1");
      
      const response = await axios.post(url, requestBody);
      
      if (response.data && response.data.candidates && response.data.candidates.length > 0) {
        const content = response.data.candidates[0].content;
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