import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
// Removed InputOTP components to fix rendering issues
import { Smartphone, CheckCircle, XCircle, ArrowRightCircle } from 'lucide-react';

export interface PhoneConnectProps {
  accountId: number;
  onSuccess?: () => void;
}

export function WhatsAppPhoneConnect({ accountId, onSuccess }: PhoneConnectProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'connecting'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Iniciar conexión solicitando código al número de teléfono
  const handleRequestCode = async () => {
    // Validar número de teléfono
    if (!phoneNumber || phoneNumber.length < 8) {
      setError('Por favor ingrese un número de teléfono válido');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest(`/api/whatsapp-accounts/${accountId}/phone-connect/request`, {
        method: 'POST',
        body: {
          phoneNumber: phoneNumber.replace(/[^0-9]/g, '') // Eliminar cualquier caracter no numérico
        }
      });

      if (response.success) {
        toast({
          title: '¡Código enviado!',
          description: 'Se ha enviado un código a tu WhatsApp. Por favor, ingrésalo a continuación.',
          variant: 'default'
        });
        setStep('code');
      } else {
        setError(response.message || 'Error al solicitar código');
      }
    } catch (err) {
      console.error('Error solicitando código:', err);
      setError('No se pudo solicitar el código. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar código y completar la conexión
  const handleVerifyCode = async () => {
    // Validar código
    if (!code || code.length !== 8) {
      setError('Por favor ingrese el código de 8 dígitos completo');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('connecting');

    try {
      const response = await apiRequest(`/api/whatsapp-accounts/${accountId}/phone-connect/verify`, {
        method: 'POST',
        body: {
          phoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
          code
        }
      });

      if (response.success) {
        toast({
          title: '¡Conexión exitosa!',
          description: 'Tu cuenta de WhatsApp ha sido conectada correctamente.',
          variant: 'default'
        });
        
        // Llamar al callback de éxito si existe
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(response.message || 'Código incorrecto o expirado');
        setStep('code'); // Volver a mostrar campo de código
      }
    } catch (err) {
      console.error('Error verificando código:', err);
      setError('Error de conexión. Intente nuevamente.');
      setStep('code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="mr-2 h-5 w-5" />
          Conectar por teléfono
        </CardTitle>
        <CardDescription>
          Conecta WhatsApp usando tu número de teléfono y un código de verificación
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {step === 'phone' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número de teléfono con WhatsApp</label>
              <Input
                type="tel"
                placeholder="+1 234 567 8901"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Ingresa tu número completo con código de país
              </p>
            </div>
          </div>
        )}
        
        {step === 'code' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código de verificación</label>
              <p className="text-xs text-gray-500 mb-2">
                Ingresa el código de 8 dígitos que recibiste en WhatsApp
              </p>
              
              <div className="flex justify-center items-center gap-2">
                <Input
                  type="text"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="12345678"
                  className="text-center text-lg font-mono tracking-widest"
                  style={{ letterSpacing: '0.5em' }}
                />
              </div>
            </div>
          </div>
        )}
        
        {step === 'connecting' && (
          <div className="flex flex-col items-center justify-center py-6">
            <Spinner size="lg" />
            <p className="mt-4 text-sm text-center">
              Conectando tu cuenta de WhatsApp...
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
            <XCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {step === 'phone' && (
          <Button
            onClick={handleRequestCode}
            disabled={isLoading || !phoneNumber}
            className="w-full"
          >
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <ArrowRightCircle className="mr-2 h-4 w-4" />}
            Solicitar código
          </Button>
        )}
        
        {step === 'code' && (
          <div className="w-full space-y-2">
            <Button
              onClick={handleVerifyCode}
              disabled={isLoading || code.length !== 8}
              className="w-full"
            >
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Verificar código
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setStep('phone')}
              disabled={isLoading}
              className="w-full"
            >
              Cambiar número
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}