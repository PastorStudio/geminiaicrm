import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WhatsAppContactSelectorProps {
  selectedContactIds: string[];
  onContactsSelected: (contactIds: string[]) => void;
}

export function WhatsAppContactSelector({ 
  selectedContactIds, 
  onContactsSelected 
}: WhatsAppContactSelectorProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);

  // Cargar contactos al montar el componente
  useEffect(() => {
    fetchContacts();
  }, []);

  // Función para obtener contactos de WhatsApp
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/direct/whatsapp/contacts');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Contactos de WhatsApp obtenidos:", data);
      setContacts(data);
    } catch (error) {
      console.error('Error obteniendo contactos de WhatsApp:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los contactos de WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Manejar selección de contacto individual
  const handleToggleContact = (contactId: string) => {
    const newSelectedIds = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter(id => id !== contactId)
      : [...selectedContactIds, contactId];
    
    onContactsSelected(newSelectedIds);
    setSelectAll(newSelectedIds.length === contacts.length);
  };

  // Manejar selección de todos los contactos
  const handleToggleAll = (checked: boolean) => {
    setSelectAll(checked);
    
    if (checked) {
      const allContactIds = contacts
        .filter(contact => contact.id?.user)
        .map(contact => contact.id.user);
      onContactsSelected(allContactIds);
    } else {
      onContactsSelected([]);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="whatsapp-contacts" className="text-base">Contactos de WhatsApp</Label>
        <div className="flex items-center gap-2">
          <Label htmlFor="select-all-whatsapp" className="text-xs">Seleccionar todos</Label>
          <Switch
            id="select-all-whatsapp"
            checked={selectAll}
            onCheckedChange={handleToggleAll}
          />
        </div>
      </div>
      
      <ScrollArea className="h-[180px] border rounded-md p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Cargando contactos...</span>
          </div>
        ) : contacts && contacts.length > 0 ? (
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="py-1 px-2 w-10"></TableHead>
                <TableHead className="py-1 px-2">Teléfono</TableHead>
                <TableHead className="py-1 px-2">Nombre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact: any, index: number) => (
                <TableRow key={index} className="h-10">
                  <TableCell className="py-1 px-2">
                    <Checkbox 
                      checked={selectedContactIds.includes(contact.id?.user)}
                      onCheckedChange={() => handleToggleContact(contact.id?.user)}
                      disabled={!contact.id?.user}
                    />
                  </TableCell>
                  <TableCell className="py-1 px-2">{contact.id?.user || "Desconocido"}</TableCell>
                  <TableCell className="py-1 px-2">{contact.name || contact.pushname || "Sin nombre"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-4 text-center text-muted-foreground">
            <Phone className="w-12 h-12 mb-2 opacity-50" />
            <p>No hay contactos de WhatsApp disponibles.</p>
            <p className="text-xs">Asegúrese de estar conectado a WhatsApp y tener contactos en su lista.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchContacts}
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}