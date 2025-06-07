/**
 * Utilidad para extraer nombres de agentes desde URLs de ChatGPT
 */

export function extractAgentName(url: string): string {
  if (url.includes('/g/g-')) {
    // Ejemplo: https://chatgpt.com/g/g-6830cd2e43d88191a262927c5334cf87-smartlegalbot
    const parts = url.split('/g/g-')[1];
    if (parts) {
      // Buscar el primer guión después del ID largo (típicamente 32+ caracteres)
      const firstDashIndex = parts.indexOf('-');
      if (firstDashIndex !== -1 && firstDashIndex >= 30) { // IDs de ChatGPT son largos
        let agentName = parts.substring(firstDashIndex + 1);
        
        // Remover parámetros de URL si existen
        const queryIndex = agentName.indexOf('?');
        if (queryIndex !== -1) {
          agentName = agentName.substring(0, queryIndex);
        }
        
        // Convertir guiones a espacios y capitalizar cada palabra
        const cleanName = agentName
          .replace(/-/g, ' ')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        if (cleanName) {
          return cleanName;
        }
      }
    }
  }
  return url.includes('chatgpt.com') ? 'ChatGPT Agent' : 'External Agent';
}