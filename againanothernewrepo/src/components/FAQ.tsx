import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircleQuestion, Sparkles, Clock, Shield, Leaf } from "lucide-react";

const FAQ = () => {
  const faqs = [
    {
      question: "How does the pickup and delivery service work?",
      answer: "Simply book your service online or call us. We'll schedule a convenient pickup time, collect your laundry, and deliver it back to you within 24 hours. All pickup and delivery is completely free!",
    },
    {
      question: "What is your turnaround time?",
      answer: "Our standard turnaround time is 24 hours for most services. For specialized services like carpet washing or suit cleaning, it may take 48-72 hours. We also offer same-day service for urgent requests.",
    },
    {
      question: "How do you ensure my clothes don't get mixed with others?",
      answer: "Every order is handled separately from start to finish. We tag and track your items individually, ensuring your laundry never gets mixed with other customers' clothes. This is our guarantee to you.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept cash on delivery, M-Pesa, and bank transfers. You can pay when your clean laundry is delivered, or prepay through M-Pesa for added convenience.",
    },
    {
      question: "Do you handle delicate fabrics and special garments?",
      answer: "Absolutely! Our team is trained to handle all types of fabrics, from everyday cotton to delicate silks and woolens. We use appropriate cleaning methods for each fabric type.",
    },
    {
      question: "What's the difference between Lite, Standard, and Premium?",
      answer: "Lite is a quick wash service. Standard includes washing, drying, and folding. Premium adds professional ironing and priority handling for the complete laundry experience.",
    },
    {
      question: "What if I'm not satisfied with the service?",
      answer: "Your satisfaction is our top priority. If you're not completely happy with our service, please contact us within 24 hours of delivery. We'll re-clean your items at no additional charge.",
    },
    {
      question: "Are your cleaning products eco-friendly?",
      answer: "Yes! We use biodegradable detergents and eco-friendly cleaning methods, including steam cleaning that minimizes water waste. We're committed to protecting the environment.",
    },
  ];

  const highlights = [
    {
      icon: Clock,
      title: "24/7 Support",
      description: "We're always here to help",
    },
    {
      icon: Shield,
      title: "100% Satisfaction",
      description: "Guaranteed quality service",
    },
    {
      icon: Leaf,
      title: "Eco-Friendly",
      description: "Sustainable practices",
    },
  ];

  return (
    <section id="faq" className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto">
          {/* Left Side - FAQ */}
          <div className="order-2 lg:order-1">
            {/* Header */}
            <div className="mb-8 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Got questions? We've got answers.
              </p>
            </div>

            {/* FAQ Accordion */}
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card/80 backdrop-blur-md border border-border/50 rounded-lg px-5 hover:border-primary/50 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <AccordionTrigger className="text-left hover:no-underline hover:text-primary transition-colors py-4">
                    <span className="font-medium text-sm">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-sm pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right Side - Modern Design Element */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24">
            <div className="relative">
              {/* Main Card */}
              <div className="bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50 rounded-3xl p-8 md:p-10 backdrop-blur-md">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
                  <MessageCircleQuestion className="w-8 h-8 text-primary-foreground" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Still Have Questions?
                </h3>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Our team is ready to assist you with any inquiries. Reach out to us and we'll get back to you within minutes.
                </p>

                {/* Highlights */}
                <div className="space-y-4 mb-8">
                  {highlights.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Contact Info */}
                <div className="space-y-3 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">Call us:</span>
                    <a href="tel:+254107647040" className="text-primary font-medium hover:underline">
                      +254 107647040
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">WhatsApp:</span>
                    <a href="https://wa.me/254107647040" className="text-primary font-medium hover:underline">
                      Chat with us
                    </a>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl animate-float" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-2xl animate-float" style={{ animationDelay: "1s" }} />
              
              {/* Sparkle decorations */}
              <div className="absolute top-4 right-8">
                <Sparkles className="w-6 h-6 text-primary/40 animate-pulse" />
              </div>
              <div className="absolute bottom-8 left-4">
                <Sparkles className="w-4 h-4 text-accent/40 animate-pulse" style={{ animationDelay: "0.5s" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
