import { Card, CardContent } from "@/components/ui/card";
import { ProcessStep } from "@/lib/data/serviceDetails";


interface ServiceProcessProps {
  steps: ProcessStep[];
}

export const ServiceProcess = ({ steps }: ServiceProcessProps) => {
  return (
    <section className="py-12">
      <div className="px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Simple, seamless process from booking to delivery
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="group relative overflow-hidden border-border/40 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity" />
                <CardContent className="relative p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-sm font-semibold text-primary">
                      Step {index + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};