import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Star, Sparkles, CheckCircle2 } from "lucide-react";
import heroBackground from "@/assets/test.jpg";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const Hero = () => {
  const [hoveredStat, setHoveredStat] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  const rotatingWords = ["Fresh", "Clean", "Premium", "Fast"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const quickFeatures = [
    "24-hour turnaround",
    "Free pickup & delivery",
    "Eco-friendly process"
  ];

  const stats = [
    { icon: Clock, value: "24", unit: "hrs", label: "Turnaround", color: "primary" },
    { icon: Star, value: "10k", unit: "+", label: "Happy Customers", color: "accent", fill: true },
    { icon: Sparkles, value: "4.9", unit: "★", label: "Rating", color: "primary" },
  ];

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* MOBILE/TABLET: Background Image with Overlay (default) */}
      <div className="absolute inset-0 z-0 lg:hidden">
        <img
          src={heroBackground}
          alt="Premium laundry service background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/94 via-background/88 to-background/94" />
      </div>

      {/* Subtle Floating Gradient Orbs */}
      <div className="absolute inset-0 z-[5] overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-accent/8 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-20 py-20 lg:py-0 px-4 sm:px-6 lg:px-12">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center lg:min-h-[calc(100vh-4rem)] lg:px-10 xl:px-22">

          
          {/* LEFT SIDE - Content */}
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left animate-fade-in-up">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary px-5 py-2.5 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg shadow-primary/10">
              <Star className="w-4 h-4 fill-primary" />
              <span className="font-semibold">Kenya's Premium Laundry Service</span>
            </div>
            
            {/* Main Headline with Rotating Word */}
            <div className="space-y-3 lg:space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
                <span className="block mb-2">
                  <span className="inline-block perspective-1000">
                    <span className="inline-block text-primary animate-word-rotate" key={currentWordIndex}>
                      {rotatingWords[currentWordIndex]}
                    </span>
                  </span>
                  {" "}
                  <span className="text-foreground">Laundry,</span>
                </span>
                
                <span className="block">
                  <span className="text-foreground">Delivered to</span>
                  <br />
                  <span className="relative inline-block group cursor-default">
                    <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                      Your Doorstep
                    </span>
                    <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-500"></span>
                  </span>
                </span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Professional laundry and dry cleaning services for homes and businesses across Kenya. Premium quality, delivered with care.
              </p>
            </div>

            {/* Quick Features - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:flex flex-wrap gap-4">
              {quickFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/signin">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 group shadow-lg hover:shadow-xl transition-all px-8 h-12 sm:h-14 text-base font-semibold"
                >
                  Book Your First Wash
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <a href="#services">
  <Button 
    size="lg" 
    variant="outline"
    className="w-full sm:w-auto border-2 h-12 sm:h-14 px-8 text-base font-semibold hover:bg-accent/10 hover:border-primary/50 transition-all backdrop-blur-sm bg-background/60 lg:bg-transparent"
  >
    View Services
  </Button>
</a>
            </div>

            {/* Stats Row - Desktop: Inline / Mobile: Cards */}
            {/* DESKTOP: Inline Stats */}
            <div className="hidden lg:flex flex-wrap gap-8 pt-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex items-center gap-3 group cursor-default">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`w-6 h-6 text-primary ${stat.fill ? 'fill-current' : ''}`} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{stat.value}{stat.unit}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MOBILE/TABLET: Card Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:hidden">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={index}
                    className="group relative"
                    onMouseEnter={() => setHoveredStat(index)}
                    onMouseLeave={() => setHoveredStat(null)}
                  >
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-0 group-hover:opacity-25 transition-opacity duration-300`} />
                    <div className="relative bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl p-4 sm:p-6 hover:border-primary/50 transition-all duration-300 group-hover:-translate-y-1 shadow-lg">
                      <div className="flex flex-col items-center gap-2 mb-1.5">
                        <Icon 
                          className={`w-5 h-5 text-${stat.color} transition-transform duration-300 ${hoveredStat === index ? 'scale-110 rotate-12' : ''} ${stat.fill ? 'fill-current' : ''}`}
                        />
                        <div className="flex items-baseline">
                          <span className={`text-2xl sm:text-3xl font-bold transition-all duration-300 ${hoveredStat === index ? 'scale-110' : ''}`}>
                            <span className={`bg-gradient-to-r from-${stat.color} to-accent bg-clip-text text-transparent`}>
                              {stat.value}
                            </span>
                          </span>
                          <span className={`text-lg sm:text-xl font-bold ml-0.5 bg-gradient-to-r from-${stat.color} to-accent bg-clip-text text-transparent`}>
                            {stat.unit}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground font-semibold text-center">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE - Image (Desktop Only) */}
          <div className="hidden lg:block relative h-[750px] animate-fade-in-right">
            <div className="relative h-full rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={heroBackground}
                alt="Professional laundry service"
                className="w-full h-full object-cover"
              />
              
              {/* Gradient Overlay on Image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20" />
              
              {/* Floating Quality Badge */}
              <div className="absolute top-8 right-8 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-primary fill-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">4.9</div>
                    <div className="text-xs text-muted-foreground">Customer Rating</div>
                  </div>
                </div>
              </div>

              {/* Floating Speed Badge */}
              <div className="absolute bottom-8 left-8 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">24hrs</div>
                    <div className="text-xs text-muted-foreground">Fast Turnaround</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-6 -left-6 w-72 h-72 bg-accent/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }

        @keyframes word-rotate {
          0% {
            opacity: 0;
            transform: translateY(-20px) rotateX(-90deg);
          }
          20% {
            opacity: 1;
            transform: translateY(0) rotateX(0deg);
          }
          80% {
            opacity: 1;
            transform: translateY(0) rotateX(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(20px) rotateX(90deg);
          }
        }

        .animate-word-rotate {
          animation: word-rotate 2.5s ease-in-out;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animate-fade-in-right {
          animation: fade-in-right 0.8s ease-out 0.2s backwards;
        }
      `}</style>
    </section>
  );
};

export default Hero;