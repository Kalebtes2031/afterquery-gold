import { Building2 } from "lucide-react";

const TrustedBy = () => {
  const partners = [
    "Hotel Grande",
    "City Apartments",
    "Fitness Plus",
    "Elite Spa",
    "Campus Housing",
    "Office Tower",
    "Royal Suites",
    "Metro Gym",
    "Hilltop Resort",
    "Urban Living",
    "Wellness Center",
    "Business Park",
  ];

  return (
    <section className="py-16 bg-muted/30 overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background pointer-events-none z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Trusted by Leading Businesses Across Kenya
          </p>
        </div>
      </div>
      
      {/* Scrolling Container */}
      <div className="relative">
        <div className="flex gap-8 animate-scroll-left">
          {/* First Set */}
          {partners.map((partner, index) => (
            <div
              key={`first-${partner}-${index}`}
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors group flex-shrink-0 px-4"
            >
              <Building2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-sm whitespace-nowrap">{partner}</span>
            </div>
          ))}
          {/* Duplicate Set for Seamless Loop */}
          {partners.map((partner, index) => (
            <div
              key={`second-${partner}-${index}`}
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors group flex-shrink-0 px-4"
            >
              <Building2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-sm whitespace-nowrap">{partner}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
