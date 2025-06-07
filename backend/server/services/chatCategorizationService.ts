import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatCategory {
  category: 'ventas' | 'soporte' | 'informacion' | 'consulta';
  confidence: number;
  reason: string;
}

export class ChatCategorizationService {
  private static instance: ChatCategorizationService;

  static getInstance(): ChatCategorizationService {
    if (!ChatCategorizationService.instance) {
      ChatCategorizationService.instance = new ChatCategorizationService();
    }
    return ChatCategorizationService.instance;
  }

  async categorizeChat(messages: string[], contactName: string): Promise<ChatCategory> {
    try {
      console.log('🏷️ Categorizando chat automáticamente...');
      
      // Combinar los últimos 5 mensajes para análisis
      const recentMessages = messages.slice(-5).join('\n');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Eres un experto en categorización de conversaciones de WhatsApp para empresas. 
            Analiza la conversación y clasifícala en una de estas categorías:
            - "ventas": Cliente interesado en comprar, solicita precios, productos, cotizaciones
            - "soporte": Cliente con problemas técnicos, quejas, devoluciones, garantías
            - "informacion": Cliente pregunta por información general, horarios, ubicación, servicios
            - "consulta": Consultas generales, dudas básicas, primeros contactos
            
            Responde SOLO en formato JSON: {"category": "categoria", "confidence": 0.85, "reason": "breve explicación"}`
          },
          {
            role: "user",
            content: `Contacto: ${contactName}\nMensajes recientes:\n${recentMessages}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log(`✅ Chat categorizado como: ${result.category} (${result.confidence})`);
      
      return {
        category: result.category || 'consulta',
        confidence: result.confidence || 0.5,
        reason: result.reason || 'Categorización automática'
      };
      
    } catch (error) {
      console.error('❌ Error categorizando chat:', error);
      // Fallback a categorización básica por palabras clave
      return this.fallbackCategorization(messages);
    }
  }

  private fallbackCategorization(messages: string[]): ChatCategory {
    const text = messages.join(' ').toLowerCase();
    
    // Palabras clave para ventas
    const ventasKeywords = ['precio', 'costo', 'comprar', 'cotización', 'vender', 'producto', 'oferta', 'descuento'];
    
    // Palabras clave para soporte
    const soporteKeywords = ['problema', 'error', 'ayuda', 'no funciona', 'reclamo', 'queja', 'garantía', 'devolver'];
    
    // Palabras clave para información
    const infoKeywords = ['horario', 'ubicación', 'dirección', 'contacto', 'información', 'servicio'];
    
    let ventasScore = 0;
    let soporteScore = 0;
    let infoScore = 0;
    
    ventasKeywords.forEach(keyword => {
      if (text.includes(keyword)) ventasScore++;
    });
    
    soporteKeywords.forEach(keyword => {
      if (text.includes(keyword)) soporteScore++;
    });
    
    infoKeywords.forEach(keyword => {
      if (text.includes(keyword)) infoScore++;
    });
    
    if (ventasScore > soporteScore && ventasScore > infoScore) {
      return { category: 'ventas', confidence: 0.7, reason: 'Palabras clave de ventas detectadas' };
    } else if (soporteScore > infoScore) {
      return { category: 'soporte', confidence: 0.7, reason: 'Palabras clave de soporte detectadas' };
    } else if (infoScore > 0) {
      return { category: 'informacion', confidence: 0.6, reason: 'Palabras clave de información detectadas' };
    }
    
    return { category: 'consulta', confidence: 0.5, reason: 'Categorización por defecto' };
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'ventas': return 'bg-green-100 text-green-800';
      case 'soporte': return 'bg-red-100 text-red-800';
      case 'informacion': return 'bg-blue-100 text-blue-800';
      case 'consulta': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'ventas': return '💰';
      case 'soporte': return '🔧';
      case 'informacion': return 'ℹ️';
      case 'consulta': return '💬';
      default: return '💬';
    }
  }
}

export const chatCategorizationService = ChatCategorizationService.getInstance();