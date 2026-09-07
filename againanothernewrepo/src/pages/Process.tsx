import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CTA from "@/components/CTA";
import { Calendar, Truck, Sparkles, Package2, Bell, SmilePlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Process = () => {
  const steps = [
    {
      icon: Calendar,
      title: "Book Online",
      description: "Schedule your pickup through our website or app. Choose a time that works for you.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Truck,
      title: "We Pick Up",
      description: "Our friendly driver arrives at your doorstep to collect your laundry.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Sparkles,
      title: "Expert Cleaning",
      description: "Your clothes are professionally washed, dried, and treated with premium care.",
      color: "from-primary to-accent",
    },
    {
      icon: Package2,
      title: "Fold & Pack",
      description: "Each item is carefully folded and packed to ensure it arrives pristine.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Bell,
      title: "Ready Alert",
      description: "Receive a notification when your laundry is ready for delivery.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: SmilePlus,
      title: "Happy Customer",
      description: "Fresh, clean laundry delivered to your door. Enjoy more free time!",
      color: "from-yellow-500 to-amber-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
          
          <div className="container mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in-up">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                How It Works
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              From booking to delivery, we've made laundry effortless. Here's our simple 6-step process.
            </p>
          </div>
        </section>

        {/* Process Steps */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-primary opacity-20 -translate-x-1/2" />
              
              {/* Steps */}
              <div className="space-y-24">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isEven = index % 2 === 0;
                  
                  return (
                    <div 
                      key={step.title}
                      className={`relative flex flex-col md:flex-row gap-8 items-center animate-fade-in ${
                        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Content */}
                      <div className={`flex-1 ${isEven ? 'md:text-right' : 'md:text-left'} text-center`}>
                        <div className="inline-block bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-8 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 group">
                          <h3 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-3 justify-center md:justify-start">
                            <span className={`${isEven ? 'order-2' : 'order-1'}`}>{step.title}</span>
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Icon Circle */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.color} p-1 animate-pulse`}>
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <Icon className="w-10 h-10 text-primary" />
                          </div>
                        </div>
                        {/* Step Number */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                          {index + 1}
                        </div>
                      </div>

                      {/* Avatar Illustration */}
                      <div className="flex-1 flex justify-center">
                        <Avatar className="w-32 h-32 ring-4 ring-primary/20 shadow-2xl">
                          <AvatarFallback className={`bg-gradient-to-br ${step.color} text-white text-4xl`}>
                            <Icon className="w-16 h-16" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <CTA />
      </main>
      
      <Footer />
    </div>
  );
};

export default Process;
