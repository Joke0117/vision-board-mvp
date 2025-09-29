import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Image as ImageIcon } from "lucide-react";

const Galeria = () => {
  // Placeholders para que el usuario agregue contenido
  const videos = [
    {
      title: "Video Destacado 1",
      views: "1.2K vistas",
      thumbnail: "https://placehold.co/400x225/6366f1/ffffff?text=Video+1",
    },
    {
      title: "Video Destacado 2",
      views: "980 vistas",
      thumbnail: "https://placehold.co/400x225/8b5cf6/ffffff?text=Video+2",
    },
    {
      title: "Video Destacado 3",
      views: "850 vistas",
      thumbnail: "https://placehold.co/400x225/d946ef/ffffff?text=Video+3",
    },
  ];

  const imagenes = [
    "https://placehold.co/400x300/6366f1/ffffff?text=Imagen+1",
    "https://placehold.co/400x300/8b5cf6/ffffff?text=Imagen+2",
    "https://placehold.co/400x300/d946ef/ffffff?text=Imagen+3",
    "https://placehold.co/400x300/ec4899/ffffff?text=Imagen+4",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
              Galería Multimedia
            </h1>
            <p className="text-muted-foreground">
              Contenido más relevante e interactivo del ministerio
            </p>
          </div>

          {/* Videos Section */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Play className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold">Videos Más Vistos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {videos.map((video, idx) => (
                <Card
                  key={idx}
                  className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                >
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{video.title}</h3>
                    <p className="text-sm text-muted-foreground">{video.views}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Images Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ImageIcon className="h-8 w-8 text-accent" />
              <h2 className="text-3xl font-bold">Imágenes Destacadas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {imagenes.map((img, idx) => (
                <Card
                  key={idx}
                  className="overflow-hidden hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
                >
                  <img
                    src={img}
                    alt={`Imagen ${idx + 1}`}
                    className="w-full h-64 object-cover"
                  />
                </Card>
              ))}
            </div>
          </section>

          {/* Nota */}
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Nota:</strong> Reemplaza estas imágenes y videos con tu contenido real
              editando el archivo src/pages/Galeria.tsx
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Galeria;
