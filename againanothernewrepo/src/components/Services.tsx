import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shirt, Sparkles, Wind, Sofa, Square, BedDouble, Briefcase, Footprints, UtensilsCrossed, Home, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ServiceProps {
  id?: string;
}

const Services = ({ id }: ServiceProps) => {
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const services = [
    {
      icon: Shirt,
      title: "Laundry Services",
      description: "Professional washing, drying, and folding services. Choose from Lite, Standard, or Premium packages tailored to your needs.",
      popular: true,
      comingSoon: false,
      slug: "laundry-services",
      packages: ["Lite", "Standard", "Premium"],
      price: "From KSh 70/kg",
      turnaround: "24 hours",
    },
    {
      icon: Wind,
      title: "Duvet Cleaning",
      description: "Deep cleaning for duvets and comforters. Remove allergens, stains, and restore freshness to your bedding.",
      popular: false,
      comingSoon: false,
      slug: "duvet-cleaning",
      price: "KSh 400",
      turnaround: "24 hours",
    },
    {
      icon: Square,
      title: "Mat Cleaning",
      description: "Professional mat and rug cleaning. Deep steam cleaning removes dirt, stains, and odors effectively.",
      popular: false,
      comingSoon: false,
      slug: "mat-cleaning",
      price: "KSh 200/piece",
      turnaround: "24 hours",
    },
    {
      icon: Sofa,
      title: "Carpet Cleaning",
      description: "Expert carpet and upholstery cleaning. Professional equipment removes deep-set dirt and refreshes your space.",
      popular: false,
      comingSoon: false,
      slug: "carpet-cleaning",
      price: "KSh 500",
      turnaround: "2-3 days",
    },
    {
      icon: Sparkles,
      title: "Eyelet Curtains",
      description: "Specialized curtain cleaning service. Gentle cleaning preserves fabric quality while removing dust and stains.",
      popular: false,
      comingSoon: false,
      slug: "eyelet-curtains",
      price: "KSh 800/pair",
      turnaround: "24 hours",
    },
    {
      icon: BedDouble,
      title: "Pillows",
      description: "Professional pillow cleaning and sanitization. Hypoallergenic treatment restores comfort and hygiene.",
      popular: false,
      comingSoon: false,
      slug: "pillows",
      price: "KSh 350/piece",
      turnaround: "24 hours",
    },
    {
      icon: Briefcase,
      title: "Suits",
      description: "Premium suit care with expert dry cleaning. Professional pressing and finishing for business attire.",
      popular: false,
      comingSoon: false,
      slug: "suits",
      price: "KSh 1000/piece",
      turnaround: "24 hours",
    },
    {
      icon: Footprints,
      title: "Shoe Cleaning",
      description: "Expert shoe cleaning for sneakers, leather, and more. Restore your footwear's original shine and condition.",
      popular: false,
      comingSoon: true,
      slug: "shoe-cleaning",
      price: "Coming Soon",
      turnaround: "TBA",
    },
    {
      icon: UtensilsCrossed,
      title: "Dish Washing",
      description: "Professional dish washing for homes and events. Sparkling clean results with eco-friendly products.",
      popular: false,
      comingSoon: true,
      slug: "dish-washing",
      price: "Coming Soon",
      turnaround: "TBA",
    },
    {
      icon: Home,
      title: "Home Cleaning",
      description: "Complete home cleaning service for all rooms. Deep cleaning, sanitization, and organization.",
      popular: false,
      comingSoon: true,
      slug: "home-cleaning",
      price: "Coming Soon",
      turnaround: "TBA",
    },
  ];

   const handleGetQuote = () => {
    if (user) {
      navigate("/lms/customer/book-laundry");
    } else {
      navigate("/signin");
    }
  };
  const displayedServices = showAll ? services : services.slice(0, 6);

  return (
    <section id={id || "services"} className="py-20 md:py-32 bg-background relative overflow-hidden">
  {/* Background shapes */}
  <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-transparent to-muted/20" />
  <div className="absolute top-40 left-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
  <div className="absolute bottom-40 right-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />

  {/* Wrapper with Hero padding */}
  <div className="relative z-10 px-4 sm:px-6 lg:px-12 xl:px-22">

    {/* Header */}
    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
      <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
        <Sparkles className="w-4 h-4" />
        <span>Our Services</span>
      </div>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
        Complete Laundry
        <span className="block text-primary">& Cleaning Solutions</span>
      </h2>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Professional services tailored to meet every need, from everyday laundry to specialized cleaning.
      </p>
    </div>

    {/* Services Grid */}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {displayedServices.map((service) => {
        const Icon = service.icon;
        return (
          <Card key={service.title} className="group relative h-full overflow-hidden border-border/40 bg-card hover:border-primary/20 hover:shadow-lg transition-all">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardContent className="relative p-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {service.popular && <Badge className="bg-primary text-primary-foreground text-xs">Most Popular</Badge>}
                  {service.comingSoon && <Badge variant="secondary" className="text-xs">Coming Soon</Badge>}
                </div>
              </div>

              {/* Content */}
              <div className="flex-grow space-y-3 mb-4">
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>

                {service.packages && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {service.packages.map((pkg) => (
                      <span key={pkg} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
                        {pkg}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Starting at</span>
                  <span className="font-semibold text-foreground">{service.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Turnaround</span>
                  <span className="font-semibold text-foreground">{service.turnaround}</span>
                </div>

                <Link to={`/services/${service.slug}`}>
                  <Button variant="outline" className="w-full group/btn" disabled={service.comingSoon}>
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Show More Button */}
    {services.length > 6 && (
          <div className="text-center mb-12">
            {showAll ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAll(false)}
                className="border-2 hover:bg-primary/5 hover:border-primary transition-all px-12  hover:text-gray-800"
              >
                Show Less
                <ArrowLeft className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAll(true)}
                className="border-2 hover:bg-primary/5 hover:border-primary transition-all px-12 hover:text-gray-800"
              >
                View All Services
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        )}

    {/* Bottom CTA */}
    <div className="text-center mt-16 p-8 rounded-2xl">
      <h3 className="text-2xl font-bold text-foreground mb-3">
        Not sure which service you need?
      </h3>
      <p className="text-muted-foreground mb-6">
        Contact our team for personalized recommendations
      </p>
      <Button onClick={handleGetQuote} size="lg" className="group">
        Get Custom Quote
        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>

  </div>
</section>

  );
};

export default Services;