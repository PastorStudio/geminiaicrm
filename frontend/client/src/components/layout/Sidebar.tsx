import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();

  // Navigation items
  const navItems = [
    { href: "/", icon: "dashboard", label: "Dashboard" },
    { href: "/leads", icon: "people", label: "Leads" },
    { href: "/messages", icon: "forum", label: "Messages" },
    { href: "/mass-sender", icon: "send", label: "Envío Masivo" },
    { href: "/message-templates", icon: "description", label: "Plantillas" },
    { href: "/media-gallery", icon: "perm_media", label: "Galería" },
    { href: "/calendar", icon: "event", label: "Calendar" },
    { href: "/tasks", icon: "assignment", label: "Tasks" },
    { href: "/analytics", icon: "leaderboard", label: "Analytics" },
    { href: "/gemini-demo", icon: "smart_toy", label: "Gemini AI" },
    { href: "/gemini-test", icon: "psychology", label: "IA Test" },
    { href: "/integrations", icon: "link", label: "Integraciones" },
    { href: "/database", icon: "storage", label: "Base de Datos" },
    { href: "/settings", icon: "settings", label: "Settings" },
  ];

  // Handle closing the sidebar on mobile
  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 transform bg-white transition duration-200 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-center h-16 bg-primary-600">
          <div className="flex items-center">
            <span className="material-icons text-white mr-2">hub</span>
            <span className="text-white font-semibold text-lg">GeminiCRM</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                  location === item.href 
                    ? "text-white bg-primary-600" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span className="material-icons mr-3 h-6 w-6">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User profile */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  className="h-10 w-10 rounded-full" 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                  alt="User profile"
                />
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">Sarah Johnson</div>
                <div className="text-xs text-gray-500">Sales Manager</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
