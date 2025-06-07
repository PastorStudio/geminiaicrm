/**
 * Rutas para gestionar cuentas de WhatsApp
 */
import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { whatsappMultiAccountManager } from '../services/whatsappMultiAccountManager';
import whatsappServiceMulti from '../services/whatsappServiceMulti';

const router = Router();

// Obtener todas las cuentas de WhatsApp
router.get('/', async (req, res) => {
  try {
    const accounts = await storage.getAllWhatsappAccounts();
    
    // Obtener el estado actual de cada cuenta desde el administrador de múltiples cuentas
    const accountsWithStatus = accounts.map(account => {
      const statusInfo = whatsappMultiAccountManager.getStatus(account.id);
      return {
        ...account,
        currentStatus: statusInfo
      };
    });
    
    res.json({
      success: true,
      accounts: accountsWithStatus
    });
  } catch (error) {
    console.error('Error al obtener cuentas de WhatsApp:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener cuentas de WhatsApp',
      accounts: [] // Always provide empty array as fallback
    });
  }
});

// Obtener una cuenta específica de WhatsApp
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const account = await storage.getWhatsappAccount(id);
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    
    // Obtener estado actualizado desde el administrador de múltiples cuentas
    const statusInfo = whatsappMultiAccountManager.getStatus(id);
    
    res.json({
      ...account,
      currentStatus: statusInfo
    });
  } catch (error) {
    console.error('Error al obtener cuenta de WhatsApp:', error);
    res.status(500).json({ error: 'Error al obtener cuenta de WhatsApp' });
  }
});

// Esquema de validación para creación de cuentas
const accountSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  ownerPhone: z.string().nullable().optional(),
  adminId: z.number().nullable().optional(),
  assignedExternalAgentId: z.string().nullable().optional(),
  autoResponseEnabled: z.boolean().optional().default(false),
  responseDelay: z.number().optional().default(3)
});

// Crear una nueva cuenta de WhatsApp
router.post('/', async (req, res) => {
  try {
    // Validar datos de entrada
    const validation = accountSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validation.error.format() 
      });
    }
    
    // Crear cuenta en la base de datos
    const newAccount = await storage.createWhatsAppAccount({
      name: validation.data.name,
      description: validation.data.description || null,
      ownerName: validation.data.ownerName || null,
      ownerPhone: validation.data.ownerPhone || null,
      adminId: validation.data.adminId || null,
      assignedExternalAgentId: validation.data.assignedExternalAgentId || null,
      autoResponseEnabled: validation.data.autoResponseEnabled || false,
      responseDelay: validation.data.responseDelay || 3,
      status: 'inactive',
      sessionData: null
    });
    
    res.status(201).json(newAccount);
  } catch (error) {
    console.error('Error al crear cuenta de WhatsApp:', error);
    res.status(500).json({ error: 'Error al crear cuenta de WhatsApp' });
  }
});

// Actualizar una cuenta de WhatsApp
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Validar datos de entrada
    const validation = accountSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: validation.error.format() 
      });
    }
    
    // Actualizar cuenta en la base de datos
    const updatedAccount = await storage.updateWhatsappAccount(id, validation.data);
    if (!updatedAccount) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    
    res.json(updatedAccount);
  } catch (error) {
    console.error('Error al actualizar cuenta de WhatsApp:', error);
    res.status(500).json({ error: 'Error al actualizar cuenta de WhatsApp' });
  }
});

// Eliminar todas las cuentas de WhatsApp
router.delete('/delete-all', async (req, res) => {
  try {
    console.log('🗑️ Iniciando eliminación completa de todas las cuentas de WhatsApp...');
    
    // Obtener todas las cuentas antes de eliminarlas
    const allAccounts = await storage.getAllWhatsappAccounts();
    
    // Desconectar todas las cuentas activas
    for (const account of allAccounts) {
      try {
        await whatsappMultiAccountManager.disconnectAccount(account.id);
        console.log(`✅ Cuenta ${account.id} (${account.name}) desconectada`);
      } catch (error) {
        console.error(`⚠️ Error desconectando cuenta ${account.id}:`, error);
      }
    }
    
    // Eliminar todas las cuentas de la base de datos
    await storage.deleteAllWhatsappAccounts();
    
    // Limpiar carpetas de sesión
    await cleanAllSessionFolders();
    
    console.log('✅ Todas las cuentas eliminadas y contador de IDs reiniciado');
    
    res.json({ 
      success: true, 
      message: 'Todas las cuentas han sido eliminadas y el contador de IDs reiniciado',
      deletedCount: allAccounts.length
    });
  } catch (error) {
    console.error('❌ Error al eliminar todas las cuentas:', error);
    res.status(500).json({ error: 'Error al eliminar todas las cuentas de WhatsApp' });
  }
});

// Eliminar una cuenta de WhatsApp
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Primero desconectar la cuenta si está activa
    await whatsappMultiAccountManager.disconnectAccount(id);
    
    // Luego eliminar de la base de datos
    await storage.deleteWhatsappAccount(id);
    
    // Sincronizar carpetas de sesión con los nuevos IDs
    await syncSessionFolders();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar cuenta de WhatsApp:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta de WhatsApp' });
  }
});

/**
 * Sincroniza las carpetas de sesión con los IDs actualizados
 * Esta función se llama después de eliminar una cuenta y reorganizar los IDs
 */
async function syncSessionFolders() {
  try {
    console.log("Sincronizando carpetas de sesión con IDs reorganizados...");
    
    // Importar módulos necesarios
    const path = require('path');
    const fs = require('fs');
    
    // Definir directorio de cuentas
    const TEMP_DIR = path.join(process.cwd(), 'temp');
    const ACCOUNTS_DIR = path.join(TEMP_DIR, 'whatsapp-accounts');
    
    // Obtener todas las cuentas con sus IDs actualizados
    const accounts = await storage.getAllWhatsappAccounts();
    accounts.sort((a, b) => a.id - b.id);
    
    // Para cada cuenta, asegurar que su carpeta tenga el nombre correcto
    for (const account of accounts) {
      const expectedFolderPath = path.join(ACCOUNTS_DIR, `account_${account.id}`);
      
      // Buscar posibles carpetas antiguas para esta cuenta 
      for (let i = 1; i <= 10; i++) {
        // Evitar revisar la carpeta con el ID correcto
        if (i === account.id) continue;
        
        const oldFolderPath = path.join(ACCOUNTS_DIR, `account_${i}`);
        
        // Si existe una carpeta con nombre antiguo y no existe la nueva
        if (fs.existsSync(oldFolderPath) && !fs.existsSync(expectedFolderPath)) {
          // Intentar determinar si esta carpeta pertenece a esta cuenta
          const oldSessionFile = path.join(oldFolderPath, 'session_status.json');
          
          if (fs.existsSync(oldSessionFile)) {
            try {
              const sessionData = JSON.parse(fs.readFileSync(oldSessionFile, 'utf8'));
              
              // Si la carpeta pertenece a esta cuenta o no hay forma de saberlo
              // (en el peor caso, es mejor reasignar la carpeta)
              if (!sessionData.name || sessionData.name === account.name) {
                console.log(`Renombrando carpeta de cuenta ${account.name} de ${oldFolderPath} a ${expectedFolderPath}`);
                fs.renameSync(oldFolderPath, expectedFolderPath);
                break; // Carpeta encontrada y actualizada
              }
            } catch (readError) {
              // Si no podemos leer el archivo, asumimos que podría ser la carpeta correcta
              console.log(`No se pudo leer datos de ${oldSessionFile}, renombrando ${oldFolderPath} a ${expectedFolderPath}`);
              fs.renameSync(oldFolderPath, expectedFolderPath);
              break;
            }
          } else {
            // Si no hay archivo de estado, asumimos que podría ser la carpeta correcta
            console.log(`Sin datos de sesión en ${oldFolderPath}, renombrando a ${expectedFolderPath}`);
            fs.renameSync(oldFolderPath, expectedFolderPath);
            break;
          }
        }
      }
      
      // Si después de la búsqueda, la carpeta esperada no existe, crearla
      if (!fs.existsSync(expectedFolderPath)) {
        console.log(`Creando nueva carpeta para cuenta ${account.name} en ${expectedFolderPath}`);
        fs.mkdirSync(expectedFolderPath, { recursive: true });
      }
    }
    
    console.log("Sincronización de carpetas de sesión completada");
    
    // Reiniciar el administrador de cuentas (opcional, pero asegura consistencia)
    if (accounts.length > 0) {
      console.log("Reiniciando administrador de cuentas para aplicar cambios...");
      
      // Reiniciar las cuentas activas
      for (const account of accounts) {
        if (account.status === 'active' || account.status === 'pending_auth') {
          try {
            await whatsappMultiAccountManager.disconnectAccount(account.id);
            await whatsappMultiAccountManager.initializeAccount(account.id);
          } catch (error) {
            console.error(`Error al reiniciar cuenta ${account.id} (${account.name}):`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error al sincronizar carpetas de sesión:", error);
  }
}

/**
 * Limpia todas las carpetas de sesión de WhatsApp
 * Esta función se llama cuando se eliminan todas las cuentas
 */
async function cleanAllSessionFolders() {
  try {
    console.log("🧹 Limpiando todas las carpetas de sesión...");
    
    // Importar módulos necesarios
    const path = require('path');
    const fs = require('fs');
    
    // Definir directorio de cuentas
    const TEMP_DIR = path.join(process.cwd(), 'temp');
    const ACCOUNTS_DIR = path.join(TEMP_DIR, 'whatsapp-accounts');
    
    // Si el directorio existe, eliminarlo completamente
    if (fs.existsSync(ACCOUNTS_DIR)) {
      fs.rmSync(ACCOUNTS_DIR, { recursive: true, force: true });
      console.log("✅ Todas las carpetas de sesión eliminadas");
    }
    
    // Recrear el directorio vacío
    fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    console.log("✅ Directorio de sesiones recreado vacío");
    
  } catch (error) {
    console.error("❌ Error al limpiar carpetas de sesión:", error);
  }
}

// Inicializar una cuenta de WhatsApp
router.post('/:id/initialize', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Verificar que la cuenta existe
    const account = await storage.getWhatsappAccount(id);
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    
    // Inicializar la cuenta
    const success = await whatsappServiceMulti.initializeAccount(id);
    if (!success) {
      return res.status(500).json({ error: 'Error al inicializar cuenta' });
    }
    
    // Obtener estado actualizado
    const status = whatsappServiceMulti.getStatus(id);
    
    // Actualizar estado en base de datos
    await storage.updateWhatsappAccount(id, {
      status: 'pending_auth',
      sessionData: status
    });
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error al inicializar cuenta de WhatsApp:', error);
    res.status(500).json({ error: 'Error al inicializar cuenta de WhatsApp' });
  }
});

// Obtener código QR para una cuenta
router.get('/:id/qrcode', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Obtener código QR
    const qrCode = await whatsappServiceMulti.getLatestQR(id);
    if (!qrCode) {
      return res.status(404).json({ error: 'Código QR no disponible' });
    }
    
    // Respuesta con el código QR
    res.json({ success: true, qrcode: qrCode });
  } catch (error) {
    console.error('Error al obtener código QR:', error);
    res.status(500).json({ error: 'Error al obtener código QR' });
  }
});

// Obtener estado de una cuenta
router.get('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Obtener estado actualizado
    const status = whatsappServiceMulti.getStatus(id);
    
    res.json(status);
  } catch (error) {
    console.error('Error al obtener estado de cuenta:', error);
    res.status(500).json({ error: 'Error al obtener estado de cuenta' });
  }
});

// Obtener código QR de una cuenta
router.get('/:id/qrcode', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Obtener cuenta de la base de datos
    const account = await storage.getWhatsappAccount(id);
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    // Obtener código QR del administrador de múltiples cuentas
    const qrData = await whatsappMultiAccountManager.getQRWithImage(id);
    
    if (!qrData) {
      // Intentar inicializar la cuenta si no tiene QR
      await whatsappMultiAccountManager.initializeAccount(id);
      const newQrData = await whatsappMultiAccountManager.getQRWithImage(id);
      
      if (!newQrData) {
        return res.status(202).json({ 
          message: 'Generando código QR, inténtelo de nuevo en unos segundos' 
        });
      }
      
      return res.json({
        success: true,
        qrcode: newQrData.qrcode,
        qrDataUrl: newQrData.qrDataUrl
      });
    }

    res.json({
      success: true,
      qrcode: qrData.qrcode,
      qrDataUrl: qrData.qrDataUrl
    });

  } catch (error) {
    console.error('Error al obtener código QR:', error);
    res.status(500).json({ error: 'Error al obtener código QR' });
  }
});

// Desconectar una cuenta
router.post('/:id/disconnect', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Desconectar la cuenta
    const success = await whatsappServiceMulti.disconnectAccount(id);
    if (!success) {
      return res.status(500).json({ error: 'Error al desconectar cuenta' });
    }
    
    // Actualizar estado en base de datos
    await storage.updateWhatsappAccount(id, {
      status: 'inactive',
      sessionData: { disconnectedAt: new Date().toISOString() }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error al desconectar cuenta de WhatsApp:', error);
    res.status(500).json({ error: 'Error al desconectar cuenta de WhatsApp' });
  }
});

// Reinicializar una cuenta (forzar regeneración de QR)
router.post('/:id/reinitialize', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`Solicitud para reinicializar cuenta ID ${id}`);
    
    // Primero desconectar si está conectada
    await whatsappServiceMulti.disconnectAccount(id);
    
    // Forzar eliminación de sesión anterior
    try {
      const account = await storage.getWhatsappAccount(id);
      if (account) {
        // Actualizar estado en BD para forzar nueva sesión
        await storage.updateWhatsappAccount(id, {
          status: 'initializing',
          sessionData: { forceNewSession: true, lastReset: new Date().toISOString() }
        });
      }
    } catch (dbError) {
      console.error(`Error actualizando BD para reinicialización de cuenta ${id}:`, dbError);
    }
    
    // Intentar inicializar nuevamente
    try {
      // Inicializar la cuenta en lugar de usar attemptConnectionRecovery
      await whatsappServiceMulti.initializeAccount(id);
      
      // Esperar un momento para que comience la inicialización
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar estado actual
      const status = whatsappServiceMulti.getStatus(id);
      
      res.json({ 
        success: true, 
        message: 'Cuenta reinicializada correctamente',
        status
      });
    } catch (initError) {
      console.error(`Error reinicializando cuenta ${id}:`, initError);
      res.status(500).json({ 
        success: false, 
        message: 'Error al reinicializar la cuenta. Intente nuevamente.' 
      });
    }
  } catch (error) {
    console.error('Error al reinicializar cuenta de WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al reinicializar cuenta de WhatsApp' 
    });
  }
});

// Enviar mensaje desde una cuenta específica
router.post('/:id/send', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Validar datos de entrada
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Se requieren los campos "to" y "message"' });
    }
    
    // Enviar mensaje
    const result = await whatsappServiceMulti.sendMessage(id, to, message);
    
    res.json({ success: true, messageId: result.id?._serialized || result.id });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Obtener chats de una cuenta específica
router.get('/:id/chats', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`🔄 Solicitando chats reales para cuenta ${id}...`);
    
    // Obtener la instancia de WhatsApp
    const instance = whatsappMultiAccountManager.getInstance(id);
    if (!instance || !instance.client) {
      console.log(`❌ No hay instancia de WhatsApp para cuenta ${id}`);
      res.json([]);
      return;
    }

    try {
      // Obtener chats directamente del cliente de WhatsApp
      const chats = await instance.client.getChats();
      if (!Array.isArray(chats)) {
        console.log(`⚠️ No se obtuvieron chats válidos`);
        res.json([]);
        return;
      }

      // Procesar y formatear chats con fotos de perfil
      const processedChats = await Promise.all(
        chats
          .filter(chat => chat && chat.id)
          .slice(0, 50) // Limitar a 50 chats
          .map(async (chat) => {
            let profilePicUrl = null;
            try {
              // Obtener foto de perfil real de WhatsApp
              profilePicUrl = await chat.getProfilePicUrl();
            } catch (error) {
              // Si no hay foto de perfil, usar null (fallback al avatar por defecto)
              profilePicUrl = null;
            }

            return {
              id: chat.id._serialized || chat.id,
              name: chat.name || chat.id.user || 'Sin nombre',
              isGroup: Boolean(chat.isGroup),
              timestamp: chat.timestamp || Date.now() / 1000,
              unreadCount: chat.unreadCount || 0,
              lastMessage: chat.lastMessage?.body || '',
              muteExpiration: chat.muteExpiration || 0,
              archived: Boolean(chat.archived),
              pinned: Boolean(chat.pinned),
              profilePicUrl: profilePicUrl,
              accountId: id
            };
          })
      );

      const sortedChats = processedChats.sort((a, b) => b.timestamp - a.timestamp);

      console.log(`✅ Enviando ${sortedChats.length} chats reales al frontend`);
      res.json(sortedChats);
    } catch (whatsappError) {
      console.error(`❌ Error obteniendo chats de WhatsApp:`, whatsappError);
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Error general al obtener chats:', error);
    res.json([]);
  }
});

// Obtener mensajes de un chat específico
router.get('/:id/messages/:chatId', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const { chatId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    console.log(`🔄 Solicitando mensajes reales para chat ${chatId}...`);
    
    // Obtener la instancia de WhatsApp
    const instance = whatsappMultiAccountManager.getInstance(id);
    if (!instance || !instance.client) {
      console.log(`❌ No hay instancia de WhatsApp para cuenta ${id}`);
      res.json([]);
      return;
    }

    try {
      // Verificar que el cliente esté completamente listo
      const clientState = await instance.client.getState();
      if (clientState !== 'CONNECTED') {
        console.log(`⚠️ Cliente no conectado (estado: ${clientState})`);
        res.json([]);
        return;
      }

      // Obtener el chat específico
      const chat = await instance.client.getChatById(chatId);
      if (!chat) {
        console.log(`⚠️ Chat ${chatId} no encontrado`);
        res.json([]);
        return;
      }

      console.log(`🔄 Obteniendo ${limit} mensajes del chat...`);
      
      // Obtener mensajes del chat con timeout
      const messages = await Promise.race([
        chat.fetchMessages({ limit }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);

      if (!Array.isArray(messages)) {
        console.log(`⚠️ No se obtuvieron mensajes válidos`);
        res.json([]);
        return;
      }

      // Procesar y formatear mensajes
      const processedMessages = messages
        .filter(msg => msg && msg.id)
        .map(msg => ({
          id: msg.id._serialized || msg.id,
          body: msg.body || '',
          fromMe: Boolean(msg.fromMe),
          timestamp: msg.timestamp, // Usar timestamp exacto de WhatsApp sin modificar
          hasMedia: Boolean(msg.hasMedia),
          type: msg.type || 'chat',
          author: msg.author || null,
          quotedMsg: msg.hasQuotedMsg ? {
            id: msg.quotedMsg?.id?._serialized,
            body: msg.quotedMsg?.body
          } : null,
          chatId: chatId
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Cronológico

      console.log(`✅ Enviando ${processedMessages.length} mensajes reales al frontend`);
      res.json(processedMessages);
    } catch (whatsappError) {
      console.error(`❌ Error obteniendo mensajes de WhatsApp:`, whatsappError);
      // Si hay error, devolver array vacío en lugar de fallar
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Error general al obtener mensajes:', error);
    res.json([]);
  }
});

// Esquema de validación para conexión por teléfono
const phoneConnectRequestSchema = z.object({
  phoneNumber: z.string().min(8, 'Ingrese un número de teléfono válido')
});

// Esquema de validación para verificación de código
const phoneConnectVerifySchema = z.object({
  phoneNumber: z.string().min(8, 'Ingrese un número de teléfono válido'),
  code: z.string().length(8, 'El código debe tener 8 dígitos')
});

// Solicitar código de conexión por teléfono
router.post('/:id/phone-connect/request', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Validar datos de entrada
    const validation = phoneConnectRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos inválidos', 
        details: validation.error.format() 
      });
    }
    
    const { phoneNumber } = validation.data;
    
    // Verificar que la cuenta existe
    const account = await storage.getWhatsappAccount(id);
    if (!account) {
      return res.status(404).json({ 
        success: false,
        message: 'Cuenta no encontrada' 
      });
    }
    
    // Enviar solicitud de código al servicio WhatsApp
    const result = await whatsappMultiAccountManager.requestPhoneNumberCode(id, phoneNumber);
    
    if (result.success) {
      // Actualizar los datos de la cuenta con el número de teléfono para la siguiente etapa
      await storage.updateWhatsappAccount(id, {
        ownerPhone: phoneNumber,
        status: 'pending_auth',
        sessionData: {
          ...account.sessionData,
          phoneConnectRequestedAt: new Date().toISOString(),
          phoneNumber
        }
      });
      
      res.json({
        success: true,
        message: 'Código solicitado exitosamente. Revisa tu WhatsApp.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'No se pudo solicitar el código. Intente nuevamente.'
      });
    }
  } catch (error) {
    console.error('Error al solicitar código para conexión por teléfono:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al solicitar código para conexión por teléfono'
    });
  }
});

// Verificar código y completar conexión
router.post('/:id/phone-connect/verify', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'ID inválido' 
      });
    }
    
    // Validar datos de entrada
    const validation = phoneConnectVerifySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos inválidos', 
        details: validation.error.format() 
      });
    }
    
    const { phoneNumber, code } = validation.data;
    
    // Verificar código en el servicio WhatsApp
    const result = await whatsappMultiAccountManager.verifyPhoneNumberCode(id, phoneNumber, code);
    
    if (result.success) {
      // Actualizar estado de la cuenta a conectada
      await storage.updateWhatsappAccount(id, {
        status: 'active',
        sessionData: {
          authenticated: true,
          authenticatedAt: new Date().toISOString(),
          authMethod: 'phone_code',
          phoneNumber
        }
      });
      
      res.json({
        success: true,
        message: 'Conexión completada exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Código inválido o expirado. Intente nuevamente.'
      });
    }
  } catch (error) {
    console.error('Error al verificar código para conexión por teléfono:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al verificar código para conexión por teléfono'
    });
  }
});

export default router;