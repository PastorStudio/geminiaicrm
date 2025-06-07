import { Activity, Lead, Message, Survey, User } from "@shared/schema";

/**
 * External API types (for Gemini API)
 */
export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
}

export interface GeminiChatMessage {
  role: "user" | "model";
  parts: {
    text: string;
  }[];
}

export interface GeminiChatRequest {
  contents: GeminiChatMessage[];
  generationConfig?: {
    temperature: number;
    maxOutputTokens: number;
    topP: number;
    topK: number;
  };
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

/**
 * Internal type extensions
 */
export interface LeadWithEnrichment extends Lead {
  activities?: Activity[];
  messages?: Message[];
  surveys?: Survey[];
  assignedUser?: User;
}

export interface ActivityWithDetails extends Activity {
  lead?: Lead;
  user?: User;
}

export interface MessageWithDetails extends Message {
  lead?: Lead;
  user?: User;
}

/**
 * Form types
 */
export interface LeadFormData {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  status: string;
  notes?: string;
  analyzeWithAI?: boolean;
}

export interface ActivityFormData {
  leadId: number;
  type: string;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  completed?: boolean;
}

export interface MessageFormData {
  leadId: number;
  direction: "incoming" | "outgoing";
  channel: "email" | "whatsapp" | "chat" | "system";
  content: string;
}

export interface SurveyFormData {
  leadId: number;
  title: string;
  questions: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: number;
  type: "text" | "multipleChoice" | "rating";
  text: string;
  options?: string[];
}

export interface SurveyResponse {
  questionId: number;
  answer: string | number | string[];
}

/**
 * Chart and dashboard data types
 */
export interface ChartData {
  name: string;
  value: number;
}

export interface LeadsBySourceData {
  source: string;
  count: number;
  percentage: number;
}

export interface LeadsByStatusData {
  status: string;
  count: number;
}

export interface SalesPerformanceData {
  date: string;
  leads: number;
  conversions: number;
}

export interface ConversionRateData {
  period: string;
  rate: number;
}

export interface LeadScoreDistribution {
  range: string;
  count: number;
}
