import { Request, Response } from 'express';

// Función que SOLO devuelve mensajes auténticos de WhatsApp
export async function getRealWhatsAppMessagesOnly(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      console.log('❌ No chatId proporcionado');
      return res.json([]);
    }

    console.log('🔄 SOLO mensajes REALES para chat:', chatId);

    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    const { db } = await import('../db');
    const { whatsappAccounts } = await import('../../shared/schema');
    
    let authenticMessages: any[] = [];
    const accounts = await db.select().from(whatsappAccounts);
    
    console.log(`🔍 Verificando ${accounts.length} cuentas para chat ${chatId}`);
    
    for (const account of accounts) {
      try {
        const client = whatsappMultiAccountManager.getClient(account.id);
        if (client) {
          const state = await client.getState();
          console.log(`📱 Cuenta ${account.id}: estado ${state}`);
          
          if (state === 'CONNECTED') {
            console.log(`✅ Cuenta ${account.id} CONECTADA - Buscando mensajes para ${chatId}`);
            
            try {
              const chat = await client.getChatById(chatId);
              if (chat) {
                console.log(`📞 Chat encontrado en cuenta ${account.id}`);
                const chatMessages = await chat.fetchMessages({ limit: 50 });
                
                if (chatMessages && chatMessages.length > 0) {
                  console.log(`📨 ${chatMessages.length} mensajes encontrados en WhatsApp`);
                  
                  const authenticFormattedMessages = chatMessages.map((msg, index) => ({
                    id: msg.id?.id || msg.id?._serialized || `real_${Date.now()}_${index}`,
                    body: msg.body || '[Sin texto]',
                    fromMe: Boolean(msg.fromMe),
                    timestamp: msg.timestamp ? msg.timestamp * 1000 : Date.now(),
                    hasMedia: Boolean(msg.hasMedia),
                    type: msg.type || 'chat',
                    chatId: chatId,
                    author: !msg.fromMe && chat.isGroup ? (msg.author || msg._data?.notifyName) : undefined,
                    authorNumber: msg.from || msg.author,
                    authorProfilePic: null
                  }));
                  
                  authenticMessages = authenticFormattedMessages.sort((a, b) => a.timestamp - b.timestamp);
                  console.log(`🎉 ${authenticMessages.length} mensajes AUTÉNTICOS obtenidos del chat ${chatId}`);
                  break; // Encontramos el chat, salir del bucle
                }
              }
            } catch (chatError) {
              console.error(`❌ Error accediendo al chat ${chatId} en cuenta ${account.id}:`, chatError);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando cuenta ${account.id}:`, (error as Error).message);
      }
    }

    console.log(`📤 Enviando ${authenticMessages.length} mensajes auténticos al frontend`);
    res.json(authenticMessages);
  } catch (error) {
    console.error('❌ Error crítico obteniendo mensajes:', error);
    res.json([]);
  }
}