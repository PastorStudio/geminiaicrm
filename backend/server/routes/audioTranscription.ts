/**
 * Rutas para transcripción de audio usando OpenAI Whisper
 */
import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configurar multer para subir archivos de audio
const upload = multer({
  dest: path.join(process.cwd(), 'temp/audio/'),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB límite
  },
  fileFilter: (req, file, cb) => {
    // Aceptar archivos de audio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de audio'));
    }
  }
});

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Transcribir audio a texto
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió archivo de audio'
      });
    }

    console.log('🎤 Transcribiendo audio:', req.file.originalname);

    // Crear stream de lectura del archivo
    const audioBuffer = fs.readFileSync(req.file.path);
    
    // Crear un objeto File para OpenAI
    const audioFile = new File([audioBuffer], req.file.originalname || 'audio.ogg', {
      type: req.file.mimetype
    });

    // Transcribir usando OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es', // Español por defecto
      response_format: 'text'
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    console.log('✅ Audio transcrito exitosamente:', transcription);

    res.json({
      success: true,
      transcription: transcription,
      originalFile: req.file.originalname
    });

  } catch (error) {
    console.error('❌ Error transcribiendo audio:', error);
    
    // Limpiar archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Error transcribiendo audio',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Procesar audio desde URL (para WhatsApp)
router.post('/transcribe-url', async (req: Request, res: Response) => {
  try {
    const { audioUrl, chatId, accountId } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL de audio requerida'
      });
    }

    console.log('🎤 Transcribiendo audio desde URL:', audioUrl);

    // Descargar el audio
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('No se pudo descargar el audio');
    }

    const audioBuffer = await response.arrayBuffer();
    const audioFile = new File([audioBuffer], 'whatsapp-audio.ogg', {
      type: 'audio/ogg'
    });

    // Transcribir usando OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
      response_format: 'text'
    });

    console.log('✅ Audio de WhatsApp transcrito:', transcription);

    res.json({
      success: true,
      transcription: transcription,
      chatId,
      accountId,
      audioUrl
    });

  } catch (error) {
    console.error('❌ Error transcribiendo audio desde URL:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error transcribiendo audio desde URL',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;