import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { TemplateSelector } from "@/components/message-templates/TemplateSelector";
import { TemplatePreview } from "@/components/message-templates/TemplatePreview";
import { SendImmediateDialog } from "@/components/messaging/SendImmediateDialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Send, Pause, Play, PlusCircle, Settings, AlertTriangle, Info, Calendar, User, Users, CheckCheck, XCircle, Upload, Database, FileText, FileSpreadsheet, CheckCircle, Phone, Clock, AlertCircle, Check, Circle, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Tipos para las campañas de envío masivo
interface ContactGroup {
  id: string;
  name: string;
  count: number;
}

interface ContactStatus {
  id: string;
  phoneNumber: string;
  name?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'verified';
  sentAt?: string;
  verifiedAt?: string;
  errorMessage?: string;
}

interface MassSendConfig {
  delayBetweenMessages: number;
  pauseBetweenChunks: number;
  chunkSize: number;
  markAsRead: boolean;
  simulateTyping: boolean;
  typingTime: number;
  randomFactor: number;
  personalizeMessages: boolean;
  useAIPersonalization: boolean;
  messageVariations: boolean;
  splitLongMessages: boolean;
  restrictRepeatedRecipients: boolean;
  restrictionPeriod: number;
  maxMessagesPerPeriod: number;
  respectBusinessHours: boolean;
  businessHoursStart: number;
  businessHoursEnd: number;
  businessDays: number[];
}

interface SendingConfig {
  minIntervalMs: number;
  maxIntervalMs: number;
  batchSize: number;
  pauseBetweenBatchesMs: number;
  simulateTyping: boolean;
  typingDurationMs: number;
  respectBusinessHours: boolean;
  businessHoursStart: number;
  businessHoursEnd: number;
}

// Interfaz extendida para manejar archivos con nombre de servidor
interface ExcelFile extends File {
  serverFilename?: string; // Nombre del archivo en el servidor después de la carga
}

interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  totalContacts: number;
  processedContacts: number;
  successfulSends: number;
  failedSends: number;
  messageTemplate: string;
  config?: MassSendConfig;
  sendingConfig?: SendingConfig;
  targetGroups: string[] | [];
  targetTags: string[] | [];
  excludedContacts: string[] | [];
  contacts?: ContactStatus[];
}

export default function MassSender() {
  const [tab, setTab] = useState("new-campaign");
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<MassSendConfig>({
    delayBetweenMessages: 8000,
    pauseBetweenChunks: 180000,
    chunkSize: 15,
    markAsRead: true,
    simulateTyping: true,
    typingTime: 3000,
    randomFactor: 0.3,
    personalizeMessages: true,
    useAIPersonalization: false,
    messageVariations: true,
    splitLongMessages: true,
    restrictRepeatedRecipients: true,
    restrictionPeriod: 24,
    maxMessagesPerPeriod: 100,
    respectBusinessHours: true,
    businessHoursStart: 9,
    businessHoursEnd: 18,
    businessDays: [1, 2, 3, 4, 5]
  });
  const [previewContact, setPreviewContact] = useState<any>({
    name: "Juan Pérez",
    company: "Empresa Ejemplo S.A."
  });
  
  // Estados para la importación de Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isFieldMappingOpen, setIsFieldMappingOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ExcelFile | null>(null);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    phoneNumber: 'none',
    name: 'none',
    company: 'none',
    email: 'none',
    tags: 'none'
  });
  const [importedData, setImportedData] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [countryCode, setCountryCode] = useState<string>("507"); // Panamá por defecto
  const [isTaggingDialogOpen, setIsTaggingDialogOpen] = useState<boolean>(false);
  const [selectedTagsToAdd, setSelectedTagsToAdd] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState<string>("");
  
  // Estados para envío inmediato
  const [showImmediateMessaging, setShowImmediateMessaging] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>("");
  const [isSendingMessages, setIsSendingMessages] = useState<boolean>(false);
  const [selectedImportedContactIds, setSelectedImportedContactIds] = useState<string[]>([]);
  const [selectAllImported, setSelectAllImported] = useState<boolean>(false);
  
  // Estados para contactos individuales de WhatsApp
  const [showWhatsAppContacts, setShowWhatsAppContacts] = useState<boolean>(false);
  const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
  const [loadingWhatsAppContacts, setLoadingWhatsAppContacts] = useState<boolean>(false);
  const [selectedWhatsAppContactIds, setSelectedWhatsAppContactIds] = useState<string[]>([]);
  const [selectAllWhatsAppContacts, setSelectAllWhatsAppContacts] = useState<boolean>(false);
  
  // Estados para asistente Gemini
  const [isGeminiAssistantOpen, setIsGeminiAssistantOpen] = useState<boolean>(false);
  const [geminiResult, setGeminiResult] = useState<string>("");
  const [geminiPrompt, setGeminiPrompt] = useState<string>("");
  const [isGeneratingWithGemini, setIsGeneratingWithGemini] = useState<boolean>(false);
  
  // Consulta para obtener los grupos de contactos
  const { data: contactGroups = [], isLoading: loadingGroups } = useQuery<ContactGroup[]>({
    queryKey: ['/api/whatsapp/contact-groups'],
    retry: false
  });
  
  // Consulta para obtener contactos individuales de WhatsApp
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
      return data;
    } catch (error) {
      console.error('Error obteniendo contactos de WhatsApp:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los contactos de WhatsApp.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoadingWhatsAppContacts(false);
    }
  };
  
  // Función para manejar selección/deselección de contactos de WhatsApp
  const handleToggleWhatsAppContact = (contactId: string) => {
    setSelectedWhatsAppContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };
  
  // Función para seleccionar/deseleccionar todos los contactos de WhatsApp
  const handleToggleAllWhatsAppContacts = (checked: boolean) => {
    setSelectAllWhatsAppContacts(checked);
    
    if (checked && whatsAppContacts && whatsAppContacts.length > 0) {
      setSelectedWhatsAppContactIds(whatsAppContacts
        .filter((contact: any) => contact.id?.user)
        .map((contact: any) => contact.id.user)
      );
    } else {
      setSelectedWhatsAppContactIds([]);
    }
  };
  
  // Consulta para obtener las etiquetas de contactos
  const { data: contactTags = [], isLoading: loadingTags } = useQuery<any[]>({
    queryKey: ['/api/whatsapp/contact-tags'],
    retry: false
  });
  
  // Consulta para obtener todas las campañas
  const { 
    data: campaigns = [], 
    isLoading: loadingCampaigns,
    refetch: refetchCampaigns
  } = useQuery<Campaign[]>({
    queryKey: ['/api/mass-sender/campaigns'],
    retry: false
  });
  
  // Mutación para crear una nueva campaña
  const createCampaignMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/mass-sender/campaigns", { method: "POST", body: data }),
    onSuccess: (data) => {
      console.log("Campaña creada exitosamente:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Campaña creada",
        description: "La campaña de mensajes se ha creado correctamente.",
      });
      // Limpiar el formulario
      setCampaignName("");
      setMessageTemplate("");
      setSelectedGroups([]);
      setSelectedTags([]);
      setCurrentConfig({
        delayBetweenMessages: 8000,
        pauseBetweenChunks: 180000,
        chunkSize: 15,
        markAsRead: true,
        simulateTyping: true,
        typingTime: 3000,
        randomFactor: 0.3,
        personalizeMessages: true,
        useAIPersonalization: false,
        messageVariations: true,
        splitLongMessages: true,
        restrictRepeatedRecipients: true,
        restrictionPeriod: 24,
        maxMessagesPerPeriod: 100,
        respectBusinessHours: true,
        businessHoursStart: 9,
        businessHoursEnd: 18,
        businessDays: [1, 2, 3, 4, 5]
      });
      // Cambiar a la pestaña de campañas
      setTab("campaigns");
    },
    onError: (error) => {
      console.error("Error al crear campaña:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la campaña de mensajes.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para iniciar una campaña
  const startCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => 
      apiRequest(`/api/mass-sender/campaigns/${campaignId}/start`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Campaña iniciada",
        description: "La campaña de mensajes se ha iniciado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo iniciar la campaña de mensajes.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para pausar una campaña
  const pauseCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => 
      apiRequest(`/api/mass-sender/campaigns/${campaignId}/pause`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Campaña pausada",
        description: "La campaña de mensajes se ha pausado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo pausar la campaña de mensajes.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para reanudar una campaña
  const resumeCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => 
      apiRequest(`/api/mass-sender/campaigns/${campaignId}/resume`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Campaña reanudada",
        description: "La campaña de mensajes se ha reanudado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo reanudar la campaña de mensajes.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para crear una nueva etiqueta
  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string, color?: string }) => {
      const response = await fetch('/api/whatsapp/contact-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al crear etiqueta');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Actualizar la lista de etiquetas
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/contact-tags'] });
      
      // Agregar la nueva etiqueta a las seleccionadas
      if (data.tag && data.tag.id) {
        setSelectedTagsToAdd([...selectedTagsToAdd, data.tag.id]);
      }
      
      // Limpiar el campo de nuevo nombre
      setNewTagName("");
      
      toast({
        title: "Etiqueta creada",
        description: `Se ha creado la etiqueta "${data.tag.name}" correctamente.`,
      });
    },
    onError: (error) => {
      console.error("Error creating tag:", error);
      toast({
        title: "Error al crear etiqueta",
        description: error instanceof Error ? error.message : "No se pudo crear la etiqueta.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para verificar un mensaje como entregado
  const verifyMessageMutation = useMutation({
    mutationFn: ({campaignId, contactId, messageId}: {campaignId: number, contactId: string, messageId?: string}) => 
      apiRequest(`/api/mass-sender/campaigns/${campaignId}/verify-message`, { 
        method: "POST",
        body: { contactId, messageId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Mensaje verificado",
        description: "El mensaje ha sido marcado como verificado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo verificar el mensaje.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para cargar archivo Excel
  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log(`Subiendo archivo Excel: ${file.name}, tamaño: ${file.size} bytes, tipo: ${file.type}`);
      
      // Verificar tipo de archivo
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/octet-stream' // Algunos navegadores usan este tipo para .xlsx
      ];
      
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        throw new Error(
          `Tipo de archivo no soportado: ${file.type}. Por favor, use archivos Excel (.xlsx, .xls) o CSV (.csv)`
        );
      }
      
      // Verificar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(
          `El archivo es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). El tamaño máximo permitido es 10MB.`
        );
      }
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/excel/upload', {
          method: 'POST',
          body: formData
        });
        
        // Manejar errores de respuesta HTTP
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || `Error al cargar el archivo (${response.status})`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error en la carga del archivo Excel:', error);
        throw error; // Re-lanzar para que onError lo maneje
      }
    },
    onSuccess: (data) => {
      console.log('Archivo Excel subido exitosamente:', data);
      toast({
        title: "Archivo cargado",
        description: "El archivo Excel ha sido cargado correctamente.",
      });
      
      // Reiniciar el mapeo de campos con valores 'none'
      setFieldMapping({
        phoneNumber: 'none',
        name: 'none',
        company: 'none',
        email: 'none',
        tags: 'none'
      });
      
      // Obtener las columnas del archivo
      // Obtener el archivo subido y mantener una referencia con el nombre del servidor
      const currentInputFile = fileInputRef.current?.files?.[0];
      if (currentInputFile) {
        try {
          // Crear un nuevo objeto tipo ExcelFile con propiedades adicionales
          const newFileObject = new File(
            [currentInputFile], 
            currentInputFile.name, 
            { type: currentInputFile.type }
          ) as ExcelFile;
          
          // Añadir propiedad de nombre en servidor
          newFileObject.serverFilename = data.filename;
          
          console.log("Archivo con nombre del servidor:", {
            originalName: newFileObject.name,
            serverFilename: newFileObject.serverFilename,
            size: newFileObject.size,
            type: newFileObject.type
          });
          
          // Actualizar estado con el nuevo objeto
          setSelectedFile(newFileObject);
          
          // Continuar con el análisis del archivo
          analyzeExcelMutation.mutate(data.filename);
        } catch (err) {
          console.error("Error al crear objeto de archivo:", err);
          // Fallback: usar Object.assign si falla el método anterior
          const serverFile = Object.assign(
            Object.create(Object.getPrototypeOf(currentInputFile)),
            currentInputFile,
            { serverFilename: data.filename }
          ) as ExcelFile;
          
          setSelectedFile(serverFile);
          analyzeExcelMutation.mutate(data.filename);
        }
      }
    },
    onError: (error) => {
      console.error("Error uploading Excel file:", error);
      toast({
        title: "Error al cargar archivo",
        description: error instanceof Error ? error.message : "No se pudo cargar el archivo Excel. Intente nuevamente.",
        variant: "destructive",
      });
      
      // Resetear el archivo seleccionado para permitir un nuevo intento
      setSelectedFile(null);
    }
  });
  
  // Mutación para analizar archivo Excel
  const analyzeExcelMutation = useMutation({
    mutationFn: async (filename: string) => {
      console.log(`Analizando archivo Excel: ${filename}`);
      try {
        const response = await fetch(`/api/excel/analyze/${filename}`);
        
        // Capturar y manejar respuestas no exitosas
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || `Error al analizar el archivo Excel (${response.status})`);
        }
        
        const data = await response.json();
        console.log('Respuesta del análisis de Excel:', data);
        return data;
      } catch (error) {
        console.error('Error en la mutación de análisis de Excel:', error);
        throw error; // Re-lanzar para que onError lo maneje
      }
    },
    onSuccess: (data) => {
      // Verificar si hay columnas
      if (!data.columns || data.columns.length === 0) {
        toast({
          title: "Archivo Excel incompleto",
          description: data.message || "No se detectaron columnas en el archivo. Verifique que el archivo tenga encabezados y datos.",
          variant: "destructive",
        });
        // Aunque no haya columnas, abrimos el diálogo para que el usuario pueda intentar de nuevo
        setExcelColumns([]);
        setIsFieldMappingOpen(true);
        return;
      }
      
      // Establecer las columnas detectadas
      setExcelColumns(data.columns || []);
      
      // Si hay un mapeo sugerido, establecerlo automáticamente
      if (data.suggestedMapping && typeof data.suggestedMapping === 'object') {
        console.log('Usando mapeo sugerido:', data.suggestedMapping);
        // Convertir cualquier valor vacío a 'none' en el mapeo sugerido
        const mapping = data.suggestedMapping as Record<string, any>;
        const sanitizedMapping = Object.entries(mapping).reduce((acc, [key, value]) => {
          acc[key] = value === '' ? 'none' : String(value);
          return acc;
        }, {} as Record<string, string>);
        
        setFieldMapping(prev => ({
          ...prev,
          ...sanitizedMapping
        }));
      }
      
      toast({
        title: "Archivo analizado correctamente",
        description: `Se detectaron ${data.columns.length} columnas en el archivo.`,
      });
      
      setIsFieldMappingOpen(true);
    },
    onError: (error) => {
      console.error("Error analyzing Excel file:", error);
      toast({
        title: "Error al analizar archivo",
        description: error instanceof Error ? error.message : "No se pudo analizar el archivo Excel. Intente nuevamente con otro formato o contacte a soporte.",
        variant: "destructive",
      });
      
      // Resetear el archivo seleccionado para permitir un nuevo intento
      setSelectedFile(null);
    }
  });
  
  // Mutación para importar datos de Excel
  const importExcelMutation = useMutation({
    mutationFn: async (data: { filename: string, originalname?: string, fieldMapping: Record<string, string>}) => {
      const response = await fetch('/api/excel/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al importar datos de Excel');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Guardar los datos importados para mostrarlos en la tabla
      setImportedData(data);
      
      // Mostrar un toast con el resumen de la importación
      if (data.validRows > 0) {
        toast({
          title: "Datos importados correctamente",
          description: `Se importaron ${data.validRows} contactos correctamente de ${data.totalRows} filas procesadas.`,
        });
      } else {
        toast({
          title: "No se importaron contactos",
          description: `Se procesaron ${data.totalRows} filas pero no se pudo importar ningún contacto. Verifique el mapeo de campos.`,
          variant: "destructive",
        });
      }
      
      // Si hay una campaña seleccionada, continuar con la importación
      if (selectedCampaignId) {
        importContactsToCampaignMutation.mutate({
          campaignId: selectedCampaignId,
          importId: data.id
        });
      } else {
        setIsFieldMappingOpen(false);
        setIsImportDialogOpen(false);
      }
    },
    onError: (error) => {
      console.error("Error importing Excel data:", error);
      
      // Extraer el mensaje de error de la respuesta si está disponible
      let errorMessage = "No se pudieron importar los datos de Excel.";
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      // Si contiene información sobre archivos disponibles, mostrarla de forma más limpia
      if (errorMessage.includes("Archivos disponibles:")) {
        const [baseMessage, filesList] = errorMessage.split("Archivos disponibles:");
        
        toast({
          title: "Error al importar datos",
          description: (
            <div>
              <p>{baseMessage.trim()}</p>
              <p>Archivos disponibles en el servidor:</p>
              <ul className="text-xs mt-1 list-disc list-inside">
                {filesList.split(",").map((file, index) => (
                  <li key={index}>{file.trim()}</li>
                ))}
              </ul>
              <p className="mt-2">Por favor, intente cargar el archivo nuevamente.</p>
            </div>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al importar datos",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  });
  
  // Mutación para formatear números de teléfono
  const formatPhoneNumbersMutation = useMutation({
    mutationFn: async ({phoneNumbers, countryCode}: {phoneNumbers: string[], countryCode: string}) => {
      const response = await fetch('/api/excel/format-phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumbers, countryCode })
      });
      
      if (!response.ok) {
        throw new Error('Error al formatear números de teléfono');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Actualizar los números de teléfono en los datos importados
      if (importedData && importedData.contacts) {
        // Crear un mapeo de los números formateados
        const formattedMap = new Map();
        data.formattedNumbers.forEach((item: any) => {
          if (item.formatted) {
            formattedMap.set(item.original, item.formatted);
          }
        });
        
        // Actualizar números de teléfono en los contactos
        const updatedContacts = importedData.contacts.map((contact: any) => {
          const formatted = formattedMap.get(contact.phoneNumber);
          if (formatted) {
            return {
              ...contact,
              phoneNumber: formatted,
              _wasFormatted: true
            };
          }
          return contact;
        });
        
        // Actualizar los datos importados
        setImportedData({
          ...importedData,
          contacts: updatedContacts
        });
        
        toast({
          title: "Números formateados",
          description: `Se formatearon ${data.formattedNumbers.filter((n: any) => n.formatted).length} números de teléfono con el código +${countryCode}.`,
        });
      }
    },
    onError: (error) => {
      console.error("Error formatting phone numbers:", error);
      toast({
        title: "Error al formatear números",
        description: error instanceof Error ? error.message : "No se pudieron formatear los números de teléfono.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para importar contactos a una campaña
  const importContactsToCampaignMutation = useMutation({
    mutationFn: async ({campaignId, importId}: {campaignId: number, importId: string}) => {
      const response = await fetch(`/api/mass-sender/campaigns/${campaignId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ importId })
      });
      
      if (!response.ok) {
        throw new Error('Error al importar contactos a la campaña');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Contactos importados",
        description: "Los contactos han sido importados a la campaña correctamente.",
      });
      setIsImportDialogOpen(false);
      setIsFieldMappingOpen(false);
    },
    onError: (error) => {
      console.error("Error importing contacts to campaign:", error);
      toast({
        title: "Error al importar contactos",
        description: "No se pudieron importar los contactos a la campaña. Intente nuevamente.",
        variant: "destructive",
      });
    }
  });
  
  // Mutación para importar contactos usando plantilla de mensaje
  const importWithTemplateMutation = useMutation({
    mutationFn: async ({campaignId, data}: {campaignId: number, data: any}) => {
      const response = await fetch(`/api/mass-sender/campaigns/${campaignId}/import-with-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al importar contactos con plantilla');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mass-sender/campaigns'] });
      toast({
        title: "Plantilla aplicada",
        description: "Los contactos se han importado con la plantilla seleccionada.",
      });
      setIsImportDialogOpen(false);
      setIsFieldMappingOpen(false);
    },
    onError: (error) => {
      console.error("Error importing with template:", error);
      toast({
        title: "Error al aplicar plantilla",
        description: "No se pudo aplicar la plantilla a los contactos importados.",
        variant: "destructive",
      });
    }
  });
  
  // Función para manejar el envío del formulario de nueva campaña
  const handleCreateCampaign = () => {
    if (!campaignName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes proporcionar un nombre para la campaña.",
        variant: "destructive",
      });
      return;
    }
    
    if (!messageTemplate.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Debes proporcionar un mensaje para la campaña.",
        variant: "destructive",
      });
      return;
    }
    
    if ((selectedGroups || []).length === 0 && (selectedTags || []).length === 0) {
      toast({
        title: "Destinatarios requeridos",
        description: "Debes seleccionar al menos un grupo o etiqueta de destinatarios.",
        variant: "destructive",
      });
      return;
    }
    
    // Crear objeto de campaña con todos los datos necesarios para asegurar el guardado
    const campaignData = {
      name: campaignName,
      messageTemplate,
      targetGroups: selectedGroups,
      targetTags: selectedTags,
      config: currentConfig,
      status: 'pending',
      totalContacts: 0,
      processedContacts: 0,
      successfulSends: 0,
      failedSends: 0,
      createdAt: new Date().toISOString()
    };
    
    console.log("Guardando campaña:", campaignData);
    
    createCampaignMutation.mutate(campaignData);
  };
  
  // Función para manejar el inicio, pausa o reanudación de una campaña
  const handleCampaignAction = (campaign: Campaign) => {
    if (campaign.status === 'pending' || campaign.status === 'failed') {
      startCampaignMutation.mutate(campaign.id);
    } else if (campaign.status === 'running') {
      pauseCampaignMutation.mutate(campaign.id);
    } else if (campaign.status === 'paused') {
      resumeCampaignMutation.mutate(campaign.id);
    }
  };
  
  // Función para manejar la carga de un archivo Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      uploadExcelMutation.mutate(file);
    }
  };
  
  // Función para abrir el selector de archivos
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Función para importar contactos desde Excel a una campaña
  const handleImportExcel = (campaignId: string) => {
    setSelectedCampaignId(parseInt(campaignId, 10));
    setIsImportDialogOpen(true);
  };
  
  // Función para manejar el cambio en el mapeo de campos
  const handleFieldMappingChange = (field: string, value: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Función para procesar la importación de datos
  const handleProcessImport = () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "No hay ningún archivo seleccionado.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar que los campos obligatorios estén mapeados y no sean 'none'
    if (!fieldMapping.phoneNumber || fieldMapping.phoneNumber === 'none' || fieldMapping.phoneNumber === '') {
      toast({
        title: "Campo requerido",
        description: "Debe seleccionar la columna que contiene los números de teléfono.",
        variant: "destructive",
      });
      return;
    }
    
    // Filtrar campos marcados como 'none' antes de enviar
    const filteredMapping = Object.entries(fieldMapping).reduce((acc, [key, value]) => {
      if (value !== 'none') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
    
    // Importar los datos de Excel
    // Construir objeto para la mutación
    const importData = {
      filename: selectedFile.serverFilename || selectedFile.name, // Usar nombre del servidor si existe
      originalname: selectedFile.name, // Nombre original para referencia
      fieldMapping: filteredMapping
    };
    
    console.log("Datos para importación:", JSON.stringify(importData));
    
    // Ejecutar la importación
    importExcelMutation.mutate(importData);
  };
  

  
  // Mutación para generar mensaje con Gemini
  const generateWithGeminiMutation = useMutation({
    mutationFn: async (data: { prompt: string }) => {
      const response = await fetch('/api/gemini/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prompt: data.prompt,
          type: "whatsapp" 
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al generar mensaje con Gemini');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.content) {
        setGeminiResult(data.content);
        // Actualizar el campo de mensaje en el formulario
        setMessageText(data.content);
      }
      setIsGeneratingWithGemini(false);
    },
    onError: (error) => {
      console.error("Error generating with Gemini:", error);
      toast({
        title: "Error con Gemini",
        description: error instanceof Error ? error.message : "No se pudo generar el mensaje con Gemini.",
        variant: "destructive",
      });
      setIsGeneratingWithGemini(false);
    }
  });
  
  // Mutación para envío inmediato de mensajes
  const sendImmediateMessagesMutation = useMutation({
    mutationFn: async (data: { contactIds: string[], message: string }) => {
      const response = await fetch('/api/mass-sender/send-immediate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar mensajes');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mensajes enviados",
        description: `Se han enviado ${data.sentCount} mensajes exitosamente.`,
      });
      setIsSendingMessages(false);
    },
    onError: (error) => {
      console.error("Error sending messages:", error);
      toast({
        title: "Error al enviar mensajes",
        description: error instanceof Error ? error.message : "No se pudieron enviar los mensajes.",
        variant: "destructive",
      });
      setIsSendingMessages(false);
    }
  });
  
  // Función para enviar mensajes inmediatamente
  const sendImmediateMessages = () => {
    if (!messageText || messageText.trim() === "") {
      toast({
        title: "Mensaje vacío",
        description: "Por favor ingrese un mensaje para enviar.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedImportedContactIds.length === 0) {
      toast({
        title: "Sin destinatarios",
        description: "Por favor seleccione al menos un contacto para enviar el mensaje.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingMessages(true);
    sendImmediateMessagesMutation.mutate({
      contactIds: selectedImportedContactIds,
      message: messageText
    });
  };
  
  // Manejar la selección de todos los contactos importados
  const handleSelectAllImportedContacts = (checked: boolean) => {
    setSelectAllImported(checked);
    if (checked && importedData && importedData.contacts) {
      setSelectedImportedContactIds(importedData.contacts.map((c: any) => c.id));
    } else {
      setSelectedImportedContactIds([]);
    }
  };
  
  // Manejar la selección individual de contactos
  const handleToggleContactSelection = (contactId: string) => {
    if (selectedImportedContactIds.includes(contactId)) {
      setSelectedImportedContactIds(selectedImportedContactIds.filter(id => id !== contactId));
      setSelectAllImported(false);
    } else {
      setSelectedImportedContactIds([...selectedImportedContactIds, contactId]);
      // Comprobar si todos están seleccionados ahora
      if (importedData && importedData.contacts && 
          selectedImportedContactIds.length + 1 === importedData.contacts.length) {
        setSelectAllImported(true);
      }
    }
  };
  
  // Función para generar mensaje con Gemini
  const handleGenerateWithGemini = () => {
    if (!geminiPrompt || geminiPrompt.trim() === "") {
      toast({
        title: "Instrucción vacía",
        description: "Por favor ingrese una instrucción para Gemini.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingWithGemini(true);
    generateWithGeminiMutation.mutate({ prompt: geminiPrompt });
  };
  
  // Función para aplicar etiquetas a los contactos importados
  const applyTagsToContacts = () => {
    if (!importedData || !importedData.contacts || importedData.contacts.length === 0 || selectedTagsToAdd.length === 0) {
      return;
    }
    
    // Obtener las etiquetas seleccionadas como objetos completos
    const selectedTags = contactTags?.filter((tag: any) => selectedTagsToAdd.includes(tag.id)) || [];
    
    // Aplicar etiquetas a cada contacto
    const updatedContacts = importedData.contacts.map((contact: any) => {
      // Obtener etiquetas actuales o inicializar como array vacío
      const currentTags = contact.tags || [];
      
      // Agregar nuevas etiquetas evitando duplicados
      const newTags = [...currentTags];
      
      selectedTags.forEach((tag: any) => {
        if (!newTags.includes(tag.id)) {
          newTags.push(tag.id);
        }
      });
      
      // Devolver contacto actualizado
      return {
        ...contact,
        tags: newTags
      };
    });
    
    // Actualizar los datos importados
    setImportedData({
      ...importedData,
      contacts: updatedContacts
    });
    
    // Cerrar el diálogo
    setIsTaggingDialogOpen(false);
    
    // Mostrar mensaje de éxito
    toast({
      title: "Etiquetas aplicadas",
      description: `Se han aplicado ${selectedTags.length} etiquetas a ${updatedContacts.length} contactos.`,
    });
  };
  
  // Actualizar automáticamente el estado de las campañas
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === "campaigns") {
        refetchCampaigns();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [tab, refetchCampaigns]);
  
  return (
    <div className="container mx-auto py-6">
      {/* Input oculto para cargar archivo Excel */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx,.xls,.csv" 
        onChange={handleFileUpload} 
      />
      
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Envío Masivo de Mensajes</h1>
            <p className="text-muted-foreground mt-1">
              Envía mensajes a múltiples contactos de forma segura y efectiva
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleSelectFile} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Campaña
            </Button>
          </div>
        </div>
        
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="new-campaign">Nueva Campaña</TabsTrigger>
            <TabsTrigger value="campaigns">Campañas Activas</TabsTrigger>
          </TabsList>
          
          {/* Pestaña para crear una nueva campaña */}
          <TabsContent value="new-campaign">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Formulario de creación de campaña */}
              <Card>
                <CardHeader>
                  <CardTitle>Crear Nueva Campaña</CardTitle>
                  <CardDescription>
                    Configure los detalles de su campaña de mensajes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Nombre de Campaña</Label>
                    <Input 
                      id="campaign-name" 
                      placeholder="Ej: Promoción Verano 2023" 
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <TemplateSelector 
                      onChange={(template) => {
                        setSelectedTemplate(template);
                        if (template) {
                          setMessageTemplate(template.content);
                        }
                      }}
                    />
                    
                    {!selectedTemplate && (
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="message-template">Mensaje Personalizado</Label>
                        <Textarea 
                          id="message-template" 
                          placeholder={"Hola " + "{{"+"nombre"+"}}" + ", tenemos una oferta especial para ti..."} 
                          className="min-h-32"
                          value={messageTemplate}
                          onChange={(e) => setMessageTemplate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Usa {"{{"+"nombre"+"}}"} para personalizar el mensaje con el nombre del contacto.
                        </p>
                      </div>
                    )}
                    
                    {selectedTemplate && (
                      <TemplatePreview 
                        template={selectedTemplate}
                        contactData={previewContact}
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Grupos de Destinatarios</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      {loadingGroups ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : Array.isArray(contactGroups) && contactGroups && contactGroups.length > 0 ? (
                        <div className="space-y-2">
                          {contactGroups.map((group: ContactGroup) => (
                            <div key={group.id} className="flex items-center space-x-2">
                              <input 
                                type="checkbox"
                                id={`group-${group.id}`}
                                checked={selectedGroups.includes(group.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGroups([...selectedGroups, group.id]);
                                  } else {
                                    setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`group-${group.id}`} className="font-normal">
                                {group.name} <span className="text-xs text-muted-foreground">({group.count})</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                          No hay grupos disponibles
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Etiquetas de Destinatarios</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      {loadingTags ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : Array.isArray(contactTags) && contactTags && contactTags.length > 0 ? (
                        <div className="space-y-2">
                          {contactTags.map((tag: any) => (
                            <div key={tag.id} className="flex items-center space-x-2">
                              <input 
                                type="checkbox"
                                id={`tag-${tag.id}`}
                                checked={selectedTags.includes(tag.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTags([...selectedTags, tag.id]);
                                  } else {
                                    setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`tag-${tag.id}`} className="font-normal">
                                {tag.name} <span className="text-xs text-muted-foreground">({tag.count})</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                          No hay etiquetas disponibles
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  
                  {/* Configuración avanzada */}
                  <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configuración Avanzada
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <div className="grid gap-4 grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="delay-between-messages">Tiempo entre mensajes (segundos)</Label>
                          <Input 
                            id="delay-between-messages" 
                            type="number" 
                            min="1" 
                            defaultValue="8"
                            onChange={(e) => setCurrentConfig({
                              ...currentConfig,
                              delayBetweenMessages: parseInt(e.target.value) * 1000
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chunk-size">Tamaño de lote</Label>
                          <Input 
                            id="chunk-size" 
                            type="number" 
                            min="1" 
                            defaultValue="15"
                            onChange={(e) => setCurrentConfig({
                              ...currentConfig,
                              chunkSize: parseInt(e.target.value)
                            })}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pause-between-chunks">Pausa entre lotes (minutos)</Label>
                        <Input 
                          id="pause-between-chunks" 
                          type="number" 
                          min="1" 
                          defaultValue="3"
                          onChange={(e) => setCurrentConfig({
                            ...currentConfig,
                            pauseBetweenChunks: parseInt(e.target.value) * 60000
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="simulate-typing" 
                          defaultChecked={true}
                          onCheckedChange={(checked) => setCurrentConfig({
                            ...currentConfig,
                            simulateTyping: checked
                          })}
                        />
                        <Label htmlFor="simulate-typing">Simular escritura</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="personalize-messages" 
                          defaultChecked={true}
                          onCheckedChange={(checked) => setCurrentConfig({
                            ...currentConfig,
                            personalizeMessages: checked
                          })}
                        />
                        <Label htmlFor="personalize-messages">Personalizar mensajes</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="message-variations" 
                          defaultChecked={true}
                          onCheckedChange={(checked) => setCurrentConfig({
                            ...currentConfig,
                            messageVariations: checked
                          })}
                        />
                        <Label htmlFor="message-variations">Usar variaciones de mensaje</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="restrict-recipients" 
                          defaultChecked={true}
                          onCheckedChange={(checked) => setCurrentConfig({
                            ...currentConfig,
                            restrictRepeatedRecipients: checked
                          })}
                        />
                        <Label htmlFor="restrict-recipients">Limitar frecuencia de envío</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="respect-hours" 
                          defaultChecked={true}
                          onCheckedChange={(checked) => setCurrentConfig({
                            ...currentConfig,
                            respectBusinessHours: checked
                          })}
                        />
                        <Label htmlFor="respect-hours">Respetar horario laboral</Label>
                      </div>
                      
                      <div className="grid gap-4 grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="business-hours-start">Hora de inicio</Label>
                          <Select 
                            defaultValue="9"
                            onValueChange={(value) => setCurrentConfig({
                              ...currentConfig,
                              businessHoursStart: parseInt(value)
                            })}
                          >
                            <SelectTrigger id="business-hours-start">
                              <SelectValue placeholder="Seleccionar hora" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(24)].map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business-hours-end">Hora de fin</Label>
                          <Select 
                            defaultValue="18"
                            onValueChange={(value) => setCurrentConfig({
                              ...currentConfig,
                              businessHoursEnd: parseInt(value)
                            })}
                          >
                            <SelectTrigger id="business-hours-end">
                              <SelectValue placeholder="Seleccionar hora" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(24)].map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Días laborales</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 1, label: "Lun" },
                            { value: 2, label: "Mar" },
                            { value: 3, label: "Mié" },
                            { value: 4, label: "Jue" },
                            { value: 5, label: "Vie" },
                            { value: 6, label: "Sáb" },
                            { value: 0, label: "Dom" }
                          ].map((day) => (
                            <Badge 
                              key={day.value} 
                              variant={currentConfig.businessDays?.includes(day.value) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const days = currentConfig.businessDays || [1, 2, 3, 4, 5];
                                if (days.includes(day.value)) {
                                  setCurrentConfig({
                                    ...currentConfig,
                                    businessDays: days.filter(d => d !== day.value)
                                  });
                                } else {
                                  setCurrentConfig({
                                    ...currentConfig,
                                    businessDays: [...days, day.value].sort()
                                  });
                                }
                              }}
                            >
                              {day.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setTab("campaigns")}>
                    Cancelar
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      variant="secondary"
                      onClick={() => setShowImmediateMessaging(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Ahora
                    </Button>
                    <Button 
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                    >
                      {createCampaignMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Crear Campaña
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              
              {/* Vista previa y verificación */}
              <Card>
                <CardHeader>
                  <CardTitle>Vista Previa</CardTitle>
                  <CardDescription>
                    Previsualiza cómo verán tu mensaje los contactos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Ejemplo de contacto</h4>
                        <p className="text-xs text-muted-foreground">+1234567890</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-sm">
                      {messageTemplate ? (
                        messageTemplate.replace(new RegExp(`{{nombre}}`, 'g'), "Juan")
                      ) : (
                        <span className="text-muted-foreground italic">
                          La vista previa del mensaje aparecerá aquí...
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <Info className="h-4 w-4 mr-1" />
                      Verificación de seguridad
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-green-500" />
                        <span>Usa intervalos variables entre mensajes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-green-500" />
                        <span>Incluye personalización de mensajes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-green-500" />
                        <span>Respeta límites de mensajes por día</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-green-500" />
                        <span>Implementa pausas entre lotes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-green-500" />
                        <span>Simula patrones de escritura humana</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-100 p-3 rounded-lg text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Recomendaciones de seguridad</span>
                    </div>
                    <p className="text-xs">
                      Para evitar que tu cuenta sea bloqueada por WhatsApp, se recomienda:
                    </p>
                    <ul className="text-xs list-disc pl-4 mt-1 space-y-1">
                      <li>No enviar el mismo mensaje a muchos contactos</li>
                      <li>Limitar envíos a 50-100 contactos por día</li>
                      <li>Personalizar cada mensaje</li>
                      <li>Evitar URLs sospechosas o acortadas</li>
                      <li>Usar una cuenta con historial (más de 6 meses)</li>
                    </ul>
                    {/* Tabla de Resultados de Importación */}
                    <div className="mt-3 border rounded-md overflow-hidden">
                      <h3 className="text-xs font-semibold bg-muted px-3 py-1.5 border-b">Resultados de Importación</h3>
                      <div className="p-2">
                        {importedData ? (
                          <>
                            <div className="grid grid-cols-4 gap-2 mb-3 text-xs font-medium">
                              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-md text-center">
                                <p className="text-lg font-bold text-green-700 dark:text-green-300">{importedData?.validRows || 0}</p>
                                <p className="text-green-800 dark:text-green-200 text-xs truncate">Contactos Válidos</p>
                              </div>
                              <div className="bg-red-100 dark:bg-red-900 p-2 rounded-md text-center">
                                <p className="text-lg font-bold text-red-700 dark:text-red-300">{importedData?.invalidRows || 0}</p>
                                <p className="text-red-800 dark:text-red-200 text-xs truncate">Contactos Inválidos</p>
                              </div>
                              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md text-center">
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{importedData?.totalRows || 0}</p>
                                <p className="text-blue-800 dark:text-blue-200 text-xs truncate">Total Filas</p>
                              </div>
                              <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-md text-center">
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{importedData?.contacts?.length || 0}</p>
                                <p className="text-amber-800 dark:text-amber-200 text-xs truncate">Contactos Importados</p>
                              </div>
                            </div>
                            
                            {/* Herramientas para manejar contactos importados */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={countryCode}
                                  onValueChange={setCountryCode}
                                >
                                  <SelectTrigger className="h-8 w-[120px]">
                                    <SelectValue placeholder="Código" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="507">🇵🇦 Panamá (+507)</SelectItem>
                                    <SelectItem value="1">🇺🇸 EEUU (+1)</SelectItem>
                                    <SelectItem value="52">🇲🇽 México (+52)</SelectItem>
                                    <SelectItem value="57">🇨🇴 Colombia (+57)</SelectItem>
                                    <SelectItem value="54">🇦🇷 Argentina (+54)</SelectItem>
                                    <SelectItem value="56">🇨🇱 Chile (+56)</SelectItem>
                                    <SelectItem value="51">🇵🇪 Perú (+51)</SelectItem>
                                    <SelectItem value="593">🇪🇨 Ecuador (+593)</SelectItem>
                                    <SelectItem value="58">🇻🇪 Venezuela (+58)</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    if (importedData && importedData.contacts && importedData.contacts.length > 0) {
                                      const phoneNumbers = importedData.contacts.map((c: any) => c.phoneNumber);
                                      formatPhoneNumbersMutation.mutate({
                                        phoneNumbers,
                                        countryCode
                                      });
                                    }
                                  }}
                                  disabled={formatPhoneNumbersMutation.isPending}
                                >
                                  {formatPhoneNumbersMutation.isPending ? (
                                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Formateando</>
                                  ) : (
                                    <><Phone className="h-4 w-4 mr-1" /> Formatear números</>
                                  )}
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    // Abrir el diálogo para añadir etiquetas
                                    setSelectedTagsToAdd([]);
                                    setIsTaggingDialogOpen(true);
                                  }}
                                >
                                  <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"></path>
                                      <path d="M12 12H12.01"></path>
                                      <rect x="9" y="3" width="6" height="4" rx="2"></rect>
                                    </svg>
                                    Añadir etiquetas
                                  </span>
                                </Button>
                              </div>
                            </div>

                            {importedData.contacts && importedData.contacts.length > 0 ? (
                              <div className="border rounded-md overflow-hidden">
                                <Table className="text-xs">
                                  <TableHeader>
                                    <TableRow className="h-8">
                                      <TableHead className="py-1 px-2">#</TableHead>
                                      <TableHead className="py-1 px-2">Teléfono</TableHead>
                                      <TableHead className="py-1 px-2">Nombre</TableHead>
                                      <TableHead className="py-1 px-2">Etiquetas</TableHead>
                                      <TableHead className="py-1 px-2">Estado</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {importedData.contacts.slice(0, 8).map((contact: any, index: number) => (
                                      <TableRow key={contact.id || index} className="h-7">
                                        <TableCell className="py-1 px-2">{index + 1}</TableCell>
                                        <TableCell className="py-1 px-2 font-mono">{contact.phoneNumber}</TableCell>
                                        <TableCell className="py-1 px-2 truncate max-w-[120px]">{contact.name || "Sin nombre"}</TableCell>
                                        <TableCell className="py-1 px-2">
                                          {contact.tags && contact.tags.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {contact.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                                                <Badge key={tagIndex} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs py-0 px-1.5 h-5">
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {contact.tags.length > 2 && (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs py-0 px-1.5 h-5">
                                                  +{contact.tags.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Sin etiquetas</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-1 px-2">
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-0 px-1.5 h-5">
                                            Importado
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {importedData.contacts.length > 8 && (
                                  <div className="p-1 text-center text-xs text-muted-foreground">
                                    Mostrando 8 de {importedData.contacts.length} contactos
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p>No se importó ningún contacto. Verifique el mapeo de campos.</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">
                            <p>Importe datos de Excel para ver los resultados aquí</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Pestaña para gestionar campañas existentes */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Campañas de Envío Masivo</CardTitle>
                <CardDescription>
                  Gestiona y monitoriza tus campañas de envío de mensajes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCampaigns ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : Array.isArray(campaigns) && campaigns && campaigns.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Progreso</TableHead>
                        <TableHead>Creada</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign: Campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                campaign.status === 'running' ? "default" :
                                campaign.status === 'completed' ? "secondary" :
                                campaign.status === 'paused' ? "outline" :
                                campaign.status === 'failed' ? "destructive" : "secondary"
                              }
                            >
                              {campaign.status === 'running' ? "En ejecución" :
                               campaign.status === 'pending' ? "Pendiente" :
                               campaign.status === 'paused' ? "Pausada" :
                               campaign.status === 'completed' ? "Completada" : "Error"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-full flex items-center gap-2">
                              <Progress 
                                value={
                                  campaign.totalContacts > 0 
                                    ? (campaign.processedContacts / campaign.totalContacts) * 100 
                                    : 0
                                }
                                className="h-2"
                              />
                              <span className="text-xs whitespace-nowrap">
                                {campaign.processedContacts}/{campaign.totalContacts}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant={
                                  campaign.status === 'running' ? "outline" : 
                                  campaign.status === 'completed' ? "secondary" : "default"
                                }
                                disabled={campaign.status === 'completed'}
                                onClick={() => handleCampaignAction(campaign)}
                              >
                                {campaign.status === 'running' ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-1" />
                                    Pausar
                                  </>
                                ) : campaign.status === 'paused' ? (
                                  <>
                                    <Play className="h-4 w-4 mr-1" />
                                    Reanudar
                                  </>
                                ) : campaign.status === 'completed' ? (
                                  "Completada"
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-1" />
                                    Iniciar
                                  </>
                                )}
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleImportExcel(campaign.id)}
                                disabled={campaign.status === 'running' || campaign.status === 'completed'}
                              >
                                <FileSpreadsheet className="h-4 w-4 mr-1" />
                                Importar
                              </Button>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Detalles de Campaña</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <h3 className="text-sm font-medium mb-2">Información general</h3>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Nombre:</span>
                                          <span>{campaign.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Estado:</span>
                                          <Badge 
                                            variant={
                                              campaign.status === 'running' ? "default" :
                                              campaign.status === 'completed' ? "secondary" :
                                              campaign.status === 'paused' ? "outline" :
                                              campaign.status === 'failed' ? "destructive" : "secondary"
                                            }
                                          >
                                            {campaign.status}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Creada:</span>
                                          <span>{new Date(campaign.createdAt).toLocaleString()}</span>
                                        </div>
                                        {campaign.startedAt && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Iniciada:</span>
                                            <span>{new Date(campaign.startedAt).toLocaleString()}</span>
                                          </div>
                                        )}
                                        {campaign.completedAt && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Completada:</span>
                                            <span>{new Date(campaign.completedAt).toLocaleString()}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Total contactos:</span>
                                          <span>{campaign.totalContacts}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Procesados:</span>
                                          <span>{campaign.processedContacts}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Exitosos:</span>
                                          <span className="text-green-600">{campaign.successfulSends}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Fallidos:</span>
                                          <span className="text-red-600">{campaign.failedSends}</span>
                                        </div>
                                      </div>
                                      
                                      <h3 className="text-sm font-medium mt-4 mb-2">Plantilla de mensaje</h3>
                                      <div className="bg-muted p-3 rounded-md text-sm">
                                        {campaign.messageTemplate}
                                      </div>
                                      
                                      {campaign.contacts && campaign.contacts.length > 0 && (
                                        <>
                                          <h3 className="text-sm font-medium mt-4 mb-2">Contactos de la campaña</h3>
                                          <div className="border rounded-md overflow-hidden">
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>Contacto</TableHead>
                                                  <TableHead>Estado</TableHead>
                                                  <TableHead>Acciones</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {campaign.contacts.slice(0, 5).map((contact) => (
                                                  <TableRow key={contact.id}>
                                                    <TableCell>
                                                      <div className="flex flex-col">
                                                        <span>{contact.name || 'Sin nombre'}</span>
                                                        <span className="text-xs text-muted-foreground">{contact.phoneNumber}</span>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell>
                                                      {contact.status === 'verified' ? (
                                                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                                          <CheckCircle className="h-3 w-3 mr-1" /> Verificado
                                                        </Badge>
                                                      ) : contact.status === 'sent' ? (
                                                        <Badge variant="outline">
                                                          <Send className="h-3 w-3 mr-1" /> Enviado
                                                        </Badge>
                                                      ) : contact.status === 'failed' ? (
                                                        <Badge variant="destructive">
                                                          <XCircle className="h-3 w-3 mr-1" /> Fallido
                                                        </Badge>
                                                      ) : (
                                                        <Badge variant="secondary">
                                                          <Clock className="h-3 w-3 mr-1" /> Pendiente
                                                        </Badge>
                                                      )}
                                                    </TableCell>
                                                    <TableCell>
                                                      <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        disabled={contact.status === 'verified'}
                                                        onClick={() => verifyMessageMutation.mutate({
                                                          campaignId: parseInt(campaign.id),
                                                          contactId: contact.id
                                                        })}
                                                      >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Verificar
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                            {campaign.contacts.length > 5 && (
                                              <div className="p-2 text-center text-sm text-muted-foreground">
                                                Mostrando 5 de {campaign.contacts.length} contactos
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <h3 className="text-sm font-medium mb-2">Configuración de envío</h3>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Intervalo entre mensajes:</span>
                                          <span>{campaign.sendingConfig && campaign.sendingConfig.minIntervalMs ? campaign.sendingConfig.minIntervalMs / 1000 : 5}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Tamaño de lote:</span>
                                          <span>{campaign.sendingConfig && campaign.sendingConfig.batchSize ? campaign.sendingConfig.batchSize : 10} mensajes</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Pausa entre lotes:</span>
                                          <span>{campaign.sendingConfig && campaign.sendingConfig.pauseBetweenBatchesMs ? campaign.sendingConfig.pauseBetweenBatchesMs / 60000 : 1}min</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Simular escritura:</span>
                                          <span>{campaign.sendingConfig && campaign.sendingConfig.simulateTyping ? "Sí" : "No"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Personalización:</span>
                                          <span>{campaign.config && campaign.config.personalizeMessages ? "Sí" : "No"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Variaciones de mensaje:</span>
                                          <span>{campaign.config && campaign.config.messageVariations ? "Sí" : "No"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Respeta horario:</span>
                                          <span>{campaign.sendingConfig && campaign.sendingConfig.respectBusinessHours ? "Sí" : "No"}</span>
                                        </div>
                                        {campaign.sendingConfig && campaign.sendingConfig.respectBusinessHours && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Horario:</span>
                                            <span>{campaign.sendingConfig.businessHoursStart}:00 - {campaign.sendingConfig.businessHoursEnd}:00</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <h3 className="text-sm font-medium mt-4 mb-2">Destinatarios</h3>
                                      {campaign.targetGroups && campaign.targetGroups.length > 0 && (
                                        <div className="mb-2">
                                          <p className="text-xs text-muted-foreground mb-1">Grupos:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {campaign.targetGroups.map(group => (
                                              <Badge key={group} variant="outline">{group}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {campaign.targetTags && campaign.targetTags.length > 0 && (
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Etiquetas:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {campaign.targetTags.map(tag => (
                                              <Badge key={tag} variant="outline">{tag}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="bg-muted rounded-full p-3">
                      <Send className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium">No hay campañas</h3>
                      <p className="text-sm text-muted-foreground">
                        Crea tu primera campaña de envío masivo de mensajes
                      </p>
                    </div>
                    <Button onClick={() => setTab("new-campaign")}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Nueva Campaña
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Diálogo para importar Excel */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Contactos desde Excel</DialogTitle>
            <DialogDescription>
              Seleccione un archivo Excel para importar contactos a la campaña.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            {selectedFile ? (
              <div className="flex items-center p-3 border rounded-md">
                <FileSpreadsheet className="h-8 w-8 mr-2 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    setExcelColumns([]);
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleSelectFile}
              >
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Haga clic para seleccionar un archivo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O arrastre y suelte un archivo Excel aquí
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={!selectedFile}
                onClick={handleSelectFile}
              >
                {selectedFile ? "Seleccionar otro archivo" : "Seleccionar archivo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para mapeo de campos */}
      <Dialog open={isFieldMappingOpen} onOpenChange={setIsFieldMappingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mapeo de Campos</DialogTitle>
            <DialogDescription>
              Seleccione qué columnas del archivo Excel corresponden a cada campo requerido.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-mapping">Número de Teléfono (requerido)</Label>
                <Select 
                  value={fieldMapping.phoneNumber} 
                  onValueChange={(value) => handleFieldMappingChange('phoneNumber', value)}
                >
                  <SelectTrigger id="phone-mapping">
                    <SelectValue placeholder="Seleccione la columna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Debe incluir código de país, ej: +521234567890
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name-mapping">Nombre</Label>
                <Select 
                  value={fieldMapping.name} 
                  onValueChange={(value) => handleFieldMappingChange('name', value)}
                >
                  <SelectTrigger id="name-mapping">
                    <SelectValue placeholder="Seleccione la columna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-mapping">Empresa</Label>
                <Select 
                  value={fieldMapping.company} 
                  onValueChange={(value) => handleFieldMappingChange('company', value)}
                >
                  <SelectTrigger id="company-mapping">
                    <SelectValue placeholder="Seleccione la columna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-mapping">Correo Electrónico</Label>
                <Select 
                  value={fieldMapping.email} 
                  onValueChange={(value) => handleFieldMappingChange('email', value)}
                >
                  <SelectTrigger id="email-mapping">
                    <SelectValue placeholder="Seleccione la columna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags-mapping">Etiquetas</Label>
                <Select 
                  value={fieldMapping.tags} 
                  onValueChange={(value) => handleFieldMappingChange('tags', value)}
                >
                  <SelectTrigger id="tags-mapping">
                    <SelectValue placeholder="Seleccione la columna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mapear</SelectItem>
                    {excelColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Etiquetas separadas por comas (ej: cliente,importante,pendiente)
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldMappingOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessImport}
              disabled={!fieldMapping.phoneNumber || fieldMapping.phoneNumber === 'none'}
            >
              Importar Contactos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para añadir etiquetas a contactos */}
      <Dialog open={isTaggingDialogOpen} onOpenChange={setIsTaggingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir etiquetas a contactos</DialogTitle>
            <DialogDescription>
              Seleccione las etiquetas que desea aplicar a todos los contactos importados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tags">Etiquetas disponibles</Label>
              
              {loadingTags ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contactTags && contactTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {contactTags.map((tag: any) => (
                    <div 
                      key={tag.id}
                      onClick={() => {
                        // Toggle la selección de la etiqueta
                        if (selectedTagsToAdd.includes(tag.id)) {
                          setSelectedTagsToAdd(selectedTagsToAdd.filter(id => id !== tag.id));
                        } else {
                          setSelectedTagsToAdd([...selectedTagsToAdd, tag.id]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                        selectedTagsToAdd.includes(tag.id) 
                          ? 'bg-primary/20 border-primary/30' 
                          : 'bg-muted/50 hover:bg-muted'
                      } border`}
                    >
                      {selectedTagsToAdd.includes(tag.id) ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm">{tag.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No hay etiquetas disponibles. Cree una nueva etiqueta.
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="new-tag">Crear nueva etiqueta</Label>
              <div className="flex gap-2">
                <Input
                  id="new-tag"
                  placeholder="Nombre de la etiqueta"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={!newTagName.trim() || createTagMutation.isPending}
                  onClick={() => {
                    if (newTagName.trim()) {
                      createTagMutation.mutate({ 
                        name: newTagName.trim(),
                        color: "#3b82f6" // Color predeterminado azul
                      });
                    }
                  }}
                >
                  {createTagMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <div>
              {selectedTagsToAdd.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedTagsToAdd.length} etiqueta{selectedTagsToAdd.length !== 1 ? 's' : ''} seleccionada{selectedTagsToAdd.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsTaggingDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={applyTagsToContacts}
                disabled={selectedTagsToAdd.length === 0}
              >
                Aplicar etiquetas
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para el asistente de Gemini */}
      <Dialog open={isGeminiAssistantOpen} onOpenChange={setIsGeminiAssistantOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Asistente de Gemini</DialogTitle>
            <DialogDescription>
              Utiliza la IA de Gemini para generar mensajes personalizados
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gemini-prompt">¿Qué tipo de mensaje quieres crear?</Label>
              <Textarea
                id="gemini-prompt"
                placeholder="Ej: Crea un mensaje de seguimiento para un cliente interesado en nuestros servicios de marketing digital"
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button 
                  size="sm"
                  onClick={handleGenerateWithGemini}
                  disabled={isGeneratingWithGemini || !geminiPrompt.trim()}
                >
                  {isGeneratingWithGemini ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando</>
                  ) : (
                    <><span className="mr-2">✨</span> Generar con Gemini</>
                  )}
                </Button>
              </div>
            </div>
            
            {geminiResult && (
              <div className="grid gap-2 mt-2">
                <Label>Mensaje generado</Label>
                <div className="border rounded-md p-4 bg-muted/30 whitespace-pre-wrap">
                  {geminiResult}
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Usar el mensaje y cerrar
                      setMessageText(geminiResult);
                      setIsGeminiAssistantOpen(false);
                      toast({
                        title: "Mensaje aplicado",
                        description: "El mensaje generado por Gemini ha sido aplicado."
                      });
                    }}
                  >
                    Usar este mensaje
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeminiAssistantOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Panel de envío inmediato de mensajes */}
      <Dialog open={showImmediateMessaging} onOpenChange={setShowImmediateMessaging}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Envío Inmediato de Mensajes</DialogTitle>
            <DialogDescription>
              Envía mensajes directamente a los contactos importados o seleccionados de WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Selección de contactos */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contacts" className="text-base">Contactos seleccionados</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="select-all" className="text-xs">Seleccionar todos</Label>
                  <Switch
                    id="select-all"
                    checked={selectAllImported}
                    onCheckedChange={handleSelectAllImportedContacts}
                  />
                </div>
              </div>
              
              <div className="border rounded-md max-h-[200px] overflow-y-auto">
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
                        <TableRow 
                          key={contact.id || index} 
                          className="h-7 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleToggleContactSelection(contact.id)}
                        >
                          <TableCell className="py-1 px-2">
                            <div className="flex items-center justify-center">
                              {selectedImportedContactIds.includes(contact.id) ? (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1 px-2 font-mono">{contact.phoneNumber}</TableCell>
                          <TableCell className="py-1 px-2 truncate max-w-[120px]">{contact.name || "Sin nombre"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No hay contactos importados. Importe contactos primero.
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground mt-1">
                {selectedImportedContactIds.length} de {importedData?.contacts?.length || 0} contactos seleccionados
              </div>
            </div>
            
            {/* Edición del mensaje */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-base">Mensaje a enviar</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsGeminiAssistantOpen(true)}
                  className="h-7 px-2"
                >
                  <span className="mr-1">✨</span> Ayuda de Gemini
                </Button>
              </div>
              <Textarea
                id="message"
                placeholder="Escribe aquí el mensaje que deseas enviar..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {messageText ? `${messageText.length} caracteres` : "0 caracteres"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImmediateMessaging(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={sendImmediateMessages}
                disabled={isSendingMessages || selectedImportedContactIds.length === 0 || !messageText.trim()}
              >
                {isSendingMessages ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Enviar ahora</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Componente de diálogo para envío inmediato */}
      <SendImmediateDialog 
        open={showImmediateMessaging}
        onOpenChange={setShowImmediateMessaging}
        importedData={importedData}
      />
    </div>
  );
}
