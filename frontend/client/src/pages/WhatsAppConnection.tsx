import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRResponse {
  success: boolean;
  qrCode?: string;
  accountId?: number;
  accountName?: string;
  message?: string;
}

interface WhatsAppAccount {
  id: number;
  name: string;
  description?: string;
  qrCode?: string;
  connected: boolean;
}

export default function WhatsAppConnection() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Obtener códigos QR para todas las cuentas existentes del sistema
  const fetchQRCodes = async () => {
    setLoading(true);
    try {
      // Obtener las cuentas existentes del sistema
      const accountsResponse = await fetch('/api/whatsapp-accounts');
      const systemAccounts = await accountsResponse.json();
      
      // Obtener códigos QR para cada cuenta
      const accountsWithQR: WhatsAppAccount[] = await Promise.all(
        systemAccounts.map(async (account: any) => {
          try {
            const qrResponse = await fetch(`/api/whatsapp/qr/${account.id}`);
            const qrData: QRResponse = await qrResponse.json();
            
            return {
              id: account.id,
              name: account.name,
              description: account.description,
              qrCode: qrData.success ? qrData.qrCode : null,
              connected: false // Se actualizará en checkConnectionStatus
            };
          } catch {
            return {
              id: account.id,
              name: account.name,
              description: account.description,
              qrCode: null,
              connected: false
            };
          }
        })
      );
      
      setAccounts(accountsWithQR);
      
      toast({
        title: "Códigos QR actualizados",
        description: `${accountsWithQR.length} cuenta(s) listas para conectar`,
      });
    } catch (error) {
      console.error('Error al obtener códigos QR:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los códigos QR",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar estado de conexión y ping para todas las cuentas
  const checkConnectionStatus = async () => {
    try {
      // Obtener estado de ping para todas las cuentas
      const pingResponse = await fetch('/api/whatsapp/ping-status/all');
      const pingData = await pingResponse.json();
      
      if (pingData.success) {
        setAccounts(prev => prev.map(account => {
          const pingInfo = pingData.accounts.find((acc: any) => acc.accountId === account.id);
          return {
            ...account,
            connected: pingInfo?.connectionStatus === 'connected',
            pingStatus: pingInfo?.pingStatus || {
              isActive: false,
              lastPing: 0,
              pingCount: 0,
              nextPing: 0
            }
          };
        }));
      } else {
        // Fallback al método anterior si el ping no está disponible
        const response = await fetch('/api/direct/whatsapp/status');
        const status = await response.json();
        
        setAccounts(prev => prev.map(account => ({
          ...account,
          connected: status.authenticated
        })));
      }
    } catch (error) {
      console.error('Error al verificar estado:', error);
    }
  };

  // Activar keep-alive para una cuenta específica
  const startKeepAlive = async (accountId: number) => {
    try {
      const response = await fetch(`/api/whatsapp/${accountId}/start-keepalive`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Keep-alive activado",
          description: `Ping automático iniciado para cuenta ${accountId}`,
        });
        // Actualizar estado inmediatamente
        checkConnectionStatus();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo activar el keep-alive",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error activando keep-alive:', error);
      toast({
        title: "Error",
        description: "Error al activar keep-alive",
        variant: "destructive",
      });
    }
  };

  // Desactivar keep-alive para una cuenta específica
  const stopKeepAlive = async (accountId: number) => {
    try {
      const response = await fetch(`/api/whatsapp/${accountId}/stop-keepalive`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Keep-alive desactivado",
          description: `Ping automático detenido para cuenta ${accountId}`,
        });
        // Actualizar estado inmediatamente
        checkConnectionStatus();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo desactivar el keep-alive",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error desactivando keep-alive:', error);
      toast({
        title: "Error",
        description: "Error al desactivar keep-alive",
        variant: "destructive",
      });
    }
  };

  // Formatear tiempo transcurrido
  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Nunca';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  // Cargar códigos QR al montar el componente
  useEffect(() => {
    fetchQRCodes();
    checkConnectionStatus();
    
    // Verificar estado cada 5 segundos
    const interval = setInterval(checkConnectionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generar URL de imagen QR
  const generateQRImageUrl = (qrCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Conexión WhatsApp</h1>
        <p className="text-gray-600">
          Escanea los códigos QR con tu teléfono para conectar las cuentas de WhatsApp al CRM
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{account.name} (ID: {account.id})</span>
                <div className="flex items-center gap-2">
                  {account.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  
                  {/* Indicador de Keep-Alive */}
                  {account.pingStatus && account.pingStatus.isActive ? (
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs flex items-center gap-1">
                      <Heart className="h-3 w-3 animate-pulse" />
                      Ping Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-500 text-xs flex items-center gap-1">
                      <Square className="h-3 w-3" />
                      Sin Ping
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {account.qrCode ? (
                <div className="text-center">
                  <div className="bg-white p-4 inline-block rounded-lg border">
                    <img 
                      src={generateQRImageUrl(account.qrCode)} 
                      alt={`QR Code ${account.name}`} 
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Estado: {account.connected ? 'Conectado' : 'Esperando escaneo'}
                  </p>
                  
                  {/* Panel de información del ping */}
                  {account.connected && account.pingStatus && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-xs">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-center">
                          <div className="font-medium text-gray-700">Último Ping</div>
                          <div className="text-gray-600">{formatTimeAgo(account.pingStatus.lastPing)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-700">Total Pings</div>
                          <div className="text-gray-600">{account.pingStatus.pingCount}</div>
                        </div>
                      </div>
                      
                      {/* Botones de control */}
                      <div className="flex gap-2 justify-center">
                        {account.pingStatus.isActive ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => stopKeepAlive(account.id)}
                            className="text-xs h-7 flex items-center gap-1"
                          >
                            <Square className="h-3 w-3" />
                            Detener Ping
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => startKeepAlive(account.id)}
                            className="text-xs h-7 flex items-center gap-1"
                          >
                            <Heart className="h-3 w-3" />
                            Activar Ping
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={checkConnectionStatus}
                          className="text-xs h-7 flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Actualizar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {account.description && (
                    <p className="text-xs text-gray-400 mt-1">
                      {account.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Código QR no disponible</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Esperando generación del código QR...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {accounts.length === 0 && !loading && (
          <div className="col-span-2 text-center py-8">
            <p className="text-gray-500">No hay cuentas WhatsApp configuradas</p>
            <p className="text-xs text-gray-400 mt-1">
              Agrega cuentas desde la sección "Cuentas WhatsApp"
            </p>
          </div>
        )}
      </div>

      {/* Botón para actualizar */}
      <div className="text-center mb-6">
        <Button onClick={fetchQRCodes} disabled={loading} className="mr-4">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar códigos QR
        </Button>
      </div>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="mr-2 h-5 w-5" />
            Instrucciones de conexión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Abre WhatsApp en tu teléfono</li>
            <li>Ve a Configuración → Dispositivos vinculados</li>
            <li>Toca "Vincular un dispositivo"</li>
            <li>Escanea el código QR de la cuenta que desees conectar</li>
            <li>Espera a que aparezca el estado "Conectado"</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Importante:</strong> Una vez conectadas las cuentas, podrás gestionar los chats, 
              asignar agentes como Carlos López y utilizar todas las funciones del CRM WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}