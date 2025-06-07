/**
 * Sistema de respuestas automáticas DIRECTO
 * Sin complicaciones, sin interceptaciones, solo funciona
 */

import OpenAI from 'openai';
import { db } from '../db';
import { whatsappAccounts, externalAgents } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DirectMessage {
  accountId: number;
  chatId: string;
  messageText: string;
  fromMe: boolean;
}

export class DirectAutoResponse {
  /**
   * Función principal - recibe mensaje y genera respuesta automática
   */
  static async processMessage(message: DirectMessage): Promise<boolean> {
    try {
      console.log(`🚀 RESPUESTA DIRECTA - Mensaje: "${message.messageText}"`);
      
      // Si el mensaje es nuestro, ignorar
      if (message.fromMe) {
        console.log('⏭️ Mensaje propio, ignorando');
        return false;
      }
      
      // Buscar configuración de la cuenta directamente
      const accountConfig = await db.select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, message.accountId))
        .limit(1);
      
      if (accountConfig.length === 0) {
        console.log('❌ Cuenta no encontrada');
        return false;
      }
      
      const account = accountConfig[0];
      
      // Verificar si tiene respuestas automáticas activadas
      if (!account.autoResponseEnabled) {
        console.log('⏭️ Respuestas automáticas no activadas');
        return false;
      }
      
      // Verificar si tiene un prompt asignado antes de intentar responder
      if (!account.assignedPromptId) {
        console.log(`❌ Cuenta ${message.accountId} no tiene prompt asignado - NO SE GENERARÁ RESPUESTA AUTOMÁTICA`);
        return false;
      }
      
      // USAR CONFIGURACIÓN AI PERSONALIZADA con prompt asignado
      console.log(`🤖 Generando respuesta con prompt asignado ${account.assignedPromptId} para cuenta ${message.accountId}...`);
      
      // Generar respuesta usando la configuración AI personalizada
      const responseText = await this.generateAIResponse(message.messageText, message.accountId);
      
      if (!responseText) {
        console.log('❌ No se pudo generar respuesta con configuración AI');
        return false;
      }
      
      console.log(`✅ Respuesta AI personalizada generada: "${responseText}"`);
      console.log(`📤 RESPUESTA LISTA PARA ENVÍO al chat ${message.chatId}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error en respuesta directa:', error);
      return false;
    }
  }
  
  /**
   * Genera respuesta usando el prompt específico asignado a la cuenta
   */
  private static async generateAIResponse(messageBody: string, accountId: number): Promise<string | null> {
    try {
      // Obtener el prompt asignado a esta cuenta específica
      const accountWithPrompt = await db.select({
        accountId: whatsappAccounts.id,
        accountName: whatsappAccounts.name,
        assignedPromptId: whatsappAccounts.assignedPromptId
      })
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, accountId))
      .limit(1);

      if (accountWithPrompt.length === 0) {
        console.log(`❌ Cuenta ${accountId} no encontrada`);
        return null;
      }

      const account = accountWithPrompt[0];
      
      if (!account.assignedPromptId) {
        console.log(`❌ Cuenta ${accountId} no tiene prompt asignado - NO SE GENERARÁ RESPUESTA AUTOMÁTICA`);
        return null;
      }

      // Obtener el prompt específico asignado
      const { aiPrompts } = await import('../../shared/schema');
      const promptResult = await db.select()
        .from(aiPrompts)
        .where(eq(aiPrompts.id, account.assignedPromptId))
        .limit(1);

      if (promptResult.length === 0) {
        console.log(`❌ Prompt ${account.assignedPromptId} no encontrado`);
        return "Gracias por tu mensaje. Te responderemos a la brevedad.";
      }

      const prompt = promptResult[0];
      
      if (!prompt.isActive) {
        console.log(`⚠️ Prompt ${prompt.id} no está activo`);
        return "Gracias por tu mensaje. Te responderemos a la brevedad.";
      }

      console.log(`🤖 Usando prompt "${prompt.name}" (${prompt.provider}) para cuenta ${accountId}`);
      console.log(`📝 Mensaje del usuario: "${messageBody}"`);
      
      // Generar respuesta con OpenAI usando el prompt específico
      const completion = await openai.chat.completions.create({
        model: prompt.model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: prompt.content
          },
          {
            role: "user",
            content: messageBody
          }
        ],
        max_tokens: prompt.maxTokens || 150,
        temperature: prompt.temperature || 0.7
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (response) {
        console.log(`✅ Respuesta generada con prompt "${prompt.name}": "${response}"`);
        return response;
      }

      console.log(`⚠️ No se pudo generar respuesta, usando fallback`);
      return "Gracias por tu mensaje. Te responderemos a la brevedad.";
      
    } catch (error) {
      console.error(`❌ Error generando respuesta con prompt asignado:`, error);
      return "Gracias por tu mensaje. Te responderemos a la brevedad.";
    }
  }

  /**
   * Verificar si una cuenta tiene respuestas automáticas activas
   */
  static async hasAutoResponseActive(accountId: number): Promise<boolean> {
    try {
      const account = await db.select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, accountId))
        .limit(1);
      
      if (account.length === 0) return false;
      
      const acc = account[0];
      return acc.autoResponseEnabled === true;
    } catch (error) {
      console.error('Error verificando auto-respuesta:', error);
      return false;
    }
  }
}

export default DirectAutoResponse;