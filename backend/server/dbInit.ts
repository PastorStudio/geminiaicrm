import { db } from "./db";
import * as schema from "@shared/schema";
import { storage } from "./storage";

/**
 * Script para inicializar la base de datos
 * Este script crea las tablas definidas en el esquema y datos iniciales
 */
async function main() {
  try {
    console.log("Iniciando creación de tablas en la base de datos PostgreSQL...");
    
    // Crear tablas mediante Drizzle
    // Drizzle tratará de crear las tablas si no existen
    // Si ya existen, simplemente continuará sin errores
    
    await db.execute(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'admin');
        END IF;
      END $$;
    `);
    
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
      
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "leadId" INTEGER REFERENCES leads(id),
        content TEXT NOT NULL,
        direction TEXT NOT NULL,
        channel TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        "sentAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
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
    
    console.log("Tablas creadas correctamente");
    
    // Inicializar datos de ejemplo
    await storage.initializeData();
    
    console.log("Base de datos inicializada correctamente");
    process.exit(0);
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
    process.exit(1);
  }
}

// Ejecutar la función main
main();