import { useEffect } from 'react';
import { useIntensiveActivityTracker } from '@/hooks/useIntensiveActivityTracker';
import { useAuth } from '@/lib/authContext';

/**
 * Componente global para activar el rastreo de actividades en toda la aplicación
 * Este componente debe estar activo en todas las páginas para garantizar el control de seguridad
 */
export const GlobalActivityTracker = () => {
  const { trackActivity } = useIntensiveActivityTracker();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Registrar sesión iniciada
    trackActivity('session_start', 'application', {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username
    }, 'security');

    // Registrar salida de la sesión al cerrar ventana
    const handleBeforeUnload = () => {
      trackActivity('session_end', 'application', {
        timestamp: new Date().toISOString(),
        sessionDuration: Date.now()
      }, 'security');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, trackActivity]);

  return null; // Componente invisible
};