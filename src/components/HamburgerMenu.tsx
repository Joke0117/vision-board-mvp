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
      className={cn(
        // Cambiado a justify-around y añadido padding para mejor espaciado
        "flex flex-col justify-around w-10 h-10 rounded-md hover:bg-accent transition-colors p-2",
        className
      )}
      aria-label="Toggle menu"
    >
      <span
        className={cn(
          "block w-full h-0.5 bg-foreground transition-all duration-300 ease-in-out",
          // Lógica de animación simplificada
          isOpen ? "rotate-45 translate-y-[5px]" : ""
        )}
      />
      <span
        className={cn(
          "block w-full h-0.5 bg-foreground transition-all duration-300 ease-in-out",
          isOpen ? "opacity-0" : "opacity-100"
        )}
      />
      <span
        className={cn(
          "block w-full h-0.5 bg-foreground transition-all duration-300 ease-in-out",
          // Lógica de animación simplificada
          isOpen ? "-rotate-45 -translate-y-[5px]" : ""
        )}
      />
    </button>
  );
};