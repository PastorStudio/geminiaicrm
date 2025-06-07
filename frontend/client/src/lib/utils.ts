import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string = ''): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// Función para formatear URLs en mensajes con enlaces clickeables
export function formatMessageWithLinks(text: string): JSX.Element[] | string {
  if (!text) return '';
  
  // Regex para detectar URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Si no hay enlaces, devolver el texto original
  if (!text.match(urlRegex)) {
    return text;
  }
  
  // Dividir el texto por URLs y crear elementos JSX
  const parts = text.split(urlRegex);
  const matches = text.match(urlRegex) || [];
  const result: JSX.Element[] = [];
  
  // Intercalar texto normal con enlaces
  for (let i = 0; i < parts.length; i++) {
    // Agregar el texto normal
    if (parts[i]) {
      result.push(React.createElement('span', { key: `text-${i}` }, parts[i]));
    }
    
    // Agregar el enlace (si existe en esta posición)
    if (i < matches.length) {
      result.push(
        React.createElement('a', {
          key: `link-${i}`,
          href: matches[i],
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-blue-600 hover:underline font-medium',
          onClick: (e: React.MouseEvent) => e.stopPropagation()
        }, matches[i])
      );
    }
  }
  
  return result;
}
