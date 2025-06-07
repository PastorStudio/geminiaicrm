import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Phone, FileSpreadsheet } from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ContactSelectorProps {
  importedContacts: any[];
  selectedImportedIds: string[];
  selectedWhatsAppIds: string[];
  onImportedSelected: (ids: string[]) => void;
  onWhatsAppSelected: (ids: string[]) => void;
}

export function ContactSelector({
  importedContacts,
  selectedImportedIds,
  selectedWhatsAppIds,
  onImportedSelected,
  onWhatsAppSelected
}: ContactSelectorProps) {
  const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
  const [loadingWhatsAppContacts, setLoadingWhatsAppContacts] = useState<boolean>(false);
  const [selectAllImported, setSelectAllImported] = useState<boolean>(false);
  const [selectAllWhatsApp, setSelectAllWhatsApp] = useState<boolean>(false);

  // Función para obtener contactos de WhatsApp
  const fetchWhatsAppContacts = async () => {
    try {
      setLoadingWhatsAppContacts(true);
      const response = await fetch('/api/direct/whatsapp/contacts');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Contactos WhatsApp obtenidos:", data);
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

  // Manejar selección de contacto importado individual
  const handleToggleImportedContact = (contactId: string) => {
    const newSelectedIds = selectedImportedIds.includes(contactId)
      ? selectedImportedIds.filter(id => id !== contactId)
      : [...selectedImportedIds, contactId];
    
    onImportedSelected(newSelectedIds);
    setSelectAllImported(newSelectedIds.length === importedContacts.length);
  };

  // Manejar selección de todos los contactos importados
  const handleSelectAllImported = (checked: boolean) => {
    setSelectAllImported(checked);
    
    if (checked && importedContacts && importedContacts.length > 0) {
      onImportedSelected(importedContacts.map(contact => contact.id));
    } else {
      onImportedSelected([]);
    }
  };

  // Manejar selección de contacto WhatsApp individual
  const handleToggleWhatsAppContact = (contactId: string) => {
    const newSelectedIds = selectedWhatsAppIds.includes(contactId)
      ? selectedWhatsAppIds.filter(id => id !== contactId)
      : [...selectedWhatsAppIds, contactId];
    
    onWhatsAppSelected(newSelectedIds);
    setSelectAllWhatsApp(newSelectedIds.length === whatsAppContacts.length);
  };

  // Manejar selección de todos los contactos WhatsApp
  const handleSelectAllWhatsApp = (checked: boolean) => {
    setSelectAllWhatsApp(checked);
    
    if (checked && whatsAppContacts && whatsAppContacts.length > 0) {
      const validIds = whatsAppContacts
        .filter(contact => contact.id?.user)
        .map(contact => contact.id.user);
      onWhatsAppSelected(validIds);
    } else {
      onWhatsAppSelected([]);
    }
  };

  return (
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
              onCheckedChange={handleSelectAllImported}
            />
          </div>
        </div>
        
        <ScrollArea className="h-[180px] border rounded-md p-2">
          {importedContacts && importedContacts.length > 0 ? (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="py-1 px-2 w-10"></TableHead>
                  <TableHead className="py-1 px-2">Teléfono</TableHead>
                  <TableHead className="py-1 px-2">Nombre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedContacts.map((contact: any, index: number) => (
                  <TableRow key={contact.id || index} className="h-10">
                    <TableCell className="py-1 px-2">
                      <Checkbox 
                        checked={selectedImportedIds.includes(contact.id)}
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
              onCheckedChange={handleSelectAllWhatsApp}
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
                  .filter(contact => contact.id?.user)
                  .map((contact: any, index: number) => (
                  <TableRow key={index} className="h-10">
                    <TableCell className="py-1 px-2">
                      <Checkbox 
                        checked={selectedWhatsAppIds.includes(contact.id?.user)}
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
  );
}