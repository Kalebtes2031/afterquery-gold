import { Award, Heart, Leaf, ArrowRight, TrendingUp, Users, Target } from "lucide-react";
import corporateOffice from "@/assets/corporate-office.jpg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AboutUs = () => {
  const milestones = [
    { year: "2019", label: "Founded", description: "Started in Chuka Ndagani" },
    { year: "2021", label: "Expansion", description: "Opened 3 new locations" },
    { year: "2023", label: "10K Orders", description: "Milestone achieved" },
    { year: "2024", label: "Award", description: "Best Laundry Service" },
  ];

  const values = [
    {
      icon: Award,
      title: "Excellence",
      description: "Premium quality in every wash, guaranteed satisfaction on every order.",
      stat: "99.5%",
      statLabel: "Customer Satisfaction"
    },
    {
      icon: Heart,
      title: "Care",
      description: "Your garments are treated with the utmost attention and respect.",
      stat: "24hrs",
      statLabel: "Turnaround Time"
    },
    {
      icon: Leaf,
      title: "Sustainability",
      description: "Eco-friendly processes that protect our environment for future generations.",
      stat: "40%",
      statLabel: "Water Saved"
    },
  ];

  const stats = [
    { icon: TrendingUp, value: "5+", label: "Years in Business" },
    { icon: Users, value: "10K+", label: "Happy Customers" },
    { icon: Target, value: "50K+", label: "Orders Completed" },
  ];

  return (
    <section id="about" className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Subtle Background */}
      <div className="absolute top-40 left-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-40 right-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      
      {/* MATCHING HERO SECTION SPACING */}
      <div className="relative z-20 px-4 sm:px-6 lg:px-12">
        <div className="lg:px-10 xl:px-22">
          
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
              
              <span>About Us</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Laundry Excellence,
              <span className="block text-primary">Delivered Since 2019</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Kenya's most trusted laundry service, serving thousands of satisfied customers with premium care and unmatched convenience.
            </p>
          </div>

          {/* Main Split Content */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-foreground">
                  Built for Your Convenience
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Founded in Chuka Ndagani, Laundry Room Inc. was born from a simple belief: everyone deserves more time for what truly matters. We've revolutionized laundry care across Kenya, combining traditional quality with modern convenience.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Our team of skilled professionals treats every garment—from everyday wear to delicate fabrics—with meticulous care. We're not just cleaning clothes; we're giving you back your time and peace of mind.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="text-center p-4 rounded-2xl bg-muted/50 hover:bg-muted/70 transition-colors">
                      <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              <Link to="/about-us">
  <Button className="group mt-4" size="lg">
    Learn More About Us
    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
  </Button>
</Link>
            </div>

            {/* Right: Image with Timeline */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={corporateOffice} 
                  alt="Laundry Room Inc. facility" 
                  className="w-full h-[500px] lg:h-[750px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>

              {/* Timeline Overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-4">Our Journey</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {milestones.map((milestone, index) => (
                      <div key={index} className="text-center">
                        <div className="text-xl font-bold text-primary mb-1">{milestone.year}</div>
                        <div className="text-xs font-semibold text-foreground mb-1">{milestone.label}</div>
                        <div className="text-xs text-muted-foreground leading-tight">{milestone.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10" />
              <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-accent/20 rounded-full blur-2xl -z-10" />
            </div>
          </div>

          {/* Values Section - Horizontal Cards */}
          <div className="space-y-8 mt-20">
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Our Core Values
              </h3>
              <p className="text-muted-foreground">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <div 
                    key={index} 
                    className="group relative bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/50 transition-all hover:shadow-lg"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-foreground">{value.stat}</div>
                          <div className="text-xs text-muted-foreground">{value.statLabel}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-semibold text-foreground mb-2">{value.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {value.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutUs;