/**
 * Servicio de integración con DeepSeek AI
 * Proporciona respuestas automáticas inteligentes usando Web Scraping
 */

import puppeteer from 'puppeteer';

export interface DeepSeekResponse {
  success: boolean;
  response?: string;
  error?: string;
  responseTime?: number;
}

export class DeepSeekService {
  private browser: any = null;
  private page: any = null;
  private isInitialized: boolean = false;
  private baseUrl: string = 'https://chat.deepseek.com';

  constructor() {
    console.log('🤖 [DEEPSEEK-SCRAPER] Servicio inicializado para web scraping');
  }

  /**
   * Inicializar el navegador para web scraping
   */
  async initializeBrowser(): Promise<boolean> {
    try {
      if (this.isInitialized && this.browser && this.page) {
        return true;
      }

      console.log('🚀 [DEEPSEEK-SCRAPER] Inicializando navegador...');

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Configurar user agent para evitar detección
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navegar a DeepSeek
      console.log('🌐 [DEEPSEEK-SCRAPER] Navegando a DeepSeek...');
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      this.isInitialized = true;
      console.log('✅ [DEEPSEEK-SCRAPER] Navegador inicializado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ [DEEPSEEK-SCRAPER] Error inicializando navegador:', error);
      return false;
    }
  }

  /**
   * Genera una respuesta usando DeepSeek AI mediante web scraping
   */
  async generateResponse(
    message: string, 
    context?: string,
    systemPrompt?: string
  ): Promise<DeepSeekResponse> {
    const startTime = Date.now();

    try {
      console.log('🤖 [DEEPSEEK-SCRAPER] Generando respuesta para:', message.substring(0, 100) + '...');

      // Inicializar navegador si es necesario
      const browserReady = await this.initializeBrowser();
      if (!browserReady) {
        return {
          success: false,
          error: 'No se pudo inicializar el navegador'
        };
      }

      // Construir el prompt completo
      let fullPrompt = message;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\nUsuario: ${message}`;
      }
      if (context) {
        fullPrompt = `${fullPrompt}\n\nContexto: ${context}`;
      }

      console.log('💭 [DEEPSEEK-SCRAPER] Enviando prompt a DeepSeek...');

      // Buscar el campo de entrada de texto
      await this.page.waitForSelector('textarea, input[type="text"], .input-area', { timeout: 10000 });
      
      // Limpiar campo de entrada y escribir el mensaje
      const inputSelector = await this.page.$('textarea') || await this.page.$('input[type="text"]') || await this.page.$('.input-area');
      
      if (!inputSelector) {
        throw new Error('No se encontró el campo de entrada de texto');
      }

      await inputSelector.click();
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await inputSelector.type(fullPrompt);

      // Buscar y hacer click en el botón de enviar
      const sendButton = await this.page.$('button[type="submit"]') || 
                        await this.page.$('.send-button') ||
                        await this.page.$('button:contains("Send")') ||
                        await this.page.$('[role="button"]');

      if (!sendButton) {
        throw new Error('No se encontró el botón de enviar');
      }

      await sendButton.click();
      console.log('📤 [DEEPSEEK-SCRAPER] Mensaje enviado, esperando respuesta...');

      // Esperar a que aparezca la respuesta
      await this.page.waitForFunction(
        () => {
          // Buscar elementos que puedan contener la respuesta
          const responseElements = document.querySelectorAll('.message, .response, .chat-message, .assistant-message, [data-role="assistant"]');
          return responseElements.length > 0;
        },
        { timeout: 30000 }
      );

      // Extraer la respuesta más reciente
      const response = await this.page.evaluate(() => {
        // Intentar diferentes selectores para encontrar la respuesta
        const selectors = [
          '.message:last-child',
          '.response:last-child', 
          '.chat-message:last-child',
          '.assistant-message:last-child',
          '[data-role="assistant"]:last-child',
          '.markdown-body:last-child'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            return element.textContent.trim();
          }
        }

        // Fallback: buscar cualquier elemento que contenga texto reciente
        const allMessages = Array.from(document.querySelectorAll('div, p, span'))
          .filter(el => el.textContent && el.textContent.length > 20)
          .map(el => el.textContent.trim());

        return allMessages[allMessages.length - 1] || 'No se pudo extraer la respuesta';
      });

      const responseTime = Date.now() - startTime;
      console.log(`✅ [DEEPSEEK-SCRAPER] Respuesta obtenida en ${responseTime}ms`);

      if (!response || response.includes('No se pudo extraer')) {
        throw new Error('No se pudo obtener una respuesta válida de DeepSeek');
      }

      return {
        success: true,
        response: response,
        responseTime: responseTime
      };

    } catch (error) {
      console.error('❌ [DEEPSEEK-SCRAPER] Error generando respuesta:', error);
      
      // Intentar reinicializar el navegador en caso de error
      try {
        await this.cleanup();
        this.isInitialized = false;
      } catch (cleanupError) {
        console.error('❌ [DEEPSEEK-SCRAPER] Error en cleanup:', cleanupError);
      }

      return {
        success: false,
        error: `Error de scraping: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Limpiar recursos del navegador
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isInitialized = false;
      console.log('🧹 [DEEPSEEK-SCRAPER] Recursos limpiados');
    } catch (error) {
      console.error('❌ [DEEPSEEK-SCRAPER] Error limpiando recursos:', error);
    }
  }

  /**
   * Genera respuesta específica para WhatsApp
   */
  async generateWhatsAppResponse(
    userMessage: string,
    senderName?: string,
    companyName?: string
  ): Promise<DeepSeekResponse> {
    const systemPrompt = `Eres un asistente de atención al cliente para ${companyName || 'nuestra empresa'} en WhatsApp.
                         Responde de manera profesional pero amigable, como lo haría un representante humano.
                         Mantén las respuestas concisas y útiles para el formato de WhatsApp.
                         Si el usuario pregunta por información específica que no conoces, indica que un agente humano le ayudará pronto.
                         ${senderName ? `El cliente se llama ${senderName}.` : ''}`;

    return this.generateResponse(userMessage, undefined, systemPrompt);
  }

  /**
   * Verifica si el servicio de scraping está funcionando
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 [DEEPSEEK-SCRAPER] Probando conexión...');
      const testResponse = await this.generateResponse('Hola', undefined, 'Responde solo con "OK"');
      return testResponse.success;
    } catch (error) {
      console.error('❌ [DEEPSEEK-SCRAPER] Error en test de conexión:', error);
      return false;
    }
  }

  /**
   * No necesita API key para web scraping
   */
  updateApiKey(newApiKey: string): void {
    console.log('ℹ️ [DEEPSEEK-SCRAPER] API key no necesaria para web scraping');
  }
}

// Instancia singleton
export const deepSeekService = new DeepSeekService();

export default deepSeekService;