// src/components/HamburgerMenu.tsx
import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const HamburgerMenu = ({ isOpen, onClick, className }: HamburgerMenuProps) => {
  return (
    <button
      onClick={onClick}
      // h-10 (40px) - p-2 (8px*2=16px) = 24px de alto interno.
      // 3 barras de h-0.5 (2px) = 6px.
      // (24px - 6px) / 2 = 9px de espacio entre barras.
      // Distancia del centro a las barras: 9px (gap) + 2px (bar) = 11px.
      // La translación perfecta para la X es 11px.
      className={cn(
        "flex flex-col justify-between w-10 h-10 rounded-md hover:bg-accent transition-colors p-2",
        className
      )}
      aria-label="Toggle menu"
    >
      <span
        className={cn(
          "block w-full h-0.5 bg-foreground transition-all duration-500 ease-in-out origin-center",
          // Mover 11px hacia abajo y rotar
          isOpen ? "translate-y-[11px] rotate-45" : ""
        )}
      />
      <span
        className={cn(
          "block w-full h-0.5 bg-foreground transition-all duration-300 ease-in-out",
          // Desaparecer la barra del medio
          isOpen ? "opacity-0" : "opacity-100"
        )}
      />
      <span
        className={cn(
          "block w-full h-0.5 bg-foreground transition-all duration-500 ease-in-out origin-center",
          // Mover 11px hacia arriba y rotar
          isOpen ? "-translate-y-[11px] -rotate-45" : ""
        )}
      />
    </button>
  );
};