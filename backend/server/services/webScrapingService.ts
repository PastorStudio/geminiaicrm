/**
 * Servicio de Web Scraping para Agentes Externos
 * Permite extraer información de sitios web para alimentar las respuestas automáticas
 */

import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapingResult {
  title?: string;
  description?: string;
  content: string;
  images?: string[];
  links?: string[];
  metadata?: Record<string, any>;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ScrapingOptions {
  selector?: string;
  waitForSelector?: string;
  timeout?: number;
  includeImages?: boolean;
  includeLinks?: boolean;
  maxLength?: number;
  userAgent?: string;
}

export class WebScrapingService {
  private static readonly DEFAULT_TIMEOUT = 10000;
  private static readonly DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Extrae contenido de una URL usando Puppeteer (para sitios con JavaScript)
   */
  static async scrapeWithPuppeteer(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    let browser;
    try {
      console.log(`🕸️ Iniciando scraping con Puppeteer: ${url}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });

      const page = await browser.newPage();
      
      // Configurar User-Agent
      await page.setUserAgent(options.userAgent || this.DEFAULT_USER_AGENT);
      
      // Configurar viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navegar a la página
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: options.timeout || this.DEFAULT_TIMEOUT
      });

      // Esperar por selector específico si se proporciona
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || this.DEFAULT_TIMEOUT
        });
      }

      // Extraer contenido
      const result = await page.evaluate((opts) => {
        const doc = document;
        
        // Función para limpiar texto
        const cleanText = (text: string) => {
          return text.replace(/\s+/g, ' ').trim();
        };

        // Extraer título
        const title = doc.querySelector('title')?.textContent || 
                     doc.querySelector('h1')?.textContent || '';

        // Extraer descripción
        const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                           doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

        // Extraer contenido principal
        let content = '';
        if (opts.selector) {
          const element = doc.querySelector(opts.selector);
          content = element ? cleanText(element.textContent || '') : '';
        } else {
          // Intentar extraer contenido de áreas comunes
          const contentSelectors = [
            'main',
            'article',
            '.content',
            '#content',
            '.post-content',
            '.entry-content',
            'body'
          ];
          
          for (const selector of contentSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
              content = cleanText(element.textContent || '');
              break;
            }
          }
        }

        // Extraer imágenes si se solicita
        let images: string[] = [];
        if (opts.includeImages) {
          const imgElements = doc.querySelectorAll('img');
          images = Array.from(imgElements)
            .map(img => img.src)
            .filter(src => src && src.startsWith('http'));
        }

        // Extraer enlaces si se solicita
        let links: string[] = [];
        if (opts.includeLinks) {
          const linkElements = doc.querySelectorAll('a[href]');
          links = Array.from(linkElements)
            .map(link => link.href)
            .filter(href => href && href.startsWith('http'));
        }

        return {
          title: cleanText(title),
          description: cleanText(description),
          content,
          images,
          links
        };
      }, options);

      // Limitar longitud del contenido si se especifica
      if (options.maxLength && result.content.length > options.maxLength) {
        result.content = result.content.substring(0, options.maxLength) + '...';
      }

      console.log(`✅ Scraping completado. Contenido extraído: ${result.content.length} caracteres`);

      return {
        ...result,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      console.error(`❌ Error en scraping con Puppeteer:`, error);
      return {
        content: '',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Extrae contenido de una URL usando Axios + Cheerio (más rápido, para sitios estáticos)
   */
  static async scrapeWithCheerio(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    try {
      console.log(`🕸️ Iniciando scraping con Cheerio: ${url}`);

      const response = await axios.get(url, {
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
        headers: {
          'User-Agent': options.userAgent || this.DEFAULT_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      const $ = cheerio.load(response.data);

      // Función para limpiar texto
      const cleanText = (text: string) => {
        return text.replace(/\s+/g, ' ').trim();
      };

      // Extraer título
      const title = $('title').text() || $('h1').first().text() || '';

      // Extraer descripción
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') || '';

      // Extraer contenido principal
      let content = '';
      if (options.selector) {
        content = cleanText($(options.selector).text());
      } else {
        // Intentar extraer contenido de áreas comunes
        const contentSelectors = [
          'main',
          'article',
          '.content',
          '#content',
          '.post-content',
          '.entry-content',
          'body'
        ];
        
        for (const selector of contentSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            content = cleanText(element.text());
            break;
          }
        }
      }

      // Extraer imágenes si se solicita
      let images: string[] = [];
      if (options.includeImages) {
        $('img').each((_, img) => {
          const src = $(img).attr('src');
          if (src && src.startsWith('http')) {
            images.push(src);
          }
        });
      }

      // Extraer enlaces si se solicita
      let links: string[] = [];
      if (options.includeLinks) {
        $('a[href]').each((_, link) => {
          const href = $(link).attr('href');
          if (href && href.startsWith('http')) {
            links.push(href);
          }
        });
      }

      // Limitar longitud del contenido si se especifica
      if (options.maxLength && content.length > options.maxLength) {
        content = content.substring(0, options.maxLength) + '...';
      }

      console.log(`✅ Scraping completado. Contenido extraído: ${content.length} caracteres`);

      return {
        title: cleanText(title),
        description: cleanText(description),
        content,
        images,
        links,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      console.error(`❌ Error en scraping con Cheerio:`, error);
      return {
        content: '',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Método inteligente que decide automáticamente qué técnica usar
   */
  static async smartScrape(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    try {
      // Primero intentar con Cheerio (más rápido)
      console.log(`🤖 Intentando scraping inteligente para: ${url}`);
      
      const cheerioResult = await this.scrapeWithCheerio(url, options);
      
      // Si el contenido es muy corto o está vacío, intentar con Puppeteer
      if (cheerioResult.success && cheerioResult.content.length > 100) {
        console.log(`✅ Scraping exitoso con Cheerio`);
        return cheerioResult;
      }

      console.log(`⚠️ Contenido insuficiente con Cheerio, intentando con Puppeteer...`);
      return await this.scrapeWithPuppeteer(url, options);

    } catch (error) {
      console.error(`❌ Error en scraping inteligente:`, error);
      return {
        content: '',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Extrae información específica usando selectores CSS
   */
  static async extractSpecificData(url: string, selectors: Record<string, string>): Promise<Record<string, string>> {
    try {
      console.log(`🎯 Extrayendo datos específicos de: ${url}`);

      const response = await axios.get(url, {
        timeout: this.DEFAULT_TIMEOUT,
        headers: {
          'User-Agent': this.DEFAULT_USER_AGENT
        }
      });

      const $ = cheerio.load(response.data);
      const results: Record<string, string> = {};

      for (const [key, selector] of Object.entries(selectors)) {
        const element = $(selector);
        if (element.length > 0) {
          results[key] = element.text().trim();
        }
      }

      console.log(`✅ Datos específicos extraídos:`, Object.keys(results));
      return results;

    } catch (error) {
      console.error(`❌ Error extrayendo datos específicos:`, error);
      return {};
    }
  }

  /**
   * Verifica si una URL es accesible para scraping
   */
  static async isScrapeable(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': this.DEFAULT_USER_AGENT
        }
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}