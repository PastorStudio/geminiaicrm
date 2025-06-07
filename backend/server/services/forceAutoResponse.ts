/**
 * Servicio para forzar respuestas automáticas en chats específicos
 */

export class ForceAutoResponse {
  /**
   * Procesa un chat específico para generar respuesta automática
   */
  static async processChat(accountId: number, chatId: string) {
    try {
      console.log(`🚀 Procesando respuesta automática para chat ${chatId}...`);
      
      // Obtener configuración del agente para la cuenta
      const config = await this.getAccountConfig(accountId);
      if (!config || !config.autoResponseEnabled || !config.assignedExternalAgentId) {
        console.log(`❌ No hay configuración de agente automático para cuenta ${accountId}`);
        return false;
      }

      // Obtener el último mensaje del chat
      const lastMessage = await this.getLastMessage(accountId, chatId);
      if (!lastMessage || lastMessage.fromMe) {
        console.log(`❌ No hay mensaje nuevo para procesar en chat ${chatId}`);
        return false;
      }

      console.log(`💬 Último mensaje: "${lastMessage.body}"`);

      // Generar respuesta usando el agente externo
      const response = await this.generateResponse(config.assignedExternalAgentId, lastMessage.body);
      if (!response) {
        console.log(`❌ No se pudo generar respuesta para chat ${chatId}`);
        return false;
      }

      console.log(`✅ Respuesta generada: "${response}"`);

      // Simular el envío colocando la respuesta en el área de texto
      await this.notifyFrontend(accountId, chatId, response);
      
      return true;
    } catch (error) {
      console.error(`❌ Error procesando respuesta automática:`, error);
      return false;
    }
  }

  /**
   * Obtiene la configuración del agente para una cuenta
   */
  private static async getAccountConfig(accountId: number) {
    try {
      const { db } = await import('../db');
      const { whatsappAccounts } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [account] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, accountId));

      if (!account) return null;

      return {
        assignedExternalAgentId: account.assignedExternalAgentId,
        autoResponseEnabled: account.autoResponseEnabled,
        responseDelay: account.responseDelay || 3
      };
    } catch (error) {
      console.error(`❌ Error obteniendo configuración:`, error);
      return null;
    }
  }

  /**
   * Obtiene el último mensaje de un chat
   */
  private static async getLastMessage(accountId: number, chatId: string) {
    try {
      const response = await fetch(`http://localhost:5000/api/whatsapp-accounts/${accountId}/messages/${chatId}`);
      if (!response.ok) return null;

      const messages = await response.json();
      if (!messages || messages.length === 0) return null;

      // Obtener el último mensaje que no sea nuestro
      const lastMessage = messages
        .filter((msg: any) => !msg.fromMe)
        .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

      return lastMessage;
    } catch (error) {
      console.error(`❌ Error obteniendo último mensaje:`, error);
      return null;
    }
  }

  /**
   * Genera respuesta usando el agente externo
   */
  private static async generateResponse(agentId: string, message: string): Promise<string | null> {
    try {
      // Obtener información del agente
      const { db } = await import('../db');
      const { externalAgents } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [agent] = await db
        .select()
        .from(externalAgents)
        .where(eq(externalAgents.id, agentId));

      if (!agent) {
        console.error(`❌ Agente ${agentId} no encontrado`);
        return null;
      }

      console.log(`🤖 Conectando con agente: ${agent.agentName}`);

      // Usar OpenAI directamente para generar respuesta
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // el modelo más reciente de OpenAI
        messages: [
          {
            role: "system",
            content: `Eres ${agent.agentName}, un asistente inteligente especializado. Responde de manera útil y profesional al siguiente mensaje.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        console.error(`❌ No se recibió respuesta del agente`);
        return null;
      }

      // Actualizar contador de respuestas del agente
      await db
        .update(externalAgents)
        .set({ 
          responseCount: (agent.responseCount || 0) + 1,
          lastUsed: new Date()
        })
        .where(eq(externalAgents.id, agentId));

      return responseText;
    } catch (error) {
      console.error(`❌ Error generando respuesta:`, error);
      return null;
    }
  }

  /**
   * Notifica al frontend sobre la nueva respuesta
   */
  private static async notifyFrontend(accountId: number, chatId: string, response: string) {
    try {
      // Aquí puedes implementar WebSocket o simplemente log para debugging
      console.log(`📢 Notificando frontend - Cuenta: ${accountId}, Chat: ${chatId}`);
      console.log(`📝 Respuesta: ${response}`);
      
      // La respuesta se puede mostrar en el área de texto del chat
      // Esto lo manejará el frontend cuando detecte nuevas respuestas
    } catch (error) {
      console.error(`❌ Error notificando frontend:`, error);
    }
  }
}