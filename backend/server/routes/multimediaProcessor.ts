/**
 * Procesador de mensajes multimedia para WhatsApp
 * Maneja imágenes, videos y notas de voz
 */

import { Router, Request, Response } from 'express';
import { whatsappMultiAccountManager } from '../services/whatsappMultiAccountManager';
import { voiceNoteTranscriptionService } from '../services/voiceNoteTranscriptionService';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Procesar nota de voz y transcribir
router.post('/transcribe-voice/:accountId/:chatId/:messageId', async (req: Request, res: Response) => {
  try {
    const { accountId, chatId, messageId } = req.params;
    
    console.log(`🎤 Iniciando transcripción de nota de voz: ${messageId}`);
    
    const instance = whatsappMultiAccountManager.getInstance(parseInt(accountId));
    
    if (!instance || !instance.client) {
      return res.status(404).json({
        success: false,
        error: `Cuenta WhatsApp ${accountId} no encontrada`
      });
    }

    // Obtener el mensaje de WhatsApp
    const chat = await instance.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    const voiceMessage = messages.find(msg => 
      msg.id._serialized === messageId && 
      (msg.type === 'ptt' || msg.type === 'audio')
    );

    if (!voiceMessage) {
      return res.status(404).json({
        success: false,
        error: 'Mensaje de voz no encontrado'
      });
    }

    // Descargar y procesar la nota de voz
    const media = await voiceMessage.downloadMedia();
    if (!media) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo descargar el archivo de audio'
      });
    }

    const audioBuffer = Buffer.from(media.data, 'base64');
    const transcription = await voiceNoteTranscriptionService.processVoiceNote(
      messageId,
      chatId,
      parseInt(accountId),
      audioBuffer
    );

    res.json({
      success: true,
      transcription,
      messageId,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Error transcribiendo nota de voz:', error);
    res.status(500).json({
      success: false,
      error: 'Error al transcribir la nota de voz'
    });
  }
});

// Obtener contenido multimedia (imagen, video)
router.get('/media/:accountId/:chatId/:messageId', async (req: Request, res: Response) => {
  try {
    const { accountId, chatId, messageId } = req.params;
    
    console.log(`📷 Obteniendo contenido multimedia: ${messageId}`);
    
    const instance = whatsappMultiAccountManager.getInstance(parseInt(accountId));
    
    if (!instance || !instance.client) {
      return res.status(404).json({
        success: false,
        error: `Cuenta WhatsApp ${accountId} no encontrada`
      });
    }

    // Obtener el mensaje de WhatsApp
    const chat = await instance.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    const mediaMessage = messages.find(msg => 
      msg.id._serialized === messageId && 
      msg.hasMedia
    );

    if (!mediaMessage) {
      return res.status(404).json({
        success: false,
        error: 'Mensaje multimedia no encontrado'
      });
    }

    // Descargar el contenido multimedia
    const media = await mediaMessage.downloadMedia();
    if (!media) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo descargar el archivo multimedia'
      });
    }

    // Crear directorio temporal si no existe
    const tempDir = path.join(process.cwd(), 'temp', 'multimedia');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Determinar extensión del archivo
    const mimeType = media.mimetype || 'application/octet-stream';
    let extension = 'bin';
    if (mimeType.includes('image/jpeg')) extension = 'jpg';
    else if (mimeType.includes('image/png')) extension = 'png';
    else if (mimeType.includes('video/mp4')) extension = 'mp4';
    else if (mimeType.includes('audio/ogg')) extension = 'ogg';
    else if (mimeType.includes('audio/mpeg')) extension = 'mp3';

    // Guardar archivo temporalmente
    const fileName = `${messageId}_${Date.now()}.${extension}`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));

    // Configurar headers apropiados
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    // Enviar el archivo
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Error enviando archivo:', err);
      }
      // Limpiar archivo temporal después de enviarlo
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('⚠️ Error limpiando archivo temporal:', cleanupError);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenido multimedia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el contenido multimedia'
    });
  }
});

// Obtener información de un mensaje multimedia
router.get('/info/:accountId/:chatId/:messageId', async (req: Request, res: Response) => {
  try {
    const { accountId, chatId, messageId } = req.params;
    
    const instance = whatsappMultiAccountManager.getInstance(parseInt(accountId));
    
    if (!instance || !instance.client) {
      return res.status(404).json({
        success: false,
        error: `Cuenta WhatsApp ${accountId} no encontrada`
      });
    }

    // Obtener el mensaje de WhatsApp
    const chat = await instance.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    const message = messages.find(msg => msg.id._serialized === messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mensaje no encontrado'
      });
    }

    const messageInfo = {
      id: message.id._serialized,
      type: message.type,
      hasMedia: message.hasMedia,
      body: message.body,
      timestamp: message.timestamp,
      fromMe: message.fromMe,
      author: message.author,
      mediaInfo: null as any
    };

    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        if (media) {
          messageInfo.mediaInfo = {
            mimetype: media.mimetype,
            filesize: media.filesize,
            filename: media.filename
          };
        }
      } catch (mediaError) {
        console.error('⚠️ Error obteniendo info del multimedia:', mediaError);
      }
    }

    res.json({
      success: true,
      message: messageInfo
    });

  } catch (error) {
    console.error('❌ Error obteniendo información del mensaje:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información del mensaje'
    });
  }
});

export default router;