import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2, Database as DatabaseIcon, RotateCw, Server } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Helmet } from "react-helmet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

type DatabaseStatus = {
  status: "connected" | "memory_mode";
  message: string;
  database_url: "configured" | "missing";
};

export default function Database() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("status");
  
  // Consultar el estado de la base de datos
  const { data: dbStatus, isLoading: isLoadingStatus, error, refetch } = useQuery<DatabaseStatus>({
    queryKey: ['/api/database/status'],
    retry: 1,
  });

  // Función para reiniciar el servidor
  const handleRestartServer = async () => {
    try {
      toast({
        title: "Reiniciando servidor...",
        description: "Por favor espere mientras se reinicia el servidor",
      });
      
      // En una aplicación real, esto llamaría a un endpoint para reiniciar
      // Para este ejemplo, simplemente recargamos la página después de un retraso
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast({
        title: "Error al reiniciar",
        description: "No se pudo reiniciar el servidor",
        variant: "destructive",
      });
    }
  };

  // Función para inicializar la base de datos
  const handleInitializeDatabase = async () => {
    try {
      toast({
        title: "Inicializando base de datos...",
        description: "Este proceso puede tardar unos segundos",
      });
      
      const response = await fetch('/api/database/initialize', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "Base de datos inicializada",
          description: "La base de datos ha sido inicializada correctamente",
        });
        // Refrescar el estado
        refetch();
      } else {
        throw new Error('Error al inicializar la base de datos');
      }
    } catch (error) {
      toast({
        title: "Error de inicialización",
        description: "No se pudo inicializar la base de datos",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Helmet>
        <title>Configuración de Base de Datos | CRM con Gemini</title>
        <meta name="description" content="Gestiona la configuración de la base de datos PostgreSQL para el CRM" />
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Base de Datos</h1>
          <p className="text-muted-foreground">Gestiona la configuración y estado de la base de datos</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} size="sm">
          <RotateCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
      
      <Tabs defaultValue="status" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="status">Estado</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status" className="pt-4">
          {isLoadingStatus ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de conexión</AlertTitle>
              <AlertDescription>
                No se pudo obtener el estado de la base de datos.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Estado de la Base de Datos</CardTitle>
                  <Badge variant={dbStatus?.status === "connected" ? "outline" : "default"} className={dbStatus?.status === "connected" ? "bg-green-100 text-green-800" : ""}>
                    {dbStatus?.status === "connected" ? "Conectado" : "Modo Memoria"}
                  </Badge>
                </div>
                <CardDescription>{dbStatus?.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center p-4 border rounded-md">
                    <Server className="h-10 w-10 mr-4 text-primary" />
                    <div>
                      <h3 className="font-medium">Modo de almacenamiento</h3>
                      <p className="text-sm text-muted-foreground">
                        {dbStatus?.status === "connected" ? "PostgreSQL" : "Memoria (temporal)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 border rounded-md">
                    <DatabaseIcon className="h-10 w-10 mr-4 text-primary" />
                    <div>
                      <h3 className="font-medium">Variable DATABASE_URL</h3>
                      <p className="text-sm text-muted-foreground">
                        {dbStatus?.database_url === "configured" ? "Configurada" : "No configurada"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {dbStatus?.status !== "connected" && (
                  <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Modo memoria activo</AlertTitle>
                    <AlertDescription>
                      El sistema está utilizando almacenamiento en memoria. Los datos se perderán cuando se reinicie el servidor.
                      Configure una base de datos PostgreSQL para almacenamiento persistente.
                    </AlertDescription>
                  </Alert>
                )}
                
                {dbStatus?.status === "connected" && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Base de datos conectada</AlertTitle>
                    <AlertDescription>
                      La conexión a PostgreSQL está activa y funcionando correctamente.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleRestartServer}>
                  Reiniciar Servidor
                </Button>
                {dbStatus?.status === "connected" && (
                  <Button onClick={handleInitializeDatabase}>
                    Inicializar Base de Datos
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de PostgreSQL</CardTitle>
              <CardDescription>
                Configure los parámetros de conexión a la base de datos PostgreSQL.
                Necesitará reiniciar el servidor para aplicar los cambios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuración avanzada</AlertTitle>
                <AlertDescription>
                  Esta configuración se realiza a nivel de entorno. Para establecer la variable DATABASE_URL,
                  utilice los secretos de entorno de su plataforma de hosting.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium mb-2">Formato de cadena de conexión</h3>
                    <code className="bg-muted p-2 rounded text-sm block">
                      postgresql://usuario:contraseña@host:puerto/nombre_db
                    </code>
                  </div>
                  
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium mb-2">Ejemplo de conexión</h3>
                    <code className="bg-muted p-2 rounded text-sm block">
                      postgresql://postgres:mypassword@localhost:5432/crmdb
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("status")}>
                Volver al estado
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}