import { whatsappService } from './whatsappServiceImpl';

/**
 * Obtiene todos los contactos de WhatsApp
 * Filtra solo los contactos que son de tipo personal (no grupos)
 */
export async function getAllWhatsAppContacts() {
  try {
    const status = whatsappService.getStatus();
    if (!status.initialized || !status.ready || !status.authenticated) {
      console.warn('Cliente de WhatsApp no inicializado, listo o autenticado');
      return [];
    }
    
    // Obtenemos el cliente
    const client = whatsappService.getClient();
    if (!client) {
      console.warn('Cliente de WhatsApp no disponible');
      return [];
    }
    
    // Obtenemos todos los contactos
    const contacts = await client.getContacts();
    
    if (!contacts || !Array.isArray(contacts)) {
      console.warn('No se pudieron obtener contactos de WhatsApp o el resultado no es un array');
      return [];
    }

    // Filtramos solo contactos personales (no grupos, servicios, etc)
    const personalContacts = contacts.filter(contact => {
      return (
        contact.id && 
        contact.id.user &&
        !contact.id.user.startsWith('0') &&  // No servicios
        !contact.id.user.startsWith('1234') && // No servicios
        !contact.id._serialized.includes('@g.us') && // No grupos
        !contact.isMe // No nosotros mismos
      );
    });
    
    // Transformamos al formato que necesitamos
    let formattedContacts = personalContacts.map(contact => {
      return {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.shortName || 'Sin nombre',
        number: contact.number || '',
        isGroup: false,
        isUser: true,
        profilePicUrl: contact.profilePicUrl || '',
      };
    });
    
    // Eliminamos duplicados usando un Map con el ID como clave
    const uniqueContactsMap = new Map();
    formattedContacts.forEach(contact => {
      if (!uniqueContactsMap.has(contact.id)) {
        uniqueContactsMap.set(contact.id, contact);
      }
    });
    
    formattedContacts = Array.from(uniqueContactsMap.values());

    return formattedContacts;
  } catch (error) {
    console.error('Error al obtener contactos de WhatsApp:', error);
    return [];
  }
}

/**
 * Obtiene todos los contactos y los agrupa por categorías:
 * - Contactos personales
 * - Grupos
 * - Etiquetados/categorizados personalizados
 */
export async function getContactsByCategory() {
  try {
    const status = whatsappService.getStatus();
    if (!status.initialized || !status.ready || !status.authenticated) {
      console.warn('Cliente de WhatsApp no inicializado, listo o autenticado');
      return {
        personal: [],
        groups: [],
        labeled: {} // Etiquetas personalizadas cuando se implementen
      };
    }
    
    // Obtenemos el cliente
    const client = whatsappService.getClient();
    if (!client) {
      console.warn('Cliente de WhatsApp no disponible');
      return {
        personal: [],
        groups: [],
        labeled: {} // Etiquetas personalizadas cuando se implementen
      };
    }
    
    // Obtenemos todos los contactos
    const contacts = await client.getContacts();
    
    if (!contacts || !Array.isArray(contacts)) {
      console.warn('No se pudieron obtener contactos de WhatsApp o el resultado no es un array');
      return {
        personal: [],
        groups: [],
        labeled: {} // Etiquetas personalizadas cuando se implementen
      };
    }

    // Separamos entre personales y grupos
    const personalContacts = [];
    const groupContacts = [];
    
    // Usamos sets para almacenar IDs únicos
    const uniquePersonalIds = new Set();
    const uniqueGroupIds = new Set();
    
    for (const contact of contacts) {
      if (!contact.id || !contact.id._serialized) continue;
      
      // Verificamos si es un grupo
      const isGroup = contact.id._serialized.includes('@g.us');
      
      // Filtramos algunos contactos de sistema o no deseados
      if (contact.isMe || 
          (contact.id.user && contact.id.user.startsWith('0')) || 
          (contact.id.user && contact.id.user.startsWith('1234'))) {
        continue;
      }
      
      const contactId = contact.id._serialized;
      
      // Evitamos duplicados verificando si ya procesamos este ID
      if (isGroup && uniqueGroupIds.has(contactId)) continue;
      if (!isGroup && uniquePersonalIds.has(contactId)) continue;
      
      const formattedContact = {
        id: contactId,
        name: contact.name || contact.pushname || contact.shortName || 'Sin nombre',
        number: contact.number || '',
        isGroup: isGroup,
        isUser: !isGroup,
        profilePicUrl: contact.profilePicUrl || '',
      };
      
      if (isGroup) {
        groupContacts.push(formattedContact);
        uniqueGroupIds.add(contactId);
      } else {
        personalContacts.push(formattedContact);
        uniquePersonalIds.add(contactId);
      }
    }

    return {
      personal: personalContacts,
      groups: groupContacts,
      labeled: {} // Para futuras implementaciones de etiquetas
    };
  } catch (error) {
    console.error('Error al obtener contactos por categoría de WhatsApp:', error);
    return {
      personal: [],
      groups: [],
      labeled: {}
    };
  }
}

/**
 * Busca contactos de WhatsApp por término de búsqueda
 */
export async function searchWhatsAppContacts(searchTerm: string) {
  try {
    const allContacts = await getAllWhatsAppContacts();
    
    if (!searchTerm || searchTerm.trim() === '') {
      return allContacts;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    // Filtramos por nombre o número
    return allContacts.filter(contact => {
      return (
        contact.name.toLowerCase().includes(searchLower) ||
        (contact.number && contact.number.includes(searchTerm))
      );
    });
  } catch (error) {
    console.error('Error al buscar contactos de WhatsApp:', error);
    return [];
  }
}

/**
 * Obtiene los grupos de WhatsApp a los que pertenece el usuario
 */
export async function getWhatsAppGroups() {
  try {
    const { groups } = await getContactsByCategory();
    return groups;
  } catch (error) {
    console.error('Error al obtener grupos de WhatsApp:', error);
    return [];
  }
}