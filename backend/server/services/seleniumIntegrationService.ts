/**
 * Servicio de integración para automatización de agentes externos usando Python/Selenium
 * Este servicio actúa como puente entre el sistema Node.js y el script de Python
 */

import { spawn } from 'child_process';
import path from 'path';

interface SeleniumResponse {
  success: boolean;
  response?: string;
  error?: string;
  agent_type?: string;
  agent_id?: string;
  timestamp?: number;
}

export class SeleniumIntegrationService {
  private static instance: SeleniumIntegrationService;
  private pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = path.join(process.cwd(), 'server', 'services', 'seleniumAgentService.py');
  }

  static getInstance(): SeleniumIntegrationService {
    if (!SeleniumIntegrationService.instance) {
      SeleniumIntegrationService.instance = new SeleniumIntegrationService();
    }
    return SeleniumIntegrationService.instance;
  }

  /**
   * Obtener respuesta de un agente externo usando web scraping
   */
  async getAgentResponse(agentUrl: string, message: string, agentId?: string): Promise<SeleniumResponse> {
    return new Promise((resolve) => {
      try {
        console.log(`🤖 Iniciando web scraping para agente: ${agentUrl}`);
        
        // Intentar primero con Selenium completo
        const seleniumArgs = [this.pythonScriptPath, agentUrl, message];
        if (agentId) {
          seleniumArgs.push(agentId);
        }

        const seleniumProcess = spawn('python3', seleniumArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000 // Reducir timeout a 30 segundos
        });

        let stdout = '';
        let stderr = '';

        seleniumProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        seleniumProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        seleniumProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              console.log(`✅ Respuesta Selenium obtenida: ${result.response?.substring(0, 100)}...`);
              resolve(result);
              return;
            } catch (parseError) {
              console.log('🔄 Selenium falló, intentando servicio simplificado...');
              this.fallbackToSimpleService(agentUrl, message, agentId, resolve);
              return;
            }
          } else {
            console.log('🔄 Selenium no disponible, usando servicio simplificado...');
            this.fallbackToSimpleService(agentUrl, message, agentId, resolve);
          }
        });

        seleniumProcess.on('error', (error) => {
          console.log('🔄 Error en Selenium, usando servicio simplificado...');
          this.fallbackToSimpleService(agentUrl, message, agentId, resolve);
        });

        // Timeout más corto para Selenium
        setTimeout(() => {
          seleniumProcess.kill();
          console.log('🔄 Timeout Selenium, usando servicio simplificado...');
          this.fallbackToSimpleService(agentUrl, message, agentId, resolve);
        }, 30000);

      } catch (error) {
        console.log('🔄 Error general, usando servicio simplificado...');
        this.fallbackToSimpleService(agentUrl, message, agentId, resolve);
      }
    });
  }

  /**
   * Método fallback usando el servicio simplificado
   */
  private fallbackToSimpleService(
    agentUrl: string, 
    message: string, 
    agentId: string | undefined, 
    resolve: (value: SeleniumResponse) => void
  ): void {
    try {
      const simpleScriptPath = path.join(process.cwd(), 'server', 'services', 'simpleWebScrapingService.py');
      const args = [simpleScriptPath, agentUrl, message];
      if (agentId) {
        args.push(agentId);
      }

      const simpleProcess = spawn('python3', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000 // 15 segundos para el servicio simple
      });

      let stdout = '';
      let stderr = '';

      simpleProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      simpleProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      simpleProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log(`✅ Respuesta simplificada obtenida: ${result.response?.substring(0, 100)}...`);
            resolve(result);
          } catch (parseError) {
            resolve({
              success: false,
              error: `Error parseando respuesta simplificada: ${parseError}`
            });
          }
        } else {
          resolve({
            success: false,
            error: `Servicio simplificado terminó con código ${code}: ${stderr}`
          });
        }
      });

      simpleProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Error en servicio simplificado: ${error.message}`
        });
      });

      setTimeout(() => {
        simpleProcess.kill();
        resolve({
          success: false,
          error: 'Timeout: Ambos servicios fallaron'
        });
      }, 15000);

    } catch (error) {
      resolve({
        success: false,
        error: `Error crítico: ${error}`
      });
    }
  }

  /**
   * Verificar si el servicio de Python está disponible
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const pythonProcess = spawn('python3', ['--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 5000
        });

        pythonProcess.on('close', (code) => {
          resolve(code === 0);
        });

        pythonProcess.on('error', () => {
          resolve(false);
        });

        setTimeout(() => {
          pythonProcess.kill();
          resolve(false);
        }, 5000);

      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Obtener respuesta con reintentos automáticos
   */
  async getAgentResponseWithRetry(
    agentUrl: string, 
    message: string, 
    agentId?: string, 
    maxRetries: number = 2
  ): Promise<SeleniumResponse> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Intento ${attempt}/${maxRetries} para agente: ${agentUrl}`);
      
      const result = await this.getAgentResponse(agentUrl, message, agentId);
      
      if (result.success && result.response) {
        console.log(`✅ Éxito en intento ${attempt}`);
        return result;
      }
      
      if (attempt < maxRetries) {
        console.log(`⚠️ Intento ${attempt} falló, reintentando en 3 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`❌ Todos los intentos fallaron para agente: ${agentUrl}`);
    return {
      success: false,
      error: `Fallaron todos los ${maxRetries} intentos`
    };
  }
}

// Instancia singleton
export const seleniumIntegration = SeleniumIntegrationService.getInstance();