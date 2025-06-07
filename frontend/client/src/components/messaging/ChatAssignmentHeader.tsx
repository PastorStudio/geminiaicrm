import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, UserCheck, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ChatAssignmentHeaderProps {
  chatId: string;
  accountId: number;
  onTransferClick?: () => void;
}

export function ChatAssignmentHeader({ chatId, accountId, onTransferClick }: ChatAssignmentHeaderProps) {
  // Consultar la asignación actual del chat desde el sistema invisible
  const { data: assignment } = useQuery({
    queryKey: ['chat-assignment-header', chatId, accountId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/agent-assignments/chat?chatId=${encodeURIComponent(chatId)}&accountId=${accountId}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.success ? data.assignment : null;
      } catch (error) {
        console.log('❌ Error al buscar asignación:', error);
        return null;
      }
    },
    enabled: !!chatId && !!accountId,
    refetchInterval: 5000 // Actualizar cada 5 segundos para ver cambios en tiempo real
  });

  return (
    <div className="flex items-center space-x-3">
      {/* Indicador de agente asignado */}
      <AnimatePresence mode="wait">
        {assignment ? (
          <motion.div
            key={`assigned-${assignment.assignedToId}`}
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ 
              duration: 0.4, 
              ease: "easeInOut",
              type: "spring",
              stiffness: 250,
              damping: 20
            }}
            className="flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200"
          >
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <UserCheck className="h-4 w-4 mr-2" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              {assignment.agentName || `Agente #${assignment.assignedToId}`}
            </motion.span>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.2 }}
              className="ml-2 w-2 h-2 bg-green-500 rounded-full"
            />
          </motion.div>
        ) : (
          <motion.div
            key="unassigned"
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ 
              duration: 0.3, 
              ease: "easeInOut",
              type: "spring",
              stiffness: 200,
              damping: 20
            }}
            className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm border border-gray-200"
          >
            <motion.div
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <User className="h-4 w-4 mr-2" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.2 }}
            >
              Sin asignar
            </motion.span>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.2 }}
              className="ml-2 w-2 h-2 bg-gray-400 rounded-full animate-pulse"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón de transferir agente (solo visible si hay asignación) */}
      <AnimatePresence>
        {assignment && onTransferClick && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={onTransferClick}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 transition-all duration-200"
            >
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Transferir
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}