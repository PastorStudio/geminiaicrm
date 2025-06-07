import { useState } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function SystemRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const response = await apiRequest('/api/system/refresh', {
        method: 'POST'
      });

      if (response.success) {
        setLastUpdate(new Date());
        
        // Invalidate all dashboard-related queries to force refresh
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/dashboard-metrics'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        
        toast({
          title: "Sistema actualizado",
          description: `${response.data.totalLeads} leads en total`,
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el sistema",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {lastUpdate && (
          <div className="bg-green-100 border border-green-200 text-green-800 px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-md">
            <CheckCircle className="h-3 w-3" />
            Actualizado {lastUpdate.toLocaleTimeString()}
          </div>
        )}
        
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <RefreshCw 
            className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
          {isRefreshing ? 'Actualizando...' : 'Actualizar Sistema'}
        </Button>
      </div>
    </div>
  );
}