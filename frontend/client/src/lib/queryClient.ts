import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest<T = any>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : undefined;
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...options?.headers
  };

  // Añadir parámetro timestamp para evitar caché
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;

  try {
    const res = await fetch(urlWithTimestamp, {
      method,
      headers,
      body,
      credentials: "include",
      cache: 'no-store'
    });

    await throwIfResNotOk(res);
    
    const contentType = res.headers.get('content-type');
    
    // Si es una respuesta JSON, procesarla normalmente
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    } 
    
    // Si no es JSON, verificar si es HTML (interceptado por Vite)
    const text = await res.text();
    if (text.includes('<!DOCTYPE html>')) {
      console.error('Respuesta HTML detectada (interceptada por Vite):', url);
      
      // Para rutas específicas, intentar usar XMLHttpRequest como alternativa
      if (url.includes('/api/integrations/whatsapp/')) {
        return await makeXhrRequest<T>(urlWithTimestamp, method, headers, body);
      }
      
      // Devolver objeto con error para que la UI pueda mostrar mensaje adecuado
      return { 
        initialized: true, 
        ready: false, 
        error: 'Interceptado por Vite - Intenta recargar la página' 
      } as unknown as T;
    } else {
      console.error(`Invalid content type: ${contentType}, url: ${url}`);
      // Devolver un valor compatible con la estructura esperada para evitar errores
      return { initialized: true, ready: false, error: 'Formato de respuesta no válido' } as T;
    }
  } catch (error) {
    console.error(`Error en solicitud API a ${url}:`, error);
    // Devolver un valor compatible con la estructura esperada para evitar errores
    return { initialized: true, ready: false, error: 'Error de conexión' } as T;
  }
}

// Función auxiliar para usar XMLHttpRequest como alternativa a fetch
async function makeXhrRequest<TData = any>(
  url: string, 
  method: string, 
  headers: Record<string, string>, 
  body?: string
): Promise<TData> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    // Establecer cabeceras
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Verificar si la respuesta es HTML
          if (xhr.responseText.includes('<!DOCTYPE html>')) {
            console.error('XHR también devolvió HTML:', url);
            resolve({ 
              initialized: true, 
              ready: false, 
              error: 'Interceptado por Vite - Intenta recargar la página' 
            } as unknown as T);
          } else {
            // Intentar parsear JSON
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              console.error('Error al parsear respuesta JSON:', e);
              resolve({ 
                initialized: true, 
                ready: false, 
                error: 'Error al procesar respuesta' 
              } as unknown as T);
            }
          }
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`XHR Error - Status: ${xhr.status}`));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('XHR Network Error'));
    };
    
    xhr.send(body);
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // Añadir parámetro timestamp para evitar caché
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&_t=${Date.now()}` 
      : `${url}?_t=${Date.now()}`;
      
    const headers = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    
    try {
      const res = await fetch(urlWithTimestamp, {
        credentials: "include",
        headers,
        cache: 'no-store'
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      const contentType = res.headers.get('content-type');
      
      // Si es una respuesta JSON, procesarla normalmente
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      
      // Si no es JSON, verificar si es HTML (interceptado por Vite)
      const text = await res.text();
      if (text.includes('<!DOCTYPE html>')) {
        console.error('Respuesta HTML detectada en getQueryFn (interceptada por Vite):', url);
        
        // Para rutas específicas, intentar usar XMLHttpRequest como alternativa
        if (url.includes('/api/integrations/whatsapp/')) {
          return await makeXhrRequest<T>(urlWithTimestamp, 'GET', headers);
        }
        
        // Devolver objeto con error para que la UI pueda mostrar mensaje adecuado
        return { 
          initialized: true, 
          ready: false, 
          error: 'Interceptado por Vite - Intenta recargar la página' 
        } as unknown as T;
      }
      
      try {
        // Intentar parsear JSON de todas formas
        return JSON.parse(text);
      } catch (e) {
        console.error('Error al parsear respuesta en getQueryFn:', e);
        return { 
          initialized: true, 
          ready: false, 
          error: 'Error al procesar respuesta' 
        } as unknown as T;
      }
    } catch (error) {
      console.error(`Error en getQueryFn a ${url}:`, error);
      // Si es una ruta de WhatsApp, intentar con XMLHttpRequest
      if (url.includes('/api/integrations/whatsapp/')) {
        try {
          return await makeXhrRequest<T>(urlWithTimestamp, 'GET', headers);
        } catch (xhrError) {
          console.error('Error también en XHR:', xhrError);
        }
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Configurar staleTime para un mejor rendimiento y menos solicitudes
      staleTime: 30000, // 30 segundos antes de considerar datos obsoletos
      // Agregar tiempo de caché para mejorar rendimiento
      gcTime: 300000, // 5 minutos de caché
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
