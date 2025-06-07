import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, Bell, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocalEvent {
  id: number;
  lead_id?: number;
  title: string;
  description: string;
  event_date: string;
  reminder_minutes: number;
  event_type: 'followup' | 'meeting' | 'call' | 'reminder' | 'task';
  contact_phone?: string;
  status: 'pending' | 'notified' | 'completed' | 'cancelled';
  created_at: string;
}

interface NotificationData {
  type: string;
  title: string;
  message: string;
  eventId: number;
  eventDate: string;
  contactPhone?: string;
  timestamp: string;
}

export function LocalCalendarIntegration() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'calendar_reminder') {
            setNotifications(prev => [data, ...prev.slice(0, 9)]);
            
            // Show toast notification
            toast({
              title: data.title,
              description: data.message,
              duration: 10000,
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [toast]);

  // Get upcoming events
  const { data: upcomingEvents, isLoading } = useQuery({
    queryKey: ['/api/calendar/events'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/events?limit=20');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      return data.events as LocalEvent[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get today's events
  const { data: todayEvents } = useQuery({
    queryKey: ['/api/calendar/events/today'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/events/today');
      if (!response.ok) throw new Error('Failed to fetch today events');
      const data = await response.json();
      return data.events as LocalEvent[];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Get WhatsApp accounts
  const { data: whatsappAccounts } = useQuery({
    queryKey: ['/api/whatsapp/accounts'],
    queryFn: async () => {
      const response = await fetch('/api/whatsapp/accounts');
      if (!response.ok) throw new Error('Failed to fetch WhatsApp accounts');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: async (data, variables) => {
      console.log('Event creation successful:', data);
      
      // Force dialog closure FIRST
      setIsCreateDialogOpen(false);
      
      // Reset form
      reset({
        title: '',
        description: '',
        eventDate: '',
        reminderMinutes: 30,
        eventType: 'reminder',
        contactPhone: '',
        whatsappAccountId: undefined
      });
      
      // Refresh calendar data
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events/today'] });
      
      // Handle WhatsApp reminder configuration
      if (variables.contactPhone && variables.whatsappAccountId && data.eventId) {
        try {
          const reminderResponse = await fetch('/api/calendar/reminders/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: data.eventId,
              chatId: variables.contactPhone.replace(/[^\d]/g, '') + '@c.us',
              whatsappAccountId: variables.whatsappAccountId,
              reminderMessage: `🗓️ Recordatorio: ${variables.title} programado para hoy. ${variables.description || ''}`,
              reminderTimeMinutes: variables.reminderMinutes || 60,
              autoActivateResponses: true
            })
          });
          
          if (reminderResponse.ok) {
            toast({
              title: "Evento y recordatorio creados",
              description: "El evento se ha programado con recordatorio automático por WhatsApp"
            });
          } else {
            toast({
              title: "Evento creado",
              description: "El evento se creó pero no se pudo configurar el recordatorio WhatsApp"
            });
          }
        } catch (error) {
          toast({
            title: "Evento creado",
            description: "El evento se creó pero no se pudo configurar el recordatorio WhatsApp"
          });
        }
      } else {
        toast({
          title: "Evento creado",
          description: "El evento se ha programado exitosamente"
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el evento",
        variant: "destructive"
      });
    }
  });

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      eventDate: '',
      reminderMinutes: 30,
      eventType: 'reminder',
      contactPhone: '',
      whatsappAccountId: undefined
    }
  });

  const onSubmit = (data: any, event: any) => {
    event?.preventDefault();
    if (createEventMutation.isPending || isSubmitting) return;
    
    // Validate required fields
    if (!data.title || !data.eventDate) {
      toast({
        title: "Error de validación",
        description: "El título y la fecha del evento son obligatorios",
        variant: "destructive"
      });
      return;
    }
    
    createEventMutation.mutate({
      ...data,
      eventDate: new Date(data.eventDate).toISOString()
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'followup': return 'bg-blue-100 text-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'call': return 'bg-yellow-100 text-yellow-800';
      case 'task': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'notified': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendario Local
          </h2>
          <p className="text-gray-600">Gestiona eventos y recordatorios automáticos</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Evento</DialogTitle>
              <DialogDescription>
                Programa un nuevo evento con recordatorio automático
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input 
                  id="title" 
                  {...register('title', { required: true })}
                  placeholder="Título del evento"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea 
                  id="description" 
                  {...register('description')}
                  placeholder="Descripción del evento"
                />
              </div>
              
              <div>
                <Label htmlFor="eventDate">Fecha y Hora</Label>
                <Input 
                  id="eventDate" 
                  type="datetime-local"
                  {...register('eventDate', { required: true })}
                />
              </div>
              
              <div>
                <Label htmlFor="reminderMinutes">Recordatorio (minutos antes)</Label>
                <Select onValueChange={(value) => setValue('reminderMinutes', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="30 minutos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="1440">1 día</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="eventType">Tipo de Evento</Label>
                <Select onValueChange={(value) => setValue('eventType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Recordatorio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Recordatorio</SelectItem>
                    <SelectItem value="followup">Seguimiento</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="call">Llamada</SelectItem>
                    <SelectItem value="task">Tarea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="contactPhone">Teléfono de Contacto (para recordatorio WhatsApp)</Label>
                <Input 
                  id="contactPhone" 
                  {...register('contactPhone')}
                  placeholder="+507 1234-5678"
                />
              </div>
              
              <div>
                <Label htmlFor="whatsappAccountId">Cuenta WhatsApp para Recordatorio</Label>
                <Select onValueChange={(value) => setValue('whatsappAccountId', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappAccounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name} - {account.description || account.ownerName}
                      </SelectItem>
                    )) || <SelectItem value="">No hay cuentas disponibles</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createEventMutation.isPending || isSubmitting}
                >
                  {createEventMutation.isPending ? 'Creando...' : 'Crear Evento'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Live Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notification, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-gray-600">{notification.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Eventos de Hoy
            </CardTitle>
            <CardDescription>
              {todayEvents?.length || 0} eventos programados para hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayEvents?.length ? (
              <div className="space-y-3">
                {todayEvents.map((event) => {
                  const { date, time } = formatEventDate(event.event_date);
                  return (
                    <div key={event.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-2">{time}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type}
                          </Badge>
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hay eventos programados para hoy
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
            <CardDescription>
              {upcomingEvents?.length || 0} eventos próximos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">Cargando eventos...</p>
            ) : upcomingEvents?.length ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 10).map((event) => {
                  const { date, time } = formatEventDate(event.event_date);
                  return (
                    <div key={event.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {date} a las {time}
                          </p>
                          {event.contact_phone && (
                            <p className="text-xs text-blue-600 mt-1">
                              📱 {event.contact_phone}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type}
                          </Badge>
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hay eventos próximos
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}