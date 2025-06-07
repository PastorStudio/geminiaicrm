/**
 * Script para inicializar la base de datos y ejecutar migraciones
 * 
 * Uso:
 * - npm run db:push (para migrar el esquema)
 * - npm run db:seed (para poblar con datos de prueba)
 */
import { db } from '../db';
import { seedDatabase } from './seedDatabase';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as path from 'path';

export async function migrateSchema() {
  console.log('Ejecutando migraciones del esquema...');
  
  try {
    // Ejecutar migraciones automáticas basadas en el esquema actual
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
    console.log('Migraciones completadas con éxito');
    return true;
  } catch (error) {
    console.error('Error ejecutando migraciones:', error);
    return false;
  }
}

export default async function initDatabase() {
  console.log('Iniciando proceso de inicialización de la base de datos...');
  
  try {
    // Primero ejecutamos las migraciones para asegurar que la estructura está actualizada
    const migrationSuccess = await migrateSchema();
    if (!migrationSuccess) {
      console.warn('No se pudieron ejecutar las migraciones, continuando de todos modos...');
    }
    
    // Luego poblamos la base de datos con datos de prueba
    const seedResult = await seedDatabase();
    
    console.log(`Base de datos inicializada con ${seedResult.users.length} usuarios, ${seedResult.leads.length} leads, ${seedResult.activities.length} actividades y ${seedResult.messages.length} mensajes`);
    return true;
  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
    return false;
  }
}

// Ejecutamos directamente en ESM
console.log('Ejecutando script de inicialización de base de datos...');

initDatabase()
  .then(success => {
    if (success) {
      console.log('Base de datos inicializada correctamente');
    } else {
      console.error('Hubo errores durante la inicialización de la base de datos');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error crítico inicializando la base de datos:', error);
    process.exit(1);
  });