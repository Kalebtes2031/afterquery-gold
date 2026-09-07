import { Building2 } from "lucide-react";

const Partners = () => {
  const partnersRow1 = [
    "Hilton Hotels",
    "Radisson Blu",
    "Serena Hotels",
    "Safari Park Hotel",
    "Villa Rosa Kempinski",
    "Fairmont",
    "Crowne Plaza",
    "InterContinental",
  ];

  const partnersRow2 = [
    "Best Western",
    "Four Points Sheraton",
    "Sarova Hotels",
    "Tribe Hotel",
    "Hemingways",
    "Sankara Nairobi",
    "Dusit D2",
    "Movenpick Hotel",
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-12 px-4 animate-fade-in-up">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Trusted by Leading Businesses Across Kenya
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Partners
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We partner with Kenya's top hotels and businesses to deliver exceptional laundry services.
          </p>
        </div>

        {/* Scrolling Partners - Two Rows - Full Width */}
        <div className="space-y-6">
          {/* Row 1 - Left to Right */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div className="flex gap-4 animate-scroll-left">
              {[...partnersRow1, ...partnersRow1, ...partnersRow1].map((partner, index) => (
                <div
                  key={`row1-${partner}-${index}`}
                  className="group flex-shrink-0"
                >
                  <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl px-6 py-3 hover:border-primary/50 transition-all hover:-translate-y-1 flex items-center gap-3 min-w-[200px]">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors whitespace-nowrap">
                      {partner}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 - Right to Left */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div className="flex gap-4 animate-scroll-right">
              {[...partnersRow2, ...partnersRow2, ...partnersRow2].map((partner, index) => (
                <div
                  key={`row2-${partner}-${index}`}
                  className="group flex-shrink-0"
                >
                  <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl px-6 py-3 hover:border-primary/50 transition-all hover:-translate-y-1 flex items-center gap-3 min-w-[200px]">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors whitespace-nowrap">
                      {partner}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
      `}</style>
    </section>
  );
};

export default Partners;