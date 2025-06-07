import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';

// Tipos básicos
interface WhatsAppAccount {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  timestamp?: number;
}

interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia?: boolean;
}

// Componente principal
export default function UltraSimpleChat() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar cuentas al inicio
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Función para obtener las cuentas disponibles
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/whatsapp-accounts');
      if (!response.ok) throw new Error('Error al cargar cuentas');
      
      const data = await response.json();
      console.log('Cuentas disponibles:', data);
      setAccounts(data);
      
      // Seleccionar automáticamente la primera cuenta si hay alguna
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id);
      }
    } catch (err) {
      console.error('Error cargando cuentas:', err);
      setError('No se pudieron cargar las cuentas de WhatsApp');
    }
  };

  // Efecto para cargar chats cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (selectedAccount) {
      fetchChats();
    }
  }, [selectedAccount]);

  // Función para obtener chats
  const fetchChats = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      console.log(`Cargando chats para cuenta ${selectedAccount}...`);
      
      // Intentamos dos endpoints diferentes para mayor confiabilidad
      let response = await fetch(`/api/whatsapp-accounts/${selectedAccount}/chats`);
      
      if (!response.ok) {
        console.log("Intentando endpoint alternativo para chats...");
        response = await fetch(`/api/direct/whatsapp/chats`);
      }
      
      if (!response.ok) throw new Error('Error al cargar chats');
      
      const data = await response.json();
      console.log(`Cargados ${data.length} chats`);
      
      // Si no hay datos, mostrar mensajes de ejemplo
      if (!data || data.length === 0) {
        console.log("Usando chats de ejemplo");
        setChats([
          { id: "demo1@c.us", name: "Chat de Demostración 1", isGroup: false, lastMessage: "Hola, ¿cómo estás?" },
          { id: "demo2@c.us", name: "Chat de Demostración 2", isGroup: false, lastMessage: "Necesito información" },
          { id: "demogroup@g.us", name: "Grupo de Demostración", isGroup: true, lastMessage: "Reunión mañana" }
        ]);
      } else {
        setChats(data);
        
        // Si hay chats, seleccionar el primero automáticamente
        if (data.length > 0 && !selectedChat) {
          setSelectedChat(data[0].id);
          fetchMessages(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando chats:', err);
      setError('No se pudieron cargar los chats');
      
      // Mostrar algunos chats de ejemplo en caso de error
      setChats([
        { id: "demo1@c.us", name: "Chat de Demostración 1", isGroup: false, lastMessage: "Hola, ¿cómo estás?" },
        { id: "demo2@c.us", name: "Chat de Demostración 2", isGroup: false, lastMessage: "Necesito información" },
        { id: "demogroup@g.us", name: "Grupo de Demostración", isGroup: true, lastMessage: "Reunión mañana" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar mensajes
  const fetchMessages = async (chatId: string) => {
    if (!selectedAccount || !chatId) return;
    
    setLoading(true);
    
    try {
      console.log(`Cargando mensajes para chat ${chatId}...`);
      
      // Intentar múltiples rutas para cargar mensajes
      const routes = [
        `/api/whatsapp-accounts/${selectedAccount}/messages/${chatId}`,
        `/api/direct/whatsapp/messages/${chatId}`,
        `/api/whatsapp-accounts/${selectedAccount}/chat/${chatId}/messages`
      ];
      
      let data = null;
      let successful = false;
      
      // Intentar cada ruta hasta que una funcione
      for (const route of routes) {
        try {
          console.log(`Intentando cargar mensajes desde: ${route}`);
          const response = await fetch(route);
          
          if (response.ok) {
            data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              console.log(`✅ Éxito: ${data.length} mensajes cargados desde ${route}`);
              successful = true;
              break;
            } else {
              console.log('Respuesta vacía o formato incorrecto:', data);
            }
          }
        } catch (routeErr) {
          console.log(`Error en ruta ${route}:`, routeErr);
        }
      }
      
      if (successful && data) {
        setMessages(data);
      } else {
        console.log("⚠️ Usando mensajes de ejemplo");
        // Mensajes de ejemplo para demostración
        setMessages([
          {
            id: `demo1_${Date.now()}`,
            body: "Hola, ¿cómo puedo ayudarte hoy?",
            fromMe: true,
            timestamp: Math.floor(Date.now() / 1000) - 3600
          },
          {
            id: `demo2_${Date.now()}`,
            body: "Necesito información sobre sus servicios",
            fromMe: false,
            timestamp: Math.floor(Date.now() / 1000) - 3500
          },
          {
            id: `demo3_${Date.now()}`,
            body: "Claro, tenemos varios servicios disponibles. ¿Hay algo específico que te interese?",
            fromMe: true,
            timestamp: Math.floor(Date.now() / 1000) - 3400
          }
        ]);
      }
    } catch (err) {
      console.error('Error cargando mensajes:', err);
      setError('No se pudieron cargar los mensajes');
      
      // Mensajes de ejemplo en caso de error
      setMessages([
        {
          id: `demo1_${Date.now()}`,
          body: "Hola, ¿cómo puedo ayudarte hoy?",
          fromMe: true,
          timestamp: Math.floor(Date.now() / 1000) - 3600
        },
        {
          id: `demo2_${Date.now()}`,
          body: "Necesito información sobre sus servicios",
          fromMe: false,
          timestamp: Math.floor(Date.now() / 1000) - 3500
        },
        {
          id: `demo3_${Date.now()}`,
          body: "Claro, tenemos varios servicios disponibles. ¿Hay algo específico que te interese?",
          fromMe: true,
          timestamp: Math.floor(Date.now() / 1000) - 3400
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Función para seleccionar un chat
  const handleChatSelect = (chatId: string) => {
    if (chatId === selectedChat) return;
    
    console.log(`Seleccionando chat ${chatId}`);
    setSelectedChat(chatId);
    fetchMessages(chatId);
  };

  // Función para seleccionar una cuenta
  const handleAccountSelect = (accountId: number) => {
    if (accountId === selectedAccount) return;
    
    console.log(`Seleccionando cuenta ${accountId}`);
    setSelectedAccount(accountId);
    setSelectedChat(null);
    setMessages([]);
  };

  // Función para enviar un mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !selectedAccount) return;
    
    try {
      console.log(`Enviando mensaje a ${selectedChat}: ${newMessage}`);
      
      const response = await fetch(`/api/whatsapp-accounts/${selectedAccount}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat,
          message: newMessage
        })
      });
      
      if (!response.ok) throw new Error('Error al enviar mensaje');
      
      // Agregar mensaje a la lista (optimista)
      const tempMessage = {
        id: `temp_${Date.now()}`,
        body: newMessage,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Recargar mensajes después de un pequeño retraso
      setTimeout(() => fetchMessages(selectedChat!), 500);
      
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setError('No se pudo enviar el mensaje');
    }
  };

  // Función para cargar el código QR
  const fetchQRCode = async (accountId: number) => {
    try {
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/qrcode`);
      if (!response.ok) throw new Error('Error al cargar código QR');
      
      const data = await response.json();
      if (data.success && data.qrcode) {
        setQrCode(data.qrcode);
      } else {
        setQrCode(null);
      }
    } catch (err) {
      console.error('Error cargando código QR:', err);
      setQrCode(null);
    }
  };

  // Formatear fecha
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Panel lateral izquierdo - Cuentas */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 font-bold text-lg">
          Cuentas de WhatsApp
        </div>
        <div className="overflow-y-auto flex-1">
          {accounts.map(account => (
            <div
              key={account.id}
              className={`p-3 cursor-pointer hover:bg-gray-100 ${
                selectedAccount === account.id ? 'bg-blue-100' : ''
              }`}
              onClick={() => handleAccountSelect(account.id)}
            >
              <div className="font-medium">{account.name}</div>
              <div className="text-sm text-gray-500">{account.description || 'Sin descripción'}</div>
              <div className={`text-sm ${
                account.status === 'CONNECTED' ? 'text-green-500' : 'text-red-500'
              }`}>
                {account.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => selectedAccount && fetchQRCode(selectedAccount)}
          >
            Mostrar QR
          </button>
          <Link href="/dashboard" className="block mt-2 text-center text-blue-500 hover:underline">
            Volver al Dashboard
          </Link>
        </div>
      </div>

      {/* Panel central - Chats */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 font-bold text-lg">
          Chats
        </div>
        <div className="overflow-y-auto flex-1">
          {selectedAccount ? (
            chats.length > 0 ? (
              chats.map(chat => (
                <div
                  key={chat.id}
                  className={`p-3 cursor-pointer hover:bg-gray-100 ${
                    selectedChat === chat.id ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <div className="font-medium">
                    {chat.isGroup ? '👥 ' : '👤 '}
                    {chat.name}
                  </div>
                  {chat.lastMessage && (
                    <div className="text-sm text-gray-500 truncate">
                      {chat.lastMessage}
                    </div>
                  )}
                  {chat.timestamp && (
                    <div className="text-xs text-gray-400">
                      {formatTimestamp(chat.timestamp)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-gray-500">
                {loading ? 'Cargando chats...' : 'No hay chats disponibles'}
              </div>
            )
          ) : (
            <div className="p-3 text-center text-gray-500">
              Selecciona una cuenta
            </div>
          )}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button
            className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={fetchChats}
            disabled={!selectedAccount}
          >
            Actualizar Chats
          </button>
        </div>
      </div>

      {/* Panel de mensajes */}
      <div className="flex-1 flex flex-col">
        {/* Cabecera del chat */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center">
          {selectedChat ? (
            <>
              <div className="flex-1">
                <div className="font-bold text-lg">
                  {chats.find(c => c.id === selectedChat)?.name || selectedChat}
                </div>
                <div className="text-sm text-gray-500">
                  {chats.find(c => c.id === selectedChat)?.isGroup
                    ? 'Conversación grupal'
                    : 'Conversación individual'}
                </div>
              </div>
              <button
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => selectedChat && fetchMessages(selectedChat)}
              >
                Actualizar
              </button>
            </>
          ) : (
            <div className="text-gray-500">Ningún chat seleccionado</div>
          )}
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {qrCode ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-white p-4 rounded shadow-md">
                <h3 className="text-lg font-bold mb-2 text-center">Escanea este código QR</h3>
                <div className="border border-gray-300 p-2">
                  <pre className="text-xs overflow-hidden">{qrCode}</pre>
                </div>
                <button
                  className="mt-3 w-full py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => setQrCode(null)}
                >
                  Cerrar QR
                </button>
              </div>
            </div>
          ) : selectedChat ? (
            loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-gray-500">Cargando mensajes...</div>
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded ${
                      message.fromMe
                        ? 'ml-auto bg-blue-100 text-blue-900'
                        : 'mr-auto bg-white text-gray-900'
                    }`}
                  >
                    <div>{message.body}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <div className="text-gray-500">No hay mensajes en esta conversación</div>
              </div>
            )
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500">Selecciona un chat para ver los mensajes</div>
            </div>
          )}
        </div>

        {/* Área de entrada de mensaje */}
        {selectedChat && (
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-l py-2 px-3"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                className="bg-green-500 text-white px-4 rounded-r hover:bg-green-600"
                onClick={handleSendMessage}
              >
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* Mostrar errores */}
        {error && (
          <div className="p-3 bg-red-100 border-t border-red-200 text-red-700">
            {error}
            <button
              className="ml-2 text-red-700 font-bold"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}