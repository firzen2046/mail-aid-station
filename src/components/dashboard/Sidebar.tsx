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
  Search
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { to: '/dashboard/customers', icon: Users, label: '客戶列表' },
  { to: '/dashboard/mails', icon: Mail, label: '郵件管理' },
  { to: '/dashboard/new-mail', icon: Plus, label: '新增郵件' },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="w-64 bg-sidebar-background border-r border-sidebar-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">生意仔有限公司</h1>
            <p className="text-xs text-muted-foreground">郵件代收管理</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link key={item.to} to={item.to}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
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
        <Link to="/lookup" target="_blank">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Search className="w-4 h-4" />
            客戶查詢頁
          </Button>
        </Link>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          登出
        </Button>
      </div>
    </aside>
  );
}
