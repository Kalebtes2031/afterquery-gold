import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Clock, LucideIcon } from "lucide-react";
import { SERVICE_DETAILS, ServiceSlug } from "@/lib/data/serviceDetails";
import { ServicePackages } from "@/components/services/ServicePackages";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceBenefits } from "@/components/services/ServiceBenefits";
import { ServiceCTA } from "@/components/services/ServiceCTA";


const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Validate slug and get service details
  const service = slug && slug in SERVICE_DETAILS 
    ? SERVICE_DETAILS[slug as ServiceSlug]
    : null;

  // Redirect to services page if invalid slug
  if (!service) {
    return <Navigate to="/#services" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24">
        {/* Back Navigation */}
        <section className="relative py-8 overflow-hidden">
          <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 px-6 sm:px-8 lg:px-16 xl:px-24">
            <Link 
              to="/#services" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Services</span>
            </Link>
          </div>
        </section>

        {/* Hero Section */}
        <ServiceHero 
          title={service.title}
          tagline={service.tagline}
          description={service.description}
        />

        {/* Packages Section */}
        <ServicePackages packages={service.packages} />

        {/* Process Section */}
        <ServiceProcess steps={service.process} />

        {/* Benefits Section */}
        <ServiceBenefits benefits={service.whyChoose} />

        {/* CTA Section */}
        <ServiceCTA />
      </main>
      
      <Footer />
    </div>
  );
};

export default ServiceDetail;