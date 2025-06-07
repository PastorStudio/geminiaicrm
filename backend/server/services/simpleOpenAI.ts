// Servicio simplificado para OpenAI que evita conflictos de imports
export async function generateChatResponse(agentName: string, message: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return "Error: No hay clave API configurada";
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: getAgentPersonality(agentName)
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No se pudo generar respuesta";

  } catch (error) {
    console.error('Error OpenAI:', error);
    return "Error al conectar con el agente";
  }
}

function getAgentPersonality(agentName: string): string {
  if (agentName.toLowerCase().includes('smartbots')) {
    return 'Eres SmartBots, un asistente inteligente especializado en automatización y respuestas conversacionales para WhatsApp. Responde de manera amigable, profesional y útil. Ayudas con consultas de servicio al cliente, ventas y soporte técnico.';
  } else if (agentName.toLowerCase().includes('smartplanner')) {
    return 'Eres SmartPlanner IA, un asistente especializado en planificación, organización y gestión de tareas. Ayudas a las personas a organizar su tiempo, crear horarios, planificar proyectos y gestionar actividades de manera eficiente.';
  } else {
    return `Eres ${agentName}, un asistente inteligente que ayuda a los usuarios con sus consultas de manera profesional y útil.`;
  }
}