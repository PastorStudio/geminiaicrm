import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Ticket,
  Menu,
  X,
  Zap
} from 'lucide-react';

interface PersistentMenuProps {
  isLoading?: boolean;
}

export function PersistentMenu({ isLoading = false }: PersistentMenuProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { path: '/messages', icon: MessageSquare, label: 'Mensajes', color: 'text-blue-400' },
    { path: '/leads', icon: Users, label: 'Leads', color: 'text-green-400' },
    { path: '/tickets', icon: Ticket, label: 'Tickets', color: 'text-purple-400' },
    { path: '/calendar', icon: Calendar, label: 'Calendario', color: 'text-orange-400' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard', color: 'text-cyan-400' },
    { path: '/settings', icon: Settings, label: 'Configuración', color: 'text-gray-400' },
  ];

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Desktop Menu */}
      <div className={`
        fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 via-black to-red-900 
        border-r border-red-800/30 z-50 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isLoading ? 'opacity-90' : 'opacity-100'}
      `}>
        
        {/* Header */}
        <div className="p-4 border-b border-red-800/30">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <Zap className="w-6 h-6 text-red-500" />
                <h1 className="text-white font-bold text-lg">CRM WhatsApp</h1>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-white hover:bg-red-900/20"
            >
              {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="mt-3">
              {!isCollapsed && (
                <div className="text-xs text-red-300 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  Cargando...
                </div>
              )}
              <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                <div className="bg-gradient-to-r from-red-500 to-red-600 h-1 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`
                    w-full justify-start text-left transition-all duration-200
                    ${active 
                      ? 'bg-gradient-to-r from-red-600/20 to-red-700/20 text-white border-l-2 border-red-500' 
                      : 'text-gray-300 hover:text-white hover:bg-red-900/10'
                    }
                    ${isCollapsed ? 'px-2' : 'px-4'}
                  `}
                >
                  <IconComponent className={`w-5 h-5 ${active ? 'text-red-400' : item.color} ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && (
                    <span className="transition-all duration-200">{item.label}</span>
                  )}
                  
                  {/* Active indicator */}
                  {active && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-red-800/30">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 text-center">
              <p>Sistema CRM WhatsApp</p>
              <p className="text-red-400">v2.0 - AI Powered</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-black/80 border-red-600 text-white"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {!isCollapsed && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsCollapsed(true)} />
      )}
    </>
  );
}

// Hook para controlar el estado de carga global
export function useMenuLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  return { isLoading, startLoading, stopLoading };
}