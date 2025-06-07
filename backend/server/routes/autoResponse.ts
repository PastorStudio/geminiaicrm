import { Request, Response } from 'express';
import { ForceAutoResponse } from '../services/forceAutoResponse';

/**
 * Ruta directa para activar respuestas automáticas sin interferencia de Vite
 */
export async function handleAutoResponse(req: Request, res: Response) {
  try {
    const accountId = parseInt(req.params.accountId);
    const chatId = req.params.chatId;
    
    console.log(`🚀 [DIRECTO] Activando respuesta automática para cuenta ${accountId}, chat: ${chatId}`);
    
    const result = await ForceAutoResponse.processChat(accountId, chatId);
    
    if (result) {
      res.json({ 
        success: true, 
        message: "Respuesta automática generada exitosamente",
        accountId,
        chatId 
      });
    } else {
      res.json({ 
        success: false, 
        message: "No se pudo generar respuesta automática",
        accountId,
        chatId 
      });
    }
  } catch (error) {
    console.error("❌ Error en respuesta automática:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor",
      message: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}

/**
 * Ruta para probar el sistema automático manualmente
 */
export async function testAutoResponse(req: Request, res: Response) {
  try {
    console.log("🧪 Probando sistema de respuesta automática...");
    
    // Probar con el chat que veo en los logs
    const testAccountId = 1;
    const testChatId = "13479611717@c.us";
    
    const result = await ForceAutoResponse.processChat(testAccountId, testChatId);
    
    res.json({
      success: true,
      message: "Prueba de respuesta automática completada",
      result,
      testData: {
        accountId: testAccountId,
        chatId: testChatId
      }
    });
  } catch (error) {
    console.error("❌ Error en prueba automática:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error en prueba automática",
      message: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}