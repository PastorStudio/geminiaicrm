import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [location] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentChildren, setCurrentChildren] = useState(children);

  useEffect(() => {
    // Iniciar transición cuando cambie la ruta
    setIsTransitioning(true);
    
    // Simular un pequeño tiempo de carga para transición suave
    const timer = setTimeout(() => {
      setCurrentChildren(children);
      setIsTransitioning(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [location, children]);

  return (
    <div className="h-full w-full relative">
      <AnimatePresence mode="wait">
        {isTransitioning ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10"
          >
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600 font-medium">Cargando página...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
            className="h-full w-full"
          >
            {currentChildren}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;