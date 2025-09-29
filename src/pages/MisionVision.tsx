import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye, QrCode, Facebook, Instagram } from "lucide-react";

const MisionVision = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
              Misión y Visión
            </h1>
            <p className="text-muted-foreground">
              Nuestro propósito y dirección como equipo de Multimedia
            </p>
          </div>

          {/* Misión */}
          <Card className="mb-8 border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                Misión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">
                Servir al ministerio de la iglesia Visión Pentecostés a través de la captura,
                producción y difusión de contenido multimedia de excelencia, comunicando el
                mensaje del evangelio con claridad y creatividad, alcanzando tanto a la
                congregación como a las personas en las plataformas digitales.
              </p>
            </CardContent>
          </Card>

          {/* Visión */}
          <Card className="mb-12 border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Eye className="h-8 w-8 text-accent" />
                </div>
                Visión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">
                Ser un equipo de Multimedia reconocido por su profesionalismo, innovación y
                compromiso, que expande el alcance del evangelio a través de todas las
                plataformas digitales disponibles, impactando vidas y edificando el Reino de
                Dios con cada contenido producido.
              </p>
            </CardContent>
          </Card>

          {/* Síguenos en Redes */}
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3 justify-center">
                <QrCode className="h-7 w-7" />
                Síguenos en Nuestras Redes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6">
                {/* QR Codes Placeholders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-md">
                  {/* Facebook QR */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.facebook.com/share/14JpUxo5aRb/"
                        alt="Facebook QR"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <Facebook className="h-5 w-5" />
                      <span className="font-semibold">Facebook</span>
                    </div>
                  </div>

                  {/* Instagram QR */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.facebook.com/share/14JpUxo5aRb/"
                        alt="Instagram QR"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-accent">
                      <Instagram className="h-5 w-5" />
                      <span className="font-semibold">Instagram</span>
                    </div>
                  </div>
                </div>

                {/* Links Directos */}
                <div className="flex gap-4">
                  <a
                    href="https://www.facebook.com/share/14JpUxo5aRb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Facebook className="h-5 w-5" />
                    Facebook
                  </a>
                  <a
                    href="https://www.facebook.com/share/14JpUxo5aRb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                    Instagram
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MisionVision;
