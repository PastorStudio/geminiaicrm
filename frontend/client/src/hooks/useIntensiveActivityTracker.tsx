import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';

/**
 * Hook para rastreo intensivo de actividades del agente
 * Captura todos los clics, botones, formularios y funciones que use el agente
 */
export const useIntensiveActivityTracker = () => {
  const { user } = useAuth();
  const sessionStartTime = useRef<Date>(new Date());

  const trackActivity = async (
    action: string,
    target?: string,
    details?: any,
    category: string = 'general'
  ) => {
    if (!user?.id) return;

    try {
      await fetch('/api/agent-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: user.id,
          activity: action,
          page: window.location.pathname,
          details: JSON.stringify({
            target,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            category,
            sessionDuration: Date.now() - sessionStartTime.current.getTime(),
            ...details
          })
        }),
      });
      console.log(`🎯 Actividad intensiva: ${action} - ${target || 'N/A'} - Categoría: ${category}`);
    } catch (error) {
      console.log('⚫ Error registrando actividad intensiva');
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Registrar inicio de sesión/aplicación
    trackActivity('session_start', 'application', {
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }, 'security');

    // Rastrear cambios de página/ruta
    let currentPath = window.location.pathname;
    const trackRouteChanges = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        trackActivity('page_navigation', `${currentPath} → ${newPath}`, {
          from: currentPath,
          to: newPath
        }, 'navigation');
        currentPath = newPath;
      }
    };

    // Rastrear tiempo de inactividad
    let inactiveTimer: NodeJS.Timeout;
    let lastActivity = Date.now();
    const resetInactiveTimer = () => {
      lastActivity = Date.now();
      clearTimeout(inactiveTimer);
      inactiveTimer = setTimeout(() => {
        trackActivity('user_inactive', '5_minutes', {
          inactiveDuration: 300000 // 5 minutos
        }, 'behavior');
      }, 300000); // 5 minutos
    };

    // Rastrear antes de cerrar ventana/pestaña
    const trackBeforeUnload = (event: BeforeUnloadEvent) => {
      const sessionDuration = Date.now() - sessionStartTime.current.getTime();
      trackActivity('session_end', 'application', {
        sessionDurationMs: sessionDuration,
        sessionDurationMinutes: Math.round(sessionDuration / 60000),
        finalPage: window.location.pathname
      }, 'security');
    };

    // Rastrear pérdida de foco de ventana
    const trackWindowBlur = () => {
      trackActivity('window_blur', 'focus_lost', {
        page: window.location.pathname
      }, 'behavior');
    };

    // Rastrear cuando vuelve el foco
    const trackWindowFocus = () => {
      trackActivity('window_focus', 'focus_gained', {
        page: window.location.pathname
      }, 'behavior');
    };

    // Rastrear clics en botones
    const trackButtonClicks = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        const buttonText = button?.textContent?.trim() || 'Sin texto';
        const buttonId = button?.id || 'sin-id';
        const buttonClass = button?.className || 'sin-clase';
        
        trackActivity('button_click', buttonText, {
          buttonId,
          buttonClass,
          coordinates: { x: event.clientX, y: event.clientY }
        }, 'interaction');
      }
    };

    // Rastrear clics en enlaces
    const trackLinkClicks = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.tagName === 'A' ? target : target.closest('a');
        const href = (link as HTMLAnchorElement)?.href || 'sin-href';
        const linkText = link?.textContent?.trim() || 'Sin texto';
        
        trackActivity('link_click', linkText, {
          href,
          target: (link as HTMLAnchorElement)?.target
        }, 'navigation');
      }
    };

    // Rastrear envío de formularios
    const trackFormSubmissions = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || 'sin-id';
      const formAction = form.action || 'sin-action';
      const formData = new FormData(form);
      const fields = Array.from(formData.keys());
      
      trackActivity('form_submit', formId, {
        action: formAction,
        method: form.method,
        fieldCount: fields.length,
        fields: fields
      }, 'form');
    };

    // Rastrear cambios en inputs
    const trackInputChanges = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.tagName === 'INPUT' || input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') {
        const inputType = input.type || input.tagName.toLowerCase();
        const inputName = input.name || input.id || 'sin-nombre';
        
        trackActivity('input_change', inputName, {
          inputType,
          valueLength: input.value?.length || 0,
          placeholder: input.placeholder
        }, 'form');
      }
    };

    // Rastrear teclas especiales
    const trackKeyPresses = (event: KeyboardEvent) => {
      // Solo rastrear teclas especiales, no todas las teclas para privacidad
      const specialKeys = ['Enter', 'Escape', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F5'];
      if (specialKeys.includes(event.key)) {
        trackActivity('key_press', event.key, {
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey
        }, 'keyboard');
      }
    };

    // Rastrear scroll
    let scrollTimeout: NodeJS.Timeout;
    const trackScrolling = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercentage = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        trackActivity('page_scroll', `${scrollPercentage}%`, {
          scrollY: window.scrollY,
          pageHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight
        }, 'interaction');
      }, 1000);
    };

    // Rastrear tiempo en página
    const startTime = Date.now();
    const trackPageDuration = () => {
      const duration = Date.now() - startTime;
      trackActivity('page_duration', window.location.pathname, {
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000)
      }, 'time');
    };

    // Agregar event listeners
    document.addEventListener('click', trackButtonClicks);
    document.addEventListener('click', trackLinkClicks);
    document.addEventListener('submit', trackFormSubmissions);
    document.addEventListener('change', trackInputChanges);
    document.addEventListener('keydown', trackKeyPresses);
    window.addEventListener('scroll', trackScrolling);
    window.addEventListener('beforeunload', trackPageDuration);
    window.addEventListener('beforeunload', trackBeforeUnload);
    window.addEventListener('blur', trackWindowBlur);
    window.addEventListener('focus', trackWindowFocus);
    
    // Configurar observador de cambios de ruta para SPAs
    setInterval(trackRouteChanges, 1000);
    
    // Inicializar timer de inactividad
    resetInactiveTimer();
    document.addEventListener('mousemove', resetInactiveTimer);
    document.addEventListener('keypress', resetInactiveTimer);
    document.addEventListener('click', resetInactiveTimer);

    // Cleanup
    return () => {
      document.removeEventListener('click', trackButtonClicks);
      document.removeEventListener('click', trackLinkClicks);
      document.removeEventListener('submit', trackFormSubmissions);
      document.removeEventListener('change', trackInputChanges);
      document.removeEventListener('keydown', trackKeyPresses);
      window.removeEventListener('scroll', trackScrolling);
      window.removeEventListener('beforeunload', trackPageDuration);
      window.removeEventListener('beforeunload', trackBeforeUnload);
      window.removeEventListener('blur', trackWindowBlur);
      window.removeEventListener('focus', trackWindowFocus);
      document.removeEventListener('mousemove', resetInactiveTimer);
      document.removeEventListener('keypress', resetInactiveTimer);
      document.removeEventListener('click', resetInactiveTimer);
      clearTimeout(scrollTimeout);
      clearTimeout(inactiveTimer);
    };
  }, [user?.id]);

  return { trackActivity };
};