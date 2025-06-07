import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Lead, User, Message, Activity } from '@shared/schema';
import { apiKeyManager } from './apiKeyManager';

// Configurar el cliente de la API de Gemini usando nuestro gestor de claves
let genAI: GoogleGenerativeAI;

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Service class for interacting with Google's Gemini API
 */
export class GeminiService {
  
  /**
   * Initialize the Gemini model with specified parameters
   * @param temperature Controls randomness (0.0 to 1.0)
   * @param maxOutputTokens Maximum tokens to generate in the response
   */
  async getModel(temperature = 0.7, maxOutputTokens = 1024) {
    // Obtenemos la clave API desde nuestro gestor
    const apiKey = apiKeyManager.getGeminiKey();
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    // Inicializar o actualizar el cliente con la clave más reciente
    genAI = new GoogleGenerativeAI(apiKey);
    
    // Mostrar advertencia si se está usando una clave temporal
    if (apiKeyManager.isUsingTemporaryKey()) {
      console.warn('⚠️ Usando una clave API temporal para Gemini. Esto es solo para desarrollo.');
    }
    
    // Para la versión 0.24.1 de la API, simplificaremos las configuraciones de seguridad
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature,
        maxOutputTokens,
        topP: 0.95,
        topK: 40,
      }
    });
    
    return model;
  }

  /**
   * Analyze a lead to extract insights, determine lead score and provide recommendations
   * @param lead The lead to analyze
   */
  async analyzeLead(lead: Lead) {
    try {
      const apiKey = apiKeyManager.getGeminiKey();
      
      // Si no hay clave API disponible o estamos en modo de desarrollo, usar simulación
      if (!apiKey || process.env.NODE_ENV === 'development') {
        console.log("Usando respuesta simulada para análisis de lead debido a limitaciones de la API");
        return this.getSimulatedLeadAnalysis(lead);
      }
      
      const model = await this.getModel(0.2); // Low temperature for more factual analysis
      
      const prompt = `
You are a CRM Assistant specializing in lead analysis. Analyze the following lead information and provide:
1. A lead score from 0-100 based on likelihood to convert
2. A match percentage indicating how well this lead matches our ideal customer profile
3. Enrichment insights and recommendations for follow-up

Lead Information:
- Name: ${lead.fullName}
- Email: ${lead.email}
- Company: ${lead.company || 'Unknown'}
- Position: ${lead.position || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Status: ${lead.status || 'New'}
- Notes: ${lead.notes || 'None'}

Provide your response in valid JSON format with the following structure:
{
  "score": number,
  "matchPercentage": number,
  "enrichmentData": {
    "insights": string[],
    "recommendedActions": string[],
    "nextSteps": string,
    "potentialBudget": string,
    "decisionTimeframe": string
  }
}
`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      try {
        // Extract the JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : '{}';
        return JSON.parse(jsonString);
      } catch (error) {
        console.error("Error parsing JSON from Gemini response:", error);
        // Fallback to a structured response if JSON parsing fails
        return this.getSimulatedLeadAnalysis(lead);
      }
    } catch (error) {
      console.error("Error calling Gemini API for lead analysis:", error);
      return this.getSimulatedLeadAnalysis(lead);
    }
  }
  
  /**
   * Genera un análisis simulado de lead cuando no se puede acceder a la API de Gemini
   * @param lead El lead a analizar
   */
  private getSimulatedLeadAnalysis(lead: Lead) {
    // Calcular una puntuación basada en la información disponible
    let score = 50; // Puntuación base
    let matchPercentage = 60; // Porcentaje de coincidencia base
    
    // Ajustar puntuación según la información disponible
    if (lead.company) score += 10;
    if (lead.position) score += 10;
    if (lead.phone) score += 15;
    if (lead.notes && lead.notes.length > 20) score += 10;
    
    // Calcular insights basados en la información del lead
    const insights = [];
    const recommendedActions = [];
    
    // Análisis del correo electrónico
    const emailDomain = lead.email.split('@')[1];
    if (emailDomain && !emailDomain.includes('gmail.com') && !emailDomain.includes('hotmail.com')) {
      insights.push(`El correo electrónico corporativo indica un lead empresarial de ${emailDomain}`);
      matchPercentage += 10;
    } else {
      insights.push('El correo electrónico personal podría indicar un lead individual o de pequeña empresa');
    }
    
    // Análisis de la fuente
    if (lead.source) {
      insights.push(`Lead proveniente de ${lead.source}, lo que indica interés activo`);
      if (lead.source.toLowerCase().includes('referral')) {
        insights.push('Los leads por referencia suelen tener mayor tasa de conversión');
        score += 15;
        matchPercentage += 15;
      }
    }
    
    // Análisis del cargo
    if (lead.position) {
      const positionLower = lead.position.toLowerCase();
      if (positionLower.includes('ceo') || positionLower.includes('director') || positionLower.includes('gerente')) {
        insights.push('Contacto con capacidad de decisión en la empresa');
        recommendedActions.push('Preparar presentación enfocada en ROI y valor estratégico');
        score += 15;
        matchPercentage += 10;
      } else if (positionLower.includes('especialista') || positionLower.includes('técnico') || positionLower.includes('analista')) {
        insights.push('Contacto técnico que puede influir en la decisión');
        recommendedActions.push('Proporcionar información técnica detallada y casos de estudio');
      }
    }
    
    // Recomendaciones generales
    recommendedActions.push('Establecer contacto inicial por correo electrónico con propuesta de valor');
    recommendedActions.push('Programar una llamada de descubrimiento para entender necesidades específicas');
    
    // Asegurar que la puntuación esté en el rango correcto
    score = Math.min(Math.max(score, 0), 100);
    matchPercentage = Math.min(Math.max(matchPercentage, 0), 100);
    
    return {
      score,
      matchPercentage,
      enrichmentData: {
        insights,
        recommendedActions,
        nextSteps: "Contactar dentro de las próximas 48 horas para calificar la oportunidad",
        potentialBudget: lead.company ? "Medio-Alto" : "Bajo-Medio",
        decisionTimeframe: "30-60 días"
      }
    };
  }

  /**
   * Generate personalized message content based on lead information
   * @param lead The lead to generate a message for
   * @param messageType The type of message to generate (follow-up, proposal, etc.)
   * @param context Additional context for the message
   */
  async generateMessage(lead: Lead, messageType: string, context?: string) {
    try {
      const apiKey = apiKeyManager.getGeminiKey();
      
      // Si no hay clave API disponible o estamos en modo de desarrollo, usar simulación
      if (!apiKey || process.env.NODE_ENV === 'development') {
        console.log(`Usando respuesta simulada para generación de mensaje ${messageType} debido a limitaciones de la API`);
        return this.getSimulatedMessage(lead, messageType, context);
      }
      
      const model = await this.getModel(0.7); // Medium temperature for balanced creativity
      
      const prompt = `
You are a CRM Assistant specializing in customer communication. Generate a personalized ${messageType} message for the following lead:

Lead Information:
- Name: ${lead.fullName}
- Email: ${lead.email}
- Company: ${lead.company || 'Unknown'}
- Position: ${lead.position || 'Unknown'}
- Status: ${lead.status || 'New'}
${context ? `\nAdditional Context:\n${context}` : ''}

Generate a professional and personalized message appropriate for a ${messageType}. The message should be specific to this lead and their company. Do not include placeholders like [Your Name].
`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      return { content: text };
    } catch (error) {
      console.error(`Error calling Gemini API for ${messageType} generation:`, error);
      return this.getSimulatedMessage(lead, messageType, context);
    }
  }
  
  /**
   * Genera un mensaje simulado cuando no se puede acceder a la API de Gemini
   * @param lead El lead para el que generar el mensaje
   * @param messageType El tipo de mensaje a generar
   * @param context Contexto adicional opcional
   */
  private getSimulatedMessage(lead: Lead, messageType: string, context?: string) {
    // Personalizar según el tipo de mensaje
    let content = '';
    const firstName = lead.fullName.split(' ')[0];
    const companyPhrase = lead.company ? ` de ${lead.company}` : '';
    
    switch(messageType.toLowerCase()) {
      case 'follow-up':
        content = `Estimado/a ${lead.fullName},

Espero que este mensaje le encuentre bien. Quería hacer un seguimiento después de nuestro último contacto${context ? ` sobre ${context}` : ''}.

Como le mencioné, nuestras soluciones han ayudado a empresas similares a${companyPhrase} a mejorar su eficiencia en un 25% en promedio. Me gustaría programar una breve llamada para discutir cómo podríamos adaptar nuestros servicios a sus necesidades específicas.

¿Tendría disponibilidad para una llamada rápida esta semana?

Saludos cordiales,
[Su Nombre]
[Su Cargo]`;
        break;
        
      case 'proposal':
        content = `Estimado/a ${lead.fullName},

Basado en nuestra conversación${context ? ` sobre ${context}` : ''}, me complace presentarle nuestra propuesta personalizada para${companyPhrase}.

Nuestra solución incluye:
- Implementación inicial adaptada a sus procesos actuales
- Capacitación completa para su equipo
- Soporte técnico prioritario
- Informes mensuales de rendimiento

Esta propuesta está diseñada específicamente para abordar los desafíos que identificamos y ayudarle a alcanzar sus objetivos de negocio.

Adjunto encontrará los detalles completos de la propuesta. ¿Podríamos agendar una reunión para revisar los puntos clave y responder a cualquier pregunta que pueda tener?

Saludos cordiales,
[Su Nombre]
[Su Cargo]`;
        break;
        
      case 'meeting-request':
        content = `Estimado/a ${lead.fullName},

Espero que esta semana esté siendo productiva. Me gustaría solicitar una reunión${context ? ` para discutir ${context}` : ''}.

Durante esta sesión, podríamos:
- Analizar sus necesidades actuales
- Presentar casos de éxito relevantes para su industria
- Discutir cómo nuestra solución podría adaptarse a${companyPhrase}
- Responder a cualquier pregunta que pueda tener

¿Le vendría bien una reunión de 30 minutos el próximo martes o jueves? Alternativamente, por favor sugiérame un horario que se adapte mejor a su agenda.

Quedo a la espera de su respuesta.

Saludos cordiales,
[Su Nombre]
[Su Cargo]`;
        break;
        
      default:
        content = `Estimado/a ${lead.fullName},

Espero que este mensaje le encuentre bien. Mi nombre es [Su Nombre] de [Su Empresa], y me pongo en contacto con usted${context ? ` en relación a ${context}` : ''}.

Ayudamos a empresas como${companyPhrase} a [beneficio principal de su producto/servicio]. Nuestros clientes han experimentado [resultado específico y cuantificable] después de implementar nuestras soluciones.

Me encantaría programar una breve llamada para discutir cómo podríamos colaborar. ¿Tendría disponibilidad para conversar esta semana?

Saludos cordiales,
[Su Nombre]
[Su Cargo]`;
    }
    
    return { content };
  }

  /**
   * Chat with the Gemini AI assistant about CRM-related topics
   * @param message The user's message
   * @param history Previous chat history
   */
  async chat(message: string, history: ChatHistory[] = []) {
    try {
      const apiKey = apiKeyManager.getGeminiKey();
      
      // Si no hay clave API disponible o estamos en modo de desarrollo, usar simulación
      if (!apiKey || process.env.NODE_ENV === 'development') {
        console.log("Usando respuesta simulada para chat con Gemini debido a limitaciones de la API");
        // Devolver una respuesta simulada
        return this.getSimulatedChatResponse(message);
      }
      
      const model = await this.getModel(0.7);
      const chat = model.startChat({
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1024,
        },
      });
      
      const systemPrompt = `
You are a helpful CRM Assistant specializing in helping sales and marketing teams manage customer relationships. 
You can provide advice on:
- Lead management and qualification
- Sales strategies
- Customer engagement tactics
- Analyzing customer data
- Creating follow-up plans
- Drafting personalized messages

Always be professional, concise, and practical in your responses.
`;

      // Add system prompt if this is the first message
      if (history.length === 0) {
        await chat.sendMessage(systemPrompt);
      }
      
      const result = await chat.sendMessage(message);
      const response = result.response;
      
      return {
        role: "assistant" as const,
        content: response.text(),
      };
    } catch (error) {
      console.error("Error calling Gemini API for chat:", error);
      // Si hay un error (como límite de cuota), usar respuesta simulada
      return this.getSimulatedChatResponse(message);
    }
  }
  
  /**
   * Genera una respuesta simulada para el chat cuando no se puede acceder a la API de Gemini
   * @param message El mensaje del usuario
   */
  private getSimulatedChatResponse(message: string) {
    // Respuestas predefinidas para preguntas comunes
    const lowerMessage = message.toLowerCase();
    let response = '';
    
    if (lowerMessage.includes('qué puedes hacer') || lowerMessage.includes('cómo me ayudas')) {
      response = `Como asistente de CRM, puedo ayudarte en varias tareas relacionadas con la gestión de clientes:
1. Analizar leads para identificar su potencial y prioridades
2. Generar mensajes personalizados para seguimiento
3. Sugerir acciones basadas en el historial del cliente
4. Ayudar con la calificación de oportunidades
5. Proporcionar información sobre estrategias de ventas
6. Automatizar tareas de seguimiento

¿En qué área específica necesitas ayuda hoy?`;
    } else if (lowerMessage.includes('lead') || lowerMessage.includes('cliente potencial')) {
      response = `La gestión efectiva de leads es fundamental para el éxito de ventas. Algunas prácticas recomendadas incluyen:
- Responder rápidamente a nuevas consultas (idealmente en menos de 5 minutos)
- Personalizar cada comunicación con información relevante
- Establecer un proceso claro de seguimiento con recordatorios
- Calificar leads según criterios como presupuesto, autoridad, necesidad y tiempo
- Usar automatización para tareas repetitivas

Desde el CRM puedes ver todos tus leads, filtrarlos por estado, y acceder a su historial completo de interacciones.`;
    } else if (lowerMessage.includes('mensaje') || lowerMessage.includes('correo') || lowerMessage.includes('email')) {
      response = `Para crear mensajes efectivos que aumenten el engagement:
1. Personaliza el asunto y la introducción
2. Enfócate en beneficios, no características
3. Incluye una clara llamada a la acción
4. Mantén el mensaje conciso y enfocado
5. Adapta el tono según la etapa del embudo de ventas

Desde el CRM puedes generar automáticamente plantillas personalizadas y programar envíos en el momento óptimo.`;
    } else if (lowerMessage.includes('análisis') || lowerMessage.includes('datos') || lowerMessage.includes('estadísticas')) {
      response = `El análisis de datos en el CRM te permite:
- Identificar tendencias en el comportamiento de clientes
- Calcular tasas de conversión por canal y campaña
- Medir la efectividad de diferentes estrategias de venta
- Predecir oportunidades de venta cruzada o adicional
- Optimizar el proceso de ventas basándote en datos reales

Los dashboards del CRM ofrecen visualizaciones en tiempo real de tus KPIs más importantes.`;
    } else {
      response = `Gracias por tu pregunta. Como asistente de CRM, estoy aquí para ayudarte con la gestión de relaciones con clientes, estrategias de ventas, y optimización de procesos de negocio. 

Puedo asistirte con análisis de leads, generación de contenido personalizado, sugerencias de seguimiento, y muchas otras tareas. ¿Hay algo específico en lo que necesites ayuda relacionado con la gestión de clientes o ventas?`;
    }
    
    return {
      role: "assistant" as const,
      content: response,
    };
  }
  
  /**
   * Generate AI suggestions for the next best action based on lead data
   * @param lead The lead to analyze
   */
  async suggestNextAction(lead: Lead) {
    try {
      const apiKey = apiKeyManager.getGeminiKey();
      
      // Si no hay clave API disponible o estamos en modo de desarrollo, usar simulación
      if (!apiKey || process.env.NODE_ENV === 'development') {
        console.log("Usando respuesta simulada para sugerencia de acción debido a limitaciones de la API");
        return this.getSimulatedNextAction(lead);
      }
      
      const model = await this.getModel(0.4);
      
      const prompt = `
You are a CRM Assistant specializing in sales strategy. Based on the following lead information, suggest the best next action to take:

Lead Information:
- Name: ${lead.fullName}
- Email: ${lead.email}
- Company: ${lead.company || 'Unknown'}
- Position: ${lead.position || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Status: ${lead.status || 'New'}
- Last Contact: ${lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : 'Never'}
- Notes: ${lead.notes || 'None'}

Provide your response in valid JSON format with the following structure:
{
  "recommendedAction": string,
  "actionType": "call" | "email" | "meeting" | "task",
  "priority": "high" | "medium" | "low",
  "reasoning": string,
  "suggestedSchedule": string,
  "talkingPoints": string[]
}
`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      try {
        // Extract the JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : '{}';
        return JSON.parse(jsonString);
      } catch (error) {
        console.error("Error parsing JSON from Gemini response:", error);
        return this.getSimulatedNextAction(lead);
      }
    } catch (error) {
      console.error("Error calling Gemini API for next action suggestion:", error);
      return this.getSimulatedNextAction(lead);
    }
  }
  
  /**
   * Genera una sugerencia simulada para la próxima acción basada en datos del lead
   * @param lead El lead para el que generar la sugerencia
   */
  private getSimulatedNextAction(lead: Lead) {
    // Determinar acciones basadas en el estado del lead
    const status = (lead.status || '').toLowerCase();
    const position = (lead.position || '').toLowerCase();
    const companyName = lead.company || 'su empresa';
    
    // Determinar prioridad basada en información disponible
    let priority = "medium";
    if (position.includes('ceo') || position.includes('director') || position.includes('gerente')) {
      priority = "high"; // Contactos con poder de decisión tienen mayor prioridad
    }
    
    // Sugerir acción según el estado del lead
    if (status === 'new' || status === '') {
      return {
        recommendedAction: "Establecer contacto inicial",
        actionType: "email",
        priority: "high",
        reasoning: "Es un lead nuevo que requiere calificación inmediata",
        suggestedSchedule: "En las próximas 24 horas",
        talkingPoints: [
          `Presentar brevemente los servicios relevantes para ${companyName}`,
          "Preguntar sobre sus necesidades actuales y desafíos",
          "Explicar cómo podemos resolver problemas específicos del sector",
          "Solicitar una llamada inicial de descubrimiento"
        ]
      };
    } else if (status === 'contacted') {
      return {
        recommendedAction: "Seguimiento post-contacto inicial",
        actionType: "call",
        priority,
        reasoning: "Ya se ha establecido contacto inicial, es importante mantener el impulso",
        suggestedSchedule: "En los próximos 2-3 días",
        talkingPoints: [
          "Confirmar recepción del correo/información enviada",
          "Resolver cualquier duda inicial",
          "Profundizar en necesidades específicas",
          "Ofrecer una demostración personalizada del producto"
        ]
      };
    } else if (status === 'qualified' || status === 'interested') {
      return {
        recommendedAction: "Programar demostración de producto",
        actionType: "meeting",
        priority,
        reasoning: "El lead ha mostrado interés y está calificado para avanzar en el embudo de ventas",
        suggestedSchedule: "En la próxima semana",
        talkingPoints: [
          "Configurar demo específica para necesidades identificadas",
          "Incluir casos de éxito relevantes para su industria",
          "Preparar respuestas a posibles objeciones",
          "Tener lista una propuesta preliminar para enviar después de la reunión"
        ]
      };
    } else if (status === 'negotiation' || status === 'proposal') {
      return {
        recommendedAction: "Seguimiento de propuesta enviada",
        actionType: "call",
        priority: "high",
        reasoning: "El lead está en fase avanzada y cerca de la decisión final",
        suggestedSchedule: "En las próximas 48 horas",
        talkingPoints: [
          "Verificar recepción y revisión de la propuesta",
          "Resolver cualquier duda sobre términos, condiciones o implementación",
          "Ofrecer incentivos para cierre inmediato si es apropiado",
          "Establecer un calendario tentativo de implementación"
        ]
      };
    } else if (status === 'closed-won') {
      return {
        recommendedAction: "Reunión de inicio de implementación",
        actionType: "meeting",
        priority: "medium",
        reasoning: "Es importante asegurar una correcta implementación e inicio de la relación comercial",
        suggestedSchedule: "En la próxima semana",
        talkingPoints: [
          "Presentar al equipo de implementación/soporte",
          "Revisar cronograma de implementación",
          "Establecer expectativas y KPIs",
          "Discutir oportunidades de expansión futura"
        ]
      };
    } else if (status === 'closed-lost') {
      return {
        recommendedAction: "Reevaluación después de periodo de espera",
        actionType: "email",
        priority: "low",
        reasoning: "Mantener la relación para futura reconsideración",
        suggestedSchedule: "En 2-3 meses",
        talkingPoints: [
          "Compartir novedades relevantes del producto/servicio",
          "Mencionar nuevos casos de éxito en su industria",
          "Preguntar si han cambiado las circunstancias que llevaron a la decisión negativa",
          "Ofrecer una nueva evaluación sin compromiso"
        ]
      };
    } else {
      // Default para estados no reconocidos
      return {
        recommendedAction: "Verificar estado actual e interés",
        actionType: "email",
        priority: "medium",
        reasoning: "Es necesario actualizar la información y estado del lead",
        suggestedSchedule: "En la próxima semana",
        talkingPoints: [
          "Recordar brevemente la propuesta de valor",
          "Preguntar por cambios en sus necesidades o situación",
          "Ofrecer información actualizada sobre productos/servicios",
          "Sugerir una breve llamada de seguimiento"
        ]
      };
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService();