import { Star } from "lucide-react";

interface ServiceBenefitsProps {
  benefits: string[];
}

export const ServiceBenefits = ({ benefits }: ServiceBenefitsProps) => {
  return (
    <section className="py-12 bg-muted/20">
      <div className="px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
            Why Choose This Service
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((reason, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg bg-card/50"
              >
                <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 fill-primary" />
                <span className="text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};