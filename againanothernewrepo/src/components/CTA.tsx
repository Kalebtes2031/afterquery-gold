import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary to-accent relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-foreground rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-foreground rounded-full blur-3xl animate-float" style={{ animationDelay: "0.75s" }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Ready for Hassle-Free Laundry?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who have made the switch to professional laundry service. Get started today with our special first-time offer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="bg-background text-primary hover:bg-background/90 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all group"
            >
              Book Your First Service
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/20 hover:scale-105 transition-all backdrop-blur-sm"
            >
              <Phone className="mr-2 w-4 h-4" />
              Call Us: (254) 798-161431
            </Button>
          </div>

          <p className="text-sm text-primary-foreground/80 mt-6">
            Refer a Friend and <span className="font-bold">Get 10% Off”</span> or “Every 4th Wash, One Free Duvet Clean!
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
