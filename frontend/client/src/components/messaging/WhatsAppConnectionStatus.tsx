import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  QrCode, 
  Wifi, 
  WifiOff, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface WhatsAppStatus {
  authenticated: boolean;
  ready: boolean;
  qrCode?: string;
  status: string;
}

interface WhatsAppAccount {
  id: number;
  name: string;
  autoResponseEnabled: boolean;
}

export const WhatsAppConnectionStatus: React.FC = () => {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [status, setStatus] = useState<WhatsAppStatus>({
    authenticated: false,
    ready: false,
    status: 'disconnected'
  });
  const [qrCode, setQrCode] = useState<string>('');
  const [showQr, setShowQr] = useState(false);

  // Obtener cuentas de WhatsApp
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/whatsapp/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error obteniendo cuentas:', error);
    }
  };

  // Obtener estado de WhatsApp
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/direct/whatsapp/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        if (data.qrCode) {
          setQrCode(data.qrCode);
        }
      }
    } catch (error) {
      console.error('Error obteniendo estado:', error);
    }
  };

  // Inicializar WhatsApp
  const initializeWhatsApp = async () => {
    try {
      const response = await fetch('/api/direct/whatsapp/initialize', {
        method: 'POST'
      });
      if (response.ok) {
        console.log('WhatsApp inicializado');
        fetchStatus();
      }
    } catch (error) {
      console.error('Error inicializando WhatsApp:', error);
    }
  };

  // Activar respuestas automáticas para una cuenta
  const activateAutoResponse = async (accountId: number) => {
    try {
      const response = await fetch(`/api/whatsapp/${accountId}/force-ready`, {
        method: 'POST'
      });
      if (response.ok) {
        console.log(`Respuestas automáticas activadas para cuenta ${accountId}`);
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error activando respuestas automáticas:', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchStatus();

    // Actualizar estado cada 10 segundos
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (status.authenticated && status.ready) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.authenticated) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (status.authenticated && status.ready) {
      return 'Conectado y listo';
    } else if (status.authenticated) {
      return 'Autenticado, preparando...';
    } else {
      return 'Desconectado';
    }
  };

  const getStatusColor = () => {
    if (status.authenticated && status.ready) {
      return 'bg-green-100 text-green-800';
    } else if (status.authenticated) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado general de WhatsApp */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold">Estado de WhatsApp</h3>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon()}
                <Badge className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!status.authenticated && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQr(!showQr)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                {showQr ? 'Ocultar QR' : 'Mostrar QR'}
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={initializeWhatsApp}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reconectar
            </Button>
          </div>
        </div>

        {/* Mostrar código QR si está disponible */}
        {showQr && qrCode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <h4 className="font-medium mb-2">Escanea este código QR con WhatsApp</h4>
              <div className="flex justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`}
                  alt="Código QR de WhatsApp"
                  className="border rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Abre WhatsApp → Configuración → Dispositivos vinculados → Vincular dispositivo
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Estado de cada cuenta */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Cuentas de WhatsApp</h3>
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">
                    {account.id}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    {account.autoResponseEnabled ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-gray-400" />
                    )}
                    <Badge 
                      variant={account.autoResponseEnabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {account.autoResponseEnabled ? 'Auto-respuesta activa' : 'Auto-respuesta inactiva'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant={account.autoResponseEnabled ? "outline" : "default"}
                onClick={() => activateAutoResponse(account.id)}
                disabled={!status.authenticated}
              >
                {account.autoResponseEnabled ? 'Reactivar' : 'Activar'}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Instrucciones si no está conectado */}
      {!status.authenticated && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">Conectar WhatsApp</h4>
              <p className="text-sm text-orange-700 mt-1">
                Para que funcionen las respuestas automáticas, debes conectar WhatsApp escaneando el código QR.
                Las respuestas automáticas solo funcionan cuando WhatsApp está autenticado y conectado.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};