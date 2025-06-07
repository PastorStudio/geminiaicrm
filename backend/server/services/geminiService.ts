/**
 * Servicio para integración con Google Gemini AI
 * Proporciona funcionalidades de IA generativa para todo el sistema
 */

import axios from 'axios';
import { apiKeyManager } from './apiKeyManager';
import { geminiKeyGenerator } from './geminiKeyGenerator';

interface GeminiConfig {
  professionLevel: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

class GeminiService {
  private static instance: GeminiService;
  private config: GeminiConfig;

  private constructor() {
    // Configuración por defecto
    this.config = {
      professionLevel: "professional",
      model: "gemini-pro", // Usando el modelo disponible de Gemini
      temperature: 0.7,
      maxOutputTokens: 1024
    };
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Obtiene una clave API válida para Gemini y actualiza el modelo si es necesario
   * @returns Objeto con la clave API y el modelo recomendado
   */
  private async getApiKeyAndModel(): Promise<{key: string, model: string}> {
    try {
      // Intentar obtener una clave válida del generador junto con el modelo recomendado
      const keyInfo = await geminiKeyGenerator.getValidKey();
      
      // Si el keyInfo es un objeto con key y model, lo manejamos correctamente
      if (typeof keyInfo === 'object' && keyInfo.key && keyInfo.model) {
        // Actualizar el modelo si es diferente al configurado actualmente
        if (keyInfo.model !== this.config.model) {
          console.log(`Cambiando modelo de Gemini de ${this.config.model} a ${keyInfo.model} por disponibilidad de cuota`);
          this.config.model = keyInfo.model;
        }
        return keyInfo;
      } 
      
      // Si por alguna razón recibimos solo una string, la manejamos para compatibilidad
      if (typeof keyInfo === 'string') {
        return {
          key: keyInfo,
          model: this.config.model
        };
      }
      
      // Si llegamos aquí, algo salió mal
      throw new Error('Formato de clave API inválido');
    } catch (error) {
      console.error('Error obteniendo clave API de Gemini:', error);
      throw new Error('No se pudo obtener una clave API válida para Gemini');
    }
  }

  /**
   * Actualiza la configuración de Gemini
   */
  public updateConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Verifica si el servicio Gemini está listo para su uso
   * @returns true si el servicio está listo, false en caso contrario
   */
  public async isReady(): Promise<boolean> {
    try {
      // Intentamos obtener una clave API válida
      const apiKeyInfo = await this.getApiKeyAndModel();
      return !!apiKeyInfo.key; // Si tenemos una clave, el servicio está listo
    } catch (error) {
      console.error("Error verificando disponibilidad de Gemini:", error);
      return false;
    }
  }

  /**
   * Genera contenido de texto con Gemini
   */
  public async generateContent(prompt: string): Promise<string> {
    try {
      const { key: apiKey } = await this.getApiKeyAndModel();
      
      // Endpoint para Gemini (la versión se determina por this.config.model)
      // Actualizado a API v1 en lugar de v1beta para evitar errores 404
      const url = `https://generativelanguage.googleapis.com/v1/models/${this.config.model}:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxOutputTokens,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Extraer el texto generado
      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      return generatedText;
    } catch (error) {
      console.error('Error generando contenido con Gemini:', error);
      return `Error: No se pudo generar contenido con Gemini. ${(error as Error).message}`;
    }
  }

  /**
   * Genera una respuesta para un chat con contexto
   */
  public async generateChatResponse(
    message: string, 
    conversationHistory: any[] = [], 
    customSystemPrompt?: string
  ): Promise<string> {
    try {
      const { key: apiKey } = await this.getApiKeyAndModel();
      
      // Actualizado a API v1 en lugar de v1beta para evitar errores 404
      const url = `https://generativelanguage.googleapis.com/v1/models/${this.config.model}:generateContent?key=${apiKey}`;
      
      // Configurar el prompt del sistema según el nivel de profesionalismo
      let systemPrompt = customSystemPrompt || this.getSystemPromptByLevel(this.config.professionLevel);
      
      // Construir el historial de la conversación
      const contents = [];
      
      // Añadir el prompt del sistema como primer mensaje
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      
      contents.push({
        role: 'model',
        parts: [{ text: 'Entendido. Actuaré según las instrucciones proporcionadas.' }]
      });
      
      // Añadir el historial de conversación
      if (conversationHistory && conversationHistory.length > 0) {
        for (const entry of conversationHistory) {
          contents.push({
            role: entry.role === 'user' ? 'user' : 'model',
            parts: [{ text: entry.content }]
          });
        }
      }
      
      // Añadir el mensaje actual
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });
      
      const response = await axios.post(url, {
        contents,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxOutputTokens,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Extraer la respuesta generada
      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      return generatedText;
    } catch (error) {
      console.error('Error generando respuesta de chat con Gemini:', error);
      return `Error: No se pudo generar una respuesta. ${(error as Error).message}`;
    }
  }

  /**
   * Analiza un lead para extraer información y sugerir acciones
   * @param leadId ID del lead a analizar
   * @param skipCache Si es true, fuerza un nuevo análisis incluso si ya existe
   */
  public async analyzeLead(leadId: number, skipCache: boolean = false): Promise<any> {
    try {
      // Importar storage para acceder a la base de datos
      const { storage } = await import('../storage');
      
      // Obtener los datos del lead
      const lead = await storage.getLead(leadId);
      if (!lead) {
        throw new Error(`No se encontró el lead con ID ${leadId}`);
      }
      
      // Obtener mensajes relacionados con el lead para analizar su conversación
      const messages = await storage.getMessagesByLead(leadId);
      
      // Si no hay mensajes pero es un lead de WhatsApp, podemos intentar obtener los mensajes de WhatsApp
      let whatsappMessages = [];
      if (messages.length === 0 && lead.source === 'WhatsApp' && lead.phone) {
        try {
          // Intentar importar el servicio de WhatsApp
          const { whatsappService } = await import('./whatsappServiceImpl');
          // Formatear el ID de WhatsApp
          const whatsappId = `${lead.phone}@c.us`;
          // Obtener mensajes de WhatsApp
          whatsappMessages = await whatsappService.getMessages(whatsappId) || [];
        } catch (whatsappError) {
          console.error('Error obteniendo mensajes de WhatsApp:', whatsappError);
        }
      }
      
      // Combinar los mensajes de todas las fuentes
      const allMessagesContent = [
        ...messages.map(msg => `${msg.direction === 'inbound' ? 'Cliente' : 'Nosotros'}: ${msg.content}`),
        ...whatsappMessages.map(msg => `${msg.fromMe ? 'Nosotros' : 'Cliente'}: ${msg.body}`)
      ].join('\n');
      
      // Obtener una clave API válida para Gemini
      const { key: apiKey } = await this.getApiKeyAndModel();
      
      // Endpoint para Gemini API
      const url = `https://generativelanguage.googleapis.com/v1/models/${this.config.model}:generateContent?key=${apiKey}`;
      
      // Construir el prompt para el análisis
      const prompt = `
      Analiza la siguiente información de un cliente potencial (lead) y genera:
      1. Insights clave sobre sus necesidades e intereses
      2. Acciones recomendadas para avanzar con este lead
      3. Probabilidad de conversión (en porcentaje)
      4. Categorías de servicios que parecen interesarle
      5. Nivel de prioridad (alta, media, baja)
      
      Información del lead:
      ID: ${lead.id}
      Nombre: ${lead.name || 'No disponible'}
      Email: ${lead.email || 'No disponible'}
      Teléfono: ${lead.phone || 'No disponible'}
      Empresa: ${lead.company || 'No disponible'}
      Origen: ${lead.source || 'No especificado'}
      Notas: ${lead.notes || 'Sin notas'}
      
      Historial de conversaciones:
      ${allMessagesContent || 'Sin conversaciones registradas'}
      
      Proporciona la respuesta en formato JSON con las siguientes claves:
      - insights: array de strings con observaciones clave
      - suggestedActions: array de strings con acciones recomendadas
      - serviceCategories: array de strings con categorías de servicios de interés
      - priority: string ("alta", "media" o "baja")
      - conversionProbability: número decimal entre 0 y 1
      
      Responde ÚNICAMENTE con un objeto JSON válido sin explicaciones o texto adicional.
      `;
      
      // Hacer la solicitud a Gemini
      const response = await axios.post(url, {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Baja temperatura para respuestas más consistentes
          maxOutputTokens: this.config.maxOutputTokens,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Extraer y procesar la respuesta
      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      
      try {
        // Limpiar el texto para asegurar que es JSON válido
        const cleanedText = generatedText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanedText);
        
        // Guardar las etiquetas de servicios en el lead
        if (result.serviceCategories && Array.isArray(result.serviceCategories) && result.serviceCategories.length > 0) {
          // Combinar etiquetas existentes con las nuevas
          const existingTags = lead.tags || [];
          const serviceTags = result.serviceCategories.filter(tag => !existingTags.includes(tag));
          
          // Si tenemos una probabilidad de conversión, añadirla como etiqueta
          if (typeof result.conversionProbability === 'number') {
            const probabilityPercentage = Math.round(result.conversionProbability * 100);
            serviceTags.push(`Interés: ${probabilityPercentage}%`);
          }
          
          // Actualizar el lead con las nuevas etiquetas
          await storage.updateLead(leadId, {
            tags: [...existingTags, ...serviceTags]
          });
        }
        
        return {
          success: true,
          leadId,
          analysis: result
        };
      } catch (parseError) {
        console.error('Error parseando respuesta JSON de Gemini:', parseError);
        return {
          success: false,
          error: 'No se pudo procesar la respuesta',
          rawResponse: generatedText
        };
      }
    } catch (error) {
      console.error('Error analizando lead con Gemini:', error);
      return {
        success: false,
        error: `Error al analizar lead: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Extrae información de una conversación con un lead
   */
  public async extractLeadInfoFromConversation(leadId: number, conversation: string): Promise<any> {
    try {
      const { key: apiKey } = await this.getApiKeyAndModel();
      
      // Actualizado a API v1 en lugar de v1beta para evitar errores 404
      const url = `https://generativelanguage.googleapis.com/v1/models/${this.config.model}:generateContent?key=${apiKey}`;
      
      const prompt = `
      Analiza la siguiente conversación con un cliente potencial y extrae toda la información relevante.
      Organiza los datos en formato JSON con las siguientes claves:
      - intereses: array de temas que interesan al cliente
      - objeciones: array de preocupaciones o objeciones del cliente
      - necesidades: array de necesidades expresadas o implícitas
      - urgencia: (alta, media, baja) basada en el tono y contenido
      - nivel_de_interes: valor numérico del 1 al 10
      - mejor_producto: cuál de nuestros productos o servicios parece más adecuado
      - siguientes_pasos: recomendación sobre cómo proceder

      Conversación:
      ${conversation}
      
      Responde ÚNICAMENTE con un objeto JSON válido sin explicaciones adicionales.
      `;
      
      const response = await axios.post(url, {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Baja temperatura para respuestas más precisas
          maxOutputTokens: this.config.maxOutputTokens,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Extraer el texto generado
      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Intentar parsear el JSON
      try {
        // Limpiar el texto para asegurar que es JSON válido
        const cleanedText = generatedText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanedText);
        return {
          success: true,
          leadId,
          analysis: result
        };
      } catch (parseError) {
        console.error('Error parseando respuesta JSON:', parseError);
        return {
          success: false,
          error: 'No se pudo parsear la respuesta',
          rawResponse: generatedText
        };
      }
    } catch (error) {
      console.error('Error extrayendo información de conversación:', error);
      return {
        success: false,
        error: `Error al extraer información: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Genera etiquetas con probabilidades para un lead
   */
  public async generateTagsWithProbability(leadId: number): Promise<any> {
    try {
      const { key: apiKey } = await this.getApiKeyAndModel();
      
      // En un sistema real, obtendríamos los datos del lead desde la base de datos
      const leadData = {
        id: leadId,
        name: "Cliente Ejemplo",
        lastInteraction: "Mostró interés en nuestros servicios de desarrollo web y pidió presupuesto para una aplicación móvil",
        industry: "Tecnología",
        source: "Referido",
        interactions: [
          "Solicitud inicial de información",
          "Demostración de producto",
          "Revisión de presupuesto"
        ]
      };
      
      // Endpoint para Gemini API
      const url = `https://generativelanguage.googleapis.com/v1/models/${this.config.model}:generateContent?key=${apiKey}`;
      
      const prompt = `
      Analiza la siguiente información de un cliente potencial (lead) y genera etiquetas relevantes 
      con su probabilidad de precisión (de 0 a 1).
      
      Información del lead:
      ID: ${leadData.id}
      Nombre: ${leadData.name}
      Última interacción: ${leadData.lastInteraction}
      Industria: ${leadData.industry}
      Origen: ${leadData.source}
      Interacciones:
      ${leadData.interactions.map(i => `- ${i}`).join('\n')}
      
      Genera un array de objetos JSON, cada uno con:
      - tag: el nombre de la etiqueta
      - probability: probabilidad de 0 a 1 
      - relevance: explicación breve de por qué esta etiqueta es relevante
      
      Incluye al menos 5 etiquetas posibles.
      Responde ÚNICAMENTE con un array JSON válido sin explicaciones adicionales.
      `;
      
      const response = await axios.post(url, {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: this.config.maxOutputTokens,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Extraer el texto generado
      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Intentar parsear el JSON
      try {
        // Limpiar el texto para asegurar que es JSON válido
        const cleanedText = generatedText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanedText);
        return {
          success: true,
          leadId,
          tags: result
        };
      } catch (parseError) {
        console.error('Error parseando respuesta JSON:', parseError);
        return {
          success: false,
          error: 'No se pudo parsear la respuesta',
          rawResponse: generatedText
        };
      }
    } catch (error) {
      console.error('Error generando etiquetas:', error);
      return {
        success: false,
        error: `Error al generar etiquetas: ${(error as Error).message}`
      };
    }
  }

  /**
   * Genera un mensaje personalizado para un lead
   */
  public async generateMessage(leadId: number, messageType: string): Promise<string> {
    try {
      // En un sistema real, obtendríamos los datos del lead y usaríamos Gemini
      // para generar un mensaje personalizado basado en esos datos
      
      const messageTemplates = {
        followUp: "Estimado cliente, me gustaría hacer un seguimiento de nuestra conversación anterior...",
        welcome: "¡Bienvenido! Gracias por su interés en nuestros servicios...",
        offer: "Tenemos una oferta especial para usted basada en sus intereses..."
      };
      
      return messageTemplates[messageType as keyof typeof messageTemplates] || 
        "Gracias por contactarnos. Estamos a su disposición para cualquier consulta.";
    } catch (error) {
      console.error('Error generando mensaje con Gemini:', error);
      throw error;
    }
  }

  /**
   * Obtiene el prompt del sistema según el nivel de profesionalismo
   */
  private getSystemPromptByLevel(level: string): string {
    const prompts = {
      casual: `
        Eres un asistente amigable y conversacional. Responde de manera informal, 
        cercana y utilizando un lenguaje sencillo. Puedes usar expresiones coloquiales
        y mostrar una personalidad cálida y accesible.
      `,
      professional: `
        Eres un asistente profesional para un CRM. Responde de manera clara, concisa 
        y profesional. Mantén un tono formal pero amable, y proporciona información 
        precisa y útil sin tecnicismos innecesarios.
      `,
      technical: `
        Eres un especialista técnico. Proporciona respuestas detalladas y precisas,
        utilizando terminología técnica cuando sea apropiado. Enfócate en proporcionar
        información detallada y procedimientos paso a paso cuando sea necesario.
      `,
      executive: `
        Eres un asistente ejecutivo de alto nivel. Proporciona respuestas concisas,
        estratégicas y orientadas a resultados. Enfócate en el valor comercial, eficiencia
        y perspectivas estratégicas sin detalles innecesarios.
      `
    };
    
    return prompts[level as keyof typeof prompts] || prompts.professional;
  }
}

// Exportar la instancia única
export const geminiService = GeminiService.getInstance();