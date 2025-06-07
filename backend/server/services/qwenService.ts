/**
 * Qwen3 AI Service Integration
 * Based on ModelScope API: https://modelscope.cn/models/Qwen/Qwen3-32B
 */
import axios from 'axios';

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenResponse {
  output: {
    text: string;
    finish_reason: string;
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class QwenService {
  private apiKey: string;
  private baseUrl: string = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: QwenMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    } = {}
  ): Promise<string> {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: 'qwen-max',
          input: {
            messages: messages
          },
          parameters: {
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 1500,
            top_p: options.top_p || 0.8,
            result_format: 'message'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable'
          },
          timeout: 30000
        }
      );

      if (response.data?.output?.text) {
        return response.data.output.text;
      } else {
        throw new Error('Invalid response format from Qwen API');
      }
    } catch (error: any) {
      console.error('Qwen API Error:', error.response?.data || error.message);
      throw new Error(`Qwen AI service error: ${error.response?.data?.message || error.message}`);
    }
  }

  async processWhatsAppMessage(
    messageText: string,
    conversationHistory: { role: string; content: string }[] = [],
    context: {
      customerName?: string;
      businessName?: string;
      customPrompt?: string;
    } = {}
  ): Promise<string> {
    const systemPrompt = context.customPrompt || `Eres un asistente de atención al cliente profesional y amigable para ${context.businessName || 'nuestra empresa'}. 
    
Instrucciones:
- Responde de manera cordial y profesional
- Proporciona información útil y precisa
- Si no tienes información específica, ofrece alternativas de ayuda
- Mantén un tono conversacional apropiado para WhatsApp
- Responde en español de manera natural y clara`;

    const messages: QwenMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: messageText }
    ];

    return await this.generateResponse(messages);
  }

  static async testConnection(apiKey: string): Promise<boolean> {
    try {
      const service = new QwenService(apiKey);
      await service.generateResponse([
        { role: 'user', content: 'Test connection' }
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }
}