import { db } from '../db';
import { users, leads, activities, messages, surveys, dashboardStats, messageTemplates, marketingCampaigns, mediaGallery } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function createTables() {
  console.log("Iniciando creación de tablas en la base de datos PostgreSQL...");
  
  try {
    // Ejecutar las migraciones utilizando SQL directo
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        "fullName" TEXT,
        email TEXT,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla 'users' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        source TEXT,
        status TEXT DEFAULT 'new',
        notes TEXT,
        "assigneeId" INTEGER REFERENCES users(id),
        budget DOUBLE PRECISION,
        priority TEXT,
        tags TEXT[],
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla 'leads' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        "leadId" INTEGER REFERENCES leads(id),
        "userId" INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        scheduled TIMESTAMP NOT NULL,
        notes TEXT,
        completed BOOLEAN DEFAULT FALSE,
        priority TEXT,
        reminder TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla 'activities' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "leadId" INTEGER REFERENCES leads(id),
        content TEXT NOT NULL,
        direction TEXT NOT NULL,
        channel TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        "sentAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla 'messages' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        title TEXT NOT NULL,
        questions JSONB NOT NULL,
        responses JSONB,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        ai_analysis JSONB,
        created_by INTEGER REFERENCES users(id)
      );
    `);
    console.log("Tabla 'surveys' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS dashboard_stats (
        id SERIAL PRIMARY KEY,
        "totalLeads" INTEGER DEFAULT 0,
        "newLeadsThisMonth" INTEGER DEFAULT 0,
        "activeLeads" INTEGER DEFAULT 0,
        "convertedLeads" INTEGER DEFAULT 0,
        "totalSales" DOUBLE PRECISION DEFAULT 0,
        "salesThisMonth" DOUBLE PRECISION DEFAULT 0,
        "pendingActivities" INTEGER DEFAULT 0,
        "completedActivities" INTEGER DEFAULT 0,
        "performanceMetrics" JSONB DEFAULT '{"responseTime": 0, "conversionRate": 0, "customerSatisfaction": 0}',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla 'dashboard_stats' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT[],
        variables JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdBy" INTEGER REFERENCES users(id),
        "isActive" BOOLEAN DEFAULT TRUE
      );
    `);
    console.log("Tabla 'message_templates' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        "templateId" INTEGER REFERENCES message_templates(id),
        status TEXT DEFAULT 'draft',
        "scheduledStart" TIMESTAMP,
        "scheduledEnd" TIMESTAMP,
        "recipientList" JSONB,
        "importedContacts" JSONB,
        "sendingConfig" JSONB,
        stats JSONB DEFAULT '{"total": 0, "sent": 0, "delivered": 0, "read": 0, "responses": 0, "failed": 0}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "createdBy" INTEGER REFERENCES users(id)
      );
    `);
    console.log("Tabla 'marketing_campaigns' creada o ya existe");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS media_gallery (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        tags TEXT[],
        title TEXT,
        description TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP,
        use_count INTEGER DEFAULT 0
      );
    `);
    console.log("Tabla 'media_gallery' creada o ya existe");

    console.log("Todas las tablas han sido creadas o verificadas correctamente.");

    // Crear índices para mejorar el rendimiento
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_assignee ON leads("assigneeId");
      CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities("leadId");
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities("userId");
      CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages("leadId");
      CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
    `);
    console.log("Índices creados o actualizados correctamente.");

    // Verificar si existe algún usuario, si no, crear uno administrador
    try {
      // Mejor enfoque: intentamos contar directamente usando SQL
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      
      // Verificamos si hay registros
      const countStr = result.rows && result.rows[0] ? result.rows[0].count : '0';
      const count = parseInt(countStr as string);
      
      if (count === 0) {
      console.log("No se encontraron usuarios, creando usuario administrador por defecto...");
      await db.execute(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('admin', 'password123', 'Administrador del Sistema', 'admin@example.com', 'admin');
      `);
      console.log("Usuario administrador creado correctamente.");
    } else {
      console.log("Ya existen usuarios en la base de datos.");
    }
    } catch (error) {
      console.error("Error al verificar usuarios:", error);
      // Creamos un usuario por defecto en caso de error
      await db.execute(`
        INSERT INTO users (username, password, "fullName", email, role)
        VALUES ('admin', 'password123', 'Administrador del Sistema', 'admin@example.com', 'admin')
        ON CONFLICT (username) DO NOTHING;
      `);
      console.log("Se intentó crear un usuario administrador de respaldo");
    }

    console.log("Inicialización de la base de datos completada exitosamente.");
  } catch (error) {
    console.error("Error al crear las tablas:", error);
    throw error;
  }
}

// Ejecutar la creación de tablas
createTables()
  .then(() => {
    console.log("Proceso de inicialización de base de datos finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error durante la inicialización de la base de datos:", error);
    process.exit(1);
  });