import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  RefreshCw, 
  Search, 
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Phone,
  User
} from 'lucide-react';

interface TicketData {
  id: number;
  chatId: string;
  accountId: number;
  customerName: string;
  customerPhone: string;
  status: string;
  priority: string;
  lastMessage: string;
  totalMessages: number;
  answeredMessages: number;
  unreadMessages: number;
  createdAt: string;
  lastActivityAt: string;
  closedAt?: string;
  notes?: string;
  tags?: string[];
  agentName?: string;
  agentUsername?: string;
}

interface TicketStats {
  byStatus: {
    nuevo: number;
    interesado: number;
    no_leido: number;
    pendiente_demo: number;
    completado: number;
    no_interesado: number;
  };
  totals: {
    total: number;
    active: number;
    today: number;
  };
}

const TicketsSimple = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Obtener estadísticas de tickets
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/tickets/stats'],
    staleTime: 30000,
    refetchInterval: 30000
  });

  // Obtener lista de tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/tickets'],
    staleTime: 30000,
    refetchInterval: 30000
  });

  // Mutación para actualizar estado de ticket
  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: number; updates: any }) => {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Error actualizando ticket');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/stats'] });
    }
  });

  // Valores seguros para evitar errores - usando datos reales de la API
  const safeStats = stats ? {
    byStatus: stats.byStatus || {
      nuevo: 0,
      interesado: 0,
      no_leido: 0,
      pendiente_demo: 0,
      completado: 0,
      no_interesado: 0
    },
    totals: stats.totals || {
      total: 0,
      active: 0,
      today: 0
    }
  } : {
    byStatus: {
      nuevo: 0,
      interesado: 0,
      no_leido: 0,
      pendiente_demo: 0,
      completado: 0,
      no_interesado: 0
    },
    totals: {
      total: 0,
      active: 0,
      today: 0
    }
  };

  const safeTicketsData = ticketsData || { tickets: [] };
  const safeTicketsArray = Array.isArray(safeTicketsData.tickets) ? safeTicketsData.tickets : [];

  const filteredTickets = safeTicketsArray.filter((ticket: TicketData) => {
    const matchesSearch = ticket.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerPhone?.includes(searchTerm) ||
                         ticket.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTicketsByStatus = (status: string) => {
    return filteredTickets.filter((ticket: TicketData) => ticket.status === status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = (ticketId: number, newStatus: string) => {
    updateTicketMutation.mutate({
      ticketId,
      updates: { status: newStatus }
    });
  };

  if (statsLoading || ticketsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Cargando sistema de tickets...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      nuevo: { color: 'bg-blue-500', icon: <AlertCircle className="w-3 h-3" />, label: 'Nuevo' },
      interesado: { color: 'bg-green-500', icon: <Eye className="w-3 h-3" />, label: 'Interesado' },
      no_leido: { color: 'bg-red-500', icon: <MessageSquare className="w-3 h-3" />, label: 'No Leído' },
      pendiente_demo: { color: 'bg-yellow-500', icon: <Clock className="w-3 h-3" />, label: 'Pendiente Demo' },
      completado: { color: 'bg-emerald-500', icon: <CheckCircle className="w-3 h-3" />, label: 'Completado' },
      no_interesado: { color: 'bg-gray-500', icon: <XCircle className="w-3 h-3" />, label: 'No Interesado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.nuevo;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sistema de Tickets</h1>
          <p className="text-muted-foreground">
            Gestión automática de conversaciones de WhatsApp
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.totals.total}</div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tickets Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{safeStats.totals.active}</div>
            <p className="text-xs text-muted-foreground">Pendientes de atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{safeStats.totals.today}</div>
            <p className="text-xs text-muted-foreground">Tickets creados hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No Leídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{safeStats.byStatus.no_leido}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por cliente, teléfono o mensaje..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tabs por categorías de tickets */}
      <Tabs defaultValue="nuevo" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="nuevo" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Nuevos ({safeStats.byStatus.nuevo})
          </TabsTrigger>
          <TabsTrigger value="interesado" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Interesados ({safeStats.byStatus.interesado})
          </TabsTrigger>
          <TabsTrigger value="no_leido" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            No Leídos ({safeStats.byStatus.no_leido})
          </TabsTrigger>
          <TabsTrigger value="pendiente_demo" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pendiente Demo ({safeStats.byStatus.pendiente_demo})
          </TabsTrigger>
          <TabsTrigger value="completado" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completados ({safeStats.byStatus.completado})
          </TabsTrigger>
          <TabsTrigger value="no_interesado" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            No Interesados ({safeStats.byStatus.no_interesado})
          </TabsTrigger>
        </TabsList>

        {/* Contenido de cada tab */}
        {(['nuevo', 'interesado', 'no_leido', 'pendiente_demo', 'completado', 'no_interesado'] as const).map((status) => (
          <TabsContent key={status} value={status}>
            {getTicketsByStatus(status).length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Ticket className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No hay tickets en esta categoría</h3>
                <p className="text-muted-foreground mb-4">
                  {status === 'nuevo' && "Los nuevos tickets aparecerán aquí cuando lleguen mensajes de WhatsApp."}
                  {status === 'interesado' && "Los clientes interesados en servicios aparecerán aquí."}
                  {status === 'no_leido' && "Los mensajes no leídos aparecerán aquí."}
                  {status === 'pendiente_demo' && "Los clientes que solicitaron demostraciones aparecerán aquí."}
                  {status === 'completado' && "Los tickets completados aparecerán aquí."}
                  {status === 'no_interesado' && "Los clientes no interesados aparecerán aquí."}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">Sistema Integrado con WhatsApp:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Categorización automática por contenido</li>
                    <li>• Asignación inteligente a agentes</li>
                    <li>• Seguimiento de métricas en tiempo real</li>
                    <li>• Priorización automática por urgencia</li>
                    <li>• Filtros avanzados y búsqueda</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {getTicketsByStatus(status).map((ticket: TicketData) => (
                  <Card key={ticket.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{ticket.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{ticket.customerPhone}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {ticket.lastMessage}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📧 {ticket.totalMessages} mensajes</span>
                            <span>✅ {ticket.answeredMessages} respondidos</span>
                            <span>📮 {ticket.unreadMessages} sin leer</span>
                            <span>🕒 {formatDate(ticket.lastActivityAt)}</span>
                          </div>
                          
                          {ticket.agentName && (
                            <div className="mt-2 text-xs text-blue-600">
                              Asignado a: {ticket.agentName}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(ticket.status)}
                          <Badge variant="outline" className={
                            ticket.priority === 'alta' ? 'border-red-500 text-red-700' :
                            ticket.priority === 'media' ? 'border-yellow-500 text-yellow-700' :
                            'border-green-500 text-green-700'
                          }>
                            {ticket.priority === 'alta' ? '🔴 Alta' :
                             ticket.priority === 'media' ? '🟡 Media' : '🟢 Baja'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TicketsSimple;