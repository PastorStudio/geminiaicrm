/**
 * Servicio de Inteligencia Nativa
 * Sistema de análisis y gestión inteligente sin dependencias externas
 * Reemplaza MiniMax con lógica propia optimizada para el CRM WhatsApp
 */

export interface ConversationAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: string;
  leadQuality: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  suggestedActions: string[];
  category: string;
  confidence: number;
  keywords: string[];
  urgencyScore: number;
  commercialPotential: number;
}

export interface LeadGenerationResult {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source: string;
  status: string;
  priority: string;
  notes: string;
  confidence: number;
  estimatedValue: number;
  followUpDate: Date;
}

export interface AutoResponseSuggestion {
  response: string;
  confidence: number;
  tone: 'formal' | 'friendly' | 'professional' | 'casual';
  followUpRequired: boolean;
  escalationNeeded: boolean;
}

export class NativeIntelligenceService {
  private keywordPatterns = {
    // Intenciones comerciales
    buying: ['comprar', 'precio', 'costo', 'cotización', 'presupuesto', 'adquirir', 'contratar'],
    information: ['información', 'detalles', 'características', 'especificaciones', 'conocer más'],
    support: ['ayuda', 'problema', 'error', 'soporte', 'asistencia', 'falla', 'funciona mal'],
    complaint: ['queja', 'reclamo', 'molesto', 'insatisfecho', 'malo', 'terrible', 'horrible'],
    urgent: ['urgente', 'inmediato', 'ahora', 'ya', 'rápido', 'pronto', 'emergencia'],
    
    // Sentimientos
    positive: ['excelente', 'genial', 'perfecto', 'gracias', 'bueno', 'bien', 'feliz', 'contento'],
    negative: ['malo', 'terrible', 'horrible', 'molesto', 'enojado', 'frustrado', 'decepcionado'],
    
    // Categorías de negocio
    sales: ['vender', 'oferta', 'descuento', 'promoción', 'producto', 'servicio'],
    technical: ['técnico', 'configuración', 'instalación', 'funcionalidad', 'integración'],
    billing: ['factura', 'pago', 'cobro', 'cuenta', 'saldo', 'dinero', 'costo']
  };

  private responseTemplates = {
    greeting: [
      'Hola {name}, gracias por contactarnos. ¿En qué podemos ayudarte hoy?',
      'Buenos días {name}, un gusto saludarte. ¿Cómo podemos asistirte?',
      'Hola {name}, esperamos que tengas un excelente día. ¿En qué te podemos apoyar?'
    ],
    information: [
      'Te comparto la información que solicitas sobre {topic}. Si necesitas más detalles, no dudes en preguntar.',
      'Aquí tienes los detalles sobre {topic}. ¿Hay algo específico que te gustaría saber?',
      'Con gusto te proporciono información sobre {topic}. ¿Te resulta útil esta información?'
    ],
    pricing: [
      'Te envío la información de precios. Tenemos varias opciones que pueden adaptarse a tus necesidades.',
      'Aquí tienes nuestros precios actuales. Podemos personalizar una propuesta según tus requerimientos.',
      'Te comparto nuestras tarifas. Si tienes un presupuesto específico, podemos buscar la mejor opción.'
    ],
    support: [
      'Entiendo tu situación. Te voy a ayudar a resolver esto paso a paso.',
      'Lamento que tengas este inconveniente. Vamos a solucionarlo juntos.',
      'Gracias por reportar esto. Te guío para resolver el problema rápidamente.'
    ],
    followUp: [
      '¿Te fue útil la información proporcionada? ¿Hay algo más en lo que pueda ayudarte?',
      '¿Necesitas alguna aclaración adicional sobre lo que hemos conversado?',
      'Quedo pendiente si tienes más preguntas. ¡Estoy aquí para ayudarte!'
    ]
  };

  /**
   * Analiza una conversación completa y extrae insights
   */
  analyzeConversation(messages: any[]): ConversationAnalysis {
    const fullText = messages.map(msg => msg.content || msg.body || '').join(' ').toLowerCase();
    const messageCount = messages.length;
    const avgMessageLength = fullText.length / messageCount;

    // Análisis de sentimiento
    const sentiment = this.analyzeSentiment(fullText);
    
    // Análisis de intención
    const intent = this.analyzeIntent(fullText);
    
    // Análisis de categoría
    const category = this.analyzeCategory(fullText);
    
    // Calidad del lead
    const leadQuality = this.assessLeadQuality(fullText, messageCount, avgMessageLength);
    
    // Prioridad
    const priority = this.assessPriority(fullText, sentiment, intent);
    
    // Puntuación de urgencia
    const urgencyScore = this.calculateUrgencyScore(fullText, intent);
    
    // Potencial comercial
    const commercialPotential = this.assessCommercialPotential(fullText, leadQuality);
    
    // Palabras clave extraídas
    const keywords = this.extractKeywords(fullText);
    
    // Acciones sugeridas
    const suggestedActions = this.generateSuggestedActions(intent, sentiment, priority);
    
    // Confianza basada en múltiples factores
    const confidence = this.calculateConfidence(messageCount, avgMessageLength, keywords.length);

    return {
      sentiment,
      intent,
      leadQuality,
      priority,
      suggestedActions,
      category,
      confidence,
      keywords,
      urgencyScore,
      commercialPotential
    };
  }

  /**
   * Genera un lead basado en la conversación
   */
  generateLeadFromConversation(messages: any[], contactInfo: any): LeadGenerationResult {
    const analysis = this.analyzeConversation(messages);
    const fullText = messages.map(msg => msg.content || msg.body || '').join(' ');

    // Extraer información del contacto
    const name = contactInfo.name || this.extractNameFromConversation(fullText) || 'Prospecto';
    const phone = contactInfo.phone || contactInfo.number || '';
    const email = contactInfo.email || this.extractEmailFromConversation(fullText);
    const company = contactInfo.company || this.extractCompanyFromConversation(fullText);

    // Determinar estado del lead
    const status = this.determineLeadStatus(analysis);
    
    // Calcular valor estimado
    const estimatedValue = this.estimateLeadValue(analysis, fullText);
    
    // Fecha de seguimiento
    const followUpDate = this.calculateFollowUpDate(analysis.priority);

    // Generar notas inteligentes
    const notes = this.generateLeadNotes(analysis, fullText);

    return {
      name,
      phone,
      email,
      company,
      source: 'whatsapp',
      status,
      priority: analysis.priority,
      notes,
      confidence: analysis.confidence,
      estimatedValue,
      followUpDate
    };
  }

  /**
   * Genera respuesta automática inteligente
   */
  generateAutoResponse(messages: any[], context: any): AutoResponseSuggestion {
    const analysis = this.analyzeConversation(messages);
    const lastMessage = messages[messages.length - 1];
    const messageText = (lastMessage?.content || lastMessage?.body || '').toLowerCase();

    // Seleccionar template apropiado
    let template = '';
    let tone: 'formal' | 'friendly' | 'professional' | 'casual' = 'friendly';

    if (analysis.intent.includes('saludo') || messages.length <= 1) {
      template = this.getRandomTemplate('greeting');
    } else if (analysis.intent.includes('información')) {
      template = this.getRandomTemplate('information');
      tone = 'professional';
    } else if (analysis.intent.includes('precio')) {
      template = this.getRandomTemplate('pricing');
      tone = 'professional';
    } else if (analysis.intent.includes('soporte')) {
      template = this.getRandomTemplate('support');
      tone = 'formal';
    } else {
      template = this.getRandomTemplate('followUp');
    }

    // Personalizar respuesta
    const response = this.personalizeResponse(template, context, analysis);

    return {
      response,
      confidence: analysis.confidence,
      tone,
      followUpRequired: analysis.priority === 'high' || analysis.priority === 'urgent',
      escalationNeeded: analysis.sentiment === 'negative' && analysis.urgencyScore > 0.7
    };
  }

  /**
   * Categoriza un ticket basado en la conversación
   */
  categorizeTicket(messages: any[]): { category: string; priority: string; description: string } {
    const analysis = this.analyzeConversation(messages);
    const fullText = messages.map(msg => msg.content || msg.body || '').join(' ');

    let category = analysis.category;
    let priority = analysis.priority;
    
    // Descripción inteligente del ticket
    const description = this.generateTicketDescription(analysis, fullText);

    return { category, priority, description };
  }

  // Métodos privados de análisis

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveCount = this.countMatches(text, this.keywordPatterns.positive);
    const negativeCount = this.countMatches(text, this.keywordPatterns.negative);
    
    if (positiveCount > negativeCount && positiveCount > 0) return 'positive';
    if (negativeCount > positiveCount && negativeCount > 0) return 'negative';
    return 'neutral';
  }

  private analyzeIntent(text: string): string {
    const intents = [];
    
    if (this.countMatches(text, this.keywordPatterns.buying) > 0) intents.push('compra');
    if (this.countMatches(text, this.keywordPatterns.information) > 0) intents.push('información');
    if (this.countMatches(text, this.keywordPatterns.support) > 0) intents.push('soporte');
    if (this.countMatches(text, this.keywordPatterns.complaint) > 0) intents.push('reclamo');
    if (text.includes('hola') || text.includes('buenos días') || text.includes('buenas tardes')) intents.push('saludo');
    
    return intents.length > 0 ? intents.join(', ') : 'consulta general';
  }

  private analyzeCategory(text: string): string {
    if (this.countMatches(text, this.keywordPatterns.sales) > 0) return 'ventas';
    if (this.countMatches(text, this.keywordPatterns.technical) > 0) return 'técnico';
    if (this.countMatches(text, this.keywordPatterns.billing) > 0) return 'facturación';
    if (this.countMatches(text, this.keywordPatterns.support) > 0) return 'soporte';
    return 'general';
  }

  private assessLeadQuality(text: string, messageCount: number, avgLength: number): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Factores que aumentan la calidad
    if (this.countMatches(text, this.keywordPatterns.buying) > 0) score += 3;
    if (messageCount > 3) score += 2;
    if (avgLength > 50) score += 1;
    if (text.includes('presupuesto') || text.includes('cotización')) score += 2;
    if (text.includes('@') || text.includes('empresa') || text.includes('compañía')) score += 1;
    
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private assessPriority(text: string, sentiment: string, intent: string): 'urgent' | 'high' | 'medium' | 'low' {
    if (this.countMatches(text, this.keywordPatterns.urgent) > 0) return 'urgent';
    if (sentiment === 'negative' && intent.includes('reclamo')) return 'high';
    if (intent.includes('compra') || intent.includes('soporte')) return 'high';
    if (intent.includes('información')) return 'medium';
    return 'low';
  }

  private calculateUrgencyScore(text: string, intent: string): number {
    let score = 0;
    
    score += this.countMatches(text, this.keywordPatterns.urgent) * 0.3;
    if (intent.includes('reclamo')) score += 0.4;
    if (intent.includes('soporte')) score += 0.2;
    
    return Math.min(score, 1);
  }

  private assessCommercialPotential(text: string, leadQuality: string): number {
    let potential = 0;
    
    if (leadQuality === 'high') potential += 0.5;
    if (leadQuality === 'medium') potential += 0.3;
    
    potential += this.countMatches(text, this.keywordPatterns.buying) * 0.2;
    
    return Math.min(potential, 1);
  }

  private extractKeywords(text: string): string[] {
    const words = text.split(/\s+/).filter(word => word.length > 3);
    const allPatterns = Object.values(this.keywordPatterns).flat();
    
    return words.filter(word => 
      allPatterns.some(pattern => word.includes(pattern) || pattern.includes(word))
    ).slice(0, 10);
  }

  private generateSuggestedActions(intent: string, sentiment: string, priority: string): string[] {
    const actions = [];
    
    if (intent.includes('compra')) {
      actions.push('Enviar cotización personalizada');
      actions.push('Programar llamada de seguimiento');
    }
    
    if (intent.includes('soporte')) {
      actions.push('Escalar a equipo técnico');
      actions.push('Crear ticket de soporte');
    }
    
    if (sentiment === 'negative') {
      actions.push('Atención prioritaria requerida');
      actions.push('Contacto directo con supervisor');
    }
    
    if (priority === 'urgent') {
      actions.push('Respuesta inmediata necesaria');
    }
    
    return actions.length > 0 ? actions : ['Seguimiento general requerido'];
  }

  private calculateConfidence(messageCount: number, avgLength: number, keywordCount: number): number {
    let confidence = 0.3; // Base confidence
    
    if (messageCount > 1) confidence += 0.2;
    if (avgLength > 20) confidence += 0.2;
    if (keywordCount > 0) confidence += 0.3;
    
    return Math.min(confidence, 1);
  }

  private extractNameFromConversation(text: string): string | null {
    // Buscar patrones de presentación
    const namePatterns = [
      /me llamo ([a-záéíóúñ]+)/i,
      /soy ([a-záéíóúñ]+)/i,
      /mi nombre es ([a-záéíóúñ\s]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return null;
  }

  private extractEmailFromConversation(text: string): string | undefined {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : undefined;
  }

  private extractCompanyFromConversation(text: string): string | undefined {
    const companyPatterns = [
      /trabajo en ([a-záéíóúñ\s]+)/i,
      /empresa ([a-záéíóúñ\s]+)/i,
      /compañía ([a-záéíóúñ\s]+)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return undefined;
  }

  private determineLeadStatus(analysis: ConversationAnalysis): string {
    if (analysis.leadQuality === 'high' && analysis.intent.includes('compra')) return 'qualified';
    if (analysis.intent.includes('información')) return 'contacted';
    return 'new';
  }

  private estimateLeadValue(analysis: ConversationAnalysis, text: string): number {
    let value = 1000; // Base value
    
    if (analysis.leadQuality === 'high') value *= 3;
    if (analysis.leadQuality === 'medium') value *= 2;
    
    if (text.includes('empresa') || text.includes('compañía')) value *= 2;
    if (analysis.commercialPotential > 0.7) value *= 1.5;
    
    return Math.floor(value);
  }

  private calculateFollowUpDate(priority: string): Date {
    const now = new Date();
    const days = {
      'urgent': 1,
      'high': 2,
      'medium': 5,
      'low': 7
    };
    
    now.setDate(now.getDate() + (days[priority as keyof typeof days] || 7));
    return now;
  }

  private generateLeadNotes(analysis: ConversationAnalysis, text: string): string {
    const notes = [];
    
    notes.push(`Análisis automático: ${analysis.intent}`);
    notes.push(`Sentimiento: ${analysis.sentiment}`);
    notes.push(`Prioridad: ${analysis.priority}`);
    
    if (analysis.keywords.length > 0) {
      notes.push(`Palabras clave: ${analysis.keywords.slice(0, 5).join(', ')}`);
    }
    
    if (analysis.suggestedActions.length > 0) {
      notes.push(`Acciones sugeridas: ${analysis.suggestedActions[0]}`);
    }
    
    return notes.join('\n');
  }

  private getRandomTemplate(type: keyof typeof this.responseTemplates): string {
    const templates = this.responseTemplates[type];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private personalizeResponse(template: string, context: any, analysis: ConversationAnalysis): string {
    let response = template;
    
    // Reemplazar variables
    response = response.replace('{name}', context.agentName || 'cliente');
    response = response.replace('{topic}', analysis.keywords[0] || 'tu consulta');
    
    return response;
  }

  private generateTicketDescription(analysis: ConversationAnalysis, text: string): string {
    const description = `Ticket generado automáticamente.
Categoría: ${analysis.category}
Intención: ${analysis.intent}
Sentimiento: ${analysis.sentiment}
Nivel de urgencia: ${analysis.urgencyScore.toFixed(2)}

Resumen de la conversación:
${text.substring(0, 200)}${text.length > 200 ? '...' : ''}

Acciones recomendadas:
${analysis.suggestedActions.join('\n')}`;
    
    return description;
  }

  private countMatches(text: string, patterns: string[]): number {
    return patterns.reduce((count, pattern) => {
      return count + (text.includes(pattern) ? 1 : 0);
    }, 0);
  }
}

// Instancia singleton
export const nativeIntelligence = new NativeIntelligenceService();