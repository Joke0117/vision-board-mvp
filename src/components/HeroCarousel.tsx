import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import heroImage1 from "@/assets/hero-multimedia-1.jpg";
import heroImage2 from "@/assets/hero-multimedia-2.jpg";
import heroImage3 from "@/assets/hero-multimedia-3.jpg";

const images = [
  {
    src: heroImage1,
    alt: "Equipo grabando video en la iglesia"
  },
  {
    src: heroImage2,
    alt: "Fotógrafo profesional en evento de iglesia"
  },
  {
    src: heroImage3,
    alt: "Sala de control multimedia con equipos profesionales"
  }
];

export const HeroCarousel = () => {
  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <section className="relative mb-12">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-2xl">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent">
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-right">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
                      MULTIMEDIA
                    </h1>
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-primary mb-2">
                      VISIÓN
                    </h2>
                    <h3 className="text-xl md:text-3xl lg:text-4xl font-medium text-accent">
                      PENTECOSTÉS
                    </h3>
                    <div className="mt-6 p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border/20">
                      <p className="text-sm md:text-base text-muted-foreground">
                        Impartiendo la Palabra de Dios a través de medios digitales
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
      
      {/* Carousel indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === current ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </section>
  );
};