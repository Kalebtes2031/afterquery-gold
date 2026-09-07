import { Truck, Package, Sparkles, CreditCard } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const WhyChooseUs = () => {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  const values = [
    {
      icon: Truck,
      title: "Free Pickup & Delivery",
      description: "We come to you! Schedule convenient pickup and delivery times that fit your busy lifestyle.",
      // Placeholder - replace with actual image URLs
      image: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=800&q=80",
    },
    {
      icon: Package,
      title: "Handled Separately — Guaranteed",
      description: "Your laundry is never mixed with others. We treat each order individually for hygiene and quality.",
      image: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&q=80",
    },
    {
      icon: Sparkles,
      title: "Smells Fresh & Feels New",
      description: "Premium detergents and fabric care techniques ensure your clothes smell amazing and feel brand new.",
      image: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800&q=80",
    },
    {
      icon: CreditCard,
      title: "Pay on Delivery or M-Pesa",
      description: "Flexible payment options. Pay when you receive your fresh laundry or use M-Pesa for instant payments.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    },
  ];

  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = cardsRef.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1 && !visibleCards.includes(index)) {
            setTimeout(() => {
              setVisibleCards((prev) => [...prev, index]);
            }, index * 150); // Stagger animation
          }
        }
      });
    }, observerOptions);

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      id="why-choose-us" 
      ref={sectionRef}
      className="py-20 md:py-32 bg-background relative overflow-hidden"
    >
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-transparent to-muted/20" />
      <div className="absolute top-40 right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Why Choose Us</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
            The Laundry Experience
            <span className="block text-primary">You Deserve</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Premium service designed for your convenience, quality, and peace of mind.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {values.map((value, index) => {
            const Icon = value.icon;
            const isVisible = visibleCards.includes(index);
            
            return (
              <div
                key={value.title}
                ref={(el) => (cardsRef.current[index] = el)}
                className={`group relative transition-all duration-700 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-12'
                }`}
              >
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                
                {/* Card */}
                <div className="relative bg-card border border-border/50 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-500 h-full group-hover:shadow-2xl">
                  
                  {/* Background Image */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <img
                      src={value.image}
                      alt={value.title}
                      className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80" />
                  </div>

                  {/* Content */}
                  <div className="relative p-8 space-y-4">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {value.title}
                    </h3>

                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>

                    {/* Decorative Line */}
                    <div className="pt-4">
                      <div className="h-1 w-0 bg-gradient-to-r from-primary to-accent rounded-full group-hover:w-20 transition-all duration-700" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: "10K+", label: "Happy Customers" },
            { value: "24hrs", label: "Turnaround" },
            { value: "99%", label: "Satisfaction" },
            { value: "5★", label: "Average Rating" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </section>
  );
};

export default WhyChooseUs;