import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Send, Phone, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface SendImmediateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importedData: any;
}

export function SendImmediateDialog({
  open,
  onOpenChange,
  importedData
}: SendImmediateDialogProps) {
  // Estados para mensajes y contactos
  const [messageText, setMessageText] = useState<string>("");
  const [isSendingMessages, setIsSendingMessages] = useState<boolean>(false);
  
  // Estados para selección de contactos
  const [selectedImportedContactIds, setSelectedImportedContactIds] = useState<string[]>([]);
  const [selectAllImported, setSelectAllImported] = useState<boolean>(false);
  
  // Estados para contactos de WhatsApp
  const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
  const [loadingWhatsAppContacts, setLoadingWhatsAppContacts] = useState<boolean>(false);
  const [selectedWhatsAppContactIds, setSelectedWhatsAppContactIds] = useState<string[]>([]);
  const [selectAllWhatsApp, setSelectAllWhatsApp] = useState<boolean>(false);

  // Limpiar selecciones al cerrar el diálogo
  useEffect(() => {
    if (!open) {
      setMessageText("");
      setSelectedImportedContactIds([]);
      setSelectedWhatsAppContactIds([]);
      setSelectAllImported(false);
      setSelectAllWhatsApp(false);
    }
  }, [open]);

  // Cargar contactos de WhatsApp
  const fetchWhatsAppContacts = async () => {
    try {
      setLoadingWhatsAppContacts(true);
      const response = await fetch('/api/direct/whatsapp/contacts');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Contactos de WhatsApp obtenidos:", data);
      setWhatsAppContacts(data);
    } catch (error) {
      console.error('Error obteniendo contactos de WhatsApp:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los contactos de WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoadingWhatsAppContacts(false);
    }
  };

  // Manejar selección de contacto importado
  const handleToggleImportedContact = (contactId: string) => {
    setSelectedImportedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Manejar selección de todos los contactos importados
  const handleSelectAllImportedContacts = (checked: boolean) => {
    setSelectAllImported(checked);
    
    if (checked && importedData && importedData.contacts) {
      setSelectedImportedContactIds(importedData.contacts.map((c: any) => c.id));
    } else {
      setSelectedImportedContactIds([]);
    }
  };

  // Manejar selección de contacto de WhatsApp
  const handleToggleWhatsAppContact = (contactId: string) => {
    setSelectedWhatsAppContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Manejar selección de todos los contactos de WhatsApp
  const handleToggleAllWhatsAppContacts = (checked: boolean) => {
    setSelectAllWhatsApp(checked);
    
    if (checked && whatsAppContacts && whatsAppContacts.length > 0) {
      setSelectedWhatsAppContactIds(whatsAppContacts
        .filter((contact: any) => contact.id?.user)
        .map((contact: any) => contact.id.user)
      );
    } else {
      setSelectedWhatsAppContactIds([]);
    }
  };

  // Función para enviar mensajes de inmediato
  const handleSendImmediate = () => {
    if (!messageText.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Debes ingresar un mensaje para enviar.",
        variant: "destructive",
      });
      return;
    }
    
    // Combinar contactos importados y contactos de WhatsApp
    const allSelectedContactIds = [...selectedImportedContactIds, ...selectedWhatsAppContactIds];
    
    if (allSelectedContactIds.length === 0) {
      toast({
        title: "Contactos requeridos",
        description: "Debes seleccionar al menos un contacto para enviar mensajes.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingMessages(true);
    
    const apiRequest = {
      contactIds: allSelectedContactIds,
      message: messageText
    };
    
    console.log("Enviando mensajes a contactos:", apiRequest);
    
    fetch('/api/mass-sender/send-immediate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiRequest)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        toast({
          title: "Mensajes enviados",
          description: `Se enviaron ${data.sentCount || 0} mensajes correctamente.`,
        });
        // Cerrar diálogo y limpiar datos
        onOpenChange(false);
      })
      .catch(error => {
        console.error("Error en envío inmediato:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al enviar mensajes",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsSendingMessages(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Envío Inmediato de Mensajes</DialogTitle>
          <DialogDescription>
            Envía mensajes directamente a los contactos importados o seleccionados de WhatsApp
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Selector de contactos con pestañas */}
          <div className="grid gap-2">
            <Tabs defaultValue="imported">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="imported">Contactos Importados</TabsTrigger>
                <TabsTrigger value="whatsapp" onClick={fetchWhatsAppContacts}>Contactos WhatsApp</TabsTrigger>
              </TabsList>
              
              <TabsContent value="imported">
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="contacts" className="text-base">Contactos importados</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="select-all-imported" className="text-xs">Seleccionar todos</Label>
                    <Switch
                      id="select-all-imported"
                      checked={selectAllImported}
                      onCheckedChange={handleSelectAllImportedContacts}
                    />
                  </div>
                </div>
                
                <ScrollArea className="h-[180px] border rounded-md p-2">
                  {importedData && importedData.contacts && importedData.contacts.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="py-1 px-2 w-10"></TableHead>
                          <TableHead className="py-1 px-2">Teléfono</TableHead>
                          <TableHead className="py-1 px-2">Nombre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importedData.contacts.map((contact: any, index: number) => (
                          <TableRow key={contact.id || index} className="h-10">
                            <TableCell className="py-1 px-2">
                              <Checkbox 
                                checked={selectedImportedContactIds.includes(contact.id)}
                                onCheckedChange={() => handleToggleImportedContact(contact.id)}
                              />
                            </TableCell>
                            <TableCell className="py-1 px-2">{contact.phoneNumber}</TableCell>
                            <TableCell className="py-1 px-2">{contact.name || "Sin nombre"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[150px] p-4 text-center text-muted-foreground">
                      <FileSpreadsheet className="w-12 h-12 mb-2 opacity-50" />
                      <p>No hay contactos importados disponibles.</p>
                      <p className="text-xs mt-1">Importe contactos desde un archivo Excel o CSV primero.</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="whatsapp">
                <div className="flex items-center justify-between mt-2">
                  <Label htmlFor="whatsapp-contacts" className="text-base">Contactos de WhatsApp</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="select-all-whatsapp" className="text-xs">Seleccionar todos</Label>
                    <Switch
                      id="select-all-whatsapp"
                      checked={selectAllWhatsApp}
                      onCheckedChange={handleToggleAllWhatsAppContacts}
                    />
                  </div>
                </div>
                
                <ScrollArea className="h-[180px] border rounded-md p-2">
                  {loadingWhatsAppContacts ? (
                    <div className="flex items-center justify-center h-[150px]">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="ml-2">Cargando contactos...</span>
                    </div>
                  ) : whatsAppContacts && whatsAppContacts.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="py-1 px-2 w-10"></TableHead>
                          <TableHead className="py-1 px-2">Teléfono</TableHead>
                          <TableHead className="py-1 px-2">Nombre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {whatsAppContacts
                          .filter((contact: any) => contact.id?.user)
                          .map((contact: any, index: number) => (
                          <TableRow key={index} className="h-10">
                            <TableCell className="py-1 px-2">
                              <Checkbox 
                                checked={selectedWhatsAppContactIds.includes(contact.id?.user)}
                                onCheckedChange={() => handleToggleWhatsAppContact(contact.id?.user)}
                              />
                            </TableCell>
                            <TableCell className="py-1 px-2">{contact.id?.user || "Desconocido"}</TableCell>
                            <TableCell className="py-1 px-2">{contact.name || contact.pushname || "Sin nombre"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[150px] p-4 text-center text-muted-foreground">
                      <Phone className="w-12 h-12 mb-2 opacity-50" />
                      <p>No hay contactos WhatsApp disponibles.</p>
                      <p className="text-xs mt-1">Asegúrese de que WhatsApp esté conectado.</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchWhatsAppContacts}
                        className="mt-2"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reintentar
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Contenido del mensaje */}
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-base">Mensaje a enviar</Label>
            <Textarea
              id="message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button"
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button 
            type="button"
            disabled={
              isSendingMessages || 
              !messageText.trim() || 
              (selectedImportedContactIds.length === 0 && selectedWhatsAppContactIds.length === 0)
            }
            onClick={handleSendImmediate}
          >
            {isSendingMessages ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensajes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}