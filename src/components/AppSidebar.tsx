import { LayoutDashboard, Armchair, Users, CreditCard, LogOut, ClipboardList, BookOpenText } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useApp } from '@/contexts/AppContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Seat Management', url: '/seats', icon: Armchair },
  { title: 'Students', url: '/students', icon: Users },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Admissions', url: '/admissions', icon: ClipboardList },
  { title: 'Help Guide', url: '/help', icon: BookOpenText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { logout } = useApp();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-16 items-center px-4 border-b border-border">
        {!collapsed ? <Logo size="sm" /> : (
          <div className="flex items-center justify-center w-full">
            <LayoutDashboard className="text-primary" size={20} />
          </div>
        )}
      </div>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon size={20} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <button
          onClick={() => { void logout(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-sm"
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
