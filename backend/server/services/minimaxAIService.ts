/**
 * Servicio de IA MiniMax para análisis de conversaciones y gestión inteligente
 * Reemplaza las funciones de Gemini con la API de MiniMax
 */

interface MiniMaxResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface ConversationAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: string;
  leadQuality: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  suggestedActions: string[];
  category: string;
  confidence: number;
}

interface LeadGenerationResult {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source: string;
  status: string;
  priority: string;
  notes: string;
  confidence: number;
}

export class MiniMaxAIService {
  private baseUrl = 'https://api.minimax.chat/v1';
  private apiKey: string | null = null;

  constructor() {
    // La clave API se configurará dinámicamente
    this.apiKey = process.env.MINIMAX_API_KEY || null;
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    this.apiKey = apiKey;
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'abab6.5s-chat',
          messages: [
            {
              role: 'user',
              content: 'Test connection'
            }
          ],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing MiniMax connection:', error);
      return false;
    }
  }

  async analyzeConversation(messages: any[]): Promise<ConversationAnalysis> {
    if (!this.apiKey) {
      throw new Error('MiniMax API key no configurada');
    }

    try {
      const conversationText = messages.map(msg => 
        `${msg.sender || 'Usuario'}: ${msg.content || msg.body || ''}`
      ).join('\n');

      const prompt = `
Analiza la siguiente conversación de WhatsApp y proporciona un análisis estructurado en formato JSON:

Conversación:
${conversationText}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "sentiment": "positive|negative|neutral",
  "intent": "descripción de la intención del cliente",
  "leadQuality": "high|medium|low",
  "priority": "urgent|high|medium|low", 
  "suggestedActions": ["acción1", "acción2"],
  "category": "ventas|soporte|consulta|reclamo",
  "confidence": 0.85
}
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'abab6.5s-chat',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto analista de conversaciones de atención al cliente. Responde siempre en formato JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`MiniMax API error: ${response.status}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);
      
      return {
        sentiment: analysis.sentiment || 'neutral',
        intent: analysis.intent || 'Sin determinar',
        leadQuality: analysis.leadQuality || 'medium',
        priority: analysis.priority || 'medium',
        suggestedActions: analysis.suggestedActions || [],
        category: analysis.category || 'consulta',
        confidence: analysis.confidence || 0.5
      };

    } catch (error) {
      console.error('Error analyzing conversation with MiniMax:', error);
      // Retornar análisis por defecto en caso de error
      return {
        sentiment: 'neutral',
        intent: 'Análisis no disponible',
        leadQuality: 'medium',
        priority: 'medium',
        suggestedActions: ['Seguimiento manual requerido'],
        category: 'consulta',
        confidence: 0.1
      };
    }
  }

  async generateLeadFromConversation(messages: any[], contactInfo: any): Promise<LeadGenerationResult> {
    if (!this.apiKey) {
      throw new Error('MiniMax API key no configurada');
    }

    try {
      const conversationText = messages.map(msg => 
        `${msg.sender || 'Usuario'}: ${msg.content || msg.body || ''}`
      ).join('\n');

      const prompt = `
Basándote en esta conversación de WhatsApp, genera un lead estructurado en formato JSON:

Información del contacto:
- Teléfono: ${contactInfo.phone || 'No disponible'}
- Nombre: ${contactInfo.name || 'No disponible'}

Conversación:
${conversationText}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "name": "nombre extraído o estimado",
  "phone": "número de teléfono",
  "email": "email si se menciona",
  "company": "empresa si se menciona",
  "source": "whatsapp",
  "status": "new|interested|qualified",
  "priority": "high|medium|low",
  "notes": "resumen de la conversación y necesidades",
  "confidence": 0.85
}
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'abab6.5s-chat',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en calificación de leads y análisis de conversaciones comerciales. Responde siempre en formato JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 400,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`MiniMax API error: ${response.status}`);
      }

      const result = await response.json();
      const leadData = JSON.parse(result.choices[0].message.content);
      
      return {
        name: leadData.name || contactInfo.name || 'Cliente WhatsApp',
        phone: contactInfo.phone || leadData.phone || '',
        email: leadData.email || '',
        company: leadData.company || '',
        source: 'whatsapp',
        status: leadData.status || 'new',
        priority: leadData.priority || 'medium',
        notes: leadData.notes || 'Lead generado automáticamente desde WhatsApp',
        confidence: leadData.confidence || 0.5
      };

    } catch (error) {
      console.error('Error generating lead with MiniMax:', error);
      // Retornar lead básico en caso de error
      return {
        name: contactInfo.name || 'Cliente WhatsApp',
        phone: contactInfo.phone || '',
        email: '',
        company: '',
        source: 'whatsapp',
        status: 'new',
        priority: 'medium',
        notes: 'Lead generado automáticamente - Análisis manual requerido',
        confidence: 0.1
      };
    }
  }

  async generateAutoResponse(conversation: any[], context: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error('MiniMax API key no configurada');
    }

    try {
      const conversationText = conversation.map(msg => 
        `${msg.sender || 'Usuario'}: ${msg.content || msg.body || ''}`
      ).join('\n');

      const prompt = `
Eres un asistente de atención al cliente profesional. Genera una respuesta apropiada en español para esta conversación de WhatsApp:

Contexto: ${context.agentName || 'Asistente Virtual'}
Empresa: ${context.company || 'Nuestra empresa'}

Conversación:
${conversationText}

Genera una respuesta profesional, útil y en español. La respuesta debe ser:
- Cordial y profesional
- Específica al contexto de la conversación
- En español
- Máximo 200 palabras
- Sin formato markdown

Respuesta:`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'abab6.5s-chat',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente de atención al cliente experto. Siempre respondes en español de manera profesional y útil.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`MiniMax API error: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating auto response with MiniMax:', error);
      return 'Gracias por contactarnos. Un agente se pondrá en contacto contigo pronto.';
    }
  }

  async categorizeTicket(conversation: any[]): Promise<{category: string, priority: string, description: string}> {
    if (!this.apiKey) {
      return {
        category: 'general',
        priority: 'medium',
        description: 'Ticket generado automáticamente'
      };
    }

    try {
      const analysis = await this.analyzeConversation(conversation);
      
      return {
        category: analysis.category,
        priority: analysis.priority,
        description: analysis.intent
      };
    } catch (error) {
      console.error('Error categorizing ticket:', error);
      return {
        category: 'general',
        priority: 'medium',
        description: 'Ticket generado automáticamente - Categorización manual requerida'
      };
    }
  }
}

// Instancia singleton del servicio
export const miniMaxAI = new MiniMaxAIService();