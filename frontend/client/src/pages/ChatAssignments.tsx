import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge
} from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  UserPlus,
  Users,
  MessageCircle,
  Check,
  Plus
} from 'lucide-react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { apiRequest } from '../lib/queryClient';
import { useAuth } from '../lib/authContext';

// Tipo para cuenta de WhatsApp
type WhatsAppAccount = {
  id: number;
  name: string;
  status: string;
  ownerName?: string | null;
};

// Tipo para usuario
type User = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  status: string;
};

// Tipo para chat
type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  profilePicUrl?: string;
  unreadCount?: number;
};

// Tipo para asignación de chat
type ChatAssignment = {
  id: number;
  chatId: string;
  accountId: number;
  assignedToId: number;
  assignedById?: number;
  category?: string;
  status: string;
  assignedAt: string;
  lastActivityAt?: string;
  chatInfo?: Chat;
  assignedTo?: User;
  assignedBy?: User;
  accountInfo?: WhatsAppAccount;
};

// Esquema para la creación/edición de asignaciones
const assignmentSchema = z.object({
  chatId: z.string().min(1, { message: 'Debe seleccionar un chat' }),
  accountId: z.number().min(1, { message: 'Debe seleccionar una cuenta' }),
  assignedToId: z.number().min(1, { message: 'Debe seleccionar un usuario' }),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const ChatAssignments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<ChatAssignment | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  
  // Cargar asignaciones de chat
  const { data: assignments = [], isLoading, error, refetch } = useQuery<ChatAssignment[]>({
    queryKey: ['/api/chat-assignments'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/chat-assignments');
      } catch (error) {
        console.error('Error cargando asignaciones:', error);
        return [];
      }
    }
  });
  
  // Cargar cuentas de WhatsApp
  const { data: accounts = [] } = useQuery<WhatsAppAccount[]>({
    queryKey: ['/api/whatsapp-accounts'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/whatsapp-accounts');
      } catch (error) {
        console.error('Error cargando cuentas de WhatsApp:', error);
        return [];
      }
    }
  });
  
  // Cargar usuarios
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/users');
        return data.success ? data.users : [];
      } catch (error) {
        console.error('Error cargando usuarios:', error);
        return [];
      }
    }
  });
  
  // Cargar chats de la cuenta seleccionada
  const { data: chats = [], refetch: refetchChats } = useQuery<Chat[]>({
    queryKey: ['/api/whatsapp-accounts', selectedAccount, 'chats'],
    queryFn: async () => {
      if (!selectedAccount) return [];
      try {
        return await apiRequest(`/api/whatsapp-accounts/${selectedAccount}/chats`);
      } catch (error) {
        console.error('Error cargando chats:', error);
        return [];
      }
    },
    enabled: !!selectedAccount
  });
  
  // Mutation para crear asignación
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      return await apiRequest('/api/chat-assignments', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: 'Asignación creada',
        description: 'La asignación se ha creado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat-assignments'] });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la asignación',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation para eliminar asignación
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/chat-assignments/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Asignación eliminada',
        description: 'La asignación se ha eliminado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat-assignments'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la asignación',
        variant: 'destructive',
      });
    }
  });
  
  // Formulario para crear asignación
  const form = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      chatId: '',
      accountId: 0,
      assignedToId: 0,
      category: '',
      notes: '',
    },
  });
  
  // Manejar envío del formulario
  const onSubmit = (data: z.infer<typeof assignmentSchema>) => {
    createAssignmentMutation.mutate(data);
  };
  
  // Manejar cambio de cuenta seleccionada
  const handleAccountChange = (accountId: number) => {
    setSelectedAccount(accountId);
    form.setValue('accountId', accountId);
    refetchChats();
  };
  
  // Eliminar asignación
  const handleDelete = (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta asignación?')) {
      deleteAssignmentMutation.mutate(id);
    }
  };
  
  // Renderizar badge de estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Activa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendiente</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">Cerrada</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };
  
  // Determinar si el usuario actual puede gestionar asignaciones
  const canManageAssignments = currentUser?.role === 'admin' || 
                               currentUser?.role === 'super_admin' || 
                               currentUser?.role === 'supervisor';
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">Error al cargar las asignaciones de chat</div>
        <Button onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Asignaciones de chat</h1>
          <p className="text-muted-foreground">
            Gestione la asignación de chats de WhatsApp a agentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          {canManageAssignments && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Añadir asignación
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar chat</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cuenta de WhatsApp *</FormLabel>
                          <Select
                            onValueChange={(value) => handleAccountChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione una cuenta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem
                                  key={account.id}
                                  value={account.id.toString()}
                                  disabled={account.status !== 'active'}
                                >
                                  {account.name} {account.status !== 'active' ? '(Inactiva)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="chatId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chat *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!selectedAccount}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un chat" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {chats.length > 0 ? (
                                chats.map((chat) => (
                                  <SelectItem
                                    key={chat.id}
                                    value={chat.id}
                                  >
                                    {chat.name || chat.id}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem
                                  value="no-chats"
                                  disabled
                                >
                                  No hay chats disponibles
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asignar a *</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un agente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users
                                .filter(u => u.status === 'active')
                                .map((user) => (
                                  <SelectItem
                                    key={user.id}
                                    value={user.id.toString()}
                                  >
                                    {user.fullName} ({user.username})
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Ventas, Soporte, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas</FormLabel>
                          <FormControl>
                            <Input placeholder="Notas sobre la asignación" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setAddDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createAssignmentMutation.isPending}
                      >
                        {createAssignmentMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creando...
                          </>
                        ) : 'Asignar'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          {canManageAssignments && (
            <TabsTrigger value="my-assignments">Mis asignaciones</TabsTrigger>
          )}
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <Card key={assignment.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">
                        {assignment.chatInfo?.name || 'Chat sin nombre'}
                      </CardTitle>
                      {renderStatusBadge(assignment.status)}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {assignment.chatInfo?.isGroup ? 'Grupo' : 'Contacto'} - ID: {assignment.chatId.split('@')[0]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-1 text-sm my-2">
                      <div className="text-muted-foreground">Cuenta:</div>
                      <div>{assignment.accountInfo?.name || `ID: ${assignment.accountId}`}</div>
                      <div className="text-muted-foreground">Asignado a:</div>
                      <div>{assignment.assignedTo?.fullName || `ID: ${assignment.assignedToId}`}</div>
                      <div className="text-muted-foreground">Asignado por:</div>
                      <div>{assignment.assignedBy?.fullName || 'Sistema'}</div>
                      <div className="text-muted-foreground">Categoría:</div>
                      <div>{assignment.category || 'Sin categoría'}</div>
                      <div className="text-muted-foreground">Fecha:</div>
                      <div>
                        {assignment.assignedAt 
                          ? new Date(assignment.assignedAt).toLocaleString() 
                          : 'Desconocida'}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t p-4">
                    <div className="flex gap-1">
                      {canManageAssignments && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-500 border-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(assignment.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Navegar a la página de mensajes con este chat
                          window.location.href = `/messages?chat=${assignment.chatId}`;
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ver mensajes
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center bg-muted p-12 rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No hay asignaciones</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No hay asignaciones de chat registradas en el sistema.
                </p>
                {canManageAssignments && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Añadir asignación
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="my-assignments">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments
              .filter(a => a.assignedToId === currentUser?.id)
              .length > 0 ? (
              assignments
                .filter(a => a.assignedToId === currentUser?.id)
                .map((assignment) => (
                  <Card key={assignment.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">
                          {assignment.chatInfo?.name || 'Chat sin nombre'}
                        </CardTitle>
                        {renderStatusBadge(assignment.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {assignment.chatInfo?.isGroup ? 'Grupo' : 'Contacto'} - ID: {assignment.chatId.split('@')[0]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-1 text-sm my-2">
                        <div className="text-muted-foreground">Cuenta:</div>
                        <div>{assignment.accountInfo?.name || `ID: ${assignment.accountId}`}</div>
                        <div className="text-muted-foreground">Categoría:</div>
                        <div>{assignment.category || 'Sin categoría'}</div>
                        <div className="text-muted-foreground">Fecha:</div>
                        <div>
                          {assignment.assignedAt 
                            ? new Date(assignment.assignedAt).toLocaleString() 
                            : 'Desconocida'}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t p-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Navegar a la página de mensajes con este chat
                          window.location.href = `/messages?chat=${assignment.chatId}`;
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ver mensajes
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center bg-muted p-12 rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No tienes asignaciones</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No tienes chats asignados actualmente.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.filter(a => a.status === 'active').length > 0 ? (
              assignments
                .filter(a => a.status === 'active')
                .map((assignment) => (
                  <Card key={assignment.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">
                          {assignment.chatInfo?.name || 'Chat sin nombre'}
                        </CardTitle>
                        {renderStatusBadge(assignment.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {assignment.chatInfo?.isGroup ? 'Grupo' : 'Contacto'} - ID: {assignment.chatId.split('@')[0]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-1 text-sm my-2">
                        <div className="text-muted-foreground">Cuenta:</div>
                        <div>{assignment.accountInfo?.name || `ID: ${assignment.accountId}`}</div>
                        <div className="text-muted-foreground">Asignado a:</div>
                        <div>{assignment.assignedTo?.fullName || `ID: ${assignment.assignedToId}`}</div>
                        <div className="text-muted-foreground">Categoría:</div>
                        <div>{assignment.category || 'Sin categoría'}</div>
                        <div className="text-muted-foreground">Fecha:</div>
                        <div>
                          {assignment.assignedAt 
                            ? new Date(assignment.assignedAt).toLocaleString() 
                            : 'Desconocida'}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4">
                      <div className="flex gap-1">
                        {canManageAssignments && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-500 border-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Navegar a la página de mensajes con este chat
                          window.location.href = `/messages?chat=${assignment.chatId}`;
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ver mensajes
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center bg-muted p-12 rounded-lg">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No hay asignaciones activas</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No hay asignaciones activas en el sistema.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="pending">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.filter(a => a.status === 'pending').length > 0 ? (
              assignments
                .filter(a => a.status === 'pending')
                .map((assignment) => (
                  <Card key={assignment.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">
                          {assignment.chatInfo?.name || 'Chat sin nombre'}
                        </CardTitle>
                        {renderStatusBadge(assignment.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {assignment.chatInfo?.isGroup ? 'Grupo' : 'Contacto'} - ID: {assignment.chatId.split('@')[0]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-1 text-sm my-2">
                        <div className="text-muted-foreground">Cuenta:</div>
                        <div>{assignment.accountInfo?.name || `ID: ${assignment.accountId}`}</div>
                        <div className="text-muted-foreground">Asignado a:</div>
                        <div>{assignment.assignedTo?.fullName || `ID: ${assignment.assignedToId}`}</div>
                        <div className="text-muted-foreground">Categoría:</div>
                        <div>{assignment.category || 'Sin categoría'}</div>
                        <div className="text-muted-foreground">Fecha:</div>
                        <div>
                          {assignment.assignedAt 
                            ? new Date(assignment.assignedAt).toLocaleString() 
                            : 'Desconocida'}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4">
                      <div className="flex gap-1">
                        {canManageAssignments && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-500 border-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Cambiar estado a activo
                            // (Aquí iría la mutación para cambiar el estado)
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aceptar
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center bg-muted p-12 rounded-lg">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No hay asignaciones pendientes</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No hay asignaciones pendientes en el sistema.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatAssignments;