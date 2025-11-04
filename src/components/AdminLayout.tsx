import * as React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  BarChart2,
  CalendarCheck,
  Image,
  Target,
  LogOut,
  ChevronDown,
  LayoutDashboard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/firebaseConfig";
import { signOut } from "firebase/auth";
import logo from "@/assets/multimedia-logo.png";
import { ThemeToggle } from "./ThemeToggle";
import { HamburgerMenu } from "./HamburgerMenu";
import { useIsMobile } from "@/hooks/use-mobile";

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "U";
  };

  const menuItems = [
    { name: "Dashboard", path: "/admin-dashboard", icon: LayoutDashboard },
    { name: "Mi Contenido", path: "/mi-contenido", icon: CalendarCheck },
    { name: "Equipo", path: "/", icon: Home },
    { name: "Organigrama", path: "/organigrama", icon: Users },
    { name: "Logros y Metas", path: "/logros-metas", icon: BarChart2 },
    { name: "Galería", path: "/galeria", icon: Image },
    { name: "Misión y Visión", path: "/mision-vision", icon: Target },
  ];

  return (
    <SidebarProvider defaultOpen={true} open={isMobile ? open : undefined} onOpenChange={isMobile ? setOpen : undefined}>
      {isMobile && (
        <div className="fixed top-4 left-4 z-50">
          <HamburgerMenu isOpen={open} onClick={() => setOpen(!open)} />
        </div>
      )}
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r border-border/70"
      >
        {/* --- CAMBIO: Añadido "flex-row" y "justify-start" --- */}
        <SidebarHeader className="h-20 flex flex-row items-center justify-start px-4 gap-3 border-b border-border/70 pt-6 pb-4">
          <img src={logo} alt="Logo" className="h-12 w-12 shrink-0" />
          <h2 className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
            Panel Admin
          </h2>
        </SidebarHeader>

        {/* El footer ya está arreglado (flex-1 en SidebarContent) */}
        <SidebarContent className="py-4 flex-1">
          <SidebarMenu className="px-2">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.name}
                >
                  <Link to={item.path}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t border-border/70">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between px-2 mt-2"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email ? getInitials(user.email) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className={isMobile ? "pt-16" : ""}>{children}</SidebarInset>
    </SidebarProvider>
  );
};