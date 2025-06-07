import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Shield, Eye, Activity, Clock, MousePointer, Keyboard, FileText, AlertTriangle } from 'lucide-react';

interface AgentActivity {
  id: number;
  agentId: number;
  action: string;
  page: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  activityType: string;
  targetElement: string;
  coordinates: string;
  formData: string;
  sessionDuration: number;
  category: string;
}

interface Agent {
  id: number;
  username: string;
  isActive: boolean;
  lastActivity: string;
}

export default function AgentSecurity() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState('24h');

  // Obtener lista de agentes
  const { data: agents } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
    refetchInterval: 5000
  });

  // Obtener actividades de agentes
  const { data: activities, refetch } = useQuery({
    queryKey: ['/api/agent-activities', selectedAgent, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgent) params.set('agentId', selectedAgent.toString());
      params.set('timeRange', timeRange);
      
      const res = await fetch(`/api/agent-activities?${params}`);
      return res.json();
    },
    refetchInterval: 2000
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'interaction': return <MousePointer className="h-4 w-4" />;
      case 'keyboard': return <Keyboard className="h-4 w-4" />;
      case 'form': return <FileText className="h-4 w-4" />;
      case 'navigation': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (category: string) => {
    switch (category) {
      case 'interaction': return 'bg-blue-100 text-blue-800';
      case 'keyboard': return 'bg-purple-100 text-purple-800';
      case 'form': return 'bg-green-100 text-green-800';
      case 'navigation': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return parsed;
    } catch {
      return { raw: details };
    }
  };

  const getSuspiciousActivities = () => {
    if (!activities?.activities) return [];
    
    return activities.activities.filter((activity: AgentActivity) => {
      const details = formatDetails(activity.details);
      
      // Detectar actividades sospechosas
      const suspiciousPatterns = [
        activity.action.includes('copy'),
        activity.action.includes('download'),
        details.target?.includes('sensitive'),
        activity.page.includes('admin'),
        details.keySequence?.includes('Ctrl+'),
        activity.sessionDuration && activity.sessionDuration > 8 * 60 * 60 * 1000 // 8 horas
      ];
      
      return suspiciousPatterns.some(Boolean);
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-6 w-6 text-red-600" />
        <h1 className="text-2xl font-bold">Sistema de Seguridad y Control de Agentes</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Agentes Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {agents?.filter((a: Agent) => a.isActive)?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actividades Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities?.totalActivities || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actividades Sospechosas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {getSuspiciousActivities()?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tiempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              En Línea
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Agentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Agentes Monitoreados</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {agents?.map((agent: Agent) => (
                  <div
                    key={agent.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAgent === agent.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{agent.username}</span>
                      <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                        {agent.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Última actividad: {new Date(agent.lastActivity).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Actividades en Tiempo Real */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Actividades en Tiempo Real</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant={timeRange === '1h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('1h')}
                >
                  1h
                </Button>
                <Button
                  variant={timeRange === '24h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('24h')}
                >
                  24h
                </Button>
                <Button
                  variant={timeRange === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('7d')}
                >
                  7d
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="suspicious">Sospechosas</TabsTrigger>
                <TabsTrigger value="forms">Formularios</TabsTrigger>
                <TabsTrigger value="navigation">Navegación</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {activities?.activities?.map((activity: any) => {
                      return (
                        <div key={activity.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{activity.icon}</span>
                              <Badge className={getActivityColor(activity.category)}>
                                {activity.category}
                              </Badge>
                              <span className="font-medium">{activity.translatedAction}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {activity.readableTime}
                            </div>
                          </div>
                          
                          {activity.priority === 'high' && (
                            <div className="mt-2 flex items-center space-x-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs font-medium">Actividad importante</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="suspicious" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {getSuspiciousActivities()?.map((activity: AgentActivity) => (
                      <div key={activity.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                        <div className="flex items-center space-x-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">ACTIVIDAD SOSPECHOSA</span>
                        </div>
                        <div className="mt-2 text-sm">
                          <div><strong>Acción:</strong> {activity.action}</div>
                          <div><strong>Página:</strong> {activity.page}</div>
                          <div><strong>Agente:</strong> {activity.agentId}</div>
                          <div><strong>Tiempo:</strong> {new Date(activity.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}