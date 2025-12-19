import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  Mail, 
  Plus, 
  LogOut,
  ExternalLink,
  Settings
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { to: '/dashboard/customers', icon: Users, label: '客戶列表' },
  { to: '/dashboard/mails', icon: Mail, label: '郵件管理' },
  { to: '/dashboard/new-mail', icon: Plus, label: '新增郵件' },
  { to: '/dashboard/settings', icon: Settings, label: '系統設置' },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground text-lg">生意仔有限公司</h1>
            <p className="text-xs text-sidebar-foreground/60">郵件代收管理</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to}>
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  active 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md' 
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Public Lookup Link */}
      <div className="p-4 border-t border-sidebar-border">
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ExternalLink className="w-4 h-4" />
            公開查詢頁
          </Button>
        </a>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          登出
        </Button>
      </div>
    </aside>
  );
}
