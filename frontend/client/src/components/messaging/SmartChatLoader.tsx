import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, X, Zap, Clock, CheckCircle } from 'lucide-react';
import { useSmartChatLoader } from '@/hooks/useSmartChatLoader';

interface SmartChatLoaderProps {
  accountIds: number[];
  enabled: boolean;
  onChatsLoaded?: (chats: any[]) => void;
  priorityChats?: string[];
  className?: string;
}

export function SmartChatLoader({ 
  accountIds, 
  enabled, 
  onChatsLoaded,
  priorityChats = [],
  className = ''
}: SmartChatLoaderProps) {
  
  const {
    chats,
    loadingState,
    isLoading,
    error,
    progress,
    cancelLoading,
    restartLoading
  } = useSmartChatLoader({
    accountIds,
    enabled,
    batchSize: 8, // Tamaño de lote optimizado
    priorityChats
  });
  
  // Notificar cuando se carguen chats
  if (onChatsLoaded && chats.length > 0) {
    onChatsLoaded(chats);
  }
  
  if (!enabled || accountIds.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">Carga Inteligente</span>
          <Badge variant="outline" className="text-xs">
            {accountIds.length} cuenta{accountIds.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelLoading}
              className="h-7 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={restartLoading}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Barra de progreso */}
      {(isLoading || progress > 0) && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Cargando chats...</span>
                </>
              ) : progress === 100 ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Carga completada</span>
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Pausado</span>
                </>
              )}
            </div>
            
            <span>
              {loadingState.chatsLoaded} / {loadingState.totalChats} chats
            </span>
          </div>
        </div>
      )}
      
      {/* Estado de error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Error de carga</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Información de chats cargados */}
      {chats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded border">
            <div className="font-medium text-blue-700">Chats Totales</div>
            <div className="text-blue-600">{chats.length}</div>
          </div>
          
          <div className="bg-green-50 p-2 rounded border">
            <div className="font-medium text-green-700">Con Mensajes</div>
            <div className="text-green-600">
              {chats.filter(chat => chat.messages && chat.messages.length > 0).length}
            </div>
          </div>
        </div>
      )}
      
      {/* Tips de optimización */}
      {!isLoading && chats.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
          <div className="flex items-start gap-2">
            <Zap className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700">
              <p className="font-medium">Optimización activa</p>
              <p className="mt-1">
                Chats prioritarios cargados primero. Cache válido por 5 minutos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}