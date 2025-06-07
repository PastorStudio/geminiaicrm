/**
 * Google Translate API service for page translation
 * Uses official Google Cloud Translation API
 */

export interface GoogleTranslationResponse {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

/**
 * Translate text using Google Translate (free service)
 */
export async function translateTextToLanguage(text: string, targetLanguage: string): Promise<GoogleTranslationResponse> {
  try {
    console.log(`🌐 Translating to ${targetLanguage}:`, text.substring(0, 100));
    
    // Use free Google Translate service
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Translate error: ${response.status}`);
    }

    const data = await response.json();
    
    // Google Translate returns an array with translation data
    const translatedText = data[0]?.map((item: any) => item[0]).join('') || text;
    const detectedSourceLanguage = data[2] || 'auto';

    console.log(`✅ Translation successful: ${text.substring(0, 50)} -> ${translatedText.substring(0, 50)}`);

    return {
      originalText: text,
      translatedText,
      sourceLanguage: detectedSourceLanguage,
      targetLanguage,
      confidence: 0.9
    };

  } catch (error) {
    console.error('❌ Google Translate error:', error);
    
    // Return original text if translation fails
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: 'auto',
      targetLanguage,
      confidence: 0
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function translateWithGoogle(text: string): Promise<GoogleTranslationResponse> {
  return translateTextToLanguage(text, 'en');
}