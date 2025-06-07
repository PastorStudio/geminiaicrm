import { db } from '../db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../storage';

interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  leadId?: number;
  campaignId?: string;
  category?: string;
  status?: string; // Añadido para filtrar por status
}

interface AnalyticsPrediction {
  value: number;
  probability: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
}

interface AnalyticsInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  relatedData?: any;
  actions?: string[];
}

// Interfaces para segmentación de clientes
interface CustomerSegment {
  name: string;
  description: string;
  characteristics: string[];
  size: number;
  percentageOfTotal: number;
}

interface SegmentationResponse {
  segments: CustomerSegment[];
  categories: {
    category: string;
    values: number[];
  }[];
}

// Interfaces para análisis de sentimiento
interface SentimentCategory {
  name: string;
  value: number;
  percentage: number;
}

interface Topic {
  name: string;
  count: number;
  sentimentScore: number;
  keywords: string[];
}

interface FeedbackAnalysisResponse {
  sentiment: SentimentCategory[];
  topics: Topic[];
  commonPhrases: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  trends: {
    description: string;
    change: number;
    period: string;
  }[];
}

export class AnalyticsService {
  // Declaramos la variable sin inicialización
  private genAI!: GoogleGenerativeAI | null;
  private model: any = null;

  constructor() {
    // Inicializamos el genAI como null por defecto
    this.genAI = null;
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('Servicio de Analytics inicializado sin API key de Gemini, funcionalidad limitada');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-pro-latest"
      });
      console.log('Servicio de Analytics inicializado con Gemini API');
    } catch (error) {
      console.error('Error al inicializar Gemini API para Analytics:', error);
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Predice métricas futuras basadas en datos históricos usando modelos de ML
   */
  async predictMetrics(metric: string, params: AnalyticsParams): Promise<AnalyticsPrediction> {
    try {
      // Obtener datos históricos dependiendo del tipo de métrica
      const historicalData = await this.getHistoricalData(metric, params);
      
      if (!this.model) {
        return await this.generateRealDataPrediction(metric, params);
      }

      // Construir prompt para Gemini
      const prompt = `
      Analiza estos datos históricos para la métrica "${metric}" y predice su valor futuro:
      
      Datos históricos:
      ${JSON.stringify(historicalData, null, 2)}
      
      Basándote en estos datos, predice:
      1. El valor esperado para esta métrica en las próximas 4 semanas
      2. La probabilidad de alcanzar este valor (porcentaje)
      3. El nivel de confianza de esta predicción (porcentaje)
      4. La tendencia general (increasing, decreasing, stable)
      5. Los principales factores que influyen en esta predicción
      
      Responde en formato JSON con las siguientes propiedades exactas:
      {
        "value": number,
        "probability": number,
        "confidence": number,
        "trend": "increasing"|"decreasing"|"stable",
        "factors": string[]
      }
      
      Sólo proporciona el objeto JSON, sin texto adicional.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extraer el JSON de la respuesta
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/```\s*([\s\S]*?)\s*```/) || 
                      text.match(/(\{[\s\S]*\})/);
                      
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      try {
        const prediction = JSON.parse(jsonText);
        return {
          value: Math.round(prediction.value),
          probability: Math.min(100, Math.max(0, Math.round(prediction.probability))),
          confidence: Math.min(100, Math.max(0, Math.round(prediction.confidence))),
          trend: prediction.trend || 'stable',
          factors: prediction.factors || []
        };
      } catch (parseError) {
        console.error("Error parsing prediction JSON:", parseError);
        return await this.generateRealDataPrediction(metric, params);
      }
    } catch (error) {
      console.error(`Error al predecir métricas para ${metric}:`, error);
      return await this.generateRealDataPrediction(metric, params);
    }
  }

  /**
   * Descubre insights relevantes en los datos usando algoritmos de aprendizaje automático
   */
  async generateInsights(params: AnalyticsParams): Promise<AnalyticsInsight[]> {
    try {
      // Obtener datos de diferentes fuentes
      const leadsData = await this.getLeadsData(params);
      const messagesData = await this.getMessagesData(params);
      const activitiesData = await this.getActivityData(params);
      
      if (!this.model) {
        return await this.generateRealDataInsights(params);
      }

      // Construir prompt para Gemini
      const prompt = `
      Analiza estos datos de CRM y genera insights valiosos:
      
      Datos de leads:
      ${JSON.stringify(leadsData.slice(0, 10), null, 2)}
      
      Datos de mensajes:
      ${JSON.stringify(messagesData.slice(0, 10), null, 2)}
      
      Datos de actividades:
      ${JSON.stringify(activitiesData.slice(0, 10), null, 2)}
      
      Genera 5 insights basados en estos datos, identificando:
      - Oportunidades de negocio
      - Riesgos potenciales
      - Tendencias emergentes
      - Recomendaciones accionables
      
      Cada insight debe incluir:
      1. Un tipo (opportunity, risk, trend, recommendation)
      2. Un título conciso
      3. Una descripción detallada
      4. Nivel de impacto (high, medium, low)
      5. Nivel de confianza (%)
      6. Datos relacionados (si aplica)
      7. Acciones recomendadas (2-3 por insight)
      
      Responde en formato JSON con un array de objetos con estas propiedades exactas:
      {
        "insights": [
          {
            "type": string,
            "title": string,
            "description": string,
            "impact": string,
            "confidence": number,
            "relatedData": object (optional),
            "actions": string[]
          }
        ]
      }
      
      Sólo proporciona el objeto JSON, sin texto adicional.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extraer el JSON de la respuesta
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/```\s*([\s\S]*?)\s*```/) || 
                      text.match(/(\{[\s\S]*\})/);
                      
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      try {
        const parsed = JSON.parse(jsonText);
        return Array.isArray(parsed.insights) ? parsed.insights : await this.generateRealDataInsights(params);
      } catch (parseError) {
        console.error("Error parsing insights JSON:", parseError);
        return await this.generateRealDataInsights(params);
      }
    } catch (error) {
      console.error("Error al generar insights:", error);
      return await this.generateRealDataInsights(params);
    }
  }

  /**
   * Analiza sentimiento y temas de los mensajes del cliente
   */
  async analyzeCustomerFeedback(params: AnalyticsParams): Promise<FeedbackAnalysisResponse> {
    try {
      // Obtener mensajes para análisis
      const messagesData = await this.getMessagesData(params);
      
      if (!this.model || messagesData.length === 0) {
        return this.generatePlaceholderFeedbackAnalysis();
      }

      // Construir prompt para Gemini
      const prompt = `
      Analiza estos mensajes de clientes para identificar sentimientos, temas comunes y tendencias:
      
      Mensajes:
      ${JSON.stringify(messagesData.slice(0, 20), null, 2)}
      
      Realiza un análisis completo que incluya:
      1. Distribución de sentimiento (positivo, neutro, negativo) con porcentajes
      2. Temas principales mencionados en los mensajes, con puntuación de sentimiento para cada tema
      3. Frases comunes por categoría de sentimiento
      4. Tendencias identificadas en el período analizado
      
      Responde en formato JSON exactamente con esta estructura:
      {
        "sentiment": [
          {"name": "Positivo", "value": number, "percentage": number},
          {"name": "Neutro", "value": number, "percentage": number},
          {"name": "Negativo", "value": number, "percentage": number}
        ],
        "topics": [
          {
            "name": string,
            "count": number,
            "sentimentScore": number,
            "keywords": string[]
          }
        ],
        "commonPhrases": {
          "positive": string[],
          "negative": string[],
          "neutral": string[]
        },
        "trends": [
          {
            "description": string,
            "change": number,
            "period": string
          }
        ]
      }
      
      Sólo proporciona el objeto JSON, sin texto adicional.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extraer el JSON de la respuesta
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/```\s*([\s\S]*?)\s*```/) || 
                      text.match(/(\{[\s\S]*\})/);
                      
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        console.error("Error parsing feedback analysis JSON:", parseError);
        return this.generatePlaceholderFeedbackAnalysis();
      }
    } catch (error) {
      console.error("Error al analizar feedback de clientes:", error);
      return this.generatePlaceholderFeedbackAnalysis();
    }
  }

  /**
   * Segmenta clientes basado en comportamiento y características
   */
  async segmentCustomers(): Promise<SegmentationResponse> {
    try {
      // Obtener datos completos de leads
      const leads = await storage.getAllLeads();
      
      if (!this.model || !leads || leads.length === 0) {
        return this.generatePlaceholderSegmentation();
      }

      // Construir prompt para Gemini
      const prompt = `
      Segmenta estos clientes basándote en sus características y comportamiento:
      
      Datos de clientes:
      ${JSON.stringify(leads.slice(0, 15), null, 2)}
      
      Identifica entre 3-5 segmentos distintos de clientes, basados en patrones como:
      - Fuente de adquisición
      - Estado en el pipeline
      - Nivel de interacción
      - Valor potencial
      - Industria o tipo de empresa
      - Cualquier otro patrón relevante
      
      Para cada segmento, proporciona:
      1. Un nombre descriptivo
      2. Una descripción detallada
      3. Características principales
      4. Tamaño (número de clientes)
      5. Porcentaje del total
      
      Además, genera una tabla de categorías para visualizar en un gráfico radar, donde cada segmento tenga una puntuación en cada categoría.
      
      Responde en formato JSON con esta estructura exacta:
      {
        "segments": [
          {
            "name": string,
            "description": string,
            "characteristics": string[],
            "size": number,
            "percentageOfTotal": number
          }
        ],
        "categories": [
          {
            "category": string,
            "values": number[]
          }
        ]
      }
      
      Donde "values" en categories contiene un array de valores (0-10) para cada segmento, en el mismo orden que aparecen en "segments".
      Sólo proporciona el objeto JSON, sin texto adicional.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extraer el JSON de la respuesta
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/```\s*([\s\S]*?)\s*```/) || 
                      text.match(/(\{[\s\S]*\})/);
                      
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      try {
        const segmentation = JSON.parse(jsonText);
        
        // Verificar y arreglar posibles problemas en los datos
        if (!segmentation.segments || !Array.isArray(segmentation.segments)) {
          segmentation.segments = [];
        }
        
        if (!segmentation.categories || !Array.isArray(segmentation.categories)) {
          segmentation.categories = [];
        }
        
        return segmentation;
      } catch (parseError) {
        console.error("Error parsing segmentation JSON:", parseError);
        return this.generatePlaceholderSegmentation();
      }
    } catch (error) {
      console.error("Error al segmentar clientes:", error);
      return this.generatePlaceholderSegmentation();
    }
  }

  /**
   * Predice la probabilidad de conversión de leads
   */
  async predictLeadConversion(leadId?: number): Promise<{ predictions: any[] }> {
    try {
      // Obtener leads para predicción
      let leads;
      if (leadId) {
        const lead = await storage.getLead(leadId);
        leads = lead ? [lead] : [];
      } else {
        leads = await storage.getAllLeads();
      }
      
      if (!this.model || !leads || leads.length === 0) {
        return { predictions: this.generatePlaceholderLeadPredictions(leads) };
      }

      // Construir prompt para Gemini
      const prompt = `
      Analiza estos leads y predice su probabilidad de conversión:
      
      Leads:
      ${JSON.stringify(leads.slice(0, 15), null, 2)}
      
      Para cada lead, calcula:
      1. Probabilidad de conversión (%)
      2. Valor potencial ($K)
      3. Nivel de confianza en la predicción (%)
      4. Factores clave que influyen en la conversión
      5. Tiempo estimado hasta la conversión (días)
      
      Responde en formato JSON con un array de objetos:
      {
        "predictions": [
          {
            "leadId": number,
            "name": string,
            "probability": number,
            "value": number,
            "confidence": number,
            "factors": string[],
            "estimatedDays": number
          }
        ]
      }
      
      Sólo proporciona el objeto JSON, sin texto adicional.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extraer el JSON de la respuesta
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/```\s*([\s\S]*?)\s*```/) || 
                      text.match(/(\{[\s\S]*\})/);
                      
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      
      try {
        const predictions = JSON.parse(jsonText);
        return predictions;
      } catch (parseError) {
        console.error("Error parsing lead conversion JSON:", parseError);
        return { predictions: this.generatePlaceholderLeadPredictions(leads) };
      }
    } catch (error) {
      console.error("Error al predecir conversión de leads:", error);
      return { predictions: [] };
    }
  }

  // Métodos privados para obtener datos

  private async getHistoricalData(metric: string, params: AnalyticsParams): Promise<any[]> {
    try {
      const { startDate, endDate } = params;
      
      // Definir fuente de datos según la métrica
      switch (metric) {
        case 'leads':
          return this.getLeadsData(params);
        case 'conversions':
          return this.getLeadsData({ ...params, status: 'closed-won' });
        case 'messages':
          return this.getMessagesData(params);
        case 'activities':
          return this.getActivityData(params);
        case 'sales':
          // Aquí se implementaría la lógica para obtener datos de ventas
          return [];
        default:
          return [];
      }
    } catch (error) {
      console.error("Error al obtener datos históricos:", error);
      return [];
    }
  }

  private async getLeadsData(params: AnalyticsParams): Promise<any[]> {
    try {
      // Obtener todos los leads
      const allLeads = await storage.getAllLeads();
      
      // Filtrar por fecha si es necesario
      let filteredLeads = allLeads;
      if (params.startDate || params.endDate) {
        filteredLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.createdAt!);
          
          if (params.startDate && params.endDate) {
            return leadDate >= new Date(params.startDate) && leadDate <= new Date(params.endDate);
          } else if (params.startDate) {
            return leadDate >= new Date(params.startDate);
          } else if (params.endDate) {
            return leadDate <= new Date(params.endDate);
          }
          
          return true;
        });
      }
      
      // Filtrar por status si es necesario
      if (params.status) {
        filteredLeads = filteredLeads.filter(lead => lead.status === params.status);
      }
      
      // Devolver resultados
      return filteredLeads;
    } catch (error) {
      console.error("Error al obtener datos de leads:", error);
      return [];
    }
  }

  private async getMessagesData(params: AnalyticsParams): Promise<any[]> {
    try {
      // Obtener mensajes según los parámetros
      const messages = await storage.getRecentMessages(100);
      
      // Filtrar por leadId si es necesario
      let filteredMessages = messages;
      if (params.leadId) {
        filteredMessages = messages.filter(message => message.leadId === params.leadId);
      }
      
      // Filtrar por fecha si es necesario
      if (params.startDate || params.endDate) {
        filteredMessages = filteredMessages.filter(message => {
          const messageDate = new Date(message.sentAt!);
          
          if (params.startDate && params.endDate) {
            return messageDate >= new Date(params.startDate) && messageDate <= new Date(params.endDate);
          } else if (params.startDate) {
            return messageDate >= new Date(params.startDate);
          } else if (params.endDate) {
            return messageDate <= new Date(params.endDate);
          }
          
          return true;
        });
      }
      
      return filteredMessages;
    } catch (error) {
      console.error("Error al obtener datos de mensajes:", error);
      return [];
    }
  }

  private async getActivityData(params: AnalyticsParams): Promise<any[]> {
    try {
      // Aquí implementaríamos la lógica para obtener actividades
      // con filtrado por fechas, leadId, etc.
      return [];
    } catch (error) {
      console.error("Error al obtener datos de actividades:", error);
      return [];
    }
  }

  // Métodos para generar datos placeholder cuando no hay API key o hay errores

  private async generateRealDataPrediction(metric: string, params: AnalyticsParams): Promise<AnalyticsPrediction> {
    try {
      // Obtener datos reales de la base de datos
      const leads = await storage.getAllLeads();
      const messages = await storage.getRecentMessages(100);
      
      let value = 0;
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let factors: string[] = [];

      switch (metric) {
        case 'leads':
          value = leads.length;
          const highPriorityLeads = leads.filter(l => l.priority === 'high').length;
          if (highPriorityLeads > leads.length * 0.3) {
            trend = 'increasing';
            factors.push(`${highPriorityLeads} leads de alta prioridad detectados`);
          }
          factors.push(`${leads.length} leads totales en el sistema`);
          break;
          
        case 'messages':
          value = messages.length;
          factors.push(`${messages.length} mensajes recientes analizados`);
          break;
          
        default:
          value = leads.length;
          factors.push(`Análisis basado en ${leads.length} leads`);
      }

      return {
        value,
        probability: Math.min(95, 60 + (value * 0.5)),
        confidence: 85,
        trend,
        factors
      };
    } catch (error) {
      console.error('Error generando predicción con datos reales:', error);
      return {
        value: 0,
        probability: 0,
        confidence: 0,
        trend: 'stable',
        factors: ['Error al acceder a los datos']
      };
    }
  }

  private async generateRealDataInsights(params: AnalyticsParams): Promise<AnalyticsInsight[]> {
    try {
      const leads = await storage.getAllLeads();
      const messages = await storage.getRecentMessages(50);
      const insights: AnalyticsInsight[] = [];

      // Análisis de leads
      if (leads.length > 0) {
        const highPriorityLeads = leads.filter(l => l.priority === 'high').length;
        const newLeads = leads.filter(l => l.status === 'new').length;
        
        if (highPriorityLeads > 0) {
          insights.push({
            type: 'opportunity',
            title: 'Leads de Alta Prioridad',
            description: `Tienes ${highPriorityLeads} leads de alta prioridad que requieren atención inmediata.`,
            impact: 'high',
            confidence: 95,
            actions: ['Revisar leads prioritarios', 'Asignar agentes especializados']
          });
        }

        if (newLeads > leads.length * 0.3) {
          insights.push({
            type: 'trend',
            title: 'Incremento en Leads Nuevos',
            description: `${newLeads} leads nuevos representan el ${Math.round((newLeads/leads.length)*100)}% del total.`,
            impact: 'medium',
            confidence: 85,
            actions: ['Optimizar proceso de calificación', 'Aumentar capacidad de respuesta']
          });
        }
      }

      // Análisis de mensajes
      if (messages.length > 0) {
        const unreadMessages = messages.filter(m => !m.read).length;
        if (unreadMessages > messages.length * 0.2) {
          insights.push({
            type: 'risk',
            title: 'Mensajes Sin Leer',
            description: `${unreadMessages} mensajes sin leer pueden afectar la satisfacción del cliente.`,
            impact: 'medium',
            confidence: 90,
            actions: ['Revisar mensajes pendientes', 'Optimizar tiempo de respuesta']
          });
        }
      }

      return insights.length > 0 ? insights : [{
        type: 'recommendation',
        title: 'Sistema Funcionando Correctamente',
        description: 'Los indicadores principales muestran un rendimiento estable.',
        impact: 'low',
        confidence: 100,
        actions: ['Continuar monitoreando métricas']
      }];
    } catch (error) {
      console.error('Error generando insights con datos reales:', error);
      return [{
        type: 'recommendation',
        title: 'Error en Análisis',
        description: 'No se pudieron analizar los datos. Verifique la conexión con la base de datos.',
        impact: 'high',
        confidence: 100,
        actions: ['Verificar conexión', 'Reintentar análisis']
      }];
    }
  }

  private generatePlaceholderFeedbackAnalysis(): FeedbackAnalysisResponse {
    return {
      sentiment: [
        { name: 'Positivo', value: 0, percentage: 0 },
        { name: 'Neutro', value: 0, percentage: 0 },
        { name: 'Negativo', value: 0, percentage: 0 }
      ],
      topics: [],
      commonPhrases: {
        positive: [],
        negative: [],
        neutral: []
      },
      trends: []
    };
  }

  private generatePlaceholderSegmentation(): SegmentationResponse {
    return {
      segments: [],
      categories: []
    };
  }

  private generatePlaceholderLeadPredictions(leads: any[]): any[] {
    return leads.map(lead => ({
      leadId: lead.id,
      name: lead.name,
      probability: 0,
      value: 0,
      confidence: 0,
      factors: ['Se requiere configurar API key de Gemini para predicciones'],
      estimatedDays: 0
    }));
  }
  
  /**
   * Genera tags inteligentes basados en contenido de texto
   */
  async generateTags(inputText: string): Promise<{tag: string, confidence: number}[]> {
    try {
      if (!this.model) {
        return [
          { tag: "configurar-gemini", confidence: 100 },
          { tag: "api-requerida", confidence: 100 }
        ];
      }

      const prompt: string = `
      Analiza este texto y genera hasta 5 tags o etiquetas relevantes:
      
      Texto: "${inputText}"
      
      Genera tags que capturen:
      - Temas principales
      - Sentimiento o tono
      - Industria o sector relevante
      - Intención o objetivo
      - Nivel de urgencia
      
      Responde en formato JSON con la siguiente estructura exacta:
      [
        {"tag": "nombre-del-tag", "confidence": valor_numérico}
      ]
      
      Donde "confidence" es un valor entre 0 y 100 que indica la relevancia o precisión del tag.
      Ordena los tags de mayor a menor confianza.
      Sólo proporciona el objeto JSON, sin texto adicional.
      `;

      const genResult = await this.model.generateContent(prompt);
      const genResponse = genResult.response;
      const responseText = genResponse.text();
      
      // Extraer el JSON de la respuesta
      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/```\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/(\[[\s\S]*\])/);
                      
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      
      try {
        const tags = JSON.parse(jsonText);
        return Array.isArray(tags) ? tags : [];
      } catch (parseError) {
        console.error("Error parsing tags JSON:", parseError);
        return [{ tag: "error-formato", confidence: 100 }];
      }
    } catch (error) {
      console.error("Error al generar tags:", error);
      return [{ tag: "error-servicio", confidence: 100 }];
    }
  }
}

export const analyticsService = new AnalyticsService();