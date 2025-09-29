import { Facebook, Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t mt-12">
      <div className="container mx-auto px-4 py-8">
        {/* Redes Sociales de la Iglesia */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-3">Síguenos en Nuestras Redes</h3>
          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/share/14JpUxo5aRb/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Facebook className="h-6 w-6 text-primary" />
            </a>
            <a
              href="https://www.facebook.com/share/14JpUxo5aRb/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              <Instagram className="h-6 w-6 text-accent" />
            </a>
          </div>
        </div>

        <div className="border-t pt-6">
          {/* Datos del Desarrollador */}
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-2">Desarrollador</p>
            <div className="flex justify-center gap-4 mb-3">
              <a
                href="https://www.facebook.com/share/16mhAsH93h/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/share/16mhAsH93h/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 Develop Ingeniero José Martínez. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
