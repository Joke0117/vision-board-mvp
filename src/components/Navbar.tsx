// src/components/Navbar.tsx
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, CalendarCheck } from "lucide-react"; // <-- Icono cambiado
import { useState } from "react";
import logo from "@/assets/multimedia-logo.png";
import { useAuth } from "@/hooks/useAuth"; 
import { auth } from "@/firebaseConfig"; 
import { signOut } from "firebase/auth"; 
import { Button } from "./ui/button";

export const Navbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth(); 

  const baseLinks = [
    { name: "Equipo", path: "/" },
    { name: "Organigrama", path: "/organigrama" },
    { name: "Logros y Metas", path: "/logros-metas" },
    { name: "Galería", path: "/galeria" },
    { name: "Misión y Visión", path: "/mision-vision" },
  ];

  // Links condicionales actualizados
  const userLinks = [
    { name: "Mis Tareas", path: "/mi-contenido", icon: CalendarCheck }, // <-- CAMBIADO
  ];

  const adminLinks = [
    { name: "Panel Admin", path: "/admin-dashboard", icon: LayoutDashboard },
  ];

  const links = [
    ...baseLinks, 
    ...userLinks, 
    ...(user?.role === 'admin' ? adminLinks : [])
  ];

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Multimedia Logo" className="h-12 w-12" />
            <span className="font-bold text-lg hidden md:inline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Multimedia Visión Pentecostés
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  location.pathname === link.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};