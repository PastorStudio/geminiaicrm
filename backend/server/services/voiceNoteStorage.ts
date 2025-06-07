/**
 * Servicio para gestionar el almacenamiento y transcripción de notas de voz
 */
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

export interface VoiceNote {
  messageId: string;
  chatId: string;
  accountId: number;
  fileName: string;
  filePath: string;
  transcription?: string;
  timestamp: number;
  duration?: number;
}

export class VoiceNoteStorage {
  private static instance: VoiceNoteStorage;
  private audioDirectory: string;
  private voiceNotes: Map<string, VoiceNote> = new Map();
  private openai?: OpenAI;

  private constructor() {
    this.audioDirectory = path.join(process.cwd(), 'temp', 'voice-notes');
    this.ensureDirectoryExists();
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  public static getInstance(): VoiceNoteStorage {
    if (!VoiceNoteStorage.instance) {
      VoiceNoteStorage.instance = new VoiceNoteStorage();
    }
    return VoiceNoteStorage.instance;
  }

  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.audioDirectory)) {
        fs.mkdirSync(this.audioDirectory, { recursive: true });
        console.log(`📁 Directorio de notas de voz creado: ${this.audioDirectory}`);
      }
    } catch (error) {
      console.error('❌ Error creando directorio de notas de voz:', error);
    }
  }

  public async saveVoiceNote(
    messageId: string,
    chatId: string,
    accountId: number,
    audioBuffer: Buffer,
    timestamp: number
  ): Promise<VoiceNote | null> {
    try {
      const fileName = `voice_${accountId}_${chatId.replace('@c.us', '')}_${messageId.replace(/[^a-zA-Z0-9]/g, '_')}.ogg`;
      const filePath = path.join(this.audioDirectory, fileName);

      // Guardar archivo de audio
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`💾 Nota de voz guardada: ${fileName}`);

      const voiceNote: VoiceNote = {
        messageId,
        chatId,
        accountId,
        fileName,
        filePath,
        timestamp
      };

      // Transcribir automáticamente si OpenAI está disponible
      if (this.openai) {
        try {
          console.log(`🎤 Iniciando transcripción automática para ${fileName}...`);
          
          const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
            language: 'es',
            response_format: 'text'
          });

          voiceNote.transcription = transcription;
          console.log(`✅ Nota de voz transcrita: "${transcription}"`);
        } catch (transcriptionError) {
          console.error('❌ Error en transcripción automática:', transcriptionError);
        }
      }

      // Almacenar en memoria para acceso rápido
      this.voiceNotes.set(messageId, voiceNote);

      return voiceNote;
    } catch (error) {
      console.error('❌ Error guardando nota de voz:', error);
      return null;
    }
  }

  public getVoiceNote(messageId: string): VoiceNote | undefined {
    return this.voiceNotes.get(messageId);
  }

  public getVoiceNotePath(messageId: string): string | null {
    const voiceNote = this.voiceNotes.get(messageId);
    if (voiceNote && fs.existsSync(voiceNote.filePath)) {
      return voiceNote.filePath;
    }
    return null;
  }

  public getAllVoiceNotes(chatId?: string, accountId?: number): VoiceNote[] {
    const notes = Array.from(this.voiceNotes.values());
    
    if (chatId && accountId) {
      return notes.filter(note => note.chatId === chatId && note.accountId === accountId);
    }
    
    return notes;
  }

  public async transcribeExistingNote(messageId: string): Promise<string | null> {
    if (!this.openai) {
      console.log('❌ OpenAI no está configurado para transcripción');
      return null;
    }

    const voiceNote = this.voiceNotes.get(messageId);
    if (!voiceNote || !fs.existsSync(voiceNote.filePath)) {
      console.log(`❌ Nota de voz no encontrada: ${messageId}`);
      return null;
    }

    try {
      console.log(`🎤 Transcribiendo nota de voz existente: ${voiceNote.fileName}`);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(voiceNote.filePath),
        model: 'whisper-1',
        language: 'es',
        response_format: 'text'
      });

      voiceNote.transcription = transcription;
      console.log(`✅ Transcripción completada: "${transcription}"`);
      
      return transcription;
    } catch (error) {
      console.error('❌ Error transcribiendo nota de voz:', error);
      return null;
    }
  }

  public cleanupOldFiles(maxAgeHours: number = 24): void {
    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      for (const [messageId, voiceNote] of this.voiceNotes.entries()) {
        if (voiceNote.timestamp < cutoffTime) {
          try {
            if (fs.existsSync(voiceNote.filePath)) {
              fs.unlinkSync(voiceNote.filePath);
            }
            this.voiceNotes.delete(messageId);
            console.log(`🗑️ Archivo de voz antiguo eliminado: ${voiceNote.fileName}`);
          } catch (error) {
            console.error(`❌ Error eliminando archivo: ${voiceNote.fileName}`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en limpieza de archivos:', error);
    }
  }
}

export const voiceNoteStorage = VoiceNoteStorage.getInstance();