// Script para inicializar la base de datos con datos de prueba
import { db } from '../db.js';
import { users, leads, activities, messages } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

async function seedDatabase() {
  console.log('Iniciando creación de datos de prueba...');
  
  // Crear usuarios
  const usersData = await createUsers();
  console.log(`Creados ${usersData.length} usuarios`);
  
  // Crear leads
  const leadsData = await createLeads(usersData);
  console.log(`Creados ${leadsData.length} leads`);
  
  // Crear actividades
  const activitiesData = await createActivities(leadsData, usersData);
  console.log(`Creadas ${activitiesData.length} actividades`);
  
  // Crear mensajes
  const messagesData = await createMessages(leadsData);
  console.log(`Creados ${messagesData.length} mensajes`);
  
  return {
    users: usersData,
    leads: leadsData,
    activities: activitiesData,
    messages: messagesData
  };
}

// Crear usuarios
async function createUsers() {
  const usersData = [
    {
      username: 'admin',
      password: 'admin123', // En producción deberían estar hasheadas
      full_name: 'Administrador',
      email: 'admin@geminicrm.com',
      role: 'admin'
    },
    {
      username: 'maria',
      password: 'maria123',
      full_name: 'Maria Rodríguez',
      email: 'maria@geminicrm.com',
      role: 'sales'
    },
    {
      username: 'carlos',
      password: 'carlos123',
      full_name: 'Carlos Mendoza',
      email: 'carlos@geminicrm.com',
      role: 'sales'
    }
  ];
  
  const createdUsers = [];
  
  for (const userData of usersData) {
    // Verificar si el usuario ya existe
    const existingUsers = await db.select().from(users).where(eq(users.username, userData.username));
    
    if (existingUsers.length === 0) {
      // Si no existe, lo creamos
      const [newUser] = await db.insert(users).values(userData).returning();
      createdUsers.push(newUser);
    } else {
      // Si ya existe, lo añadimos a la lista
      createdUsers.push(existingUsers[0]);
    }
  }
  
  return createdUsers;
}

// Crear leads
async function createLeads(usersData) {
  const leadsData = [
    {
      name: 'Tecnología Innovadora S.A.',
      email: 'contacto@tecno-innovadora.com',
      phone: '+34678123456',
      company: 'Tecnología Innovadora S.A.',
      source: 'Sitio web',
      status: 'new',
      notes: 'Empresa interesada en soluciones de CRM con IA integrada',
      assigneeId: usersData[1].id, // Asignado a Maria
      budget: 12000,
      priority: 'high',
      tags: ['tech', 'ai-interest', 'enterprise']
    },
    {
      name: 'Comercio Global Express',
      email: 'info@comercioglobal.com',
      phone: '+34612345678',
      company: 'Comercio Global Express',
      source: 'Referencia',
      status: 'contacted',
      notes: 'Necesitan mejorar su proceso de ventas y seguimiento de clientes',
      assigneeId: usersData[2].id, // Asignado a Carlos
      budget: 8000,
      priority: 'medium',
      tags: ['retail', 'sales-improvement']
    },
    {
      name: 'Consultores Financieros Asociados',
      email: 'direccion@confi-asociados.es',
      phone: '+34691234567',
      company: 'Consultores Financieros Asociados',
      source: 'LinkedIn',
      status: 'meeting',
      notes: 'Reunión programada para presentar las capacidades de análisis predictivo',
      assigneeId: usersData[1].id, // Asignado a Maria
      budget: 15000,
      priority: 'high',
      tags: ['finance', 'enterprise', 'analytics']
    },
    {
      name: 'Desarrollo Web Rapid',
      email: 'proyectos@desarrolloweb-rapid.com',
      phone: '+34623456789',
      company: 'Desarrollo Web Rapid',
      source: 'Evento',
      status: 'proposal',
      notes: 'Enviada propuesta para integración de nuestro CRM con su plataforma existente',
      assigneeId: usersData[2].id, // Asignado a Carlos
      budget: 5000,
      priority: 'medium',
      tags: ['web-development', 'integration', 'small-business']
    },
    {
      name: 'Logística Internacional Express',
      email: 'operaciones@logistica-inter.com',
      phone: '+34634567890',
      company: 'Logística Internacional Express',
      source: 'Google',
      status: 'negotiation',
      notes: 'En proceso de negociación. Interesados principalmente en la automatización',
      assigneeId: usersData[1].id, // Asignado a Maria
      budget: 20000,
      priority: 'high',
      tags: ['logistics', 'enterprise', 'automation']
    }
  ];
  
  const createdLeads = [];
  
  for (const leadData of leadsData) {
    const [newLead] = await db.insert(leads).values(leadData).returning();
    createdLeads.push(newLead);
  }
  
  return createdLeads;
}

// Crear actividades
async function createActivities(leadsData, usersData) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const activitiesData = [
    {
      leadId: leadsData[0].id,
      userId: usersData[1].id,
      type: 'call',
      scheduled: yesterday,
      notes: 'Llamada inicial para presentar nuestra solución',
      completed: true,
      priority: 'high'
    },
    {
      leadId: leadsData[0].id,
      userId: usersData[1].id,
      type: 'meeting',
      scheduled: tomorrow,
      notes: 'Demostración de la plataforma CRM con integración Gemini AI',
      completed: false,
      priority: 'high'
    },
    {
      leadId: leadsData[1].id,
      userId: usersData[2].id,
      type: 'email',
      scheduled: yesterday,
      notes: 'Envío de información adicional sobre las capacidades de automatización',
      completed: true,
      priority: 'medium'
    },
    {
      leadId: leadsData[1].id,
      userId: usersData[2].id,
      type: 'meeting',
      scheduled: nextWeek,
      notes: 'Reunión con el equipo técnico para evaluar requerimientos',
      completed: false,
      priority: 'medium'
    },
    {
      leadId: leadsData[2].id,
      userId: usersData[1].id,
      type: 'call',
      scheduled: yesterday,
      notes: 'Llamada de seguimiento para resolver dudas sobre la propuesta',
      completed: true,
      priority: 'high'
    },
    {
      leadId: leadsData[2].id,
      userId: usersData[1].id,
      type: 'meeting',
      scheduled: tomorrow,
      notes: 'Presentación al comité directivo',
      completed: false,
      priority: 'high'
    },
    {
      leadId: leadsData[3].id,
      userId: usersData[2].id,
      type: 'email',
      scheduled: yesterday,
      notes: 'Envío de propuesta económica detallada',
      completed: true,
      priority: 'medium'
    },
    {
      leadId: leadsData[4].id,
      userId: usersData[1].id,
      type: 'meeting',
      scheduled: yesterday,
      notes: 'Negociación de términos contractuales y alcance',
      completed: true,
      priority: 'high'
    },
    {
      leadId: leadsData[4].id,
      userId: usersData[1].id,
      type: 'call',
      scheduled: tomorrow,
      notes: 'Llamada para confirmar acuerdo final',
      completed: false,
      priority: 'high'
    }
  ];
  
  const createdActivities = [];
  
  for (const activityData of activitiesData) {
    const [newActivity] = await db.insert(activities).values(activityData).returning();
    createdActivities.push(newActivity);
  }
  
  return createdActivities;
}

// Crear mensajes
async function createMessages(leadsData) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const messagesData = [
    {
      leadId: leadsData[0].id,
      content: 'Estimados señores de Tecnología Innovadora, gracias por contactarnos. Nos gustaría presentarles nuestra solución de CRM potenciada con Inteligencia Artificial. ¿Tendrían disponibilidad para una demostración esta semana?',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leadsData[0].id,
      content: 'Gracias por la información. Nos interesa mucho conocer más sobre su plataforma, especialmente las capacidades de análisis con IA. Tendríamos disponibilidad para una demo el próximo jueves a las 10:00.',
      channel: 'email',
      direction: 'inbound',
      read: true
    },
    {
      leadId: leadsData[1].id,
      content: 'Buenas tardes. Hemos recibido su información de contacto a través de nuestro socio comercial. Nos encantaría mostrarle cómo podemos optimizar sus procesos de ventas con nuestra plataforma.',
      channel: 'whatsapp',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leadsData[1].id,
      content: 'Gracias por contactarme. Efectivamente, estamos buscando una solución que nos ayude a mejorar el seguimiento de clientes. ¿Podrían enviarme más información sobre sus servicios?',
      channel: 'whatsapp',
      direction: 'inbound',
      read: true
    },
    {
      leadId: leadsData[2].id,
      content: 'Estimados Consultores Financieros, adjunto encontrarán la presentación de nuestras capacidades de análisis predictivo que discutimos en la llamada. Confirmamos la reunión para el próximo martes.',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leadsData[3].id,
      content: 'Le hacemos llegar la propuesta de integración de nuestro CRM con su plataforma web actual. Incluye todos los puntos discutidos en nuestra reunión inicial.',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leadsData[3].id,
      content: 'Hemos revisado la propuesta y tenemos algunas preguntas sobre la implementación. ¿Podríamos agendar una llamada para discutirlas?',
      channel: 'email',
      direction: 'inbound',
      read: false
    },
    {
      leadId: leadsData[4].id,
      content: 'Hemos preparado un documento detallado con los términos y condiciones según lo negociado. Por favor revísenlo y nos indican si tienen alguna observación.',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leadsData[4].id,
      content: 'El documento se ve bien en general. Nuestro departamento legal ha sugerido algunos ajustes menores que enviaremos mañana.',
      channel: 'email',
      direction: 'inbound',
      read: true
    }
  ];
  
  const createdMessages = [];
  
  for (const messageData of messagesData) {
    const [newMessage] = await db.insert(messages).values(messageData).returning();
    createdMessages.push(newMessage);
  }
  
  return createdMessages;
}

// Ejecutar la inicialización
seedDatabase()
  .then((result) => {
    console.log('Base de datos inicializada con éxito:');
    console.log(`- ${result.users.length} usuarios`);
    console.log(`- ${result.leads.length} leads`);
    console.log(`- ${result.activities.length} actividades`);
    console.log(`- ${result.messages.length} mensajes`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error inicializando la base de datos:', error);
    process.exit(1);
  });