import React from 'react';
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from '@/components/ui/toaster';
import { Spinner } from '@/components/ui/spinner';
import PageTransition from '@/components/ui/page-transition';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PersistentMenu, useMenuLoading } from '@/components/ui/persistent-menu';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Messages from './pages/Messages';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AISettings from './pages/AISettings';
import Tasks from './pages/Tasks';
import MediaGallery from './pages/MediaGallery';
import MessageTemplates from './pages/MessageTemplates';
import MassSender from './pages/MassSender';
import NotFound from './pages/not-found';
import Integrations from './pages/Integrations';
import AutoResponseSettings from './pages/AutoResponseSettings';
import AutoResponseSettingsFixed from './pages/AutoResponseSettingsFixed';
import Connection from './pages/Connection';
import QRCode from './pages/QRCode';
import QrViewer from './pages/QrViewer';
import QrTextViewer from './pages/QrTextViewer';
import RawQrViewer from './pages/RawQrViewer';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import WhatsAppAccounts from './pages/WhatsAppAccounts';
import ChatAssignments from './pages/ChatAssignments';
import Profile from './pages/Profile';
import WhatsAppManager from './pages/WhatsAppManager';
import SimpleWhatsApp from './pages/SimpleWhatsApp';
import UltraSimpleChat from './pages/UltraSimpleChat';
import WhatsAppConnection from './pages/WhatsAppConnection';
import AgentMonitoring from './pages/AgentMonitoring';
import TicketsSimple from './pages/TicketsSimple';
import ExternalAgents from './pages/ExternalAgents';
import InternalAgents from './pages/InternalAgents';
import GeminiAI from './pages/GeminiAI';
import AgentAnalysis from './pages/AgentAnalysis';
import DeepSeekSettings from './pages/DeepSeekSettings';
import ModernMessaging from './pages/ModernMessaging';
import SalesPipeline from './pages/SalesPipeline';
import AgentSecurity from './pages/AgentSecurity';

// import SimpleWhatsAppDemo from './pages/SimpleWhatsAppDemo';
import { useQuery } from '@tanstack/react-query';
import { ModelNotificationProvider } from './lib/modelNotification';
import { GlobalActivityTracker } from '@/components/GlobalActivityTracker';

import { AuthProvider, useAuth } from './lib/authContext';
import { Loader2 } from 'lucide-react';
import { PageTranslationProvider } from './components/translation/PageTranslator';

// Componente PrivateRoute para protección de rutas
const PrivateRoute: React.FC<{ component: React.ComponentType<any>, path: string }> = ({ component: Component, path }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login'];
  
  // Si estamos en una ruta pública, permitir acceso
  if (publicRoutes.includes(path)) {
    return <Component />;
  }
  
  // Mostrar cargando mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Verificando sesión...</span>
      </div>
    );
  }
  
  // Bypass temporal para acceso directo (desarrollo)
  const bypassAuth = localStorage.getItem('bypass-auth') === 'true';
  
  // Si no está autenticado y no hay bypass, redirigir a login
  if (!isAuthenticated && !bypassAuth) {
    navigate('/login');
    return null;
  }
  
  // Si está autenticado, renderizar el componente
  return <Component />;
};

// Componente principal de rutas
const AppRoutes: React.FC = () => {
  // Obtener la ruta actual para la navegación activa
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login'];
  
  // No mostrar la barra lateral en la página de login
  const showSidebar = !publicRoutes.includes(location) && isAuthenticated;
  
  // Obtener clave API de Gemini para el cliente
  const { isLoading: isLoadingGeminiKey } = useQuery({
    queryKey: ['gemini-client-key'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/settings/gemini-client-key');
        if (!response.ok) throw new Error('No se pudo obtener la clave API de Gemini');
        const data = await response.json();
        
        if (data.success && data.apiKey) {
          console.log('Clave API de Gemini obtenida correctamente');
          // Establecer la clave en una variable de entorno en tiempo de ejecución
          (window as any).VITE_GEMINI_API_KEY = data.apiKey;
        } else {
          console.warn('No se pudo obtener la clave API de Gemini');
        }
        
        return data;
      } catch (error) {
        console.error('Error obteniendo clave API de Gemini:', error);
        return null;
      }
    },
    enabled: isAuthenticated // Solo cargar si está autenticado
  });

  // Verificar si el usuario tiene rol de administrador, supervisor o superadministrador
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const canManageUsers = isSuperAdmin || isAdmin || isSupervisor;
  const hasFullAccess = isSuperAdmin; // DJP tiene acceso completo como superadministrador

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar con menú vertical - siempre visible cuando está autenticado */}
      {showSidebar && (
        <aside className="fixed h-full w-44 bg-gradient-to-b from-black via-black to-red-600 shadow-2xl z-50 overflow-y-auto" style={{backgroundImage: 'linear-gradient(180deg, #000000 0%, #000000 65%, #dc2626 100%)'}}>
          <div className="p-2">
            <div className="flex items-center justify-center mb-4">
              <span className="text-white text-sm font-bold">WhatsApp CRM</span>
            </div>
            
            <nav className="mt-2 flex flex-col space-y-1">
              {/* Principal */}
              <div className="px-3 py-1">
                <span className="text-xs uppercase font-semibold text-white/70">Principal</span>
              </div>
              
              <a href="/" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" fill="#3B82F6"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" fill="#10B981"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" fill="#F59E0B"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" fill="#EF4444"/>
                </svg>
                Dashboard
              </a>
              
              <a href="/leads" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/leads' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3" fill="#8B5CF6"/>
                  <circle cx="8" cy="14" r="2" fill="#06B6D4"/>
                  <circle cx="16" cy="14" r="2" fill="#F59E0B"/>
                  <path d="M12 14v6M8 18h8" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Leads
              </a>
              
              <a href="/sales-pipeline" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/sales-pipeline' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="4" height="16" rx="1" fill="#3B82F6"/>
                  <rect x="7" y="6" width="4" height="14" rx="1" fill="#8B5CF6"/>
                  <rect x="12" y="8" width="4" height="12" rx="1" fill="#F59E0B"/>
                  <rect x="17" y="10" width="4" height="10" rx="1" fill="#10B981"/>
                  <circle cx="4" cy="2" r="1" fill="#EF4444"/>
                  <circle cx="9" cy="4" r="1" fill="#EF4444"/>
                  <circle cx="14" cy="6" r="1" fill="#EF4444"/>
                  <circle cx="19" cy="8" r="1" fill="#EF4444"/>
                </svg>
                Pipeline Ventas
              </a>
              
              {/* Comunicación */}
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs uppercase font-semibold text-white/70">Comunicación</span>
              </div>
              
              <a href="/messages" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/messages' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="14" rx="3" fill="#25D366"/>
                  <circle cx="7" cy="11" r="1" fill="white"/>
                  <circle cx="12" cy="11" r="1" fill="white"/>
                  <circle cx="17" cy="11" r="1" fill="white"/>
                </svg>
                Mensajes
              </a>

              {/* OCULTO: Mensajería Moderna */}
              {/*<a href="/modern-messaging" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/modern-messaging' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" fill="#25D366"/>
                  <rect x="4" y="6" width="6" height="12" rx="1" fill="white"/>
                  <rect x="12" y="6" width="10" height="12" rx="1" fill="white"/>
                  <circle cx="7" cy="9" r="1" fill="#25D366"/>
                  <rect x="5" y="11" width="4" height="1" fill="#666"/>
                  <rect x="5" y="13" width="3" height="1" fill="#666"/>
                  <circle cx="15" cy="9" r="1" fill="#25D366"/>
                  <rect x="14" y="11" width="6" height="1" fill="#666"/>
                  <rect x="14" y="13" width="4" height="1" fill="#666"/>
                </svg>
                Mensajería Moderna
              </a>*/}
              
              <a href="/message-templates" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/message-templates' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="#6366F1"/>
                  <rect x="6" y="6" width="12" height="2" rx="1" fill="white"/>
                  <rect x="6" y="10" width="8" height="2" rx="1" fill="white"/>
                  <rect x="6" y="14" width="10" height="2" rx="1" fill="white"/>
                </svg>
                Plantillas
              </a>
              
              <a href="/mass-sender" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/mass-sender' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" fill="#F59E0B"/>
                  <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="6" cy="6" r="2" fill="#EF4444"/>
                  <circle cx="18" cy="6" r="2" fill="#10B981"/>
                  <circle cx="6" cy="18" r="2" fill="#3B82F6"/>
                  <circle cx="18" cy="18" r="2" fill="#8B5CF6"/>
                </svg>
                Envío Masivo
              </a>
              
              {/* OCULTO: Respuestas Auto */}
              {/*<a href="/auto-response-settings" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/auto-response-settings' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="8" width="18" height="8" rx="4" fill="#06B6D4"/>
                  <circle cx="8" cy="12" r="2" fill="white"/>
                  <circle cx="16" cy="12" r="2" fill="white"/>
                  <path d="M10 10l4 4M14 10l-4 4" stroke="#06B6D4" strokeWidth="1.5"/>
                </svg>
                Respuestas Auto
              </a>*/}

              {/* OCULTO: Agentes Externos */}
              {/*<a href="/external-agents" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/external-agents' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" fill="#F59E0B"/>
                  <circle cx="8" cy="8" r="2" fill="white"/>
                  <circle cx="16" cy="8" r="2" fill="white"/>
                  <rect x="7" y="13" width="10" height="2" rx="1" fill="white"/>
                  <rect x="9" y="16" width="6" height="2" rx="1" fill="white"/>
                </svg>
                Agentes Externos
              </a>*/}
              
              {/* OCULTO: Agentes Internos */}
              {/*<a href="/internal-agents" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/internal-agents' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" fill="#3B82F6"/>
                  <circle cx="8" cy="8" r="2" fill="white"/>
                  <circle cx="16" cy="8" r="2" fill="white"/>
                  <rect x="7" y="13" width="10" height="2" rx="1" fill="white"/>
                  <rect x="9" y="16" width="6" height="2" rx="1" fill="white"/>
                  <path d="M12 11v4m0-4l2-2m-2 2l-2-2" stroke="white" strokeWidth="1" fill="none"/>
                </svg>
                Agentes Internos
              </a>*/}

              {/* OCULTO: Análisis Completo */}
              {/*<a href="/agent-analysis" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/agent-analysis' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" fill="#8B5CF6"/>
                  <rect x="6" y="8" width="12" height="2" rx="1" fill="white"/>
                  <rect x="6" y="11" width="8" height="2" rx="1" fill="white"/>
                  <rect x="6" y="14" width="10" height="2" rx="1" fill="white"/>
                  <circle cx="18" cy="6" r="2" fill="#22C55E"/>
                  <path d="M16 6h4m-2-2v4" stroke="white" strokeWidth="1"/>
                </svg>
                Análisis Completo
              </a>*/}
              
              {/* Planificación */}
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs uppercase font-semibold text-white/70">Planificación</span>
              </div>
              
              <a href="/calendar" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/calendar' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#EF4444"/>
                  <rect x="3" y="4" width="18" height="6" rx="2" fill="#DC2626"/>
                  <circle cx="8" cy="7" r="1" fill="white"/>
                  <circle cx="16" cy="7" r="1" fill="white"/>
                  <rect x="6" y="12" width="2" height="2" rx="0.5" fill="white"/>
                  <rect x="11" y="12" width="2" height="2" rx="0.5" fill="white"/>
                  <rect x="16" y="12" width="2" height="2" rx="0.5" fill="white"/>
                </svg>
                Calendario
              </a>
              
              <a href="/tasks" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/tasks' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="16" height="18" rx="2" fill="#10B981"/>
                  <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="8" y="7" width="8" height="1" fill="white" opacity="0.7"/>
                  <rect x="8" y="16" width="6" height="1" fill="white" opacity="0.7"/>
                </svg>
                Tareas
              </a>

              <a href="/tickets" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/tickets' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="3" width="20" height="18" rx="3" fill="#8B5CF6"/>
                  <rect x="5" y="7" width="14" height="2" rx="1" fill="white"/>
                  <rect x="5" y="11" width="10" height="2" rx="1" fill="white"/>
                  <rect x="5" y="15" width="12" height="2" rx="1" fill="white"/>
                  <circle cx="18" cy="8" r="2" fill="#EF4444"/>
                  <circle cx="18" cy="8" r="1" fill="white"/>
                </svg>
                Tickets
              </a>
              
              {/* Análisis y Recursos */}
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs uppercase font-semibold text-white/70">Análisis y Recursos</span>
              </div>
              
              <a href="/analytics" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/analytics' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="12" width="4" height="8" rx="1" fill="#3B82F6"/>
                  <rect x="8" y="8" width="4" height="12" rx="1" fill="#10B981"/>
                  <rect x="13" y="4" width="4" height="16" rx="1" fill="#F59E0B"/>
                  <rect x="18" y="10" width="4" height="10" rx="1" fill="#EF4444"/>
                </svg>
                Análisis
              </a>

              <a href="/gemini-ai" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/gemini-ai' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" fill="#9333EA"/>
                  <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="1.5" fill="#C084FC"/>
                  <circle cx="15" cy="15" r="1.5" fill="#A855F7"/>
                  <circle cx="15" cy="9" r="1" fill="white"/>
                  <circle cx="9" cy="15" r="1" fill="white"/>
                </svg>
                Gemini AI
              </a>
              
              <a href="/media-gallery" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/media-gallery' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="#8B5CF6"/>
                  <rect x="6" y="6" width="5" height="5" rx="1" fill="#A855F7"/>
                  <rect x="13" y="6" width="5" height="5" rx="1" fill="#C084FC"/>
                  <rect x="6" y="13" width="5" height="5" rx="1" fill="#DDD6FE"/>
                  <rect x="13" y="13" width="5" height="5" rx="1" fill="#EDE9FE"/>
                  <circle cx="8.5" cy="8.5" r="1" fill="white"/>
                </svg>
                Galería
              </a>
              
              {/* Conexiones e Integraciones */}
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs uppercase font-semibold text-white/70">Conexiones</span>
              </div>
              
              <a href="/whatsapp-accounts" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/whatsapp-accounts' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="3" fill="#25D366"/>
                  <circle cx="8" cy="10" r="2" fill="white"/>
                  <circle cx="16" cy="10" r="2" fill="white"/>
                  <path d="M6 14h4v2H6zM14 14h4v2h-4z" fill="white"/>
                  <rect x="10" y="6" width="4" height="1" fill="white" opacity="0.8"/>
                </svg>
                Cuentas WhatsApp
              </a>
              
              {/* OCULTO: Gestor WhatsApp */}
              {/*<a href="/whatsapp-manager" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/whatsapp-manager' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" fill="#128C7E"/>
                  <rect x="8" y="8" width="8" height="8" rx="2" fill="white"/>
                  <circle cx="10" cy="10" r="1" fill="#25D366"/>
                  <circle cx="14" cy="10" r="1" fill="#25D366"/>
                  <path d="M9 13h6v1H9z" fill="#25D366"/>
                  <path d="M10 15h4v1h-4z" fill="#25D366"/>
                </svg>
                Gestor WhatsApp
              </a>*/}

              {/* OCULTO: Conectar WhatsApp */}
              {/*<a href="/whatsapp-connection" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/whatsapp-connection' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="4" fill="#DCF2F1"/>
                  <rect x="4" y="4" width="6" height="6" rx="1" fill="#0EA5E9"/>
                  <rect x="14" y="4" width="6" height="6" rx="1" fill="#10B981"/>
                  <rect x="4" y="14" width="6" height="6" rx="1" fill="#F59E0B"/>
                  <rect x="14" y="14" width="6" height="6" rx="1" fill="#EF4444"/>
                  <circle cx="12" cy="12" r="2" fill="white" stroke="#374151" strokeWidth="1"/>
                </svg>
                Conectar WhatsApp
              </a>*/}

              <a href="/agent-monitoring" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/agent-monitoring' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="2" fill="#1F2937"/>
                  <circle cx="8" cy="8" r="2" fill="#10B981"/>
                  <circle cx="16" cy="8" r="2" fill="#3B82F6"/>
                  <circle cx="8" cy="16" r="2" fill="#F59E0B"/>
                  <circle cx="16" cy="16" r="2" fill="#EF4444"/>
                  <rect x="6" y="11" width="4" height="1" fill="#10B981"/>
                  <rect x="14" y="11" width="4" height="1" fill="#3B82F6"/>
                  <rect x="10" y="6" width="4" height="1" fill="#6B7280"/>
                  <rect x="10" y="17" width="4" height="1" fill="#6B7280"/>
                </svg>
                Monitoreo Agentes
              </a>
              
              {/* Menú oculto: Conexión, Código QR e Integraciones - Se mantiene en el código pero no se muestra */}
              {false && (
                <>
                  <a href="/connection" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/connection' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Conexión
                  </a>
                  
                  <a href="/qrcode" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/qrcode' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Código QR
                  </a>
                  
                  <a href="/integrations" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/integrations' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                    Integraciones
                  </a>
                </>
              )}
              
              {/* Administración - Solo para super_admin, admin y supervisor */}
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs uppercase font-semibold text-white/70">Administración</span>
              </div>
              
              {/* Gestión de agentes - Temporalmente visible para todos */}
              <a href="/users" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/users' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="#3B82F6"/>
                  <circle cx="8" cy="15" r="2" fill="#10B981"/>
                  <circle cx="16" cy="15" r="2" fill="#F59E0B"/>
                  <path d="M12 13v6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 17h8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="2" y="20" width="20" height="2" rx="1" fill="#EF4444"/>
                </svg>
                <span className="relative">
                  Agentes
                  <span className="absolute top-0 right-0 -mt-2 -mr-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </span>
              </a>
              
              {/* OCULTO: Asignar Chats */}
              {/*<a href="/chat-assignments" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/chat-assignments' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="14" rx="3" fill="#8B5CF6"/>
                  <circle cx="8" cy="9" r="1.5" fill="white"/>
                  <circle cx="16" cy="9" r="1.5" fill="white"/>
                  <path d="M6 13h12v2H6z" fill="white"/>
                  <path d="M18 18l-3-3H6a1 1 0 01-1-1v-1h14v1a1 1 0 01-1 1z" fill="#A855F7"/>
                </svg>
                Asignar Chats
              </a>*/}
              
              <a href="/ai-settings" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/ai-settings' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" fill="#9333EA"/>
                  <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="1.5" fill="#C084FC"/>
                  <circle cx="15" cy="15" r="1.5" fill="#A855F7"/>
                  <circle cx="15" cy="9" r="1" fill="white"/>
                  <circle cx="9" cy="15" r="1" fill="white"/>
                </svg>
                AI Integration
              </a>
              
              <a href="/agent-security" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/agent-security' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="10" rx="2" fill="#DC2626"/>
                  <rect x="7" y="7" width="10" height="4" rx="2" stroke="#DC2626" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="15" r="2" fill="white"/>
                  <rect x="11" y="16" width="2" height="3" fill="white"/>
                </svg>
                <span className="relative">
                  Control y Seguridad
                  <span className="absolute top-0 right-0 -mt-2 -mr-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </span>
              </a>



              <a href="/settings" className={`flex items-center px-3 py-2 text-xs font-medium rounded-md ${location === '/settings' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'} transition-all duration-200`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" fill="#374151"/>
                  <circle cx="12" cy="12" r="3" fill="#F59E0B"/>
                  <rect x="11" y="2" width="2" height="4" rx="1" fill="#6B7280"/>
                  <rect x="11" y="18" width="2" height="4" rx="1" fill="#6B7280"/>
                  <rect x="18" y="11" width="4" height="2" rx="1" fill="#6B7280"/>
                  <rect x="2" y="11" width="4" height="2" rx="1" fill="#6B7280"/>
                  <rect x="17.5" y="4.9" width="2" height="4" rx="1" fill="#6B7280" transform="rotate(45 18.5 6.9)"/>
                  <rect x="4.5" y="4.9" width="2" height="4" rx="1" fill="#6B7280" transform="rotate(-45 5.5 6.9)"/>
                </svg>
                Configuración
              </a>
              
              {/* Perfil de usuario y cierre de sesión */}
              <div className="mt-auto pt-4 border-t border-white/10">
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <a href="/profile" className="flex items-center group">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {user ? user.username?.substring(0, 2).toUpperCase() : "US"}
                      </div>
                      <div className="ml-2">
                        <p className="text-xs font-medium text-white group-hover:text-white/90">{user?.username || "Usuario"}</p>
                        <p className="text-xs text-white/60">{user?.role || "Rol no disponible"}</p>
                      </div>
                    </a>
                    <button
                      onClick={() => {
                        if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
                          // Usar la función de cierre de sesión del contexto de autenticación
                          window.location.href = '/login';
                          localStorage.removeItem('crm_auth_token');
                          localStorage.removeItem('crm_user_data');
                        }
                      }}
                      className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 ${showSidebar ? 'ml-44' : ''} overflow-hidden`}>
        <div className="w-full h-full">
          {isLoadingGeminiKey && isAuthenticated ? (
            <div className="flex justify-center items-center h-12">
              <Spinner className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-gray-600">Cargando configuración de la API...</span>
            </div>
          ) : (
            <PageTransition>
              <ErrorBoundary>
                <Switch>
                {/* Ruta de login pública */}
                <Route path="/login" component={Login} />
                
                {/* Rutas protegidas */}
                <Route path="/" component={() => <PrivateRoute component={Dashboard} path="/" />} />
                <Route path="/leads" component={() => <PrivateRoute component={Leads} path="/leads" />} />
                <Route path="/sales-pipeline" component={() => <PrivateRoute component={SalesPipeline} path="/sales-pipeline" />} />
                <Route path="/messages" component={() => <PrivateRoute component={Messages} path="/messages" />} />
                <Route path="/modern-messaging" component={() => <PrivateRoute component={ModernMessaging} path="/modern-messaging" />} />
                <Route path="/calendar" component={() => <PrivateRoute component={Calendar} path="/calendar" />} />
                <Route path="/tasks" component={() => <PrivateRoute component={Tasks} path="/tasks" />} />
                <Route path="/tickets" component={() => <PrivateRoute component={TicketsSimple} path="/tickets" />} />
                <Route path="/analytics" component={() => <PrivateRoute component={Analytics} path="/analytics" />} />
                <Route path="/gemini-ai" component={() => <PrivateRoute component={GeminiAI} path="/gemini-ai" />} />
                <Route path="/settings" component={() => <PrivateRoute component={Settings} path="/settings" />} />
                <Route path="/ai-settings" component={() => <PrivateRoute component={AISettings} path="/ai-settings" />} />

                <Route path="/media-gallery" component={() => <PrivateRoute component={MediaGallery} path="/media-gallery" />} />
                <Route path="/message-templates" component={() => <PrivateRoute component={MessageTemplates} path="/message-templates" />} />
                <Route path="/mass-sender" component={() => <PrivateRoute component={MassSender} path="/mass-sender" />} />
                <Route path="/integrations" component={() => <PrivateRoute component={Integrations} path="/integrations" />} />
                <Route path="/auto-response-settings" component={() => <PrivateRoute component={AutoResponseSettings} path="/auto-response-settings" />} />
                <Route path="/external-agents" component={() => <PrivateRoute component={ExternalAgents} path="/external-agents" />} />
                <Route path="/internal-agents" component={() => <PrivateRoute component={InternalAgents} path="/internal-agents" />} />
                <Route path="/agent-analysis" component={() => <PrivateRoute component={AgentAnalysis} path="/agent-analysis" />} />
                <Route path="/connection" component={() => <PrivateRoute component={Connection} path="/connection" />} />
                <Route path="/qrcode" component={() => <PrivateRoute component={QRCode} path="/qrcode" />} />
                <Route path="/qr-viewer" component={() => <PrivateRoute component={QrViewer} path="/qr-viewer" />} />
                <Route path="/qr-text" component={() => <PrivateRoute component={QrTextViewer} path="/qr-text" />} />
                <Route path="/whatsapp-manager" component={() => <PrivateRoute component={WhatsAppManager} path="/whatsapp-manager" />} />
                <Route path="/raw-qr" component={() => <PrivateRoute component={RawQrViewer} path="/raw-qr" />} />
                <Route path="/simple-whatsapp" component={() => <PrivateRoute component={SimpleWhatsApp} path="/simple-whatsapp" />} />
                <Route path="/ultra-whatsapp" component={() => <PrivateRoute component={UltraSimpleChat} path="/ultra-whatsapp" />} />
                {/* Ruta de demostración eliminada - solo chats reales */}
                <Route path="/users" component={() => <PrivateRoute component={UserManagement} path="/users" />} />
                <Route path="/whatsapp-accounts" component={() => <PrivateRoute component={WhatsAppAccounts} path="/whatsapp-accounts" />} />
                <Route path="/whatsapp-connection" component={() => <PrivateRoute component={WhatsAppConnection} path="/whatsapp-connection" />} />
                <Route path="/agent-monitoring" component={() => <PrivateRoute component={AgentMonitoring} path="/agent-monitoring" />} />
                <Route path="/agent-security" component={() => <PrivateRoute component={AgentSecurity} path="/agent-security" />} />
                <Route path="/chat-assignments" component={() => <PrivateRoute component={ChatAssignments} path="/chat-assignments" />} />
                <Route path="/profile" component={() => <PrivateRoute component={Profile} path="/profile" />} />
                <Route component={() => <PrivateRoute component={NotFound} path="*" />} />
                </Switch>
              </ErrorBoundary>
            </PageTransition>
          )}
        </div>
      </main>
      
      <ModelNotificationProvider>
        <Toaster />
      </ModelNotificationProvider>
      
      {/* Sistema de rastreo global de actividades para seguridad y control */}
      {isAuthenticated && <GlobalActivityTracker />}
    </div>
  );
};

// Componente App principal que envuelve todo con el contexto de autenticación
const App: React.FC = () => {
  return (
    <AuthProvider>
      <PageTranslationProvider>
        <AppRoutes />
      </PageTranslationProvider>
    </AuthProvider>
  );
};

export default App;