import { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

export async function translateText(req: Request, res: Response) {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Texto y idioma de destino son requeridos' 
      });
    }

    // Map language codes to full names for better translation
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    };

    const targetLanguageName = languageNames[targetLanguage] || targetLanguage;
    
    const prompt = sourceLanguage === 'auto' 
      ? `Translate the following text to ${targetLanguageName}. Maintain the original tone and context. Only return the translated text, no explanations:\n\n${text}`
      : `Translate the following text from ${languageNames[sourceLanguage] || sourceLanguage} to ${targetLanguageName}. Maintain the original tone and context. Only return the translated text, no explanations:\n\n${text}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the given text accurately while preserving the original tone, style, and context. Only return the translation, no additional explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent translations
    });

    const translatedText = response.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('No se pudo generar la traducción');
    }

    console.log(`🌐 Traducción exitosa: "${text}" → "${translatedText}" (${targetLanguageName})`);

    res.json({
      success: true,
      translatedText: translatedText,
      sourceText: text,
      targetLanguage: targetLanguage,
      targetLanguageName: targetLanguageName
    });

  } catch (error) {
    console.error('❌ Error en traducción:', error);
    
    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('API key')) {
      return res.status(401).json({ 
        error: 'Clave API de OpenAI no configurada o inválida' 
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor durante la traducción',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

export async function detectLanguage(req: Request, res: Response) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Texto es requerido para detectar idioma' 
      });
    }

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a language detection expert. Identify the language of the given text and respond with only the ISO 639-1 language code (2 letters, lowercase). For example: 'en', 'es', 'fr', etc."
        },
        {
          role: "user",
          content: `Detect the language of this text: ${text}`
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const detectedLanguage = response.choices[0]?.message?.content?.trim().toLowerCase();

    if (!detectedLanguage) {
      throw new Error('No se pudo detectar el idioma');
    }

    console.log(`🔍 Idioma detectado: "${text}" → ${detectedLanguage}`);

    res.json({
      success: true,
      detectedLanguage: detectedLanguage,
      sourceText: text
    });

  } catch (error) {
    console.error('❌ Error en detección de idioma:', error);
    
    res.status(500).json({ 
      error: 'Error interno del servidor durante la detección de idioma',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}