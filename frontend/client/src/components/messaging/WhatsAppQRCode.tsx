import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw, XCircle, Users, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Componente para mostrar el código QR de WhatsApp
export function WhatsAppQRCode({ accountId }: { accountId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [manualRetry, setManualRetry] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitalizing, setIsInitializing] = useState(false);
  
  // Reinicializar cuenta y forzar la regeneración del QR
  const reinitializeAccount = async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    
    try {
      // Solicitar la reinicialización de la cuenta
      const response = await apiRequest(`/api/whatsapp-accounts/${accountId}/reinitialize`, {
        method: 'POST'
      });
      
      if (response.success) {
        toast({
          title: 'Cuenta reinicializada',
          description: 'Generando nuevo código QR. Esto puede tomar unos segundos.',
          variant: 'default'
        });
        
        // Esperar un poco para que el servidor genere el nuevo QR
        setTimeout(() => {
          setManualRetry(prev => !prev); // Invertir valor para forzar refetch
          setIsInitializing(false);
        }, 8000);
      } else {
        setErrorMessage(response.message || 'Error al reinicializar la cuenta');
        setIsInitializing(false);
      }
    } catch (error) {
      console.error('Error reinicializando cuenta:', error);
      setErrorMessage('Error al reinicializar la cuenta. Intente nuevamente.');
      setIsInitializing(false);
    }
  };
  
  // Query para obtener el código QR - versión reforzada con manejo de errores
  const { data: qrData, isLoading: isQrLoading, refetch: refetchQr, error: qrError } = useQuery({
    queryKey: ['/api/whatsapp-accounts', accountId, 'qrcode', manualRetry],
    queryFn: async () => {
      try {
        // Timeout para evitar bloqueos durante el despliegue
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // Timeout extendido
        
        const response = await apiRequest(`/api/whatsapp-accounts/${accountId}/qrcode`, {
          // Forzar refresco del cache añadiendo timestamp
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        // Verificar que el QR sea válido
        if (response.success && response.qrcode && typeof response.qrcode === 'string' && response.qrcode.trim().length > 20) {
          // Resetear el contador de reintentos cuando el QR es bueno
          setRetryCount(0);
          setErrorMessage(null);
          return response;
        } else {
          console.warn('Código QR inválido o incompleto recibido:', 
            response.qrcode ? `${response.qrcode.substring(0, 15)}...` : 'Vacío');
          
          // Incrementar contador de fallos
          setRetryCount(prev => prev + 1);
          
          // Si hay un mensaje de error específico, mostrarlo
          if (response.message) {
            setErrorMessage(response.message);
          }
          
          // Intentar reinicializar automáticamente después de varios fallos
          if (retryCount >= 3 && !isInitalizing) {
            console.log('Demasiados intentos fallidos, reinicializando automáticamente...');
            await reinitializeAccount();
          }
          
          return null;
        }
      } catch (err: any) {
        // Incrementar contador de fallos
        setRetryCount(prev => prev + 1);
        
        if (err?.name === 'AbortError') {
          console.warn('Timeout al obtener el código QR');
          setErrorMessage('La solicitud tardó demasiado. Intente nuevamente.');
        } else {
          console.error('Error fetching QR code:', err);
          setErrorMessage('Error de conexión. Intente nuevamente.');
        }
        
        // Intentar reinicializar automáticamente después de varios fallos
        if (retryCount >= 3 && !isInitalizing) {
          console.log('Demasiados errores, reinicializando automáticamente...');
          await reinitializeAccount();
        }
        
        return null;
      }
    },
    refetchInterval: (data) => {
      // Si no hay datos, acortar el intervalo
      if (!data) return 3000;
      // Si hay datos, intervalo normal
      return 5000;
    },
    retry: 2,               // Reducir reintentos automáticos
    retryDelay: 1500        // Esperar más entre reintentos
  });
  
  // Generar el código QR cuando cambian los datos
  useEffect(() => {
    if (!canvasRef.current || !qrData?.qrcode) return;
    
    const generateQR = async () => {
      try {
        // Remover cualquier imagen QR previa (de intentos alternativos)
        if (canvasRef.current?.parentElement) {
          const parent = canvasRef.current.parentElement;
          const images = parent.querySelectorAll('img');
          images.forEach(img => img.remove());
          
          // Restaurar la visibilidad del canvas
          canvasRef.current.style.display = 'block';
        }
        
        // Usar el texto del QR directamente como viene del servidor
        const qrText = qrData.qrcode.trim();
        
        // Verificar si el QR no está vacío
        if (!qrText) {
          console.error('El código QR está vacío');
          setErrorMessage('Código QR vacío recibido del servidor');
          return;
        }
        
        // Implementación más robusta para manejar errores en la generación de QR
        try {
          await QRCode.toCanvas(canvasRef.current, qrText, {
            width: 256,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'H' // Mayor nivel de corrección de errores
          });
          
          // QR generado correctamente
          setErrorMessage(null);
          
        } catch (canvasError) {
          console.error('Error al generar QR en canvas, intentando alternativa:', canvasError);
          
          // Alternativa: generar como URL de imagen (en caso de que falle el canvas)
          try {
            const qrDataUrl = await QRCode.toDataURL(qrText, {
              width: 256,
              margin: 1,
              errorCorrectionLevel: 'H'
            });
            
            // Crear imagen y mostrarla en lugar del canvas
            const img = document.createElement('img');
            img.src = qrDataUrl;
            img.width = 256;
            img.height = 256;
            img.alt = "Código QR de WhatsApp";
            img.className = "border rounded";
            
            // Método alternativo: insertar la imagen junto al canvas (no reemplazarlo)
            // Esto evita problemas con las referencias nulas
            if (canvasRef.current) {
              try {
                // Ocultar el canvas
                canvasRef.current.style.display = 'none';
                
                // Obtener el contenedor padre y agregar la imagen
                const parent = canvasRef.current.parentElement;
                if (parent) {
                  parent.appendChild(img);
                  // Imagen generada correctamente
                  setErrorMessage(null);
                }
              } catch (domError) {
                console.error('Error al manipular el DOM:', domError);
                setErrorMessage('Error al mostrar el código QR en pantalla');
              }
            }
          } catch (dataUrlError) {
            console.error('Error generando QR como URL:', dataUrlError);
            setErrorMessage('No se pudo generar el código QR');
          }
        }
      } catch (error) {
        console.error('Error al procesar el código QR:', error);
        setErrorMessage('Error procesando el código QR');
      }
    };
    
    generateQR();
  }, [qrData]);
  
  return (
    <div className="flex flex-col items-center">
      {isQrLoading || isInitalizing ? (
        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg mb-4 w-64 h-64">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">
            {isInitalizing ? 'Reinicializando cuenta...' : 'Cargando código QR...'}
          </p>
        </div>
      ) : qrData?.qrcode ? (
        <div className="bg-white p-4 rounded-lg mb-4 shadow-md">
          <canvas
            ref={canvasRef}
            className="w-64 h-64 border rounded"
            aria-label="Código QR para conectar WhatsApp"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center bg-white p-4 rounded-lg mb-4 w-64 h-64 border border-red-300">
          <div className="text-center text-red-500">
            <XCircle className="h-16 w-16 mx-auto mb-2" />
            <p>No se pudo generar el código QR</p>
            {errorMessage && (
              <p className="text-xs mt-2 text-gray-600">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-2 w-full max-w-64">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchQr()}
          disabled={isInitalizing}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar QR
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={reinitializeAccount}
          disabled={isInitalizing}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Reinicializar cuenta
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/whatsapp-accounts'}
        >
          <Users className="h-4 w-4 mr-2" />
          Ver cuentas
        </Button>
      </div>
      
      {retryCount > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          Intentos de reconexión: {retryCount}
        </div>
      )}
    </div>
  );
}