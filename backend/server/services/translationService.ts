import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface TranslationRequest {
  text: string;
  targetLanguage?: string;
  sourceLanguage?: string;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

/**
 * Detect the language of a text using Gemini AI
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Detect the language of this text and respond with ONLY the language code (like 'es' for Spanish, 'en' for English, 'pt' for Portuguese, etc.). Text: "${text}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const languageCode = response.text().trim().toLowerCase();
    
    return languageCode;
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'unknown';
  }
}

/**
 * Translate text using Gemini AI
 */
export async function translateText(request: TranslationRequest): Promise<TranslationResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Detect source language if not provided
    let sourceLanguage = request.sourceLanguage;
    if (!sourceLanguage || sourceLanguage === 'auto') {
      sourceLanguage = await detectLanguage(request.text);
    }
    
    // Determine target language
    const targetLanguage = request.targetLanguage || (sourceLanguage === 'es' ? 'en' : 'es');
    
    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return {
        originalText: request.text,
        translatedText: request.text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0
      };
    }
    
    // Create translation prompt
    const languageNames: { [key: string]: string } = {
      'es': 'Spanish',
      'en': 'English',
      'pt': 'Portuguese',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic'
    };
    
    const sourceLangName = languageNames[sourceLanguage] || 'the detected language';
    const targetLangName = languageNames[targetLanguage] || 'the target language';
    
    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. Respond with ONLY the translated text, no explanations or additional text:

"${request.text}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();
    
    return {
      originalText: request.text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: 0.9 // Gemini typically provides high quality translations
    };
    
  } catch (error) {
    console.error('Error translating text:', error);
    
    // Return original text if translation fails
    return {
      originalText: request.text,
      translatedText: request.text,
      sourceLanguage: request.sourceLanguage || 'unknown',
      targetLanguage: request.targetLanguage || 'unknown',
      confidence: 0.0
    };
  }
}

/**
 * Auto-translate text (Spanish <-> English)
 */
export async function autoTranslate(text: string): Promise<TranslationResponse> {
  const detectedLang = await detectLanguage(text);
  
  // Auto-detect target language: if Spanish, translate to English; otherwise, translate to Spanish
  const targetLang = detectedLang === 'es' ? 'en' : 'es';
  
  return translateText({
    text,
    sourceLanguage: detectedLang,
    targetLanguage: targetLang
  });
}