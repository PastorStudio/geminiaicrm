/**
 * Integrador de Agentes Externos con WhatsApp
 * Conecta automáticamente los agentes externos con las cuentas de WhatsApp
 * para generar respuestas usando OpenAI cuando están activos
 */

import { db } from '../db';
import { whatsappAccounts, externalAgents } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface WhatsAppMessage {
  id: string;
  chatId: string;
  accountId: number;
  from: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  contactName?: string;
}

export class ExternalAgentWhatsAppIntegrator {
  
  /**
   * Procesa un mensaje entrante y genera respuesta con configuración AI personalizada
   */
  async processIncomingMessage(message: WhatsAppMessage): Promise<{ success: boolean; response?: string; agentName?: string }> {
    try {
      // Solo procesar mensajes que no son nuestros
      if (message.fromMe) {
        return { success: false };
      }

      console.log(`📨 Procesando mensaje entrante en cuenta ${message.accountId}: "${message.body.substring(0, 50)}..."`);

      // Obtener configuración de la cuenta WhatsApp
      const [account] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, message.accountId))
        .limit(1);

      if (!account) {
        console.log(`❌ Cuenta WhatsApp ${message.accountId} no encontrada`);
        return { success: false };
      }

      // Verificar si tiene respuesta automática activada (sin depender de agentes asignados)
      if (!account.autoResponseEnabled) {
        console.log(`⏭️ Cuenta ${message.accountId} no tiene respuestas automáticas activadas`);
        return { success: false };
      }

      console.log(`🤖 Generando respuesta automática con configuración AI personalizada`);

      // Generar respuesta usando la configuración AI personalizada
      const response = await this.generateResponseWithAI(message.body, message.accountId, message.chatId);

      if (response) {
        console.log(`✅ Respuesta generada exitosamente: "${response.substring(0, 50)}..."`);
        
        return { 
          success: true, 
          response, 
          agentName: "AI Assistant" 
        };
      }

      return { success: false };

    } catch (error) {
      console.error('❌ Error procesando mensaje con configuración AI:', error);
      return { success: false };
    }
  }

  /**
   * Genera respuesta usando exclusivamente la configuración AI personalizada
   */
  private async generateResponseWithAI(message: string, accountId: number, chatId: string): Promise<string | null> {
    try {
      console.log(`🎯 Generando respuesta con configuración AI personalizada`);

      // Usar exclusivamente el servicio de respuestas inteligentes con configuración AI personalizada
      try {
        const { intelligentResponseService } = await import('./intelligentResponseService');
        
        const intelligentResponse = await intelligentResponseService.generateResponse({
          chatId: chatId,
          accountId: accountId,
          userMessage: message,
          customerName: "Cliente"
        });

        if (intelligentResponse && intelligentResponse.message) {
          console.log(`✅ Respuesta generada con ${intelligentResponse.provider} usando configuración AI personalizada`);
          return intelligentResponse.message;
        }
      } catch (intelligentError: any) {
        console.log('⚠️ Error en configuración AI personalizada:', intelligentError.message);
      }

      // Si no hay configuración AI personalizada, mostrar mensaje informativo
      console.log('ℹ️ No se encontró configuración AI personalizada. Configure prompts en la página AI Settings.');
      return null;

    } catch (error) {
      console.error('❌ Error generando respuesta con configuración AI:', error);
      return null;
    }
  }

  /**
   * Obtiene el contexto específico para cada tipo de agente
   */
  private getAgentContext(agentName: string): string {
    const name = agentName.toLowerCase();
    
    if (name.includes('smartbots')) {
      return `Eres ${agentName}, un experto en automatización, bots inteligentes y tecnología para WhatsApp. Ayudas a las empresas a automatizar procesos, crear chatbots y implementar soluciones de inteligencia artificial. Tu especialidad es simplificar la tecnología para que sea accesible a todos. Responde de manera profesional, útil y amigable a las consultas de WhatsApp.`;
    } else if (name.includes('smartflyer')) {
      return `Eres ${agentName}, un experto en viajes, aerolíneas y turismo especializado en WhatsApp. Ayudas a las personas a planificar viajes perfectos, encontrar las mejores ofertas de vuelos, recomendar destinos y resolver cualquier consulta relacionada con viajes. Responde de manera profesional y entusiasta.`;
    } else if (name.includes('smartplanner')) {
      return `Eres ${agentName}, un experto en planificación, organización y productividad para WhatsApp. Tu misión es ayudar a las personas a organizar sus tareas, proyectos y tiempo de manera eficiente para maximizar su productividad. Responde de manera estructurada y práctica.`;
    } else if (name.includes('agente') && name.includes('ventas')) {
      return `Eres ${agentName}, un especialista en ventas de telecomunicaciones en Panamá via WhatsApp. Conoces a fondo los productos, servicios y planes de TELCA Panamá. Tu objetivo es ayudar a los clientes a encontrar las mejores soluciones de telecomunicaciones para sus necesidades. Responde de manera comercial pero no agresiva.`;
    } else if (name.includes('asistente') && name.includes('tecnico')) {
      return `Eres ${agentName}, un especialista en gestión técnica de campo via WhatsApp. Tu experiencia incluye mantenimiento técnico, soporte operativo y gestión de equipos en campo. Ayudas a resolver problemas técnicos y optimizar operaciones. Responde de manera técnica pero clara.`;
    } else {
      return `Eres ${agentName}, un asistente virtual inteligente y profesional especializado en WhatsApp. Estás aquí para ayudar con cualquier consulta de manera efectiva, amigable y profesional. Siempre mantén un tono conversacional apropiado para WhatsApp.`;
    }
  }

  /**
   * Verifica si una cuenta tiene respuestas automáticas activadas
   */
  async hasActiveAutoResponse(accountId: number): Promise<boolean> {
    try {
      const [account] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, accountId))
        .limit(1);

      return !!(account?.autoResponseEnabled);
    } catch (error) {
      console.error('Error verificando respuestas automáticas:', error);
      return false;
    }
  }

  /**
   * Obtiene información de configuración AI para respuestas automáticas
   */
  async getAutoResponseConfig(accountId: number): Promise<{ enabled: boolean; accountName: string } | null> {
    try {
      const [account] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, accountId))
        .limit(1);

      if (!account) {
        return null;
      }

      return {
        enabled: !!account.autoResponseEnabled,
        accountName: account.name || `Cuenta ${accountId}`
      };
    } catch (error) {
      console.error('Error obteniendo configuración de respuestas automáticas:', error);
      return null;
    }
  }
}

export const externalAgentWhatsAppIntegrator = new ExternalAgentWhatsAppIntegrator();