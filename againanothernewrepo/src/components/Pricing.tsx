import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetQuote = () => {
    if (user) {
      navigate("/lms/customer/book-laundry");
    } else {
      navigate("/signin");
    }
  };

  const pricingPlans = [
    {
      title: "Lite",
      description: "Quick wash for everyday items",
      category: "Laundry Services",
      popular: false,
      stages: ["Pending", "Collected", "In Washing", "Ready", "Delivered"],
      features: [
        "Professional washing",
        "Quick turnaround",
        "Free pickup & delivery",
        "Eco-friendly detergents",
      ],
    },
    {
      title: "Standard",
      description: "Complete care with folding",
      category: "Laundry Services",
      popular: true,
      stages: ["Pending", "Collected", "In Washing", "Drying", "Folding", "Packaging", "Ready", "Delivered"],
      features: [
        "Professional washing & drying",
        "Neatly folded clothes",
        "Careful packaging",
        "Free pickup & delivery",
        "24-hour turnaround",
      ],
    },
    {
      title: "Premium",
      description: "Full service with ironing",
      category: "Laundry Services",
      popular: false,
      stages: ["Pending", "Collected", "In Washing", "Drying", "Ironing & Folding", "Packaging", "Delivered"],
      features: [
        "Professional washing & drying",
        "Expert ironing service",
        "Premium packaging",
        "Free pickup & delivery",
        "Priority handling",
      ],
    },
    {
      title: "Duvet Cleaning",
      description: "Deep clean for your bedding",
      category: "Specialty",
      popular: false,
      stages: ["Pending", "Collected", "In Washing", "Drying", "Folding", "Packaging", "Delivered"],
      features: [
        "Deep cleaning process",
        "Allergen removal",
        "Fresh & fluffy results",
        "Free pickup & delivery",
      ],
    },
    {
      title: "Carpet Cleaning",
      description: "Professional carpet care",
      category: "Specialty",
      popular: false,
      stages: ["Pending", "Collected", "In Washing", "Folding", "Packaging", "Delivered"],
      features: [
        "Deep steam cleaning",
        "Stain removal",
        "Odor elimination",
        "Professional equipment",
      ],
    },
    {
      title: "Suits",
      description: "Premium suit care",
      category: "Premium Care",
      popular: false,
      stages: ["Pending", "Collected", "In Washing", "Drying", "Ironing & Folding", "Packaging", "Delivered"],
      features: [
        "Expert handling",
        "Professional pressing",
        "Premium finishing",
        "Protective packaging",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      <div className="absolute top-40 right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">
            Flexible Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Choose Your Service
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Transparent pricing, no hidden fees. Get a personalized quote for your laundry needs.
          </p>
        </div>

        {/* Carousel Pricing Cards */}
        <div className="max-w-7xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {pricingPlans.map((plan, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <Card 
                      className={`relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg ${
                        plan.popular 
                          ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20' 
                          : 'border-border/40 hover:border-border'
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                      )}
                      
                      <CardHeader className="pb-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {plan.category}
                          </Badge>
                          {plan.popular && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-semibold mb-1.5">
                            {plan.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {plan.description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <ul className="space-y-3">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-full bg-primary/10 p-0.5">
                                <Check className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm text-muted-foreground leading-relaxed">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                        
                        {/* Process stages preview */}
                        <div className="pt-4 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Process stages:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.stages.slice(0, 3).map((stage, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
                                {stage}
                              </span>
                            ))}
                            {plan.stages.length > 3 && (
                              <span className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
                                +{plan.stages.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleGetQuote}
                          className={`w-full group ${
                            plan.popular 
                              ? 'bg-primary hover:bg-primary/90 shadow-md' 
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                        >
                          Get Quote
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden lg:flex -left-12 hover:bg-primary/10 hover:text-primary hover:border-primary/20" />
            <CarouselNext className="hidden lg:flex -right-12 hover:bg-primary/10 hover:text-primary hover:border-primary/20" />
          </Carousel>
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-16">
          <p className="text-sm text-muted-foreground">
            All services include free pickup and delivery • Custom requirements available
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;