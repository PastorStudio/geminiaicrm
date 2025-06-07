/**
 * Servicio para gestión de tareas y etiquetas con IA
 * 
 * Este servicio se encarga de:
 * - Analizar leads y generar etiquetas con probabilidades
 * - Crear tareas automáticas basadas en el análisis de IA
 * - Mantener un historial de análisis para mejorar la precisión
 */

import { storage } from "../storage";
import { GeminiService } from "./geminiService";
import { Lead, Activity, InsertActivity } from "@shared/schema";

interface TagWithProbability {
  tag: string;
  probability: number;
  category: string;
}

interface AutoTask {
  title: string;
  type: string;
  description?: string;
  dueDate?: Date;
  priority?: 'high' | 'medium' | 'low';
}

interface AIAnalysis {
  tags: TagWithProbability[];
  summary: string;
  nextBestAction: string;
  confidenceScore: number;
  timestamp: Date;
}

class TaskTagService {
  private geminiService: GeminiService;
  private analysisCache: Map<number, AIAnalysis>;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
    this.analysisCache = new Map();
  }

  // Analizar un lead y generar etiquetas con probabilidades
  async analyzeLead(leadId: number): Promise<{ tags: TagWithProbability[], success: boolean }> {
    try {
      // Obtener el lead y sus datos relacionados
      const lead = await storage.getLead(leadId);
      if (!lead) {
        throw new Error("Lead no encontrado");
      }

      // Obtener mensajes y actividades relacionadas con el lead para un mejor análisis
      const messages = await storage.getMessagesByLead(leadId);
      const activities = await storage.getActivitiesByLead(leadId);

      // Generar análisis usando IA
      const analysisPrompt = `
        Analiza el siguiente perfil de lead y genera etiquetas con su probabilidad (0-100):
        
        Lead: ${JSON.stringify(lead)}
        Mensajes recientes: ${JSON.stringify(messages.slice(0, 5))}
        Actividades: ${JSON.stringify(activities.slice(0, 5))}

        Genera etiquetas específicas para este lead considerando:
        - Etapas del proceso de venta (prospecto, cualificado, negociación, etc.)
        - Intereses mostrados en conversaciones
        - Problemas o necesidades detectadas
        - Nivel de compromiso basado en interacciones
        - Comportamiento de compra potencial

        Para cada etiqueta, asigna una probabilidad entre 0 y 100 basada en la confianza.
      `;

      const response = await this.geminiService.generateContent(analysisPrompt);
      
      // Procesar la respuesta para extraer etiquetas y probabilidades
      const analysisResult = this.parseTagsResponse(response);
      
      // Actualizar el lead con el análisis de IA
      await storage.updateLead(leadId, {
        tags: analysisResult
      });

      // Guardar el análisis en caché
      this.analysisCache.set(leadId, {
        tags: analysisResult,
        summary: "",
        nextBestAction: "",
        confidenceScore: 0,
        timestamp: new Date()
      });

      return {
        tags: analysisResult,
        success: true
      };
    } catch (error) {
      console.error("Error al analizar lead:", error);
      return {
        tags: [],
        success: false
      };
    }
  }

  // Parsear respuesta de IA para extraer etiquetas con probabilidades
  private parseTagsResponse(response: string): TagWithProbability[] {
    try {
      // Intentar extraer información estructurada del texto de respuesta
      const tags: TagWithProbability[] = [];
      
      // Buscar patrones como "Etiqueta: XX%" o "Etiqueta (XX%)" en el texto
      const lines = response.split('\n');
      
      for (const line of lines) {
        // Patrones posibles: "Etiqueta: 75%" o "Etiqueta (75%)" o "- Etiqueta: 75%"
        const tagMatch = line.match(/[-•]?\s*([^:()]+)[:(\s]+(\d+)%/);
        if (tagMatch && tagMatch.length >= 3) {
          const tag = tagMatch[1].trim();
          const probability = parseInt(tagMatch[2], 10);
          
          // Determinar categoría basada en la etiqueta
          let category = 'general';
          if (tag.toLowerCase().includes('interés') || tag.toLowerCase().includes('interesado')) {
            category = 'interés';
          } else if (tag.toLowerCase().includes('etapa') || tag.toLowerCase().includes('fase')) {
            category = 'etapa';
          } else if (tag.toLowerCase().includes('probabilidad') || tag.toLowerCase().includes('conversión')) {
            category = 'conversión';
          }
          
          tags.push({
            tag,
            probability,
            category
          });
        }
      }
      
      return tags;
    } catch (error) {
      console.error("Error al parsear etiquetas:", error);
      return [];
    }
  }

  // Generar tareas automáticas basadas en el análisis de IA
  async generateTasks(leadId: number): Promise<{ tasks: AutoTask[], success: boolean }> {
    try {
      // Obtener el lead
      const lead = await storage.getLead(leadId);
      if (!lead) {
        throw new Error("Lead no encontrado");
      }
      
      // Obtener mensajes y actividades para contexto
      const messages = await storage.getMessagesByLead(leadId);
      const activities = await storage.getActivitiesByLead(leadId);
      
      // Obtener análisis previo si existe
      const cachedAnalysis = this.analysisCache.get(leadId);
      
      // Generar prompt para crear tareas
      const tasksPrompt = `
        Genera 3 tareas automáticas para este lead basadas en su perfil y actividad reciente:
        
        Lead: ${JSON.stringify(lead)}
        Mensajes recientes: ${JSON.stringify(messages.slice(0, 3))}
        Actividades previas: ${JSON.stringify(activities.slice(0, 3))}
        ${cachedAnalysis ? `Análisis previo: ${JSON.stringify(cachedAnalysis)}` : ''}
        
        Para cada tarea, especifica:
        - Título: breve y descriptivo
        - Tipo: llamada, reunión, email, seguimiento
        - Descripción: detalle sobre qué hacer exactamente
        - Fecha recomendada: en formato relativo (ej. "en 3 días")
        - Prioridad: alta, media o baja
        
        Asegúrate que las tareas sean relevantes para el estado actual del lead y ayuden a avanzar en el proceso de venta.
      `;
      
      const response = await this.geminiService.generateContent(tasksPrompt);
      
      // Procesar la respuesta para extraer tareas
      const tasks = this.parseTasksResponse(response);
      
      // Crear las tareas en el sistema
      for (const task of tasks) {
        const newActivity: InsertActivity = {
          type: task.type,
          title: task.title,
          description: task.description || "",
          leadId,
          startTime: task.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // Por defecto mañana
          completed: false,
          aiGenerated: true,
          aiSummary: task.priority ? `Priority: ${task.priority}` : undefined
        };
        
        await storage.createActivity(newActivity);
      }
      
      return {
        tasks,
        success: true
      };
    } catch (error) {
      console.error("Error al generar tareas:", error);
      return {
        tasks: [],
        success: false
      };
    }
  }
  
  // Parsear respuesta de IA para extraer tareas
  private parseTasksResponse(response: string): AutoTask[] {
    try {
      const tasks: AutoTask[] = [];
      const taskBlocks = response.split(/Tarea\s+\d+:|(?=\n\s*Tarea\s+\d+:)/g).filter(Boolean);
      
      for (const block of taskBlocks) {
        if (!block.trim()) continue;
        
        const title = this.extractValue(block, "Título");
        const type = this.extractValue(block, "Tipo");
        const description = this.extractValue(block, "Descripción");
        const dateText = this.extractValue(block, "Fecha");
        const priority = this.extractValue(block, "Prioridad")?.toLowerCase();
        
        if (title && type) {
          const task: AutoTask = {
            title,
            type,
            description
          };
          
          // Convertir fecha relativa a Date
          if (dateText) {
            task.dueDate = this.parseRelativeDate(dateText);
          }
          
          // Validar prioridad
          if (priority && ["alta", "media", "baja", "high", "medium", "low"].includes(priority)) {
            task.priority = this.mapPriority(priority);
          }
          
          tasks.push(task);
        }
      }
      
      return tasks;
    } catch (error) {
      console.error("Error al parsear tareas:", error);
      return [];
    }
  }
  
  private extractValue(text: string, key: string): string | undefined {
    const regex = new RegExp(`${key}:?\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
  }
  
  private parseRelativeDate(dateText: string): Date {
    const now = new Date();
    const result = new Date(now);
    
    // Buscar patrones como "en X días", "mañana", "próxima semana"
    if (dateText.match(/mañana/i)) {
      result.setDate(now.getDate() + 1);
    } else if (dateText.match(/semana/i)) {
      result.setDate(now.getDate() + 7);
    } else if (dateText.match(/mes/i)) {
      result.setMonth(now.getMonth() + 1);
    } else {
      // Buscar un número de días
      const daysMatch = dateText.match(/(\d+)\s*d[ií]as?/i);
      if (daysMatch && daysMatch[1]) {
        const days = parseInt(daysMatch[1], 10);
        result.setDate(now.getDate() + days);
      }
    }
    
    return result;
  }
  
  private mapPriority(priority: string): 'high' | 'medium' | 'low' {
    if (priority === 'alta' || priority === 'high') return 'high';
    if (priority === 'media' || priority === 'medium') return 'medium';
    return 'low';
  }
  
  // Gestionar un lead automáticamente con IA
  async manageLead(leadId: number): Promise<{
    success: boolean;
    automaticTasks: AutoTask[];
    tagsWithProbability: TagWithProbability[];
    message: string;
  }> {
    try {
      // 1. Analizar lead para generar etiquetas con probabilidades
      const analysisResult = await this.analyzeLead(leadId);
      
      // 2. Generar tareas automáticas
      const tasksResult = await this.generateTasks(leadId);
      
      return {
        success: true,
        automaticTasks: tasksResult.tasks,
        tagsWithProbability: analysisResult.tags,
        message: "Lead gestionado automáticamente con éxito"
      };
    } catch (error) {
      console.error("Error en gestión automática de lead:", error);
      return {
        success: false,
        automaticTasks: [],
        tagsWithProbability: [],
        message: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`
      };
    }
  }
}

export default TaskTagService;