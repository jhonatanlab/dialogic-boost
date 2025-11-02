import { NavLink, useLocation } from "react-router-dom";
import { 
  MessageSquare, 
  Users, 
  Bot, 
  Send, 
  BarChart3, 
  QrCode, 
  Brain,
  LayoutDashboard 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Contatos", url: "/contacts", icon: Users },
  { title: "Automações", url: "/automations", icon: Bot },
  { title: "Campanhas", url: "/campaigns", icon: Send },
  { title: "Relatórios", url: "/analytics", icon: BarChart3 },
  { title: "Check-in", url: "/checkin", icon: QrCode },
  { title: "IA", url: "/ai", icon: Brain },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg">LeadChat</span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
