import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface CalendarStatus {
  configured: boolean;
  authenticated: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

interface CalendarIntegrationProps {
  leadId?: number;
  leadName?: string;
}

export function CalendarIntegration({ leadId, leadName }: CalendarIntegrationProps) {
  const [status, setStatus] = useState<CalendarStatus>({ configured: false, authenticated: false });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDateTime, setEventDateTime] = useState('');
  const [eventDuration, setEventDuration] = useState(60);
  const { toast } = useToast();

  useEffect(() => {
    checkCalendarStatus();
    if (status.authenticated) {
      loadEvents();
    }
  }, [status.authenticated]);

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const connectCalendar = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/auth-url');
      const data = await response.json();
      
      if (data.authUrl) {
        window.open(data.authUrl, 'calendar-auth', 'width=500,height=600');
        
        // Poll for authentication completion
        const pollAuth = setInterval(async () => {
          await checkCalendarStatus();
          if (status.authenticated) {
            clearInterval(pollAuth);
            toast({
              title: "Google Calendar conectado",
              description: "Ya puedes crear eventos automáticamente para tus leads",
            });
            loadEvents();
          }
        }, 2000);
        
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollAuth), 120000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error conectando con Google Calendar",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  const createEvent = async () => {
    if (!leadId || !eventTitle || !eventDateTime) {
      toast({
        title: "Error",
        description: "Completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          title: eventTitle,
          dateTime: eventDateTime,
          duration: eventDuration
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Evento creado",
          description: "El evento se ha agregado a tu calendario",
        });
        setShowEventDialog(false);
        setEventTitle('');
        setEventDateTime('');
        loadEvents();
        queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      } else {
        throw new Error(data.error || 'Error creating event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error creando el evento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAutoFollowup = async () => {
    if (!leadId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/calendar/auto-followup/${leadId}`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Seguimiento programado",
          description: data.message,
        });
        loadEvents();
      } else {
        toast({
          title: "Información",
          description: data.message || "No se pudo programar el seguimiento",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error programando el seguimiento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!status.configured) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">Google Calendar no configurado</h3>
        </div>
        <p className="text-sm text-yellow-700 mb-3">
          Configura las credenciales de Google Calendar para crear eventos automáticamente
        </p>
        <div className="text-xs text-yellow-600 space-y-1">
          <p>1. Ve a Google Cloud Console</p>
          <p>2. Habilita Google Calendar API</p>
          <p>3. Crea credenciales OAuth 2.0</p>
          <p>4. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET</p>
        </div>
      </div>
    );
  }

  if (!status.authenticated) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Conectar Google Calendar</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Conecta tu cuenta de Google para crear eventos automáticamente
        </p>
        <Button 
          onClick={connectCalendar} 
          disabled={isLoading}
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {isLoading ? 'Conectando...' : 'Conectar Google Calendar'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Google Calendar</h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            Conectado
          </span>
        </div>
      </div>

      {leadId && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={createAutoFollowup}
            disabled={isLoading}
          >
            <Clock className="h-4 w-4 mr-1" />
            Seguimiento 24h
          </Button>

          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Crear Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Evento de Calendario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título del Evento</Label>
                  <Input
                    id="title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder={`Reunión con ${leadName || 'cliente'}`}
                  />
                </div>
                <div>
                  <Label htmlFor="datetime">Fecha y Hora</Label>
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duración (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(Number(e.target.value))}
                    min={15}
                    max={480}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={createEvent} disabled={isLoading} className="flex-1">
                    {isLoading ? 'Creando...' : 'Crear Evento'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Próximos Eventos</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="text-xs p-2 bg-gray-50 rounded border">
                <div className="font-medium">{event.summary}</div>
                <div className="text-gray-600">
                  {new Date(event.start.dateTime).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}