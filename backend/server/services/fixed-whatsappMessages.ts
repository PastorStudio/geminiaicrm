/**
 * Implementación de la función getMessages que solo usa mensajes reales
 * Esta función reemplazará la implementación actual sin mensajes de demostración
 */

// Obtener mensajes reales para un chat específico
export async function getMessages(chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
  console.log(`Obteniendo mensajes reales para chat ${chatId}, límite: ${limit}`);
  
  try {
    // Verificar que el cliente esté autenticado
    if (!this.authenticated) {
      console.log("Cliente no autenticado");
      return [];
    }
    
    // Intentar obtener el chat
    try {
      const chat = await this.client.getChatById(chatId);
      
      // Cargar mensajes
      await chat.fetchMessages({ limit });
      
      // Obtener mensajes del chat
      const messages = chat.messages || [];
      
      // Convertir a formato WhatsAppMessage
      return messages.map(msg => {
        return {
          id: msg.id.id,
          body: msg.body,
          fromMe: msg.fromMe,
          timestamp: msg.timestamp,
          hasMedia: msg.hasMedia,
          type: msg.type,
          metadata: {
            author: msg.author || '',
            notifyName: msg._data?.notifyName || ''
          }
        };
      });
    } catch (error) {
      console.error(`Error al obtener mensajes para el chat ${chatId}:`, error);
      return [];
    }
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    return [];
  }
}