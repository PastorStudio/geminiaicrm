// Script simplificado para inicializar directamente la base de datos
import { db } from '../db.js';
import { 
  users, leads, activities, messages, dashboardStats
} from '../../shared/schema.js';

async function initDatabase() {
  console.log('Iniciando inicialización simple de la base de datos...');
  
  try {
    // Crear usuarios
    const usersData = [
      {
        username: 'admin',
        password: 'admin123',
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
    
    console.log('Creando usuarios...');
    
    const createdUsers = [];
    for (const userData of usersData) {
      try {
        const [newUser] = await db.insert(users).values(userData).returning();
        createdUsers.push(newUser);
        console.log(`Usuario creado: ${userData.username}`);
      } catch (err) {
        console.log(`El usuario ${userData.username} ya existe o hubo un error: ${err.message}`);
      }
    }
    
    // Crear estadísticas del dashboard
    const statsData = {
      totalLeads: 0,
      newLeadsThisMonth: 0,
      activeLeads: 0,
      convertedLeads: 0,
      totalSales: 0,
      salesThisMonth: 0,
      pendingActivities: 0,
      completedActivities: 0,
      performanceMetrics: JSON.stringify({
        responseTime: 3.5,
        conversionRate: 15,
        customerSatisfaction: 92
      }),
      updatedAt: new Date()
    };
    
    console.log('Creando estadísticas del dashboard...');
    
    try {
      const [newStats] = await db.insert(dashboardStats).values(statsData).returning();
      console.log('Estadísticas del dashboard creadas');
    } catch (err) {
      console.log(`Error creando estadísticas: ${err.message}`);
    }
    
    console.log('Inicialización completada con éxito');
  } catch (error) {
    console.error('Error en la inicialización de la base de datos:', error);
    return false;
  }
  
  return true;
}

// Ejecutar la inicialización
initDatabase()
  .then(success => {
    if (success) {
      console.log('Base de datos inicializada correctamente');
    } else {
      console.error('Hubo errores durante la inicialización');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error crítico:', error);
    process.exit(1);
  });