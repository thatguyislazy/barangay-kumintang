import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "../../components/public/Navbar";
import { Hero } from "../../components/public/Hero";
import { AboutSection } from "../../components/public/AboutSection";
import { ServicesSection } from "../../components/public/ServicesSection";
import { ContactSection } from "../../components/public/ContactSection";
import { Footer } from "../../components/public/Footer";

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950">
      <Navbar />
      <main>
        <Hero />
        <AboutSection />
        <ServicesSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
