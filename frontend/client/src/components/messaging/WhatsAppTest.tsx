import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function WhatsAppTest() {
  const [status, setStatus] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    status: false,
    chats: false,
    messages: false
  });
  const [error, setError] = useState<any>(null);

  // Función para obtener el estado de WhatsApp
  const fetchStatus = async () => {
    setLoading(prev => ({ ...prev, status: true }));
    setError(null);
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/direct/whatsapp/status?t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Estado de WhatsApp:', data);
      setStatus(data);
    } catch (error) {
      console.error('Error obteniendo estado de WhatsApp:', error);
      setError(error);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  };
  
  // Función para obtener chats de WhatsApp
  const fetchChats = async () => {
    setLoading(prev => ({ ...prev, chats: true }));
    setError(null);
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/direct/whatsapp/chats?t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Chats de WhatsApp:', data);
      setChats(data);
    } catch (error) {
      console.error('Error obteniendo chats de WhatsApp:', error);
      setError(error);
    } finally {
      setLoading(prev => ({ ...prev, chats: false }));
    }
  };
  
  // Función para obtener mensajes de un chat específico
  const fetchMessages = async (chatId: string) => {
    setLoading(prev => ({ ...prev, messages: true }));
    setError(null);
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/direct/whatsapp/messages/${chatId}?t=${timestamp}&limit=10`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Mensajes de chat ${chatId}:`, data);
      setMessages(data);
    } catch (error) {
      console.error(`Error obteniendo mensajes de chat ${chatId}:`, error);
      setError(error);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };
  
  // Cargar estado inicial
  useEffect(() => {
    fetchStatus();
  }, []);
  
  // Seleccionar chat y obtener mensajes
  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    fetchMessages(chatId);
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="bg-gradient-to-r from-green-100 to-transparent">
        <CardTitle className="text-lg font-semibold text-green-800">
          Prueba de Conexión a WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-2">
          <Button 
            onClick={fetchStatus} 
            disabled={loading.status}
            variant="outline"
            size="sm"
          >
            {loading.status && <Spinner size="sm" className="mr-2" />}
            Verificar Estado
          </Button>
          
          <Button 
            onClick={fetchChats}
            disabled={loading.chats || !status?.authenticated}
            variant="outline"
            size="sm"
          >
            {loading.chats && <Spinner size="sm" className="mr-2" />}
            Obtener Chats Reales
          </Button>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            <p className="font-semibold">Error:</p>
            <p>{error.message || 'Error desconocido'}</p>
          </div>
        )}
        
        {status && (
          <div className="p-3 bg-gray-50 border rounded text-sm">
            <h3 className="font-semibold mb-2">Estado:</h3>
            <ul className="space-y-1">
              <li><span className="font-medium">Inicializado:</span> {status.initialized ? 'Sí' : 'No'}</li>
              <li><span className="font-medium">Listo:</span> {status.ready ? 'Sí' : 'No'}</li>
              <li>
                <span className="font-medium">Autenticado:</span> 
                <span className={status.authenticated ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {status.authenticated ? 'Sí' : 'No'}
                </span>
                {!status.authenticated && (
                  <span className="text-orange-500 ml-2">
                    (Necesita escanear código QR para ver chats reales)
                  </span>
                )}
              </li>
              {status.connectionState && (
                <li><span className="font-medium">Estado de conexión:</span> {status.connectionState}</li>
              )}
              {status.qrCode && !status.authenticated && (
                <li className="pt-2">
                  <div className="font-medium mb-1">Código QR:</div>
                  <img 
                    src={status.qrDataUrl}
                    alt="QR Code para WhatsApp" 
                    className="w-48 h-48 border"
                  />
                  <div className="mt-2 text-xs text-gray-600">
                    Escanea este código con WhatsApp en tu teléfono para autenticarte
                    y poder ver los chats reales. Una vez autenticado, haz clic en "Obtener Chats Reales".
                  </div>
                </li>
              )}
              {status.authenticated && (
                <li className="pt-2 text-green-600">
                  ¡Autenticación exitosa! Ahora puedes ver los chats reales haciendo clic en el botón "Obtener Chats Reales"
                </li>
              )}
            </ul>
          </div>
        )}
        
        {chats && chats.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2">Chats Disponibles ({chats.length}):</h3>
            <div className="border rounded divide-y max-h-48 overflow-y-auto">
              {chats.map((chat) => (
                <div 
                  key={chat.id} 
                  className={`p-2 text-sm hover:bg-gray-50 cursor-pointer ${
                    selectedChatId === chat.id ? 'bg-green-50' : ''
                  }`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <div className="font-medium">{chat.name}</div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{chat.isGroup ? 'Grupo' : 'Contacto'}</span>
                    {chat.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px]">
                        {chat.unreadCount} sin leer
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <div className="text-xs text-gray-600 truncate mt-1">{chat.lastMessage}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedChatId && messages && (
          <div>
            <h3 className="font-semibold text-sm mb-2">
              Mensajes {loading.messages && <Spinner size="sm" className="ml-2" />}:
            </h3>
            <div className="border rounded p-3 bg-gray-50 max-h-64 overflow-y-auto">
              {messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`p-2 rounded-lg text-sm ${
                        msg.fromMe 
                          ? 'bg-green-100 ml-8' 
                          : 'bg-white border mr-8'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.body}</div>
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No hay mensajes para mostrar
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}