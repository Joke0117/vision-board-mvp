import { OrganizationChart } from "@/components/OrganizationChart";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Organigrama = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <OrganizationChart />
      </main>
      <Footer />
    </div>
  );
};

export default Organigrama;
