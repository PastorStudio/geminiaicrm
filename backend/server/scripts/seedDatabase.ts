import { storage } from '../storage';
import { InsertLead, InsertUser, InsertActivity, InsertMessage } from '../../shared/schema';

/**
 * Inicializa la base de datos con datos reales de prueba
 * Esta función crea:
 * - Usuarios para el sistema
 * - Leads con diferentes estados en el pipeline
 * - Actividades relacionadas con los leads
 * - Mensajes de comunicación
 */
async function seedDatabase() {
  console.log('Iniciando creación de datos de prueba...');
  
  try {
    // Crear usuarios
    const users = await createUsers();
    console.log(`Creados ${users.length} usuarios`);
    
    // Crear leads
    const leads = await createLeads(users);
    console.log(`Creados ${leads.length} leads`);
    
    // Crear actividades
    const activities = await createActivities(leads, users);
    console.log(`Creadas ${activities.length} actividades`);
    
    // Crear mensajes
    const messages = await createMessages(leads);
    console.log(`Creados ${messages.length} mensajes`);
    
    console.log('Base de datos inicializada con éxito');
    return { users, leads, activities, messages };
  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
    throw error;
  }
}

/**
 * Crea usuarios de prueba para el sistema
 */
async function createUsers() {
  const usersData: InsertUser[] = [
    {
      username: 'DJP',
      password: 'Mi123456@',
      fullName: 'DJP - Superadministrador',
      email: 'djp@geminicrm.com',
      role: 'superadmin'
    },
    {
      username: 'superadmin',
      password: 'super123',
      fullName: 'Super Administrador',
      email: 'superadmin@geminicrm.com',
      role: 'superadmin'
    },
    {
      username: 'admin',
      password: 'admin123', // En producción deberían estar hasheadas
      fullName: 'Administrador',
      email: 'admin@geminicrm.com',
      role: 'admin'
    },
    {
      username: 'maria',
      password: 'maria123',
      fullName: 'Maria Rodríguez',
      email: 'maria@geminicrm.com',
      role: 'sales'
    },
    {
      username: 'carlos',
      password: 'carlos123',
      fullName: 'Carlos Mendoza',
      email: 'carlos@geminicrm.com',
      role: 'sales'
    }
  ];
  
  const users = [];
  for (const userData of usersData) {
    // Verificar si el usuario ya existe
    const existingUser = await storage.getUserByUsername(userData.username);
    if (!existingUser) {
      users.push(await storage.createUser(userData));
    } else {
      users.push(existingUser);
    }
  }
  
  return users;
}

/**
 * Crea leads de prueba con diferentes estados y características
 */
async function createLeads(users: any[]) {
  const leadsData: InsertLead[] = [
    {
      name: 'Tecnología Innovadora S.A.',
      email: 'contacto@tecno-innovadora.com',
      phone: '+34678123456',
      company: 'Tecnología Innovadora S.A.',
      source: 'Sitio web',
      status: 'new',
      notes: 'Empresa interesada en soluciones de CRM con IA integrada',
      assigneeId: users[1].id, // Asignado a Maria
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
      assigneeId: users[2].id, // Asignado a Carlos
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
      assigneeId: users[1].id, // Asignado a Maria
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
      assigneeId: users[2].id, // Asignado a Carlos
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
      assigneeId: users[1].id, // Asignado a Maria
      budget: 20000,
      priority: 'high',
      tags: ['logistics', 'enterprise', 'automation']
    }
  ];
  
  const leads = [];
  for (const leadData of leadsData) {
    leads.push(await storage.createLead(leadData));
  }
  
  return leads;
}

/**
 * Crea actividades relacionadas con los leads
 */
async function createActivities(leads: any[], users: any[]) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const activitiesData: InsertActivity[] = [
    {
      leadId: leads[0].id,
      userId: users[1].id,
      type: 'call',
      scheduled: yesterday,
      notes: 'Llamada inicial para presentar nuestra solución',
      completed: true,
      priority: 'high'
    },
    {
      leadId: leads[0].id,
      userId: users[1].id,
      type: 'meeting',
      scheduled: tomorrow,
      notes: 'Demostración de la plataforma CRM con integración Gemini AI',
      completed: false,
      priority: 'high'
    },
    {
      leadId: leads[1].id,
      userId: users[2].id,
      type: 'email',
      scheduled: yesterday,
      notes: 'Envío de información adicional sobre las capacidades de automatización',
      completed: true,
      priority: 'medium'
    },
    {
      leadId: leads[1].id,
      userId: users[2].id,
      type: 'meeting',
      scheduled: nextWeek,
      notes: 'Reunión con el equipo técnico para evaluar requerimientos',
      completed: false,
      priority: 'medium'
    },
    {
      leadId: leads[2].id,
      userId: users[1].id,
      type: 'call',
      scheduled: yesterday,
      notes: 'Llamada de seguimiento para resolver dudas sobre la propuesta',
      completed: true,
      priority: 'high'
    },
    {
      leadId: leads[2].id,
      userId: users[1].id,
      type: 'meeting',
      scheduled: tomorrow,
      notes: 'Presentación al comité directivo',
      completed: false,
      priority: 'high'
    },
    {
      leadId: leads[3].id,
      userId: users[2].id,
      type: 'email',
      scheduled: yesterday,
      notes: 'Envío de propuesta económica detallada',
      completed: true,
      priority: 'medium'
    },
    {
      leadId: leads[4].id,
      userId: users[1].id,
      type: 'meeting',
      scheduled: yesterday,
      notes: 'Negociación de términos contractuales y alcance',
      completed: true,
      priority: 'high'
    },
    {
      leadId: leads[4].id,
      userId: users[1].id,
      type: 'call',
      scheduled: tomorrow,
      notes: 'Llamada para confirmar acuerdo final',
      completed: false,
      priority: 'high'
    }
  ];
  
  const activities = [];
  for (const activityData of activitiesData) {
    activities.push(await storage.createActivity(activityData));
  }
  
  return activities;
}

/**
 * Crea mensajes de comunicación con los leads
 */
async function createMessages(leads: any[]) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const messagesData: InsertMessage[] = [
    {
      leadId: leads[0].id,
      content: 'Estimados señores de Tecnología Innovadora, gracias por contactarnos. Nos gustaría presentarles nuestra solución de CRM potenciada con Inteligencia Artificial. ¿Tendrían disponibilidad para una demostración esta semana?',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leads[0].id,
      content: 'Gracias por la información. Nos interesa mucho conocer más sobre su plataforma, especialmente las capacidades de análisis con IA. Tendríamos disponibilidad para una demo el próximo jueves a las 10:00.',
      channel: 'email',
      direction: 'inbound',
      read: true
    },
    {
      leadId: leads[1].id,
      content: 'Buenas tardes. Hemos recibido su información de contacto a través de nuestro socio comercial. Nos encantaría mostrarle cómo podemos optimizar sus procesos de ventas con nuestra plataforma.',
      channel: 'whatsapp',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leads[1].id,
      content: 'Gracias por contactarme. Efectivamente, estamos buscando una solución que nos ayude a mejorar el seguimiento de clientes. ¿Podrían enviarme más información sobre sus servicios?',
      channel: 'whatsapp',
      direction: 'inbound',
      read: true
    },
    {
      leadId: leads[2].id,
      content: 'Estimados Consultores Financieros, adjunto encontrarán la presentación de nuestras capacidades de análisis predictivo que discutimos en la llamada. Confirmamos la reunión para el próximo martes.',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leads[3].id,
      content: 'Le hacemos llegar la propuesta de integración de nuestro CRM con su plataforma web actual. Incluye todos los puntos discutidos en nuestra reunión inicial.',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leads[3].id,
      content: 'Hemos revisado la propuesta y tenemos algunas preguntas sobre la implementación. ¿Podríamos agendar una llamada para discutirlas?',
      channel: 'email',
      direction: 'inbound',
      read: false
    },
    {
      leadId: leads[4].id,
      content: 'Hemos preparado un documento detallado con los términos y condiciones según lo negociado. Por favor revísenlo y nos indican si tienen alguna observación.',
      channel: 'email',
      direction: 'outbound',
      read: true
    },
    {
      leadId: leads[4].id,
      content: 'El documento se ve bien en general. Nuestro departamento legal ha sugerido algunos ajustes menores que enviaremos mañana.',
      channel: 'email',
      direction: 'inbound',
      read: true
    }
  ];
  
  const messages = [];
  for (const messageData of messagesData) {
    messages.push(await storage.createMessage(messageData));
  }
  
  return messages;
}

// En ESM no hay acceso a require.main, así que siempre exportamos la función
export { seedDatabase };