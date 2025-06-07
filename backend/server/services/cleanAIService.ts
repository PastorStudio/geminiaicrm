import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  response: string;
  provider: 'gemini' | 'openai';
  success: boolean;
  error?: string;
}

export class CleanAIService {
  private geminiClient: GoogleGenerativeAI | null = null;
  
  constructor() {
    // Initialize Gemini AI if API key is available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
    }
  }

  /**
   * Generate AI response using the specified provider
   */
  async generateResponse(
    provider: 'gemini' | 'openai',
    prompt: string,
    conversationHistory: AIMessage[] = [],
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      if (provider === 'openai') {
        return await this.generateOpenAIResponse(prompt, conversationHistory, systemPrompt);
      } else {
        return await this.generateGeminiResponse(prompt, conversationHistory, systemPrompt);
      }
    } catch (error) {
      console.error(`Error generating ${provider} response:`, error);
      return {
        response: '',
        provider,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate response using OpenAI GPT
   */
  private async generateOpenAIResponse(
    prompt: string,
    conversationHistory: AIMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    const messages: any[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const responseText = response.choices[0].message.content || '';

    return {
      response: responseText,
      provider: 'openai',
      success: true
    };
  }

  /**
   * Generate response using Google Gemini
   */
  private async generateGeminiResponse(
    prompt: string,
    conversationHistory: AIMessage[],
    systemPrompt?: string
  ): Promise<AIResponse> {
    if (!this.geminiClient) {
      throw new Error('Gemini API not configured');
    }

    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-pro' });

    // Build context from conversation history
    let context = '';
    if (systemPrompt) {
      context += `System: ${systemPrompt}\n\n`;
    }

    // Add conversation history
    conversationHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      context += `${role}: ${msg.content}\n`;
    });

    // Add current prompt
    const fullPrompt = context + `User: ${prompt}\nAssistant:`;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    return {
      response: responseText,
      provider: 'gemini',
      success: true
    };
  }

  /**
   * Format conversation history for WhatsApp context
   */
  static formatWhatsAppHistory(messages: any[]): AIMessage[] {
    return messages.map((msg: any) => ({
      role: (msg.fromMe ? 'assistant' : 'user') as 'user' | 'assistant',
      content: msg.body || msg.text || '',
      timestamp: new Date(msg.timestamp * 1000)
    })).slice(-10); // Keep last 10 messages for context
  }

  /**
   * Check if AI providers are available
   */
  checkAvailability(): { gemini: boolean; openai: boolean } {
    return {
      gemini: !!this.geminiClient,
      openai: !!process.env.OPENAI_API_KEY
    };
  }
}

export const cleanAIService = new CleanAIService();