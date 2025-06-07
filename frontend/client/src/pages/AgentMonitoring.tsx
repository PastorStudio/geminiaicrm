import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, BarChart3, RefreshCw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentWorkload {
  agentId: number;
  agentName: string;
  activeChats: number;
  totalChats: number;
  department?: string;
  role?: string;
}

interface AgentAssignment {
  id: number;
  chatId: string;
  accountId: number;
  assignedToId: number;
  agentName?: string;
  category?: string;
  status: string;
  assignedAt: Date;
  lastActivityAt?: Date;
}

export default function AgentMonitoring() {
  const [workloads, setWorkloads] = useState<AgentWorkload[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAssignments: 0,
    totalChats: 0,
    averageLoad: 0
  });
  const { toast } = useToast();

  // Cargar datos de monitoreo
  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // Obtener carga de trabajo de agentes
      const workloadResponse = await fetch('/api/agent-assignments/workloads');
      const workloadData = await workloadResponse.json();
      
      if (workloadData.success) {
        setWorkloads(workloadData.workloads);
        
        // Calcular estadísticas
        const totalChats = workloadData.workloads.reduce((sum: number, agent: AgentWorkload) => sum + agent.activeChats, 0);
        const avgLoad = workloadData.workloads.length > 0 ? totalChats / workloadData.workloads.length : 0;
        
        setStats({
          totalAgents: workloadData.workloads.length,
          activeAssignments: totalChats,
          totalChats,
          averageLoad: Math.round(avgLoad * 10) / 10
        });
      }

      toast({
        title: "Datos actualizados",
        description: "Información de asignaciones cargada exitosamente",
      });
    } catch (error) {
      console.error('Error cargando datos de monitoreo:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de monitoreo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Asignar chat manualmente a agente específico
  const assignChatToAgent = async (chatId: string, accountId: number, agentId: number) => {
    try {
      const response = await fetch('/api/agent-assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          accountId,
          assignedToId: agentId,
          category: 'manual',
          notes: 'Asignación manual desde panel de administración'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Chat asignado",
          description: `Chat asignado exitosamente al agente`,
        });
        loadMonitoringData(); // Recargar datos
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error asignando chat:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el chat al agente",
        variant: "destructive",
      });
    }
  };

  // Auto-asignar chat basado en carga de trabajo
  const autoAssignChat = async (chatId: string, accountId: number) => {
    try {
      const response = await fetch('/api/agent-assignments/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          accountId,
          category: 'auto'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Auto-asignación exitosa",
          description: `Chat asignado automáticamente a ${result.assignment.agentName}`,
        });
        loadMonitoringData(); // Recargar datos
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error en auto-asignación:', error);
      toast({
        title: "Error",
        description: "No se pudo auto-asignar el chat",
        variant: "destructive",
      });
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadMonitoringData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Monitoreo de Asignaciones</h1>
        <p className="text-gray-600">
          Sistema invisible de asignación de agentes - Funciona automáticamente sin que los usuarios finales lo noten
        </p>
      </div>

      {/* Estadísticas generales */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Agentes Activos</p>
                <p className="text-2xl font-bold">{stats.totalAgents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chats Asignados</p>
                <p className="text-2xl font-bold">{stats.activeAssignments}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Carga Promedio</p>
                <p className="text-2xl font-bold">{stats.averageLoad}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sistema</p>
                <p className="text-sm font-bold text-green-600">Funcionando</p>
              </div>
              <Settings className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control del sistema */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Control del Sistema Invisible</span>
              <Button 
                onClick={loadMonitoringData} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Funciones Automáticas</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Auto-asignación por carga de trabajo</li>
                  <li>✅ Categorización automática de chats</li>
                  <li>✅ Seguimiento de actividad invisible</li>
                  <li>✅ Balanceador de carga en tiempo real</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Configuración</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => autoAssignChat('demo_chat', 1)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Probar Auto-asignación
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carga de trabajo por agente */}
      <Card>
        <CardHeader>
          <CardTitle>Carga de Trabajo por Agente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workloads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay agentes disponibles</p>
                <p className="text-sm">Los agentes aparecerán automáticamente cuando estén activos</p>
              </div>
            ) : (
              workloads.map((agent) => (
                <div key={agent.agentId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.agentName}</p>
                      <div className="flex items-center space-x-2">
                        {agent.department && (
                          <Badge variant="outline" className="text-xs">
                            {agent.department}
                          </Badge>
                        )}
                        {agent.role && (
                          <Badge variant="secondary" className="text-xs">
                            {agent.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-gray-600">Chats Activos</p>
                        <p className="text-2xl font-bold text-center">{agent.activeChats}</p>
                      </div>
                      
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min((agent.activeChats / 10) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      
                      <Badge 
                        variant={agent.activeChats === 0 ? "secondary" : agent.activeChats < 5 ? "default" : "destructive"}
                      >
                        {agent.activeChats === 0 ? 'Libre' : agent.activeChats < 5 ? 'Normal' : 'Ocupado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Importante:</strong> Este sistema funciona de manera completamente invisible para los usuarios finales de WhatsApp. 
          Las asignaciones se realizan automáticamente en segundo plano, permitiendo al CRM rastrear qué agente está trabajando 
          con cada chat sin afectar la experiencia del usuario.
        </p>
      </div>
    </div>
  );
}