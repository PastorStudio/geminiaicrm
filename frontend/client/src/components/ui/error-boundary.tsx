import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            {/* Logo/Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Sistema CRM WhatsApp</h1>
              <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-red-700 mx-auto rounded"></div>
            </div>

            {/* Error Alert */}
            <Alert className="border-red-600 bg-red-900/20 text-white">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-200">Error del Sistema</AlertTitle>
              <AlertDescription className="text-red-100 mt-2">
                El sistema ha encontrado un error inesperado. No te preocupes, esto no afecta tus datos.
              </AlertDescription>
            </Alert>

            {/* Error Details */}
            <div className="bg-black/30 rounded-lg p-4 text-sm">
              <p className="text-red-200 font-semibold mb-2">Detalles técnicos:</p>
              <p className="text-gray-300 break-words">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReset}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar Nuevamente
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-900/20"
              >
                Recargar Aplicación
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-400">
              <p>Si el problema persiste, contacta al administrador del sistema.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para mostrar errores en componentes funcionales
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error en ${context || 'componente'}:`, error);
    
    // Mostrar toast de error
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-error-toast', {
        detail: {
          title: 'Error del Sistema',
          description: `${context ? context + ': ' : ''}${error.message}`,
          variant: 'destructive'
        }
      });
      window.dispatchEvent(event);
    }
  };

  return { handleError };
};