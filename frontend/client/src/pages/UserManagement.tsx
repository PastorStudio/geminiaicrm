import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/authContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { isSuperAdmin, canManageAdmins, hasPermission } from '@/lib/permissions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, PlusCircle, UserPlus, UserX, Edit, Trash, Activity, Eye, Clock, BarChart3, User as UserIcon, MessageCircle, Users as UsersIcon, CheckCircle, LogIn, Pencil, Trash2 } from 'lucide-react';

// Definir tipo para usuarios
interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  department?: string;
  avatar?: string;
  lastLoginAt?: string;
  totalLogins?: number;
  lastActivity?: string;
}

// Definir tipo para actividades de agentes
interface AgentActivity {
  id: number;
  agentId: number;
  action: string;
  page: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionToken?: string;
  timestamp: string;
}

interface ActivityStats {
  totalSessions: number;
  lastLogin: string;
  totalPageViews: number;
  mostVisitedPages: string[];
  averageSessionTime: number;
}

// Definir esquema para validar formularios
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const userFormSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  fullName: z.string().min(3, "El nombre completo debe tener al menos 3 caracteres"),
  email: z.string().email("Debe ser un correo electrónico válido"),
  role: z.string().refine(val => ['admin', 'agent', 'supervisor'].includes(val), {
    message: "El rol debe ser admin, agent o supervisor"
  }),
  department: z.string().optional(),
  status: z.string().refine(val => ['active', 'inactive', 'suspended'].includes(val), {
    message: "El estado debe ser active, inactive o suspended"
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const defaultValues: Partial<UserFormValues> = {
  role: "agent",
  status: "active",
  department: "ventas",
};

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Estados para actividades de agentes
  const [showActivities, setShowActivities] = useState(false);
  const [selectedAgentForActivities, setSelectedAgentForActivities] = useState<User | null>(null);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Estados para preview completo del agente
  const [showAgentPreview, setShowAgentPreview] = useState(false);
  const [selectedAgentPreview, setSelectedAgentPreview] = useState<User | null>(null);
  const [agentPreviewData, setAgentPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Estado en vivo de agentes
  const [activeAgents, setActiveAgents] = useState<number[]>([]);

  // Obtener estado en vivo de agentes cada 10 segundos
  const { data: liveStatus } = useQuery({
    queryKey: ['/api/agents/live-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/agents/live-status');
        if (!response.ok) return { activeAgents: [] };
        const data = await response.json();
        return data;
      } catch (error) {
        console.log('⚫ Error obteniendo estado en vivo de agentes');
        return { activeAgents: [] };
      }
    },
    refetchInterval: 10000, // Actualizar cada 10 segundos
    enabled: true
  });

  // Actualizar lista de agentes activos
  useEffect(() => {
    if (liveStatus?.activeAgents) {
      setActiveAgents(liveStatus.activeAgents);
      console.log('💚 Agentes activos:', liveStatus.activeAgents);
    }
  }, [liveStatus]);

  // El heartbeat ahora se maneja globalmente en AuthContext
  
  // DJP SUPERADMINISTRADOR - ACCESO TOTAL GARANTIZADO SIN RESTRICCIONES
  const isSuperAdmin = currentUser?.username === 'DJP' || currentUser?.id === 3 || 
                       currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin';
  const isAdminRole = currentUser?.role === 'admin';
  const isSupervisorRole = currentUser?.role === 'supervisor';
  
  // DJP SIEMPRE tiene acceso - sin excepciones
  const canManageUsers = isSuperAdmin || isAdminRole || isSupervisorRole || currentUser?.username === 'DJP';
  
  // Sólo el superadministrador puede crear/eliminar administradores
  const canManageAdmins = isSuperAdmin;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form para crear/editar usuarios
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  // Obtener lista de usuarios reales desde la base de datos PostgreSQL
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      console.log('🔄 Frontend: Cargando usuarios reales desde PostgreSQL...');
      
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // La API devuelve directamente un array de usuarios, no un objeto con success
        if (Array.isArray(data)) {
          console.log('✅ Frontend: Usuarios reales cargados desde DB:', data.length);
          
          // Obtener estadísticas de actividad para cada usuario
          const usersWithActivity = await Promise.all(
            data.map(async (user: any) => {
              try {
                // Obtener actividades de cada usuario usando la API existente
                const activityResponse = await fetch(`/api/agent-activity/${user.id}`);
                let totalLogins = 0;
                let lastActivity = null;
                
                if (activityResponse.ok) {
                  const activityData = await activityResponse.json();
                  if (activityData.success) {
                    totalLogins = activityData.activities?.filter((a: any) => a.action === 'login').length || 0;
                    lastActivity = activityData.activities?.[0]?.timestamp || null;
                  }
                }
                
                return {
                  ...user,
                  status: 'active',
                  department: user.role === 'super_admin' || user.role === 'superadmin' ? 'administracion' : 
                             user.role === 'admin' ? 'administracion' : 
                             user.role === 'supervisor' ? 'supervision' : 'atencion_cliente',
                  totalLogins,
                  lastActivity
                };
              } catch (error) {
                console.warn('Error obteniendo actividades del usuario:', user.id, error);
                return {
                  ...user,
                  status: 'active',
                  department: user.role === 'super_admin' || user.role === 'superadmin' ? 'administracion' : 
                             user.role === 'admin' ? 'administracion' : 
                             user.role === 'supervisor' ? 'supervision' : 'atencion_cliente',
                  totalLogins: 0,
                  lastActivity: null
                };
              }
            })
          );
          
          return usersWithActivity;
        } else if (data.success && Array.isArray(data.users)) {
          console.log('✅ Frontend: Usuarios reales cargados desde DB:', data.users.length);
          return data.users.map((user: any) => ({
            ...user,
            status: 'active',
            department: user.role === 'super_admin' || user.role === 'superadmin' ? 'administracion' : 
                       user.role === 'admin' ? 'administracion' : 
                       user.role === 'supervisor' ? 'supervision' : 'atencion_cliente'
          }));
        } else {
          console.error('❌ Respuesta inválida del servidor:', data);
          throw new Error('Respuesta inválida del servidor');
        }
      } catch (error) {
        console.error('❌ Error cargando usuarios:', error);
        throw error;
      }
    },
    enabled: true,
    retry: 1
  });

  // Mutación para crear usuario
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear usuario');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDialogOpen(false);
      form.reset(defaultValues);
      toast({
        title: "Usuario creado",
        description: data.message || "El usuario ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error('Error al crear usuario:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar usuario
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: Partial<UserFormValues> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar usuario');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDialogOpen(false);
      setSelectedUser(null);
      form.reset(defaultValues);
      toast({
        title: "Usuario actualizado",
        description: data.message || "El usuario ha sido actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error('Error al actualizar usuario:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    }
  });

  // Mutación para eliminar usuario
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crm_auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar usuario');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Usuario eliminado",
        description: data.message || "El usuario ha sido eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error('Error al eliminar usuario:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  });

  // Función para abrir formulario de edición
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    form.reset({
      username: user.username,
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'agent',
      department: user.department || '',
      status: user.status || 'active',
      // No incluimos la contraseña, para no sobrescribirla si no se cambia
      password: '', // Campo vacío para no forzar cambio de contraseña
    });
    setIsDialogOpen(true);
  };

  // Función para abrir diálogo de eliminación
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Función para ver actividades del agente
  const viewAgentActivities = async (user: User) => {
    setSelectedAgentForActivities(user);
    setShowActivities(true);
    setLoadingActivities(true);
    
    try {
      const response = await fetch(`/api/agent-activity/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAgentActivities(data.activities || []);
          setActivityStats(data.stats || null);
        }
      }
    } catch (error) {
      console.error('Error obteniendo actividades:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades del agente",
        variant: "destructive"
      });
    } finally {
      setLoadingActivities(false);
    }
  };

  // Función para formatear fechas
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para mostrar tiempo relativo
  const timeAgo = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 30) return `Hace ${diffDays} días`;
    return formatDate(dateString);
  };

  // Función para abrir preview completo del agente
  const openAgentPreview = async (user: User) => {
    setSelectedAgentPreview(user);
    setShowAgentPreview(true);
    setLoadingPreview(true);
    
    try {
      // Obtener datos completos del agente
      const [activitiesResponse, chatsResponse, leadsResponse] = await Promise.all([
        fetch(`/api/agent-activity/${user.id}`),
        fetch(`/api/whatsapp-accounts/1/chats`), // Chats asignados
        fetch(`/api/leads`) // Leads del agente
      ]);

      let activities = [];
      let chats = [];
      let leads = [];
      let activityStats = null;

      if (activitiesResponse.ok) {
        const activityData = await activitiesResponse.json();
        if (activityData.success) {
          activities = activityData.activities || [];
          activityStats = activityData.stats || null;
        }
      }

      if (chatsResponse.ok) {
        const chatData = await chatsResponse.json();
        chats = Array.isArray(chatData) ? chatData : [];
      }

      if (leadsResponse.ok) {
        const leadData = await leadsResponse.json();
        leads = Array.isArray(leadData) ? leadData.filter((lead: any) => lead.assigneeId === user.id) : [];
      }

      setAgentPreviewData({
        activities,
        activityStats,
        chats: chats.length,
        leads: leads.length,
        activeChats: chats.filter((chat: any) => chat.unreadCount > 0).length,
        completedLeads: leads.filter((lead: any) => lead.status === 'convertido').length,
        personalData: {
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          totalLogins: user.totalLogins,
          lastActivity: user.lastActivity
        }
      });
      
    } catch (error) {
      console.error('Error cargando datos del agente:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos completos del agente",
        variant: "destructive"
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit del formulario
  const onSubmit = (values: UserFormValues) => {
    if (selectedUser) {
      // Si no se proporciona contraseña, creamos un objeto nuevo sin ella
      const userData: Partial<UserFormValues> = {};
      
      // Copiar solo los campos con valores válidos
      Object.keys(values).forEach(key => {
        // No incluir contraseña vacía
        if (key === 'password' && (!values[key as keyof typeof values] || (values[key as keyof typeof values] as string).trim() === '')) {
          return;
        }
        // Utilizar tipado seguro para acceder a las propiedades
        if (key in values) {
          (userData as any)[key] = values[key as keyof typeof values];
        }
      });
      
      updateUserMutation.mutate({ id: selectedUser.id, userData });
    } else {
      createUserMutation.mutate(values);
    }
  };

  // Esta línea se elimina para evitar conflictos con la declaración anterior

  // Renderizado condicional basado en permisos
  if (!canManageUsers) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a la gestión de usuarios.
              Esta funcionalidad está reservada para administradores y supervisores.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Agentes</h1>
          <p className="text-muted-foreground">
            Administra los agentes que atenderán los chats de WhatsApp
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/users'] })}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar Lista
          </Button>
          <Button 
            onClick={() => {
              setSelectedUser(null);
              form.reset({
                ...defaultValues,
                // Si es superadmin, permitir crear cualquier tipo de usuario
                // Si no es superadmin, solo permitir crear agentes
                role: "agent",
                status: "active",
                department: "ventas"
              });
              setIsDialogOpen(true);
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Agente
          </Button>
        </div>
      </div>

      {/* Panel de estadísticas de agentes */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Agentes Activos</p>
                <h3 className="text-2xl font-bold text-green-700 mt-1">
                  {users?.filter(user => user.status === 'active' && user.role === 'agent').length || 0}
                </h3>
              </div>
              <div className="p-2 bg-green-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-xs text-green-600">
              Agentes disponibles para atender chats
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Departamentos</p>
                <h3 className="text-2xl font-bold text-blue-700 mt-1">
                  {Array.from(new Set(users?.map(user => user.department) || [])).filter(Boolean).length || 0}
                </h3>
              </div>
              <div className="p-2 bg-blue-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-xs text-blue-600">
              Áreas de especialización activas
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Tiempo Promedio</p>
                <h3 className="text-2xl font-bold text-purple-700 mt-1">12 min</h3>
              </div>
              <div className="p-2 bg-purple-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-xs text-purple-600">
              Tiempo de respuesta promedio
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Satisfacción</p>
                <h3 className="text-2xl font-bold text-amber-700 mt-1">94%</h3>
              </div>
              <div className="p-2 bg-amber-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-xs text-amber-600">
              Índice de satisfacción de clientes
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-6 pb-0">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-col">
              <CardTitle className="text-lg">Lista de Agentes</CardTitle>
              <CardDescription>Gestión completa de agentes y personal del sistema</CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2 md:gap-4">
              {/* Filtro por rol */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="role-filter" className="text-xs font-normal text-muted-foreground">Rol:</Label>
                <Select
                  onValueChange={(value) => {
                    // Implementación de filtro por rol
                    console.log("Filtrar por rol:", value);
                  }}
                  defaultValue="all"
                >
                  <SelectTrigger id="role-filter" className="h-8 w-[130px]">
                    <SelectValue placeholder="Todos los roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="agent">Agentes</SelectItem>
                    <SelectItem value="supervisor">Supervisores</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por departamento */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="dept-filter" className="text-xs font-normal text-muted-foreground">Departamento:</Label>
                <Select
                  onValueChange={(value) => {
                    // Implementación de filtro por departamento
                    console.log("Filtrar por departamento:", value);
                  }}
                  defaultValue="all"
                >
                  <SelectTrigger id="dept-filter" className="h-8 w-[150px]">
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ventas">Ventas</SelectItem>
                    <SelectItem value="soporte">Soporte</SelectItem>
                    <SelectItem value="atencion_cliente">Atención al Cliente</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="administracion">Administración</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por estado */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="status-filter" className="text-xs font-normal text-muted-foreground">Estado:</Label>
                <Select
                  onValueChange={(value) => {
                    // Implementación de filtro por estado
                    console.log("Filtrar por estado:", value);
                  }}
                  defaultValue="all"
                >
                  <SelectTrigger id="status-filter" className="h-8 w-[130px]">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                    <SelectItem value="suspended">Suspendidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Búsqueda por nombre */}
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  type="search"
                  placeholder="Buscar agente..."
                  className="pl-8 h-8 w-[200px]"
                  onChange={(e) => {
                    // Implementación de búsqueda por nombre
                    console.log("Buscar:", e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" />
                      Ingresos
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Activity className="h-4 w-4" />
                      Última Actividad
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user: User) => (
                    <TableRow 
                      key={user.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openAgentPreview(user)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-600">
                                {user.username?.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            {/* Indicador de estado en vivo - verde para activo, gris para inactivo */}
                            <div 
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                activeAgents.includes(user.id) ? 'bg-green-500' : 'bg-gray-400'
                              }`} 
                              title={activeAgents.includes(user.id) ? 'Agente activo en el sistema' : 'Agente inactivo'}
                            ></div>
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500">
                              {activeAgents.includes(user.id) ? 'En línea' : 'Desconectado'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.fullName || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        {(() => {
                          // Función para determinar el estilo y texto del badge según el rol
                          let badgeStyle = 'outline';
                          let badgeText = 'Agente';
                          let badgeColor = '';
                          
                          // Determinar el estilo y color según el rol
                          if (user.role === 'admin') {
                            badgeStyle = 'destructive';
                            badgeText = 'Administrador';
                          } else if (user.role === 'supervisor') {
                            badgeStyle = 'default';
                            badgeText = 'Supervisor';
                          } else if (user.role === 'team_lead') {
                            badgeStyle = 'default';
                            badgeText = 'Líder de Equipo';
                            badgeColor = 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                          } else if (user.role === 'coordinator') {
                            badgeStyle = 'default';
                            badgeText = 'Coordinador';
                            badgeColor = 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200';
                          } else if (user.role === 'agent_senior') {
                            badgeStyle = 'outline';
                            badgeText = 'Agente Senior';
                            badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          } else if (user.role === 'agent_specialist') {
                            badgeStyle = 'outline';
                            badgeText = 'Especialista';
                            badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                          } else if (user.role === 'super_admin' || user.role === 'superadmin') {
                            badgeStyle = 'destructive';
                            badgeText = 'SUPERADMINISTRADOR';
                            badgeColor = 'bg-gradient-to-r from-red-600 to-red-800 text-white font-bold shadow-lg';
                          }
                          
                          return (
                            <Badge
                              variant={badgeStyle as any}
                              className={badgeColor}
                            >
                              {badgeText}
                            </Badge>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {user.status === 'active' ? (
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                              Activo
                            </Badge>
                          </div>
                        ) : user.status === 'inactive' ? (
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200">
                              Inactivo
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                            <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                              Suspendido
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.department ? (
                          <div className="flex items-center">
                            {user.department === 'ventas' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            )}
                            {user.department === 'soporte' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            )}
                            {user.department === 'atencion_cliente' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                            {user.department === 'marketing' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                              </svg>
                            )}
                            {user.department === 'administracion' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                            {user.department === 'ventas' && 'Ventas'}
                            {user.department === 'soporte' && 'Soporte'}
                            {user.department === 'atencion_cliente' && 'Atención al Cliente'}
                            {user.department === 'marketing' && 'Marketing'}
                            {user.department === 'administracion' && 'Administración'}
                            {!['ventas', 'soporte', 'atencion_cliente', 'marketing', 'administracion'].includes(user.department) && user.department}
                          </div>
                        ) : '-'}
                      </TableCell>
                      
                      {/* Columna de Ingresos al Sistema */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
                              {user.totalLogins || 0}
                            </Badge>
                            <span className="text-xs text-gray-500">veces</span>
                          </div>
                          {user.totalLogins && user.totalLogins > 0 && (
                            <div className="text-xs text-gray-400">
                              Sistema activo
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Columna de Última Actividad */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-sm font-medium">
                            {timeAgo(user.lastActivity)}
                          </div>
                          {user.lastActivity && (
                            <div className="text-xs text-gray-400">
                              {formatDate(user.lastActivity).split(' ')[0]}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => viewAgentActivities(user)}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Ver Actividades
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                // Cambiar estado (activar/desactivar)
                                const newStatus = user.status === 'active' ? 'inactive' : 'active';
                                updateUserMutation.mutate({ 
                                  id: user.id, 
                                  userData: { status: newStatus } 
                                });
                              }}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(user)}
                              className="text-destructive focus:text-destructive"
                              disabled={user.id === currentUser?.id || user.role === 'super_admin'} // No permitir eliminar al usuario actual o al superadmin
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      {error ? `Error: ${error instanceof Error ? error.message : String(error)}` : 'No hay usuarios registrados'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para crear/editar usuario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedUser ? (
                <>
                  <Edit className="h-5 w-5 mr-2 text-blue-500" />
                  Editar Agente
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2 text-green-500" /> 
                  Registrar Nuevo Agente
                </>
              )}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {selectedUser 
                ? 'Modifica los datos del agente para actualizar su acceso al sistema.' 
                : 'Crea un nuevo agente para que pueda iniciar sesión y atender los chats asignados.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    {selectedUser && (
                      <FormDescription>
                        Deja en blanco para mantener la contraseña actual.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Usuario</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Agentes de Primera Línea</SelectLabel>
                            <SelectItem value="agent">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span>Agente de Chat</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="agent_senior">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span>Agente Senior</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="agent_specialist">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                <span>Especialista</span>
                              </div>
                            </SelectItem>
                          </SelectGroup>
                          
                          <SelectGroup>
                            <SelectLabel>Supervisión y Gestión</SelectLabel>
                            <SelectItem value="supervisor">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>Supervisor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="team_lead">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Líder de Equipo</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="coordinator">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                </svg>
                                <span>Coordinador</span>
                              </div>
                            </SelectItem>
                          </SelectGroup>
                          
                          <SelectGroup>
                            <SelectLabel>Administración</SelectLabel>
                            <SelectItem value="admin">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>Administrador</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="super_admin" disabled={currentUser?.role !== 'super_admin'}>
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                </svg>
                                <span>Super Administrador</span>
                              </div>
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "agent" && "Los agentes pueden ver y responder chats que les sean asignados."}
                        {field.value === "agent_senior" && "Los agentes senior tienen prioridad para casos complejos y pueden asesorar a otros agentes."}
                        {field.value === "agent_specialist" && "Los especialistas manejan consultas técnicas o específicas de un área determinada."}
                        {field.value === "supervisor" && "Los supervisores pueden monitorear a los agentes y sus conversaciones."}
                        {field.value === "team_lead" && "Los líderes de equipo coordinan grupos de agentes y supervisan su desempeño."}
                        {field.value === "coordinator" && "Los coordinadores gestionan varios equipos y supervisan los flujos de trabajo entre departamentos."}
                        {field.value === "admin" && "Los administradores tienen acceso completo a todas las funciones del sistema."}
                        {field.value === "super_admin" && "Los super administradores tienen todos los permisos y pueden configurar roles y permisos del sistema."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del Agente</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                              <span>Activo</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                              <span>Inactivo</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="suspended">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                              <span>Suspendido</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Solo los agentes activos pueden recibir asignaciones de chats.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ventas">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Ventas</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="soporte">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span>Soporte Técnico</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="atencion_cliente">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Atención al Cliente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="marketing">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            <span>Marketing</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="administracion">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>Administración</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      El departamento determina qué tipos de consultas podrá atender el agente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedUser ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              <Trash className="h-5 w-5 mr-2" />
              Confirmar Eliminación de Agente
            </DialogTitle>
            <DialogDescription className="pt-3">
              {selectedUser?.role === 'agent' ? (
                <>
                  <p className="mb-3">Estás a punto de eliminar al agente <strong>{selectedUser?.fullName || selectedUser?.username}</strong>.</p>
                  <div className="flex items-start mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Al eliminar este agente, todas sus asignaciones de chat pasarán al administrador. Las conversaciones existentes no se eliminarán.</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3">Estás a punto de eliminar al usuario <strong>{selectedUser?.fullName || selectedUser?.username}</strong> con rol de <strong>{selectedUser?.role === 'admin' ? 'Administrador' : 'Supervisor'}</strong>.</p>
                  <div className="flex items-start mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Los usuarios con permisos elevados tienen acceso a funciones administrativas. Al eliminarlos, asegúrate de que exista otro administrador en el sistema.</span>
                  </div>
                </>
              )}
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
                Esta acción es permanente y no se puede deshacer.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Confirmar Eliminación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar actividades del agente */}
      <Dialog open={showActivities} onOpenChange={setShowActivities}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
              Actividades de {selectedAgentForActivities?.fullName || selectedAgentForActivities?.username}
            </DialogTitle>
            <DialogDescription>
              Historial completo de actividades y movimientos en el sistema
            </DialogDescription>
          </DialogHeader>

          {loadingActivities ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estadísticas resumidas */}
              {activityStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {activityStats.totalSessions}
                        </div>
                        <div className="text-sm text-blue-500">Sesiones Totales</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {activityStats.totalPageViews}
                        </div>
                        <div className="text-sm text-green-500">Páginas Visitadas</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(activityStats.averageSessionTime)} min
                        </div>
                        <div className="text-sm text-purple-500">Tiempo Promedio</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-amber-600">Último Acceso</div>
                        <div className="text-xs text-amber-500 mt-1">
                          {timeAgo(activityStats.lastLogin)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Lista de actividades */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Historial de Actividades
                </h3>
                
                {agentActivities.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {agentActivities.map((activity, index) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {activity.icon ? (
                            <span className="text-2xl">{activity.icon}</span>
                          ) : activity.action === 'login' ? (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            </div>
                          ) : activity.action === 'page_view' ? (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Activity className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.translatedAction || activity.action}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(activity.timestamp)}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Página: <span className="font-medium">{activity.page}</span>
                          </p>
                          
                          {activity.ipAddress && (
                            <p className="text-xs text-gray-400 mt-1">
                              IP: {activity.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay actividades registradas para este agente</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivities(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Preview Completo del Agente */}
      <Dialog open={showAgentPreview} onOpenChange={setShowAgentPreview}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-600">
              <Eye className="h-5 w-5 mr-2" />
              Preview Completo del Agente
            </DialogTitle>
            <DialogDescription>
              Información detallada de actividades, chats y rendimiento del agente
            </DialogDescription>
          </DialogHeader>
          
          {loadingPreview ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Cargando datos del agente...</span>
            </div>
          ) : selectedAgentPreview && agentPreviewData ? (
            <div className="space-y-6">
              {/* Datos Personales */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Datos Personales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Usuario:</span>
                    <p className="font-semibold">{agentPreviewData.personalData.username}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Nombre Completo:</span>
                    <p className="font-semibold">{agentPreviewData.personalData.fullName || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <p className="font-semibold">{agentPreviewData.personalData.email || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Departamento:</span>
                    <p className="font-semibold">{agentPreviewData.personalData.department || 'No asignado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Rol:</span>
                    <Badge variant="outline" className="font-semibold">
                      {agentPreviewData.personalData.role?.toUpperCase() || 'AGENT'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Estado:</span>
                    <Badge 
                      variant={agentPreviewData.personalData.status === 'active' ? 'default' : 'destructive'}
                      className={agentPreviewData.personalData.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {agentPreviewData.personalData.status?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Estadísticas Generales */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Total Chats</p>
                      <p className="text-2xl font-bold text-green-800">{agentPreviewData.chats}</p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Leads Gestionados</p>
                      <p className="text-2xl font-bold text-blue-800">{agentPreviewData.leads}</p>
                    </div>
                    <UsersIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Chats Activos</p>
                      <p className="text-2xl font-bold text-orange-800">{agentPreviewData.activeChats}</p>
                    </div>
                    <Activity className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Leads Convertidos</p>
                      <p className="text-2xl font-bold text-purple-800">{agentPreviewData.completedLeads}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Estadísticas de Actividad */}
              {agentPreviewData.activityStats && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Estadísticas de Actividad
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total Sesiones:</span>
                      <p className="text-xl font-bold text-blue-600">{agentPreviewData.activityStats.totalSessions}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Páginas Visitadas:</span>
                      <p className="text-xl font-bold text-green-600">{agentPreviewData.activityStats.totalPageViews}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Último Acceso:</span>
                      <p className="font-semibold">{timeAgo(agentPreviewData.activityStats.lastLogin)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Tiempo Promedio:</span>
                      <p className="font-semibold">{agentPreviewData.activityStats.averageSessionTime} min</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actividades Recientes */}
              <div className="border rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Actividades Recientes
                  </h3>
                </div>
                <div className="p-4">
                  {agentPreviewData.activities.length > 0 ? (
                    <div className="space-y-3">
                      {agentPreviewData.activities.slice(0, 10).map((activity: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
                          <div className="flex-shrink-0">
                            {activity.icon ? (
                              <span className="text-lg">{activity.icon}</span>
                            ) : activity.action === 'login' ? (
                              <LogIn className="h-5 w-5 text-green-500" />
                            ) : activity.action === 'page_view' ? (
                              <Eye className="h-5 w-5 text-blue-500" />
                            ) : (
                              <Activity className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.translatedAction || activity.action}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(activity.timestamp)}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">
                              Página: <span className="font-medium">{activity.page}</span>
                            </p>
                            {activity.ipAddress && (
                              <p className="text-xs text-gray-500">
                                IP: {activity.ipAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay actividades registradas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón para ver actividades completas */}
              <div className="flex justify-center">
                <Button 
                  onClick={() => {
                    setShowAgentPreview(false);
                    viewAgentActivities(selectedAgentPreview);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Activity className="h-4 w-4" />
                  <span>Ver Todas las Actividades</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UserIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No se pudieron cargar los datos del agente</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}