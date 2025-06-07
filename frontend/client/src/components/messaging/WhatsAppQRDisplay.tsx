import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppQRDisplayProps {
  status: {
    initialized?: boolean;
    ready?: boolean;
    authenticated?: boolean;
    qrCode?: string;
    qrDataUrl?: string;
    error?: string;
  };
  isLoading: boolean;
  onRefresh: () => void;
}

export function WhatsAppQRDisplay({ status, isLoading, onRefresh }: WhatsAppQRDisplayProps) {
  const { toast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  
  // Generar el código QR a partir del código proporcionado
  const generateQRFromCode = async (qrCode: string) => {
    try {
      console.log("Generando QR en el cliente");
      // Importamos dinámicamente la librería qrcode
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 8,
        color: {
          dark: '#128C7E',  // Color verde WhatsApp
          light: '#FFFFFF'  // Fondo blanco
        }
      });
      
      console.log("QR generado correctamente en el cliente");
      setQrDataUrl(url);
      setImgError(false);
      return true;
    } catch (err) {
      console.error("Error generando QR en el cliente:", err);
      setImgError(true);
      return false;
    }
  };
  
  // Obtener imagen del QR, primero intentando endpoint directo y luego generación local
  const fetchQRImage = async () => {
    // Si ya tenemos una URL de datos para el QR en el estado, úsala directamente
    if (status?.qrDataUrl) {
      console.log('Usando QR data URL del estado');
      setQrDataUrl(status.qrDataUrl);
      setImgError(false);
      return;
    }
    
    // Si tenemos el código QR, generarlo directamente en el cliente
    if (status?.qrCode) {
      await generateQRFromCode(status.qrCode);
    } else {
      console.error('No hay código QR disponible para mostrar');
      setImgError(true);
    }
  };
  
  // Generar imagen del código QR cuando cambie el status
  useEffect(() => {
    setTimestamp(Date.now());
    
    // Intentar mostrar QR si está listo
    console.log("Intentando mostrar código QR, estado:", status);
    
    if (status?.error) {
      console.warn("Estado con error:", status.error);
      setImgError(false);
      setQrDataUrl(null);
    } else if (status?.qrDataUrl) {
      // Si ya tenemos una URL de datos en el estado, usarla directamente
      console.log("Usando QR data URL del estado");
      setQrDataUrl(status.qrDataUrl);
      setImgError(false);
    } else if (status?.qrCode) {
      // Si tenemos el código QR, intentar generar la imagen
      fetchQRImage();
    } else {
      // No hay código QR disponible
      setQrDataUrl(null);
      setImgError(false);
    }
  }, [status]);
  
  // Manejar errores al cargar la imagen
  const handleImageError = () => {
    console.error("Error cargando la imagen del código QR");
    setImgError(true);
    
    toast({
      title: "Error al cargar código QR",
      description: "No se pudo cargar la imagen del código QR. Intenta refrescar la página.",
      variant: "destructive",
    });
  };
  
  // Estado de carga
  if (isLoading) {
    return (
      <div className="border p-4 rounded-md bg-white flex flex-col items-center">
        <div className="flex flex-col items-center justify-center h-64 w-64">
          <RefreshCw className="h-12 w-12 animate-spin text-gray-500" />
          <p className="mt-4 text-sm text-gray-500">Cargando estado de WhatsApp...</p>
        </div>
      </div>
    );
  }
  
  // Estado sin inicializar
  if (!status?.initialized) {
    return (
      <div className="border p-4 rounded-md bg-white flex flex-col items-center">
        <div className="flex flex-col items-center justify-center h-64 w-64">
          <AlertCircle className="h-12 w-12 text-gray-500" />
          <p className="mt-4 text-sm text-gray-600">Servicio de WhatsApp no inicializado</p>
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            className="mt-4 w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar inicializar
          </Button>
        </div>
      </div>
    );
  }
  
  // Estado autenticado
  if (status?.authenticated) {
    return (
      <div className="border p-4 rounded-md bg-white flex flex-col items-center">
        <div className="flex flex-col items-center justify-center h-64 w-64">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <p className="font-medium text-green-800 text-center">¡WhatsApp conectado correctamente!</p>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Tu cuenta está vinculada y lista para enviar mensajes.
          </p>
        </div>
      </div>
    );
  }
  
  // Estado con QR code para escanear (y no hay error)
  if (qrDataUrl && !status.error) {
    return (
      <div className="border p-4 rounded-md bg-white flex flex-col items-center">
        <div className="flex flex-col items-center justify-center relative">
          <img 
            src={qrDataUrl} 
            alt="Código QR para conectar WhatsApp" 
            className="h-64 w-64"
            onError={handleImageError}
          />
          {/* Overlay del logo de WhatsApp */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white p-2 rounded-md">
              <Smartphone className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
        <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-md">
          Escanea este código QR con la aplicación de WhatsApp en tu teléfono
        </div>
        <Button 
          onClick={() => {
            setImgError(false);
            setQrDataUrl(null);
            setTimestamp(Date.now());
            onRefresh();
          }}
          variant="ghost" 
          size="sm"
          className="mt-2 text-xs"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Actualizar QR
        </Button>
      </div>
    );
  }

  // Por defecto mostrar estado de error
  return (
    <div className="border p-4 rounded-md bg-white flex flex-col items-center">
      <div className="flex flex-col items-center justify-center h-64 w-64">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <p className="mt-4 text-sm text-gray-600 text-center">
          {status?.error || "No se pudo conectar al servicio de WhatsApp"}
        </p>
        <Button 
          onClick={() => {
            setImgError(false);
            setQrDataUrl(null);
            setTimestamp(Date.now());
            onRefresh();
          }}
          variant="outline" 
          className="mt-4 w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Intentar de nuevo
        </Button>
      </div>
    </div>
  );
}