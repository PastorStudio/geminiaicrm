import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // Filtrar toasts para mostrar mensajes importantes incluyendo configuraciones
  const filteredToasts = toasts.filter(toast => {
    // Mostrar toasts de error, éxito de configuración, y mensajes importantes
    return toast.variant === 'destructive' || 
           (toast.title && (
             toast.title.toLowerCase().includes('error') ||
             toast.title.toLowerCase().includes('fallo') ||
             toast.title.toLowerCase().includes('problema') ||
             toast.title.toLowerCase().includes('desconectado') ||
             toast.title.toLowerCase().includes('configuración') ||
             toast.title.toLowerCase().includes('guardada') ||
             toast.title.toLowerCase().includes('creada') ||
             toast.title.toLowerCase().includes('actualizada') ||
             toast.title.toLowerCase().includes('cargadas')
           )) ||
           (toast.description && (
             toast.description.toLowerCase().includes('error') ||
             toast.description.toLowerCase().includes('fallo') ||
             toast.description.toLowerCase().includes('problema') ||
             toast.description.toLowerCase().includes('configuraciones') ||
             toast.description.toLowerCase().includes('guardadas') ||
             toast.description.toLowerCase().includes('exitosamente')
           ))
  })

  return (
    <ToastProvider>
      {filteredToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
