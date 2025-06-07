/**
 * Sistema mejorado de respuestas automáticas con IA
 * Integra Gemini AI y procesamiento automático de leads
 */

import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';
import { AutomaticLeadGenerator } from './automaticLeadGenerator';
import { MultimediaService } from './multimediaService';
import { WebScrapingService } from './webScrapingService';
import { db } from '../db';
import { whatsappAccounts, chatAssignments, externalAgents } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class EnhancedAutoResponseService {
  private static activeAccounts = new Set<number>();
  
  /**
   * Activa respuestas automáticas para una cuenta
   */
  static async activateAutoResponse(accountId: number) {
    try {
      console.log(`🤖 Activando respuestas automáticas para cuenta ${accountId}`);
      
      // Marcar en base de datos
      await db.update(whatsappAccounts)
        .set({ 
          autoResponseEnabled: true,
          responseDelay: 3 
        })
        .where(eq(whatsappAccounts.id, accountId));

      // Añadir a conjunto activo
      this.activeAccounts.add(accountId);
      
      // Configurar listener de mensajes
      await this.setupMessageListener(accountId);
      
      console.log(`✅ Respuestas automáticas activadas para cuenta ${accountId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error activando respuestas automáticas:`, error);
      return false;
    }
  }

  /**
   * Desactiva respuestas automáticas para una cuenta
   */
  static async deactivateAutoResponse(accountId: number) {
    try {
      console.log(`🛑 Desactivando respuestas automáticas para cuenta ${accountId}`);
      
      // Actualizar base de datos
      await db.update(whatsappAccounts)
        .set({ autoResponseEnabled: false })
        .where(eq(whatsappAccounts.id, accountId));

      // Remover del conjunto activo
      this.activeAccounts.delete(accountId);
      
      console.log(`✅ Respuestas automáticas desactivadas para cuenta ${accountId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error desactivando respuestas automáticas:`, error);
      return false;
    }
  }

  /**
   * Configura el listener de mensajes para una cuenta
   */
  private static async setupMessageListener(accountId: number) {
    const instance = whatsappMultiAccountManager.getInstance(accountId);
    
    if (!instance || !instance.client) {
      console.error(`❌ Cliente WhatsApp no disponible para cuenta ${accountId}`);
      return;
    }

    // Listener para mensajes entrantes
    instance.client.on('message', async (message) => {
      if (this.activeAccounts.has(accountId)) {
        await this.processIncomingMessage(accountId, message);
      }
    });

    // Listener para multimedia
    instance.client.on('message_create', async (message) => {
      if (this.activeAccounts.has(accountId) && message.hasMedia) {
        await this.processMultimediaMessage(accountId, message);
      }
    });

    console.log(`🔧 Listeners configurados para cuenta ${accountId}`);
  }

  /**
   * Procesa un mensaje entrante y genera respuesta automática
   */
  private static async processIncomingMessage(accountId: number, message: any) {
    console.log('❌ SISTEMA DE RESPUESTAS GENÉRICAS DESACTIVADO PERMANENTEMENTE');
    console.log('❌ Usar únicamente agentes externos reales con OpenAI');
    return;
    
    try {
      // Solo procesar mensajes de clientes (no propios)
      if (message.fromMe) return;

      console.log(`📨 Procesando mensaje entrante: ${message.body?.substring(0, 50)}...`);

      const chatId = message.from;
      
      // Verificar si hay asignación manual (prioridad)
      const existingAssignment = await db.select()
        .from(chatAssignments)
        .where(eq(chatAssignments.chatId, chatId))
        .limit(1);

      if (existingAssignment.length > 0) {
        console.log(`ℹ️ Chat ${chatId} tiene asignación manual, omitiendo respuesta automática`);
        return;
      }

      // Obtener historial del chat para análisis
      const chat = await message.getChat();
      const messages = await chat.fetchMessages({ limit: 20 });
      
      // Generar lead automáticamente si cumple criterios
      await AutomaticLeadGenerator.analyzeAndCreateLead(accountId, chatId, messages);
      
      // Generar respuesta usando IA
      const response = await this.generateAIResponse(message, messages);
      
      if (response) {
        // Esperar delay configurado
        const account = await db.select()
          .from(whatsappAccounts)
          .where(eq(whatsappAccounts.id, accountId))
          .limit(1);
          
        const delay = account[0]?.responseDelay || 3;
        await this.delay(delay * 1000);
        
        // Enviar respuesta
        await chat.sendMessage(response);
        console.log(`✅ Respuesta automática enviada: ${response.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.error('❌ Error procesando mensaje entrante:', error);
    }
  }

  /**
   * Procesa mensajes multimedia
   */
  private static async processMultimediaMessage(accountId: number, message: any) {
    try {
      console.log(`🖼️ Procesando mensaje multimedia: ${message.type}`);
      
      const chatId = message.from;
      
      // Procesar multimedia usando el servicio especializado
      if (message.type === 'ptt' || message.type === 'audio') {
        await MultimediaService.processVoiceNote(accountId, chatId, message.id._serialized);
      } else {
        await MultimediaService.processMultimediaMessage(accountId, chatId, message.id._serialized);
      }
      
      // Generar respuesta apropiada para multimedia
      const response = await this.generateMultimediaResponse(message);
      
      if (response) {
        const chat = await message.getChat();
        await this.delay(2000); // Delay menor para multimedia
        await chat.sendMessage(response);
        console.log(`✅ Respuesta a multimedia enviada`);
      }
      
    } catch (error) {
      console.error('❌ Error procesando multimedia:', error);
    }
  }

  /**
   * Utiliza web scraping para obtener información relevante para respuestas
   */
  private static async enrichResponseWithWebData(chatId: string, message: string): Promise<string> {
    try {
      // Verificar si hay un agente externo asignado
      const assignments = await db.select()
        .from(chatAssignments)
        .where(eq(chatAssignments.chatId, chatId))
        .limit(1);

      if (assignments.length === 0) {
        return '';
      }

      const assignment = assignments[0];
      if (!assignment.assignedExternalAgentId) {
        return '';
      }

      // Obtener información del agente externo
      const agents = await db.select()
        .from(externalAgents)
        .where(eq(externalAgents.id, assignment.assignedExternalAgentId))
        .limit(1);

      if (agents.length === 0 || !agents[0].agentUrl) {
        return '';
      }

      const agent = agents[0];
      console.log(`🕸️ Utilizando web scraping para agente: ${agent.agentName}`);

      // Realizar web scraping de la URL del agente
      const scrapingResult = await WebScrapingService.smartScrape(agent.agentUrl, {
        maxLength: 1000,
        includeImages: false,
        includeLinks: false
      });

      if (scrapingResult.success && scrapingResult.content) {
        console.log(`✅ Información extraída exitosamente: ${scrapingResult.content.length} caracteres`);
        return scrapingResult.content;
      }

      console.log(`⚠️ No se pudo extraer información de: ${agent.agentUrl}`);
      return '';

    } catch (error) {
      console.error('❌ Error en web scraping para respuesta:', error);
      return '';
    }
  }

  /**
   * Genera respuesta usando IA (Gemini) con información de web scraping
   */
  private static async generateAIResponse(message: any, conversationHistory: any[]): Promise<string | null> {
    try {
      const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.warn('⚠️ GOOGLE_GEMINI_API_KEY no configurada');
        return this.getFallbackResponse(message);
      }

      // Enriquecer respuesta con información de web scraping
      const chatId = message.from;
      const webData = await this.enrichResponseWithWebData(chatId, message.body);

      // Preparar contexto de conversación
      const context = conversationHistory
        .slice(-10) // Últimos 10 mensajes
        .map(msg => `${msg.fromMe ? 'Empresa' : 'Cliente'}: ${msg.body}`)
        .join('\n');

      let prompt = `
Eres un asistente de atención al cliente profesional y amigable. 
Responde de manera útil y cortés al siguiente mensaje, considerando el contexto de la conversación.

Contexto de conversación:
${context}

Mensaje actual del cliente: ${message.body}

Instrucciones:
- Responde en español
- Sé profesional pero amigable
- Si el cliente pregunta por precios o productos, indica que un agente especializado lo contactará pronto
- Si es un saludo, responde cordialmente y pregunta cómo puedes ayudar
- Mantén la respuesta concisa (máximo 2 líneas)
- No inventes información específica sobre productos o precios`;

      // Agregar información de web scraping si está disponible
      if (webData) {
        prompt += `

Información adicional de la empresa (extraída automáticamente):
${webData}

- Utiliza esta información para brindar respuestas más precisas y útiles
- Si la información es relevante para la consulta del cliente, inclúyela de forma natural`;
      }

      prompt += `

Respuesta:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      return aiResponse || this.getFallbackResponse(message);
      
    } catch (error) {
      console.error('❌ Error generando respuesta con IA:', error);
      return this.getFallbackResponse(message);
    }
  }

  /**
   * Genera respuesta para mensajes multimedia
   */
  private static async generateMultimediaResponse(message: any): Promise<string | null> {
    const responses = {
      image: "📸 He recibido tu imagen. Un agente revisará el contenido y te responderá pronto.",
      audio: "🎤 He recibido tu nota de voz. La estoy procesando y un agente te contactará en breve.",
      video: "🎥 He recibido tu video. Un especialista lo revisará y te dará seguimiento.",
      document: "📄 He recibido tu documento. Lo revisaré y te proporcionaré la información necesaria.",
      ptt: "🎤 He recibido tu nota de voz. La estoy procesando y un agente te contactará en breve."
    };

    return responses[message.type as keyof typeof responses] || null;
  }

  /**
   * Respuestas de respaldo cuando la IA no está disponible
   */
  private static getFallbackResponse(message: any): string {
    const messageText = message.body?.toLowerCase() || '';
    
    const responses = {
      greeting: "¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?",
      question: "Gracias por tu consulta. Un agente especializado te contactará en breve para brindarte la información que necesitas.",
      complaint: "Lamento que hayas tenido esta experiencia. Tu caso es importante para nosotros y será revisado por nuestro equipo de soporte.",
      default: "Gracias por tu mensaje. Hemos recibido tu consulta y te responderemos a la brevedad."
    };

    if (messageText.includes('hola') || messageText.includes('buenos') || messageText.includes('hello')) {
      return responses.greeting;
    } else if (messageText.includes('?') || messageText.includes('pregunta') || messageText.includes('información')) {
      return responses.question;
    } else if (messageText.includes('problema') || messageText.includes('queja') || messageText.includes('reclamo')) {
      return responses.complaint;
    }
    
    return responses.default;
  }

  /**
   * Utilidad para delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene el estado de respuestas automáticas
   */
  static getAutoResponseStatus() {
    return {
      activeAccounts: Array.from(this.activeAccounts),
      totalActive: this.activeAccounts.size
    };
  }

  /**
   * Inicializa el servicio cargando cuentas activas desde la base de datos
   */
  static async initialize() {
    try {
      console.log('🚀 Inicializando servicio de respuestas automáticas...');
      
      const activeAccounts = await db.select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.autoResponseEnabled, true));

      for (const account of activeAccounts) {
        await this.activateAutoResponse(account.id);
      }
      
      console.log(`✅ Servicio inicializado con ${activeAccounts.length} cuentas activas`);
      
    } catch (error) {
      console.error('❌ Error inicializando servicio de respuestas automáticas:', error);
    }
  }
}