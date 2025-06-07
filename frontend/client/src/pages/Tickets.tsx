import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Ticket, 
  User, 
  RefreshCw, 
  Search, 
  Filter,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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

const Tickets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Obtener estadísticas de tickets
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<TicketStats>({
    queryKey: ['/api/tickets/stats'],
    queryFn: () => apiRequest('/api/tickets/stats'),
    refetchInterval: 30000, // Actualizar cada 30 segundos
    retry: false
  });

  // Obtener todos los tickets
  const { data: ticketsData, isLoading: ticketsLoading, refetch, error: ticketsError } = useQuery({
    queryKey: ['/api/tickets', selectedStatus, selectedAgent],
    queryFn: () => {
      let url = '/api/tickets?limit=100';
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`;
      if (selectedAgent !== 'all') url += `&assignedTo=${selectedAgent}`;
      return apiRequest(url);
    },
    refetchInterval: 10000, // Actualizar cada 10 segundos
    retry: false
  });

  // Obtener usuarios (agentes)
  const { data: users = [] } = useQuery({
    queryKey: ['/api/system/users'],
    queryFn: () => apiRequest('/api/system/users')
  });

  // Mutación para actualizar estado del ticket
  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: number; updates: any }) => {
      return apiRequest(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/stats'] });
      toast({
        title: 'Ticket actualizado',
        description: 'El ticket se ha actualizado correctamente.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el ticket.',
        variant: 'destructive'
      });
    }
  });

  // Mutación para marcar mensajes como leídos
  const markAsReadMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return apiRequest(`/api/tickets/${ticketId}/read`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: 'Mensajes marcados como leídos',
        description: 'Los mensajes se han marcado como leídos.'
      });
    }
  });

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

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgente: 'bg-red-600',
      alta: 'bg-orange-500',
      media: 'bg-blue-500',
      baja: 'bg-gray-500'
    };
    
    return (
      <Badge className={`${colors[priority as keyof typeof colors] || colors.media} text-white`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  // Valores por defecto seguros
  const safeStats = stats || {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (statsError || ticketsError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sistema de Tickets</h1>
            <p className="text-muted-foreground">
              Gestión automática de conversaciones de WhatsApp
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {statsError ? 'Error al cargar estadísticas de tickets' : 'Error al cargar tickets'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sistema de Tickets</h1>
          <p className="text-muted-foreground">
            Gestión automática de conversaciones de WhatsApp
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
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

      {/* Filtros */}
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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="nuevo">Nuevos</SelectItem>
            <SelectItem value="interesado">Interesados</SelectItem>
            <SelectItem value="no_leido">No Leídos</SelectItem>
            <SelectItem value="pendiente_demo">Pendiente Demo</SelectItem>
            <SelectItem value="completado">Completados</SelectItem>
            <SelectItem value="no_interesado">No Interesados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los agentes</SelectItem>
            {users.map((user: any) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.fullName || user.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getTicketsByStatus(status).map((ticket: TicketData) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{ticket.customerName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{ticket.customerPhone}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Último mensaje:</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{ticket.lastMessage}</p>
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Mensajes: {ticket.totalMessages}</span>
                      <span>Respondidos: {ticket.answeredMessages}</span>
                      {ticket.unreadMessages > 0 && (
                        <span className="text-red-600 font-medium">
                          No leídos: {ticket.unreadMessages}
                        </span>
                      )}
                    </div>

                    {ticket.agentName && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck className="w-4 h-4" />
                        <span>Asignado a: {ticket.agentName}</span>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      <p>Creado: {formatDate(ticket.createdAt)}</p>
                      <p>Última actividad: {formatDate(ticket.lastActivityAt)}</p>
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={ticket.status}
                        onValueChange={(newStatus) => handleStatusChange(ticket.id, newStatus)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nuevo">Nuevo</SelectItem>
                          <SelectItem value="interesado">Interesado</SelectItem>
                          <SelectItem value="no_leido">No Leído</SelectItem>
                          <SelectItem value="pendiente_demo">Pendiente Demo</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="no_interesado">No Interesado</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {ticket.unreadMessages > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markAsReadMutation.mutate(ticket.id)}
                          className="h-8 px-2 text-xs"
                        >
                          Marcar leído
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {getTicketsByStatus(status).length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay tickets en esta categoría</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Tickets;