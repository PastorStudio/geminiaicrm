/**
 * Servicio de respuestas inteligentes que integra configuraciones AI con historial de conversación
 * Genera respuestas contextuales y persuasivas basadas en prompts personalizados
 */

import { conversationHistory } from './conversationHistory';
import { db } from '../db';
import { aiSettings, whatsappAccounts, aiPrompts } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ResponseContext {
  chatId: string;
  accountId: number;
  userMessage: string;
  customerName?: string;
  customerLocation?: string;
}

interface AIResponse {
  message: string;
  confidence: number;
  provider: string;
  reasoning?: string;
}

class IntelligentResponseService {
  
  /**
   * Obtiene el prompt asignado para una cuenta específica
   */
  private async getAccountPrompt(accountId: number): Promise<string | null> {
    try {
      // Buscar cuenta con prompt asignado
      const accountResult = await db.select({
        assignedPromptId: whatsappAccounts.assignedPromptId
      })
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, accountId))
      .limit(1);

      if (accountResult.length === 0 || !accountResult[0].assignedPromptId) {
        return null;
      }

      // Obtener el prompt completo
      const promptResult = await db.select({
        content: aiPrompts.content,
        name: aiPrompts.name
      })
      .from(aiPrompts)
      .where(eq(aiPrompts.id, accountResult[0].assignedPromptId))
      .limit(1);

      if (promptResult.length > 0) {
        console.log(`🎯 Usando prompt asignado: "${promptResult[0].name}" para cuenta ${accountId}`);
        return promptResult[0].content;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo prompt asignado:`, error);
      return null;
    }
  }

  /**
   * Genera una respuesta inteligente basada en la configuración AI y el historial
   */
  async generateResponse(context: ResponseContext): Promise<AIResponse> {
    try {
      console.log('🤖 Generando respuesta inteligente para chat:', context.chatId);
      
      // Obtener configuración AI actual
      const [aiConfig] = await db.select().from(aiSettings).limit(1);
      
      if (!aiConfig || !aiConfig.enableAIResponses) {
        console.log('❌ Respuestas AI deshabilitadas');
        return {
          message: '',
          confidence: 0,
          provider: 'none',
          reasoning: 'Respuestas AI deshabilitadas'
        };
      }

      // Obtener historial de conversación
      const history = await conversationHistory.getFullContext(context.chatId, 'ai-agent');
      console.log(`📚 Historial obtenido: ${history.length} mensajes`);

      // Agregar mensaje actual del usuario al historial
      conversationHistory.addUserMessage(context.chatId, 'ai-agent', context.userMessage);

      // Construir contexto completo para el AI
      const fullContext = await this.buildAIContext(aiConfig, history, context);
      
      // Generar respuesta según el proveedor configurado
      let response: AIResponse;
      
      switch (aiConfig.selectedProvider) {
        case 'openai':
          response = await this.generateOpenAIResponse(fullContext, aiConfig);
          break;
        case 'gemini':
          response = await this.generateGeminiResponse(fullContext, aiConfig);
          break;
        case 'qwen3':
          // Temporalmente usar Gemini hasta arreglar Qwen3
          console.log('⚠️ Qwen3 solicitado pero usando Gemini temporalmente');
          response = await this.generateGeminiResponse(fullContext, aiConfig);
          break;
        default:
          response = await this.generateGeminiResponse(fullContext, aiConfig);
      }

      // Guardar respuesta en el historial
      if (response.message) {
        conversationHistory.addAssistantMessage(context.chatId, 'ai-agent', response.message);
      }

      console.log(`✅ Respuesta generada con ${response.provider}: ${response.message.substring(0, 100)}...`);
      return response;
      
    } catch (error) {
      console.error('❌ Error generando respuesta inteligente:', error);
      return {
        message: '',
        confidence: 0,
        provider: 'error',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Construye el contexto completo para el AI con prompt prioritario
   */
  private async buildAIContext(aiConfig: any, history: any[], context: ResponseContext): Promise<string> {
    // PRIORIDAD 1: Usar prompt asignado a la cuenta específica
    let systemPrompt = await this.getAccountPrompt(context.accountId);
    let agentName = 'Asistente';
    
    // PRIORIDAD 2: Usar prompt genérico si no hay asignado
    if (!systemPrompt) {
      systemPrompt = `INSTRUCCIONES:
1. Responde como Martín, el asesor de ventas de Telca
2. Mantén el contexto de toda la conversación anterior
3. Sé persuasivo pero natural y amigable
4. Identifica las necesidades específicas del cliente
5. Guía la conversación hacia una venta concreta
6. Si es apropiado, solicita información adicional (ubicación, servicio actual, etc.)
7. Ofrece soluciones específicas de Telca que resuelvan sus problemas
8. Usa un tono conversacional y cercano
9. Responde ÚNICAMENTE con el mensaje que enviarías al cliente, sin explicaciones adicionales`;
      agentName = 'Martín';
      console.log(`⚠️ Usando prompt genérico para cuenta ${context.accountId} - no hay prompt asignado`);
    }

    let aiContext = `${aiConfig.customPrompt}\n\n`;
    
    // Agregar información del contexto
    aiContext += `INFORMACIÓN DEL CLIENTE:\n`;
    aiContext += `- ID del Chat: ${context.chatId}\n`;
    if (context.customerName) {
      aiContext += `- Nombre: ${context.customerName}\n`;
    }
    if (context.customerLocation) {
      aiContext += `- Ubicación: ${context.customerLocation}\n`;
    }
    
    // Agregar historial de conversación
    if (history.length > 0) {
      aiContext += `\nHISTORIAL DE CONVERSACIÓN:\n`;
      history.forEach((msg, index) => {
        const role = msg.role === 'user' ? 'Cliente' : agentName;
        aiContext += `${role}: ${msg.content}\n`;
      });
    }
    
    // Agregar mensaje actual
    aiContext += `\nMENSAJE ACTUAL DEL CLIENTE: ${context.userMessage}\n\n`;
    
    // Usar el prompt asignado o el genérico
    aiContext += systemPrompt + '\n\n';

    return aiContext;
  }

  /**
   * Genera respuesta usando OpenAI
   */
  private async generateOpenAIResponse(context: string, aiConfig: any): Promise<AIResponse> {
    try {
      if (!process.env.OPENAI_API_KEY && !aiConfig.openaiApiKey) {
        throw new Error('API Key de OpenAI no configurada');
      }

      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ 
        apiKey: aiConfig.openaiApiKey || process.env.OPENAI_API_KEY 
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: context
          }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: 500
      });

      const message = response.choices[0].message.content || '';
      
      return {
        message: message.trim(),
        confidence: 0.85,
        provider: 'openai',
        reasoning: 'Respuesta generada con GPT-4o'
      };
      
    } catch (error) {
      console.error('❌ Error con OpenAI:', error);
      throw error;
    }
  }

  /**
   * Genera respuesta usando Gemini
   */
  private async generateGeminiResponse(context: string, aiConfig: any): Promise<AIResponse> {
    try {
      if (!process.env.GEMINI_API_KEY && !aiConfig.geminiApiKey) {
        throw new Error('API Key de Gemini no configurada');
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(aiConfig.geminiApiKey || process.env.GEMINI_API_KEY || '');
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const result = await model.generateContent(context);
      const response = await result.response;
      const message = response.text();

      return {
        message: message.trim(),
        confidence: 0.80,
        provider: 'gemini',
        reasoning: 'Respuesta generada con Gemini Pro'
      };
      
    } catch (error) {
      console.error('❌ Error con Gemini:', error);
      throw error;
    }
  }

  /**
   * Genera respuesta usando Qwen3
   */
  private async generateQwenResponse(context: string, aiConfig: any): Promise<AIResponse> {
    try {
      if (!process.env.QWEN_API_KEY && !aiConfig.qwenApiKey) {
        throw new Error('API Key de Qwen no configurada');
      }

      // Implementación de Qwen3 - ajustar según la API específica
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.qwenApiKey || process.env.QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          input: {
            messages: [
              {
                role: 'system',
                content: context
              }
            ]
          },
          parameters: {
            temperature: aiConfig.temperature || 0.7,
            max_tokens: 500
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.statusText}`);
      }

      const data = await response.json();
      const message = data.output?.text || '';

      return {
        message: message.trim(),
        confidence: 0.75,
        provider: 'qwen3',
        reasoning: 'Respuesta generada con Qwen-Plus'
      };
      
    } catch (error) {
      console.error('❌ Error con Qwen:', error);
      throw error;
    }
  }

  /**
   * Analiza el sentimiento y contexto del mensaje
   */
  async analyzeMessage(message: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    intent: 'inquiry' | 'complaint' | 'interest' | 'objection' | 'ready_to_buy';
    urgency: 'low' | 'medium' | 'high';
  }> {
    // Análisis básico basado en palabras clave
    const lowerMessage = message.toLowerCase();
    
    // Análisis de sentimiento
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (lowerMessage.includes('gracias') || lowerMessage.includes('excelente') || lowerMessage.includes('perfecto')) {
      sentiment = 'positive';
    } else if (lowerMessage.includes('problema') || lowerMessage.includes('malo') || lowerMessage.includes('no funciona')) {
      sentiment = 'negative';
    }

    // Análisis de intención
    let intent: 'inquiry' | 'complaint' | 'interest' | 'objection' | 'ready_to_buy' = 'inquiry';
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('cuánto')) {
      intent = 'interest';
    } else if (lowerMessage.includes('contratar') || lowerMessage.includes('quiero') || lowerMessage.includes('instalar')) {
      intent = 'ready_to_buy';
    } else if (lowerMessage.includes('problema') || lowerMessage.includes('queja')) {
      intent = 'complaint';
    } else if (lowerMessage.includes('no') || lowerMessage.includes('caro')) {
      intent = 'objection';
    }

    // Análisis de urgencia
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (lowerMessage.includes('urgente') || lowerMessage.includes('ya') || lowerMessage.includes('ahora')) {
      urgency = 'high';
    } else if (lowerMessage.includes('después') || lowerMessage.includes('más tarde')) {
      urgency = 'low';
    }

    return { sentiment, intent, urgency };
  }
}

export const intelligentResponseService = new IntelligentResponseService();