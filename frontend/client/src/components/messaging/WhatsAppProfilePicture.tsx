import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface WhatsAppProfilePictureProps {
  contactId: string;
  accountId: number;
  contactName: string;
  isGroup?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WhatsAppProfilePicture({ 
  contactId, 
  accountId, 
  contactName, 
  isGroup = false,
  className = "",
  size = 'md'
}: WhatsAppProfilePictureProps) {
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  // Función para obtener la foto de perfil real de WhatsApp
  const fetchProfilePicture = async () => {
    if (isGroup || !contactId || !accountId) {
      return;
    }

    setLoading(true);
    setError(false);

    try {
      // Primero verificar si la cuenta está conectada
      const statusResponse = await fetch('/api/direct/whatsapp/status');
      const statusData = await statusResponse.json();
      
      if (!statusData.authenticated) {
        console.log(`📸 Cuenta ${accountId} no conectada - usando iniciales para ${contactId}`);
        setError(true);
        setLoading(false);
        return;
      }
      
      console.log(`📸 Obteniendo foto de perfil para ${contactId} en cuenta ${accountId}`);
      
      // Usar API directa para evitar interceptación de Vite
      const response = await fetch(
        `/api/direct/whatsapp-accounts/${accountId}/contact/${encodeURIComponent(contactId)}/profile-picture`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.profilePicUrl) {
          setProfilePicUrl(data.profilePicUrl);
          console.log(`✅ Foto de perfil cargada para ${contactId}`);
        } else {
          console.log(`📸 No hay foto de perfil disponible para ${contactId}`);
          setError(true);
        }
      } else {
        console.warn(`⚠️ Error obteniendo foto de perfil: ${response.status}`);
        setError(true);
      }
    } catch (error) {
      console.error('❌ Error obteniendo foto de perfil:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Cargar foto de perfil al montar el componente
  useEffect(() => {
    fetchProfilePicture();
  }, [contactId, accountId]);

  // Obtener las iniciales para el fallback
  const getInitials = (name: string): string => {
    if (!name) return '?';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {/* Si hay foto de perfil real, mostrarla */}
      {profilePicUrl && !error && (
        <AvatarImage 
          src={profilePicUrl} 
          alt={`${contactName} - WhatsApp Profile`}
          onError={() => setError(true)}
        />
      )}
      
      {/* Fallback */}
      <AvatarFallback 
        className={`${isGroup ? 'bg-purple-500' : 'bg-blue-500'} text-white flex items-center justify-center`}
      >
        {isGroup ? (
          <Users className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} />
        ) : (
          <span className="font-medium text-sm">
            {getInitials(contactName)}
          </span>
        )}
      </AvatarFallback>
    </Avatar>
  );
}