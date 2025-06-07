import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConnectionStatusProps {
  platform: 'whatsapp' | 'telegram';
}

export default function ConnectionStatus({ platform }: ConnectionStatusProps) {
  const { toast } = useToast();
  
  // Definir interfaz para el estado de la conexión
  interface ConnectionStatusData {
    initialized?: boolean;
    ready?: boolean;
    authenticated?: boolean;
    pendingMessages?: number;
    connectedChats?: number[];
  }
  
  // Consultar estado de la conexión
  const { 
    data: status, 
    isLoading: statusLoading,
    error: statusError
  } = useQuery<ConnectionStatusData>({
    queryKey: [`/api/integrations/${platform}/status`],
    refetchInterval: 30000, // Recargar cada 30 segundos
  });
  
  // Mutación para reiniciar la conexión
  const { mutate: restartConnection, isPending: isRestarting } = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/integrations/${platform}/restart`);
    },
    onSuccess: () => {
      toast({
        title: `Conexión de ${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'} reiniciada`,
        description: "La conexión se ha reiniciado correctamente."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/integrations/${platform}/status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo reiniciar la conexión: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Función para determinar el color del badge
  const getBadgeVariant = () => {
    if (statusLoading || statusError) return "secondary";
    if (!status) return "destructive";
    
    return status.ready || status.authenticated 
      ? "success" 
      : status.initialized 
        ? "warning" 
        : "destructive";
  };
  
  // Función para obtener el texto de estado
  const getStatusText = () => {
    if (statusLoading) return "Cargando...";
    if (statusError) return "Error";
    if (!status) return "No disponible";
    
    if (status.ready) return "Conectado";
    if (status.authenticated) return "Autenticado";
    if (status.initialized) return "Inicializado";
    return "Desconectado";
  };
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant={getBadgeVariant() as any} className="capitalize">
        {platform}: {getStatusText()}
      </Badge>
      
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => restartConnection()}
        disabled={isRestarting}
        className="h-7 px-2"
      >
        {isRestarting ? (
          <span className="material-icons animate-spin text-xs mr-1">refresh</span>
        ) : (
          <span className="material-icons text-xs mr-1">refresh</span>
        )}
        <span className="text-xs">Reiniciar</span>
      </Button>
    </div>
  );
}