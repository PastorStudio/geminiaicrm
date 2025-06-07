import OpenAI from 'openai';

export async function testOpenAIAgent(message: string, agentName: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'Error: No hay clave API de OpenAI configurada';
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let agentPersonality = '';
    if (agentName.toLowerCase().includes('smartbots')) {
      agentPersonality = 'Eres SmartBots, un asistente inteligente especializado en automatización y respuestas conversacionales para WhatsApp. Responde de manera amigable, profesional y útil. Ayudas con consultas de servicio al cliente, ventas y soporte técnico.';
    } else if (agentName.toLowerCase().includes('smartplanner')) {
      agentPersonality = 'Eres SmartPlanner IA, un asistente especializado en planificación, organización y gestión de tareas. Ayudas a las personas a organizar su tiempo, crear horarios, planificar proyectos y gestionar actividades de manera eficiente.';
    } else {
      agentPersonality = `Eres ${agentName}, un asistente inteligente que ayuda a los usuarios con sus consultas de manera profesional y útil.`;
    }

    const completion = await openai.chat.completions.create({
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

    return completion.choices[0].message.content || 'No se pudo generar respuesta';

  } catch (error: any) {
    console.error('Error en testOpenAIAgent:', error);
    return `Error: ${error.message}`;
  }
}