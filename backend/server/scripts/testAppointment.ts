/**
 * Script de prueba para la detección y creación de citas
 * Este script genera una cita de prueba en el sistema para un lead existente
 */

import { pool } from '../db';
import { createAppointmentFromConversation } from '../services/appointmentDetector';

// Función principal que crea una cita de prueba para un lead específico
async function createTestAppointment(leadId: number): Promise<void> {
  console.log('Conectando a la base de datos PostgreSQL...');
  try {
    console.log(`Creando cita de prueba para el lead ID: ${leadId}`);
    
    // Primero verificar si el lead existe
    const checkQuery = {
      text: 'SELECT name FROM leads WHERE id = $1',
      values: [leadId]
    };
    
    const checkResult = await pool.query(checkQuery);
    if (checkResult.rows.length === 0) {
      console.error(`No existe un lead con ID: ${leadId}`);
      return;
    }
    
    const leadName = checkResult.rows[0].name;
    console.log(`Lead encontrado: ${leadName}`);
    
    // Crear un objeto clientInfo simulado
    const clientInfo = {
      clientName: leadName,
      phoneNumber: "1234567890", // Esto sería el teléfono del lead en un caso real
      appointment: {
        detected: true,
        description: `Reunión para discutir implementación del CRM con ${leadName}`,
        date: new Date().toISOString().split('T')[0], // Fecha actual
        time: "15:00",
        type: "meeting",
        location: "Oficina central"
      }
    };
    
    console.log('Datos de prueba:', JSON.stringify(clientInfo, null, 2));
    
    // Llamar a la función de creación de citas
    await createAppointmentFromConversation(clientInfo, leadId);
    
    console.log(`Cita de prueba creada correctamente para el lead ${leadName} (ID: ${leadId})`);
  } catch (error) {
    console.error('Error al crear cita de prueba:', error);
  }
}

// Para ejecución directa del script
const leadId = process.argv[2] ? parseInt(process.argv[2]) : 1;

createTestAppointment(leadId)
  .then(() => {
    console.log('Proceso de prueba completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el proceso de prueba:', error);
    process.exit(1);
  });

export default createTestAppointment;