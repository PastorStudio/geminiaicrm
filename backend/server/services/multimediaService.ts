/**
 * Servicio mejorado para procesamiento de contenido multimedia
 * Maneja imágenes, videos, documentos y notas de voz
 */

import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

export class MultimediaService {
  
  /**
   * Identifica el tipo correcto de archivo basado en el tipo de mensaje y MIME type
   */
  static identifyFileType(messageType: string, mimeType?: string, filename?: string): string {
    console.log(`🔍 Identificando tipo de archivo: messageType=${messageType}, mimeType=${mimeType}, filename=${filename}`);
    
    // PRIORIDAD 1: Analizar MIME type primero (más confiable)
    if (mimeType) {
      if (mimeType.startsWith('image/')) {
        console.log(`✅ IMAGEN detectada por MIME: ${mimeType}`);
        return 'image';
      }
      if (mimeType.startsWith('video/')) {
        console.log(`✅ VIDEO detectado por MIME: ${mimeType}`);
        return 'video';
      }
      if (mimeType.startsWith('audio/')) {
        console.log(`✅ AUDIO detectado por MIME: ${mimeType}`);
        return 'voice';
      }
      if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        console.log(`✅ DOCUMENTO detectado por MIME: ${mimeType}`);
        return 'document';
      }
    }
    
    // PRIORIDAD 2: Analizar extensión de archivo
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext || '')) {
        console.log(`✅ IMAGEN detectada por extensión: ${ext}`);
        return 'image';
      }
      if (['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'].includes(ext || '')) {
        console.log(`✅ VIDEO detectado por extensión: ${ext}`);
        return 'video';
      }
      if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'opus'].includes(ext || '')) {
        console.log(`✅ AUDIO detectado por extensión: ${ext}`);
        return 'voice';
      }
      if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) {
        console.log(`✅ DOCUMENTO detectado por extensión: ${ext}`);
        return 'document';
      }
    }
    
    // PRIORIDAD 3: Usar tipo de mensaje de WhatsApp como respaldo
    switch (messageType) {
      case 'image':
        console.log(`✅ IMAGEN detectada por messageType: ${messageType}`);
        return 'image';
      case 'sticker':
        console.log(`✅ STICKER detectado por messageType: ${messageType}`);
        return 'image'; // Los stickers se manejan como imágenes
      case 'video':
        console.log(`✅ VIDEO detectado por messageType: ${messageType}`);
        return 'video';
      case 'audio':
        console.log(`✅ AUDIO detectado por messageType: ${messageType}`);
        return 'voice';
      case 'ptt': // Push-to-talk (notas de voz)
        console.log(`✅ NOTA DE VOZ detectada por messageType: ${messageType}`);
        return 'voice';
      case 'document':
        console.log(`✅ DOCUMENTO detectado por messageType: ${messageType}`);
        return 'document';
      default:
        console.log(`⚠️ Tipo no reconocido, usando 'unknown': ${messageType}`);
        return 'unknown';
    }
  }
  
  /**
   * Procesa mensajes multimedia y los convierte a formato base64 para mostrar en frontend
   */
  static async processMultimediaMessage(accountId: number, chatId: string, messageId: string) {
    try {
      console.log(`🖼️ Procesando multimedia: mensaje ${messageId} en chat ${chatId}`);
      
      // Verificar si ya existe en la base de datos
      const existingFiles = await db.select()
        .from(multimediaFiles)
        .where(and(
          eq(multimediaFiles.messageId, messageId),
          eq(multimediaFiles.chatId, chatId),
          eq(multimediaFiles.accountId, accountId)
        ));

      if (existingFiles.length > 0) {
        console.log(`✅ Archivo multimedia ya procesado: ${messageId}`);
        return {
          id: messageId,
          type: existingFiles[0].fileType,
          mimetype: existingFiles[0].mimeType,
          filename: existingFiles[0].fileName,
          data: existingFiles[0].fileData,
          size: existingFiles[0].fileSize,
          timestamp: new Date(existingFiles[0].originalDate || new Date())
        };
      }
      
      const instance = whatsappMultiAccountManager.getInstance(accountId);
      
      if (!instance || !instance.client) {
        throw new Error(`Cuenta WhatsApp ${accountId} no disponible`);
      }

      const chat = await instance.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 100 });
      
      const multimediaMessage = messages.find(msg => msg.id._serialized === messageId);
      
      if (!multimediaMessage || !multimediaMessage.hasMedia) {
        return null;
      }

      // Descargar el multimedia
      const media = await multimediaMessage.downloadMedia();
      
      if (!media) {
        console.error('❌ No se pudo descargar el multimedia');
        return null;
      }

      // Identificar el tipo correcto de archivo
      const fileType = this.identifyFileType(multimediaMessage.type, media.mimetype, media.filename || undefined);
      const filename = media.filename || `${messageId}.${this.getExtensionFromMimeType(media.mimetype)}`;
      
      console.log(`🔍 Tipo identificado: ${fileType} para mensaje tipo ${multimediaMessage.type}`);

      // Guardar en la base de datos
      const multimediaRecord = {
        messageId,
        chatId,
        accountId,
        fileName: filename,
        mimeType: media.mimetype,
        fileSize: media.data.length,
        fileType,
        fileData: media.data,
        metadata: JSON.stringify({
          whatsappType: multimediaMessage.type,
          originalFilename: media.filename,
          timestamp: multimediaMessage.timestamp
        }),
        originalDate: new Date(multimediaMessage.timestamp * 1000),
        processingStatus: 'completed'
      };

      await db.insert(multimediaFiles).values(multimediaRecord);

      // Convertir a formato para el frontend
      const mediaData = {
        id: messageId,
        type: fileType,
        mimetype: media.mimetype,
        filename: filename,
        data: media.data,
        size: media.data.length,
        timestamp: multimediaMessage.timestamp
      };

      console.log(`✅ Multimedia procesado y guardado: ${fileType} - ${filename}`);
      return mediaData;
      
    } catch (error) {
      console.error('❌ Error procesando multimedia:', error);
      return null;
    }
  }

  /**
   * Procesa notas de voz y las transcribe usando OpenAI
   */
  static async processVoiceNote(accountId: number, chatId: string, messageId: string) {
    try {
      console.log(`🎤 Procesando nota de voz: ${messageId}`);
      
      const instance = whatsappMultiAccountManager.getInstance(accountId);
      
      if (!instance || !instance.client) {
        throw new Error(`Cuenta WhatsApp ${accountId} no disponible`);
      }

      const chat = await instance.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 50 });
      
      const voiceMessage = messages.find(msg => 
        msg.id._serialized === messageId && 
        (msg.type === 'ptt' || msg.type === 'audio')
      );

      if (!voiceMessage) {
        return null;
      }

      // Descargar audio
      const media = await voiceMessage.downloadMedia();
      
      if (!media) {
        console.error('❌ No se pudo descargar la nota de voz');
        return null;
      }

      // Transcribir usando OpenAI si está disponible
      let transcription = null;
      try {
        transcription = await this.transcribeAudio(media.data, media.mimetype);
      } catch (transcribeError) {
        console.warn('⚠️ No se pudo transcribir la nota de voz:', transcribeError);
      }

      return {
        id: messageId,
        type: 'voice',
        mimetype: media.mimetype,
        data: media.data,
        transcription: transcription,
        duration: voiceMessage.duration || 0,
        timestamp: voiceMessage.timestamp
      };
      
    } catch (error) {
      console.error('❌ Error procesando nota de voz:', error);
      return null;
    }
  }

  /**
   * Transcribe audio usando OpenAI Whisper
   */
  private static async transcribeAudio(audioData: string, mimetype: string): Promise<string | null> {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.warn('⚠️ OPENAI_API_KEY no configurada para transcripción');
        return null;
      }

      // Convertir base64 a buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Crear FormData para enviar a OpenAI
      const FormData = require('form-data');
      const form = new FormData();
      
      // Determinar extensión del archivo
      const extension = this.getExtensionFromMimeType(mimetype);
      form.append('file', audioBuffer, `audio.${extension}`);
      form.append('model', 'whisper-1');
      form.append('language', 'es'); // Español por defecto

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return result.text || null;
      
    } catch (error) {
      console.error('❌ Error en transcripción OpenAI:', error);
      return null;
    }
  }

  /**
   * Obtiene la extensión de archivo apropiada según el tipo MIME
   */
  private static getExtensionFromMimeType(mimetype: string): string {
    const mimeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    
    return mimeMap[mimetype] || 'bin';
  }

  /**
   * Procesa múltiples mensajes multimedia de un chat
   */
  static async processAllMultimediaInChat(accountId: number, chatId: string) {
    try {
      console.log(`🖼️ Procesando todo el multimedia del chat: ${chatId}`);
      
      const instance = whatsappMultiAccountManager.getInstance(accountId);
      
      if (!instance || !instance.client) {
        return [];
      }

      const chat = await instance.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 100 });
      
      const multimediaMessages = messages.filter(msg => msg.hasMedia);
      const processedMedia = [];

      for (const msg of multimediaMessages) {
        try {
          const media = await msg.downloadMedia();
          if (media) {
            processedMedia.push({
              id: msg.id._serialized,
              type: msg.type,
              mimetype: media.mimetype,
              filename: media.filename || `${msg.id._serialized}.${this.getExtensionFromMimeType(media.mimetype)}`,
              data: media.data,
              timestamp: msg.timestamp,
              from: msg.from
            });
          }
        } catch (error) {
          console.warn(`⚠️ Error procesando multimedia ${msg.id._serialized}:`, error);
        }
      }

      console.log(`✅ Procesados ${processedMedia.length} archivos multimedia`);
      return processedMedia;
      
    } catch (error) {
      console.error('❌ Error procesando multimedia del chat:', error);
      return [];
    }
  }
}