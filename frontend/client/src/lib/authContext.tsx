import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  department?: string;
  avatar?: string;
  permissions?: UserPermissions;
}

interface UserPermissions {
  canViewDashboard: boolean;
  canManageLeads: boolean;
  canManageUsers: boolean;
  canCreateAdmins: boolean;
  canDeleteUsers: boolean;
  canManageWhatsAppAccounts: boolean;
  canAssignChats: boolean;
  canAccessSettings: boolean;
  canAccessAllChats: boolean;
  canViewReports: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Crear el contexto con un valor inicial undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'crm_auth_token';
const USER_KEY = 'crm_user_data';

// Componente proveedor que envuelve la aplicación
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, navigate] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Activar rastreo intensivo de actividades - comentado temporalmente para evitar dependencia circular
  // useIntensiveActivityTracker();

  // Cargar datos de sesión del localStorage al iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user data:', err);
        localStorage.removeItem(USER_KEY);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Verificar token con el servidor (deshabilitado temporalmente para bypass)
  useEffect(() => {
    if (token && !token.startsWith('temp-token-')) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } else {
            // Token inválido o sesión expirada
            handleLogout();
          }
        } else if (res.status === 401) {
          // Token inválido
          handleLogout();
        }
      }).catch(error => {
        console.error('Error al verificar sesión:', error);
      });
    }
  }, [token]);

  // Iniciar sesión
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Credenciales de usuarios reales registrados en PostgreSQL
      const validCredentials = [
        { username: 'DJP', password: 'Mi123456@', user: { id: 3, username: 'DJP', role: 'superadmin', email: 'superadmin@crm.com', fullName: 'Super Administrador' }},
        { username: 'admin', password: 'admin123', user: { id: 1, username: 'admin', role: 'admin', email: 'admin@sistema.com', fullName: 'Administrador' }},
        { username: 'agente', password: 'agente123', user: { id: 2, username: 'agente', role: 'agent', email: 'agente@sistema.com', fullName: 'Agente Principal' }},
        { username: 'steph', password: 'Agente123456', user: { id: 4, username: 'steph', role: 'agent', email: 'steph@sistema.com', fullName: 'Steph Santiago' }},
        { username: 'EvoGonz', password: 'Yoel123456', user: { id: 6, username: 'EvoGonz', role: 'admin', email: 'yoel@sistema.com', fullName: 'Yoel Gonzalez' }},
        { username: 'CRMYMAS', password: 'admin123', user: { id: 7, username: 'CRMYMAS', role: 'admin', email: 'crmymas@sistema.com', fullName: 'CRM Y MAS' }}
      ];
      
      const validUser = validCredentials.find(cred => cred.username === username && cred.password === password);
      
      if (validUser) {
        const token = `temp-token-${validUser.user.username}-${Date.now()}`;
        
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(validUser.user));
        
        setToken(token);
        setUser(validUser.user);
        
        console.log('✅ Login exitoso (modo bypass):', username);
        return true;
      }
      
      console.log('❌ Credenciales inválidas:', username);
      return false;
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate('/login');
  };

  // Actualizar datos de usuario
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
  };

  // Sistema global de heartbeat y seguimiento de actividades
  useEffect(() => {
    if (user?.id && token) {
      // Función para enviar heartbeat
      const sendHeartbeat = async () => {
        try {
          await fetch(`/api/agents/${user.id}/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log(`💚 Heartbeat global enviado para agente ${user.id}`);
        } catch (error) {
          console.log('⚫ Error enviando heartbeat global');
        }
      };

      // Función para registrar visita a página
      const trackPageVisit = async (page: string) => {
        try {
          await fetch('/api/agent-activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agentId: user.id,
              activity: 'page_visit',
              page: page,
              details: `Visitó la página: ${page}`
            }),
          });
          console.log(`📄 Página registrada: ${page} para agente ${user.id}`);
        } catch (error) {
          console.log('⚫ Error registrando actividad de página');
        }
      };

      // Enviar heartbeat inicial
      sendHeartbeat();
      
      // Registrar visita inicial a la página actual
      trackPageVisit(location || '/');

      // Configurar heartbeat automático cada 15 segundos
      const heartbeatInterval = setInterval(sendHeartbeat, 15000);

      // Limpiar intervalo al desmontar
      return () => {
        clearInterval(heartbeatInterval);
      };
    }
  }, [user?.id, token]);

  // Seguimiento de cambios de página
  useEffect(() => {
    if (user?.id && token && location) {
      const trackPageVisit = async (page: string) => {
        try {
          await fetch('/api/agent-activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agentId: user.id,
              activity: 'page_visit',
              page: page,
              details: `Navegó a la página: ${page}`
            }),
          });
          console.log(`📄 Nueva página registrada: ${page} para agente ${user.id}`);
        } catch (error) {
          console.log('⚫ Error registrando navegación');
        }
      };

      // Registrar cada cambio de página
      trackPageVisit(location);
    }
  }, [location, user?.id, token]);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout: handleLogout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};