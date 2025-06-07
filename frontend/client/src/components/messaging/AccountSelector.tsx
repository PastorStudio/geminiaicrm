import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Smartphone, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatsAppAccount {
  id: number;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastSeen?: Date;
  messageCount?: number;
  profilePicUrl?: string;
}

interface AccountSelectorProps {
  accounts: WhatsAppAccount[];
  selectedAccounts: number[];
  onAccountsChange: (accountIds: number[]) => void;
  onAccountClick: (accountId: number) => void;
}

export function AccountSelector({ 
  accounts, 
  selectedAccounts, 
  onAccountsChange, 
  onAccountClick 
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-500" />;
      case 'connecting':
        return <Wifi className="h-3 w-3 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <WifiOff className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'error':
        return 'Error';
      default:
        return 'Desconectado';
    }
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      onAccountsChange([]);
    } else {
      onAccountsChange(accounts.map(acc => acc.id));
    }
  };

  const handleAccountToggle = (accountId: number) => {
    if (selectedAccounts.includes(accountId)) {
      onAccountsChange(selectedAccounts.filter(id => id !== accountId));
    } else {
      onAccountsChange([...selectedAccounts, accountId]);
    }
  };

  const connectedCount = selectedAccounts.length;
  const selectedAccountsData = accounts.filter(acc => selectedAccounts.includes(acc.id));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="min-w-[200px] justify-between bg-white hover:bg-gray-50 border-gray-200 pt-[0px] pb-[0px] mt-[10px] mb-[10px] pl-[92px] pr-[92px]"
        >
          <div className="flex items-center space-x-2">
            <Smartphone className="h-4 w-4 text-green-600" />
            <span className="font-medium">
              {selectedAccounts.length === 0 
                ? "Seleccionar cuentas"
                : selectedAccounts.length === accounts.length
                ? "Todas las cuentas"
                : `${selectedAccounts.length} cuenta${selectedAccounts.length > 1 ? 's' : ''}`
              }
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {connectedCount}/{accounts.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        <Card className="border-0 shadow-lg">
          <div className="p-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Cuentas WhatsApp</h3>
              <Badge variant="outline" className="text-xs">
                {connectedCount} activas
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedAccounts.length === accounts.length}
                onCheckedChange={handleSelectAll}
                className="border-green-500 data-[state=checked]:bg-green-600"
              />
              <label 
                htmlFor="select-all" 
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Seleccionar todas
              </label>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <AnimatePresence>
              {accounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onAccountClick(account.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => handleAccountToggle(account.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="border-green-500 data-[state=checked]:bg-green-600 mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 truncate">
                            {account.name}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(account.status)}`}
                          >
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(account.status)}
                              <span>{getStatusText(account.status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <span>📱</span>
                          <span>{account.phone}</span>
                        </span>
                        {account.messageCount !== undefined && (
                          <span className="flex items-center space-x-1">
                            <span>💬</span>
                            <span>{account.messageCount} chats</span>
                          </span>
                        )}
                      </div>
                      
                      {account.lastSeen && account.status === 'connected' && (
                        <div className="text-xs text-green-600 mt-1">
                          En línea
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {selectedAccountsData.length > 0 && (
            <div className="p-3 bg-gray-50 border-t">
              <div className="text-xs text-gray-600 mb-2">Cuentas seleccionadas:</div>
              <div className="flex flex-wrap gap-1">
                {selectedAccountsData.map(account => (
                  <Badge 
                    key={account.id} 
                    variant="secondary" 
                    className="text-xs bg-blue-100 text-blue-800"
                  >
                    {account.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}