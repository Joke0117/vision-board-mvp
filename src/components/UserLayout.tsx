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

export const UserLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth);
  };

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "U";
  };

  const menuItems = [
    { name: "Mi Contenido", path: "/mi-contenido", icon: CalendarCheck },
    { name: "Equipo", path: "/", icon: Home },
    { name: "Organigrama", path: "/organigrama", icon: Users },
    { name: "Logros y Metas", path: "/logros-metas", icon: BarChart2 },
    { name: "Galería", path: "/galeria", icon: Image },
    { name: "Misión y Visión", path: "/mision-vision", icon: Target },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r border-border/70"
      >
        <SidebarHeader className="h-16 flex items-center justify-center gap-2.5">
          <img src={logo} alt="Logo" className="h-10 w-10" />
          <h2 className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
            Multimedia
          </h2>
        </SidebarHeader>

        {/* --- ¡ESTE ES EL CÓDIGO BUENO! --- */}
        <SidebarContent> {/* <-- SIN CLASES */}
          <SidebarMenu className="flex-1"> {/* <-- CON flex-1 */}
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
        {/* --- FIN DEL ARREGLO --- */}

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

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
};