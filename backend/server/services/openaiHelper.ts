import OpenAI from 'openai';

export class OpenAIHelper {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generateAgentResponse(agentName: string, message: string): Promise<string> {
    try {
      // Crear un prompt que simule el comportamiento del agente específico
      let agentPersonality = '';
      if (agentName.toLowerCase().includes('smartbots')) {
        agentPersonality = 'Eres SmartBots, un asistente inteligente especializado en automatización y respuestas conversacionales para WhatsApp. Responde de manera amigable, profesional y útil. Ayudas con consultas de servicio al cliente, ventas y soporte técnico.';
      } else if (agentName.toLowerCase().includes('smartplanner')) {
        agentPersonality = 'Eres SmartPlanner IA, un asistente especializado en planificación, organización y gestión de tareas. Ayudas a las personas a organizar su tiempo, crear horarios, planificar proyectos y gestionar actividades de manera eficiente.';
      } else {
        agentPersonality = `Eres ${agentName}, un asistente inteligente que ayuda a los usuarios con sus consultas de manera profesional y útil.`;
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: agentPersonality
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const text = completion.choices[0]?.message?.content || "No se pudo generar respuesta";
      return text;

    } catch (error: any) {
      console.error(`❌ Error usando OpenAI: ${error.message || error}`);
      throw error;
    }
  }
}