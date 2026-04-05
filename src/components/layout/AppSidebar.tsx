import { NavLink, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Bot,
  Send,
  BarChart3,
  QrCode,
  Brain,
  LayoutDashboard,
  Settings,
  Scan,
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
  { title: "Processar Check-in", url: "/process-checkin", icon: Scan },
  { title: "IA", url: "/ai", icon: Brain },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-64"}
      collapsible="icon"
      style={{ borderRight: "1px solid rgba(0, 212, 212, 0.2)" }}
    >
      <SidebarContent className="bg-white">
        {/* Logo */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "#00D4D4" }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: "#0D1A3A" }} />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg">
                <span style={{ color: "#00D4D4" }}>ELO</span>
                <span style={{ color: "#1A2B5C" }}>CHAT</span>
              </span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel
            style={{
              color: "#8A9AB0",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        className="rounded-lg transition-colors"
                        style={{
                          borderRadius: "8px",
                          background: active
                            ? "rgba(0, 212, 212, 0.12)"
                            : "transparent",
                          color: active ? "#1A2B5C" : "#8A9AB0",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <item.icon
                          className="h-4 w-4"
                          style={{ color: active ? "#00D4D4" : "#8A9AB0" }}
                        />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
