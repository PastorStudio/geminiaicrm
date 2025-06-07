import React from 'react';

interface MessageTextProps {
  text: string;
  className?: string;
}

export function MessageText({ text, className = '' }: MessageTextProps) {
  if (!text) return null;
  
  // Función para convertir URLs en enlaces HTML
  const linkifyText = (textContent: string) => {
    // Expresión regular mejorada para detectar URLs sin duplicar
    const urlRegex = /https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    
    // Buscar todas las coincidencias de URLs
    const matches = textContent.match(urlRegex);
    
    // Si no hay URLs, devolver el texto original
    if (!matches) {
      return textContent;
    }
    
    // Crear un arreglo de fragmentos de texto y enlaces
    let lastIndex = 0;
    const fragments: React.ReactNode[] = [];
    
    // Función para encontrar la siguiente URL y su posición
    const findNextUrl = (startIndex: number) => {
      let earliestMatch = { url: '', index: Infinity };
      
      for (const url of matches) {
        const index = textContent.indexOf(url, startIndex);
        if (index !== -1 && index < earliestMatch.index) {
          earliestMatch = { url, index };
        }
      }
      
      return earliestMatch.index !== Infinity ? earliestMatch : null;
    };
    
    // Procesar el texto fragmento por fragmento
    let nextMatch = findNextUrl(lastIndex);
    while (nextMatch) {
      const { url, index } = nextMatch;
      
      // Agregar el texto antes de la URL
      if (index > lastIndex) {
        fragments.push(
          <span key={`text-${lastIndex}`}>
            {textContent.substring(lastIndex, index)}
          </span>
        );
      }
      
      // Agregar la URL como enlace
      fragments.push(
        <a
          key={`link-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-medium"
        >
          {url}
        </a>
      );
      
      // Actualizar el índice para la siguiente búsqueda
      lastIndex = index + url.length;
      
      // Buscar la siguiente URL
      nextMatch = findNextUrl(lastIndex);
    }
    
    // Agregar cualquier texto restante después de la última URL
    if (lastIndex < textContent.length) {
      fragments.push(
        <span key={`text-${lastIndex}`}>
          {textContent.substring(lastIndex)}
        </span>
      );
    }
    
    // Usamos createElement para evitar problemas con data-replit-metadata
    return React.createElement(React.Fragment, null, ...fragments);
  };
  
  return <div className={className}>{linkifyText(text)}</div>;
}