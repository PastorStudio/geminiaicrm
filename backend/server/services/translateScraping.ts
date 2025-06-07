import puppeteer from 'puppeteer';

interface TranslationResult {
  success: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  error?: string;
}

export class GoogleTranslateScraper {
  private browser: any = null;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
  }

  async translateText(text: string, targetLang: string = 'es'): Promise<TranslationResult> {
    try {
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      // Configurar user agent para evitar detección
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Construir URL de Google Translate
      const sourceText = encodeURIComponent(text);
      const translateUrl = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${sourceText}&op=translate`;
      
      console.log('🌐 Navegando a Google Translate...');
      await page.goto(translateUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Esperar a que aparezca el resultado
      await page.waitForSelector('[data-test="translation"]', { timeout: 15000 });
      
      // Extraer el texto traducido
      const translatedText = await page.evaluate(() => {
        const element = document.querySelector('[data-test="translation"]');
        return element ? element.textContent?.trim() : null;
      });
      
      // Extraer el idioma detectado
      const detectedLanguage = await page.evaluate(() => {
        const sourceButton = document.querySelector('button[aria-label*="Source language"]');
        if (sourceButton) {
          const text = sourceButton.textContent || '';
          // Extraer código de idioma de la etiqueta
          if (text.includes('English')) return 'en';
          if (text.includes('Portuguese')) return 'pt';
          if (text.includes('French')) return 'fr';
          if (text.includes('German')) return 'de';
          if (text.includes('Italian')) return 'it';
          if (text.includes('Russian')) return 'ru';
          if (text.includes('Chinese')) return 'zh';
          if (text.includes('Japanese')) return 'ja';
          if (text.includes('Korean')) return 'ko';
          if (text.includes('Arabic')) return 'ar';
          if (text.includes('Spanish')) return 'es';
        }
        return 'auto';
      });
      
      await page.close();
      
      if (!translatedText) {
        throw new Error('No se pudo obtener la traducción');
      }
      
      console.log(`✅ Traducción exitosa: "${text}" → "${translatedText}" (${detectedLanguage} → ${targetLang})`);
      
      return {
        success: true,
        translatedText,
        detectedLanguage: detectedLanguage || 'auto'
      };
      
    } catch (error) {
      console.error('❌ Error en traducción por scraping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Método alternativo más simple usando la API no oficial de Google Translate
  async translateSimple(text: string, targetLang: string = 'es'): Promise<TranslationResult> {
    try {
      // Detectar si el texto ya está en español
      const spanishWords = ['hola', 'gracias', 'por', 'favor', 'como', 'estas', 'que', 'tal', 'buenos', 'dias', 'noches'];
      const lowerText = text.toLowerCase();
      const isSpanish = spanishWords.some(word => lowerText.includes(word)) || /[áéíóúñ¿¡]/i.test(text);
      
      if (isSpanish) {
        return {
          success: true,
          translatedText: text,
          detectedLanguage: 'es'
        };
      }

      // Usar la URL de la API no oficial de Google Translate
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000 // 5 segundos de timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extraer texto traducido
      const translatedText = data[0]?.map((item: any) => item[0]).join('') || text;
      
      // Extraer idioma detectado
      const detectedLanguage = data[2] || 'auto';
      
      // Si el idioma detectado es español, no traducir
      if (detectedLanguage === 'es' || detectedLanguage === 'spa') {
        return {
          success: true,
          translatedText: text,
          detectedLanguage: 'es'
        };
      }
      
      console.log(`✅ Traducción simple exitosa: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..." (${detectedLanguage} → ${targetLang})`);
      
      return {
        success: true,
        translatedText,
        detectedLanguage
      };
      
    } catch (error) {
      console.error('❌ Error en traducción simple:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Instancia singleton
export const googleTranslateScraper = new GoogleTranslateScraper();