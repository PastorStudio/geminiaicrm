import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Activity, 
  BarChart3,
  UserCheck,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Clock,
  Calendar,
  Target,
  Zap,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActiveAgent {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastActivity?: string;
}

interface AgentActivity {
  id: number;
  agentId: number;
  action: string;
  page: string;
  details?: string;
  timestamp: string;
}

interface AgentMetrics {
  totalActivities: number;
  lastSeen: string;
  totalPages: number;
  mostActiveHours: string[];
  sessionDuration: number;
  assignedChats: number;
}

interface ChatAssignment {
  id: number;
  chatId: string;
  assignedToId: number;
  category: string;
  status: string;
  assignedAt: string;
  agentName: string;
}

export default function InternalAgents() {
  const [agents, setAgents] = useState<ActiveAgent[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [assignments, setAssignments] = useState<ChatAssignment[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<ActiveAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();

  // Roles con colores
  const roleColors = {
    superadmin: 'bg-red-500 text-white',
    admin: 'bg-red-400 text-white',
    supervisor: 'bg-orange-500 text-white',
    agent: 'bg-green-500 text-white',
    viewer: 'bg-blue-500 text-white'
  };

  // Cargar agentes activos del sistema
  const fetchActiveAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Error obteniendo usuarios');
      
      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        // Filtrar solo agentes activos
        const activeAgents = data.users.filter((user: ActiveAgent) => 
          user.status === 'active' && 
          ['agent', 'supervisor', 'admin', 'superadmin'].includes(user.role.toLowerCase())
        );
        setAgents(activeAgents);
      }
    } catch (error) {
      console.error('Error cargando agentes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los agentes activos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar actividades recientes
  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      if (response.ok) {
        const data = await response.json();
        setActivities(data || []);
      }
    } catch (error) {
      console.error('Error cargando actividades:', error);
    }
  };

  // Cargar asignaciones de chats
  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/chat-assignments');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setAssignments(data);
        }
      }
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
    }
  };

  // Obtener métricas de un agente específico
  const getAgentMetrics = (agentId: number): AgentMetrics => {
    const agentActivities = activities.filter(a => a.agentId === agentId);
    const agentAssignments = assignments.filter(a => a.assignedToId === agentId);
    
    const pages = [...new Set(agentActivities.map(a => a.page))];
    const lastActivity = agentActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    return {
      totalActivities: agentActivities.length,
      lastSeen: lastActivity?.timestamp || 'N/A',
      totalPages: pages.length,
      mostActiveHours: [], // Calculado después
      sessionDuration: 0, // Calculado después
      assignedChats: agentAssignments.length
    };
  };

  // Refrescar datos
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActiveAgents(),
      fetchActivities(),
      fetchAssignments()
    ]);
    setRefreshing(false);
  };

  // Formatear fecha relativa
  const timeAgo = (dateString: string) => {
    if (!dateString) return 'Nunca';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 30) return `Hace ${diffDays} días`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Cargando análisis de agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Análisis de Agentes
          </h1>
          <p className="text-gray-600 mt-1">
            Reportes y análisis de actividad para agentes activos del sistema
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agentes Activos</p>
                <p className="text-2xl font-bold text-green-600">{agents.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chats Asignados</p>
                <p className="text-2xl font-bold text-blue-600">{assignments.length}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actividades Hoy</p>
                <p className="text-2xl font-bold text-orange-600">
                  {activities.filter(a => {
                    const today = new Date().toDateString();
                    return new Date(a.timestamp).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Supervisores</p>
                <p className="text-2xl font-bold text-purple-600">
                  {agents.filter(a => ['supervisor', 'admin', 'superadmin'].includes(a.role)).length}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="agents">Análisis por Agente</TabsTrigger>
          <TabsTrigger value="activity">Actividad Reciente</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen General */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Agentes Más Activos
                </CardTitle>
                <CardDescription>
                  Basado en actividad reciente y asignaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents.slice(0, 5).map((agent) => {
                    const metrics = getAgentMetrics(agent.id);
                    return (
                      <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {agent.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{agent.fullName}</p>
                            <p className="text-sm text-gray-500">
                              {metrics.assignedChats} chats asignados
                            </p>
                          </div>
                        </div>
                        <Badge className={roleColors[agent.role as keyof typeof roleColors] || 'bg-gray-500 text-white'}>
                          {agent.role}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Distribución de Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Distribución de Roles
                </CardTitle>
                <CardDescription>
                  Agentes activos por nivel de acceso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    agents.reduce((acc, agent) => {
                      acc[agent.role] = (acc[agent.role] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={roleColors[role as keyof typeof roleColors] || 'bg-gray-500 text-white'}>
                          {role}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {count} agente{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${(count / agents.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Análisis por Agente */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const metrics = getAgentMetrics(agent.id);
              return (
                <Card key={agent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {agent.fullName.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{agent.fullName}</CardTitle>
                          <CardDescription>{agent.username}</CardDescription>
                        </div>
                      </div>
                      <Badge className={roleColors[agent.role as keyof typeof roleColors] || 'bg-gray-500 text-white'}>
                        {agent.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{metrics.assignedChats}</p>
                        <p className="text-xs text-gray-500">Chats Asignados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{metrics.totalActivities}</p>
                        <p className="text-xs text-gray-500">Actividades</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Última actividad: {timeAgo(metrics.lastSeen)}</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAgent(agent)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab: Actividad Reciente */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Actividad Reciente del Sistema
              </CardTitle>
              <CardDescription>
                Últimas acciones realizadas por los agentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.slice(0, 20).map((activity) => {
                  const agent = agents.find(a => a.id === activity.agentId);
                  return (
                    <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {agent?.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {agent?.fullName || 'Usuario desconocido'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.action} en {activity.page}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {timeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay actividades recientes registradas
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}