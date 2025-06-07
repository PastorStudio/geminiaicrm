import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Lead {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

export function WhatsAppSender({ leadId }: { leadId?: number }) {
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Si tenemos un ID de lead, obtener sus datos para autocompletar el teléfono
  const { data: lead } = useQuery<Lead>({
    queryKey: leadId ? [`/api/leads/${leadId}`] : [],
    enabled: !!leadId
  });

  // Poner el teléfono del lead si existe
  useEffect(() => {
    if (lead?.phone) {
      setPhoneNumber(lead.phone);
    }
  }, [lead]);

  const handleSend = async () => {
    if (!message || !phoneNumber) {
      toast({
        title: 'Error',
        description: 'El mensaje y el número de teléfono son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      
      // Normalizar número de teléfono
      let normalizedPhone = phoneNumber.replace(/[^0-9+]/g, '');
      
      // Asegurar que tenga el prefijo internacional
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone;
      }
      
      const response = await apiRequest('/api/integrations/whatsapp/send', {
        method: 'POST',
        body: {
          to: normalizedPhone,
          message,
          leadId
        }
      });
      
      toast({
        title: 'Mensaje enviado',
        description: 'El mensaje se ha enviado correctamente',
      });
      
      setMessage('');
      
      console.log('WhatsApp message sent:', response);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje de WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Enviar mensaje de WhatsApp</CardTitle>
        <CardDescription>
          Envía un mensaje directo a través de WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Número de teléfono (con código de país)</Label>
          <Input
            id="phone"
            placeholder="+34612345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            placeholder="Escribe tu mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSend} 
          disabled={sending || !message || !phoneNumber}
          className="w-full gap-2"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {sending ? 'Enviando...' : 'Enviar mensaje'}
        </Button>
      </CardFooter>
    </Card>
  );
}