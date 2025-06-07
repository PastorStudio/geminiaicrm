import React, { useState, useEffect } from 'react';

const SuperSimpleToggle: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const activateAutoResponse = async () => {
    setLoading(true);
    try {
      // Intentar activar usando fetch directo
      const response = await fetch('/api/direct/auto-response/activate/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentName: 'Smart Assistant' })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuestas automáticas activadas:', data);
        setIsActive(true);
      } else {
        console.error('❌ Error activando respuestas automáticas');
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
    }
    setLoading(false);
  };

  const deactivateAutoResponse = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/direct/auto-response/deactivate/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuestas automáticas desactivadas:', data);
        setIsActive(false);
      } else {
        console.error('❌ Error desactivando respuestas automáticas');
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
    }
    setLoading(false);
  };

  const handleToggle = () => {
    if (isActive) {
      deactivateAutoResponse();
    } else {
      activateAutoResponse();
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Respuestas Automáticas Estables</h3>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isActive
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Procesando...' : isActive ? 'Desactivar' : 'Activar'}
        </button>

        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isActive ? '🟢 Activo' : '🔴 Inactivo'}
        </span>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          Sistema estable que mantiene las configuraciones en la base de datos.
          No se desactiva por errores de WhatsApp.
        </p>
      </div>
    </div>
  );
};

export default SuperSimpleToggle;