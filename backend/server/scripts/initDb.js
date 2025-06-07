// Script para inicializar la base de datos con datos de prueba
// Usando formato ESM para compatibilidad con el proyecto
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

console.log('Iniciando proceso de inicialización de la base de datos...');

async function runInitProcess() {
  try {
    // Ejecutar el comando para generar migraciones si es necesario
    console.log('Ejecutando migraciones...');
    const { stdout: migrationsOutput } = await exec('npx drizzle-kit push');
    console.log('Migraciones completadas:');
    console.log(migrationsOutput);
    
    // Ahora ejecutamos nuestro script de inicialización
    console.log('Iniciando creación de datos de prueba...');
    const { stdout: seedOutput } = await exec('npx tsx server/scripts/seedData.js');
    console.log('Datos de prueba creados:');
    console.log(seedOutput);
    
    console.log('Base de datos inicializada correctamente');
    process.exit(0);
  } catch (error) {
    console.error(`Error en la inicialización: ${error.message}`);
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
}

runInitProcess();