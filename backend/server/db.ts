import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema-autonomous";

neonConfig.webSocketConstructor = ws;

// Siempre usamos la base de datos PostgreSQL para datos reales
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada. Se requiere una base de datos PostgreSQL para datos reales.");
}

console.log("Conectando a la base de datos PostgreSQL...");
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });