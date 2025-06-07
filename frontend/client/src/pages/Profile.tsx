import React from 'react';
import { useAuth } from '@/lib/authContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>Debes iniciar sesión para ver tu perfil</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      // Eliminar datos de sesión
      localStorage.removeItem('crm_auth_token');
      localStorage.removeItem('crm_user_data');
      
      // Mostrar notificación
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
      });
      
      // Redirigir al login
      navigate('/login');
    }
  };

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <Avatar className="h-24 w-24 mx-auto">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.username} />
                ) : (
                  <AvatarFallback className="text-2xl bg-gradient-to-r from-blue-500 to-purple-600">
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <CardTitle>{user.fullName || user.username}</CardTitle>
            <CardDescription>{user.email || 'No hay email registrado'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Badge variant="outline" className="mb-2">{user.role || 'Usuario'}</Badge>
            {user.department && (
              <p className="text-sm text-muted-foreground">Departamento: {user.department}</p>
            )}
            <div className="mt-6">
              <Button variant="destructive" onClick={handleLogout} className="w-full">
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información de la cuenta</CardTitle>
            <CardDescription>Detalles de tu perfil en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Nombre de usuario</span>
                <span className="font-medium">{user.username}</span>
              </div>
              
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">ID de usuario</span>
                <span className="font-medium">{user.id}</span>
              </div>
              
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Rol</span>
                <span className="font-medium">{user.role || 'No especificado'}</span>
              </div>
              
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Estado</span>
                <div>
                  <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                    {user.status === 'active' ? 'Activo' : user.status || 'No especificado'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Departamento</span>
                <span className="font-medium">{user.department || 'No especificado'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;