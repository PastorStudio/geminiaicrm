/**
 * Script para poblar el sistema con datos realistas
 * Demuestra todas las capacidades de IA nativa sin dependencias externas
 */

import { storage } from '../storage';
import { nativeIntelligence } from '../services/nativeIntelligenceService';

interface MockConversation {
  messages: Array<{
    sender: string;
    body: string;
    timestamp: Date;
    isFromMe: boolean;
  }>;
  contactInfo: {
    name: string;
    phone: string;
    profilePictureUrl?: string;
  };
}

const mockConversations: MockConversation[] = [
  {
    messages: [
      {
        sender: "Maria González",
        body: "Buenos días, estoy interesada en sus servicios de consultoría empresarial. Tengo una empresa mediana y necesito optimizar procesos.",
        timestamp: new Date(Date.now() - 3600000),
        isFromMe: false
      },
      {
        sender: "Sistema",
        body: "¡Hola María! Gracias por contactarnos. Sería un placer ayudarte con la optimización de procesos. ¿Podrías contarme más sobre tu empresa?",
        timestamp: new Date(Date.now() - 3500000),
        isFromMe: true
      },
      {
        sender: "Maria González", 
        body: "Claro, somos una empresa de manufactura con 50 empleados. Facturamos aproximadamente 2 millones al año pero creemos que podemos mejorar la eficiencia.",
        timestamp: new Date(Date.now() - 3400000),
        isFromMe: false
      }
    ],
    contactInfo: {
      name: "Maria González",
      phone: "+34666123456",
      profilePictureUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b29c?w=150&h=150&fit=crop&crop=face"
    }
  },
  {
    messages: [
      {
        sender: "Carlos Mendoza",
        body: "Hola, tengo un problema urgente con mi cuenta. No puedo acceder desde hace 2 días y necesito resolver esto YA porque tengo una presentación mañana.",
        timestamp: new Date(Date.now() - 1800000),
        isFromMe: false
      },
      {
        sender: "Sistema",
        body: "Entiendo tu urgencia Carlos. Vamos a resolver esto inmediatamente. ¿Puedes darme tu número de cuenta?",
        timestamp: new Date(Date.now() - 1700000),
        isFromMe: true
      },
      {
        sender: "Carlos Mendoza",
        body: "Mi cuenta es CM-2024-001. El error que me aparece es 'Acceso denegado' cuando intento entrar al dashboard.",
        timestamp: new Date(Date.now() - 1600000),
        isFromMe: false
      }
    ],
    contactInfo: {
      name: "Carlos Mendoza",
      phone: "+34677234567",
      profilePictureUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    }
  },
  {
    messages: [
      {
        sender: "Ana Rodríguez",
        body: "¿Tienen servicios de marketing digital? Estoy buscando hacer crecer mi negocio online.",
        timestamp: new Date(Date.now() - 7200000),
        isFromMe: false
      },
      {
        sender: "Sistema",
        body: "¡Por supuesto Ana! Ofrecemos servicios completos de marketing digital. ¿Qué tipo de negocio tienes?",
        timestamp: new Date(Date.now() - 7100000),
        isFromMe: true
      },
      {
        sender: "Ana Rodríguez",
        body: "Tengo una tienda online de ropa femenina. Llevo 6 meses pero las ventas están estancadas en 15,000€ mensuales.",
        timestamp: new Date(Date.now() - 7000000),
        isFromMe: false
      }
    ],
    contactInfo: {
      name: "Ana Rodríguez",
      phone: "+34688345678",
      profilePictureUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  },
  {
    messages: [
      {
        sender: "Roberto Silva",
        body: "Buenas tardes, quería hacer una consulta sobre precios para servicios de desarrollo web.",
        timestamp: new Date(Date.now() - 14400000),
        isFromMe: false
      },
      {
        sender: "Sistema",
        body: "¡Hola Roberto! Estaré encantado de ayudarte con información sobre desarrollo web. ¿Qué tipo de proyecto tienes en mente?",
        timestamp: new Date(Date.now() - 14300000),
        isFromMe: true
      },
      {
        sender: "Roberto Silva",
        body: "Necesito una plataforma e-commerce completa para mi empresa de suministros industriales. Algo robusto que maneje inventario y facturación.",
        timestamp: new Date(Date.now() - 14200000),
        isFromMe: false
      }
    ],
    contactInfo: {
      name: "Roberto Silva",
      phone: "+34699456789",
      profilePictureUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    }
  },
  {
    messages: [
      {
        sender: "Laura Fernández",
        body: "Hola! Vi su anuncio en LinkedIn sobre consultoría en transformación digital. Mi empresa necesita modernizarse urgentemente.",
        timestamp: new Date(Date.now() - 10800000),
        isFromMe: false
      },
      {
        sender: "Sistema",
        body: "¡Excelente Laura! La transformación digital es fundamental hoy en día. Cuéntame más sobre tu empresa y los desafíos que enfrentan.",
        timestamp: new Date(Date.now() - 10700000),
        isFromMe: true
      },
      {
        sender: "Laura Fernández",
        body: "Somos una empresa familiar de construcción con 25 años en el mercado. Aún manejamos todo en papel y Excel. Facturamos 5 millones anuales pero perdemos eficiencia.",
        timestamp: new Date(Date.now() - 10600000),
        isFromMe: false
      }
    ],
    contactInfo: {
      name: "Laura Fernández",
      phone: "+34610567890",
      profilePictureUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    }
  }
];

const additionalAgents = [
  {
    id: "agent_ai_001",
    agentName: "IA Asistente Comercial",
    agentUrl: "https://api-comercial-ia.empresa.com/webhook",
    provider: "Sistema Nativo",
    status: "active",
    notes: "Especializado en lead qualification y respuestas comerciales automáticas"
  },
  {
    id: "agent_ai_002", 
    agentName: "IA Soporte Técnico",
    agentUrl: "https://api-soporte-ia.empresa.com/webhook",
    provider: "Sistema Nativo",
    status: "active",
    notes: "Maneja consultas técnicas y categorización de tickets automática"
  },
  {
    id: "agent_ai_003",
    agentName: "IA Análisis Conversacional",
    agentUrl: "https://api-analisis-ia.empresa.com/webhook", 
    provider: "Sistema Nativo",
    status: "active",
    notes: "Análisis de sentimientos y generación de insights automáticos"
  }
];

async function populateSystemData() {
  console.log('🚀 Iniciando población automática del sistema...');
  
  try {
    // 1. Crear agentes externos adicionales
    console.log('👥 Creando agentes externos con IA...');
    for (const agent of additionalAgents) {
      try {
        await storage.createExternalAgent({
          id: agent.id,
          agentName: agent.agentName,
          agentUrl: agent.agentUrl,
          provider: agent.provider,
          status: agent.status,
          notes: agent.notes,
          accountId: 1,
          lastUsed: new Date(),
          responseCount: Math.floor(Math.random() * 50) + 10,
          averageResponseTime: Math.floor(Math.random() * 3000) + 500
        });
        console.log(`✅ Agente creado: ${agent.agentName}`);
      } catch (error) {
        console.log(`⚠️ Agente ya existe: ${agent.agentName}`);
      }
    }

    // 2. Procesar conversaciones y generar leads/tickets automáticamente
    console.log('💬 Procesando conversaciones y generando datos con IA...');
    
    for (const conversation of mockConversations) {
      try {
        // Analizar conversación con IA nativa
        const analysis = nativeIntelligence.analyzeConversation(conversation.messages);
        console.log(`🧠 Análisis para ${conversation.contactInfo.name}:`, {
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          leadQuality: analysis.leadQuality,
          priority: analysis.priority,
          confidence: analysis.confidence
        });

        // Generar lead si la calidad es media o alta
        if (analysis.leadQuality === 'high' || analysis.leadQuality === 'medium') {
          const leadData = nativeIntelligence.generateLeadFromConversation(
            conversation.messages, 
            conversation.contactInfo
          );

          try {
            const newLead = await storage.createLead({
              name: leadData.name,
              phone: leadData.phone,
              email: leadData.email,
              company: leadData.company,
              source: leadData.source,
              status: leadData.status,
              priority: leadData.priority,
              notes: leadData.notes,
              stage: 'nuevo',
              estimatedValue: leadData.estimatedValue,
              followUpDate: leadData.followUpDate,
              assignedTo: 'IA Asistente Comercial'
            });
            console.log(`📊 Lead creado: ${leadData.name} (Valor estimado: €${leadData.estimatedValue})`);
          } catch (error) {
            console.log(`⚠️ Lead ya existe para: ${leadData.name}`);
          }
        }

        // Generar ticket si es urgente o de soporte
        if (analysis.priority === 'urgent' || analysis.priority === 'high' || 
            analysis.category === 'soporte' || analysis.category === 'reclamo') {
          
          const ticketInfo = nativeIntelligence.categorizeTicket(conversation.messages);
          
          try {
            // Crear asignación de chat como ticket
            await storage.createChatAssignment({
              chatId: `chat_${conversation.contactInfo.phone.replace(/[^0-9]/g, '')}`,
              agentId: 'agent_ai_002',
              accountId: 1,
              priority: ticketInfo.priority,
              status: 'abierto',
              category: ticketInfo.category,
              assignedAt: new Date(),
              notes: ticketInfo.description
            });
            console.log(`🎫 Ticket creado: ${ticketInfo.category} (${ticketInfo.priority})`);
          } catch (error) {
            console.log(`⚠️ Ticket ya existe para: ${conversation.contactInfo.name}`);
          }
        }

        // Generar respuesta automática para consultas
        if (analysis.category === 'consulta' && analysis.sentiment !== 'negative') {
          const autoResponse = nativeIntelligence.generateAutoResponse(
            conversation.messages,
            {
              agentName: 'IA Asistente',
              company: 'Nuestra Empresa'
            }
          );
          console.log(`🤖 Respuesta automática generada para ${conversation.contactInfo.name}: "${autoResponse.response.substring(0, 50)}..."`);
        }

      } catch (error) {
        console.error(`❌ Error procesando conversación de ${conversation.contactInfo.name}:`, error);
      }
    }

    // 3. Generar estadísticas adicionales
    console.log('📈 Generando estadísticas del sistema...');
    
    const allLeads = await storage.getAllLeads();
    const totalValue = allLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
    const highPriorityLeads = allLeads.filter(lead => lead.priority === 'high').length;
    
    console.log(`💰 Valor total de leads: €${totalValue.toLocaleString()}`);
    console.log(`🔥 Leads de alta prioridad: ${highPriorityLeads}`);
    console.log(`📋 Total de leads generados: ${allLeads.length}`);

    // 4. Verificar capacidades de IA
    console.log('🧪 Verificando capacidades de IA nativa...');
    const testMessage = "Hola, estoy muy molesto porque mi pedido llegó tarde y dañado. Necesito una solución inmediata.";
    const testAnalysis = nativeIntelligence.analyzeConversation([{
      sender: 'Test User',
      body: testMessage,
      timestamp: new Date(),
      isFromMe: false
    }]);
    
    console.log('🔍 Análisis de prueba:', {
      sentiment: testAnalysis.sentiment,
      intent: testAnalysis.intent,
      urgency: testAnalysis.urgencyScore,
      keywords: testAnalysis.keywords
    });

    console.log('✅ Sistema poblado exitosamente con IA nativa!');
    console.log('🎯 Funcionalidades demostradas:');
    console.log('   • Análisis automático de conversaciones');
    console.log('   • Generación inteligente de leads');
    console.log('   • Categorización automática de tickets');
    console.log('   • Respuestas automáticas contextuales');
    console.log('   • Análisis de sentimientos');
    console.log('   • Scoring de leads y priorización');

  } catch (error) {
    console.error('❌ Error poblando el sistema:', error);
    throw error;
  }
}

export { populateSystemData };