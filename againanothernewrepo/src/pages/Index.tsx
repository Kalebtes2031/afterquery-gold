import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustedBy from "@/components/TrustedBy";
import WhyChooseUs from "@/components/WhyChooseUs";
import AboutUs from "@/components/AboutUs";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Partners from "@/components/Partners";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
       <div className="hidden lg:block h-20"></div>
      <main>
        <Hero />
        <TrustedBy />
        <WhyChooseUs />
        <Services id="services" />
        <Pricing />
        <AboutUs />
        <Testimonials id="testimonials" />
        <Partners />
        <FAQ />
        <CTA />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
