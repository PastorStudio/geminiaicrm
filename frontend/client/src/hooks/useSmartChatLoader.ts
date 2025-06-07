import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ChatLoadingState {
  isLoading: boolean;
  error: string | null;
  chatsLoaded: number;
  totalChats: number;
  progress: number;
}

interface SmartChatLoaderOptions {
  accountIds: number[];
  enabled: boolean;
  batchSize?: number;
  priorityChats?: string[];
}

/**
 * Hook para optimización inteligente de carga de chats
 * Implementa carga por lotes, priorización y cache inteligente
 */
export function useSmartChatLoader(options: SmartChatLoaderOptions) {
  const { accountIds, enabled, batchSize = 10, priorityChats = [] } = options;
  
  const [loadingState, setLoadingState] = useState<ChatLoadingState>({
    isLoading: false,
    error: null,
    chatsLoaded: 0,
    totalChats: 0,
    progress: 0
  });
  
  const [loadedChats, setLoadedChats] = useState<any[]>([]);
  const [chatBatches, setChatBatches] = useState<string[][]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache inteligente con tiempo de vida
  const cacheKey = `smart_chats_${accountIds.join('_')}`;
  const cacheExpiry = 5 * 60 * 1000; // 5 minutos
  
  // Obtener lista inicial de chats de todas las cuentas
  const { data: chatList, isLoading: isLoadingList } = useQuery({
    queryKey: ['chat-list', accountIds],
    queryFn: async () => {
      if (!enabled || accountIds.length === 0) return [];
      
      const allChats: any[] = [];
      
      for (const accountId of accountIds) {
        try {
          const response = await apiRequest(`/api/whatsapp-accounts/${accountId}/chats`);
          if (Array.isArray(response)) {
            const chatsWithAccount = response.map(chat => ({
              ...chat,
              accountId,
              priority: priorityChats.includes(chat.id) ? 1 : 0
            }));
            allChats.push(...chatsWithAccount);
          }
        } catch (error) {
          console.warn(`Error cargando chats de cuenta ${accountId}:`, error);
        }
      }
      
      // Ordenar por prioridad y luego por actividad reciente
      return allChats.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    },
    enabled: enabled && accountIds.length > 0,
    staleTime: cacheExpiry / 2,
    gcTime: cacheExpiry
  });
  
  // Crear lotes de chats para carga progresiva
  const createChatBatches = useCallback(() => {
    if (!chatList || chatList.length === 0) return;
    
    const batches: string[][] = [];
    for (let i = 0; i < chatList.length; i += batchSize) {
      const batch = chatList.slice(i, i + batchSize).map(chat => chat.id);
      batches.push(batch);
    }
    
    setChatBatches(batches);
    setLoadingState(prev => ({
      ...prev,
      totalChats: chatList.length,
      chatsLoaded: 0,
      progress: 0
    }));
  }, [chatList, batchSize]);
  
  // Cargar lote de chats con mensajes
  const loadChatBatch = useCallback(async (batchIndex: number) => {
    if (!chatBatches[batchIndex] || !enabled) return;
    
    const batch = chatBatches[batchIndex];
    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Crear controlador de abort para cancelar si es necesario
      abortControllerRef.current = new AbortController();
      
      const batchPromises = batch.map(async (chatId) => {
        const chat = chatList?.find(c => c.id === chatId);
        if (!chat) return null;
        
        try {
          // Cargar mensajes recientes para este chat (solo últimos 10)
          const messages = await apiRequest(
            `/api/whatsapp-accounts/${chat.accountId}/messages/${chatId}?limit=10`
          );
          
          return {
            ...chat,
            messages: Array.isArray(messages) ? messages : [],
            loaded: true,
            loadedAt: Date.now()
          };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error; // Re-throw abort errors
          }
          console.warn(`Error cargando mensajes para chat ${chatId}:`, error);
          return {
            ...chat,
            messages: [],
            loaded: false,
            error: 'Error al cargar mensajes'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validChats = batchResults.filter(Boolean);
      
      setLoadedChats(prev => {
        const newChats = [...prev, ...validChats];
        // Guardar en cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            chats: newChats,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('No se pudo guardar en cache:', e);
        }
        return newChats;
      });
      
      setLoadingState(prev => ({
        ...prev,
        chatsLoaded: prev.chatsLoaded + validChats.length,
        progress: Math.min(100, ((prev.chatsLoaded + validChats.length) / prev.totalChats) * 100),
        isLoading: batchIndex < chatBatches.length - 1
      }));
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Carga de lote cancelada');
        return;
      }
      
      console.error(`Error cargando lote ${batchIndex}:`, error);
      setLoadingState(prev => ({
        ...prev,
        error: `Error cargando chats: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        isLoading: false
      }));
    }
  }, [chatBatches, chatList, enabled, cacheKey]);
  
  // Cargar desde cache al inicializar
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { chats, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < cacheExpiry && Array.isArray(chats)) {
          console.log(`Cargando ${chats.length} chats desde cache (${Math.round(age/1000)}s de antigüedad)`);
          setLoadedChats(chats);
          setLoadingState(prev => ({
            ...prev,
            chatsLoaded: chats.length,
            totalChats: chats.length,
            progress: 100
          }));
          return true;
        }
      }
    } catch (e) {
      console.warn('Error cargando desde cache:', e);
    }
    return false;
  }, [cacheKey, cacheExpiry]);
  
  // Cancelar carga en curso
  const cancelLoading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingState(prev => ({ ...prev, isLoading: false }));
  }, []);
  
  // Reiniciar carga
  const restartLoading = useCallback(() => {
    cancelLoading();
    setLoadedChats([]);
    setCurrentBatchIndex(0);
    localStorage.removeItem(cacheKey);
    createChatBatches();
  }, [cancelLoading, cacheKey, createChatBatches]);
  
  // Efecto para inicializar
  useEffect(() => {
    if (!enabled || accountIds.length === 0) return;
    
    // Intentar cargar desde cache primero
    const cacheLoaded = loadFromCache();
    
    if (!cacheLoaded && chatList) {
      createChatBatches();
    }
  }, [enabled, accountIds, chatList, loadFromCache, createChatBatches]);
  
  // Efecto para cargar lotes progresivamente
  useEffect(() => {
    if (!enabled || chatBatches.length === 0 || currentBatchIndex >= chatBatches.length) return;
    
    const timer = setTimeout(() => {
      loadChatBatch(currentBatchIndex);
      setCurrentBatchIndex(prev => prev + 1);
    }, 100); // Pequeño delay entre lotes
    
    return () => clearTimeout(timer);
  }, [enabled, chatBatches, currentBatchIndex, loadChatBatch]);
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      cancelLoading();
    };
  }, [cancelLoading]);
  
  return {
    chats: loadedChats,
    loadingState,
    isLoading: loadingState.isLoading || isLoadingList,
    error: loadingState.error,
    progress: loadingState.progress,
    cancelLoading,
    restartLoading,
    
    // Métodos adicionales
    getChatById: useCallback((chatId: string) => {
      return loadedChats.find(chat => chat.id === chatId);
    }, [loadedChats]),
    
    getChatsForAccount: useCallback((accountId: number) => {
      return loadedChats.filter(chat => chat.accountId === accountId);
    }, [loadedChats]),
    
    searchChats: useCallback((query: string) => {
      if (!query.trim()) return loadedChats;
      const lowerQuery = query.toLowerCase();
      return loadedChats.filter(chat => 
        chat.name?.toLowerCase().includes(lowerQuery) ||
        chat.id.toLowerCase().includes(lowerQuery) ||
        chat.messages?.some((msg: any) => 
          msg.body?.toLowerCase().includes(lowerQuery)
        )
      );
    }, [loadedChats])
  };
}