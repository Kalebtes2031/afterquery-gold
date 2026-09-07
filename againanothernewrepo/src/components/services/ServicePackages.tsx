import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";
import { ServicePackage } from "@/lib/data/serviceDetails";


interface ServicePackagesProps {
  packages: ServicePackage[];
}

export const ServicePackages = ({ packages }: ServicePackagesProps) => {
  return (
    <section className="py-12 bg-muted/20">
      <div className="px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Choose Your Package
          </h2>
          <p className="text-lg text-muted-foreground">
            Select the service level that best fits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {packages.map((pkg, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden ${
                pkg.popular
                  ? "border-primary shadow-lg ring-1 ring-primary/20"
                  : "border-border/40"
              } hover:shadow-xl transition-all`}
            >
              {pkg.popular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
              )}

              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-foreground">
                      {pkg.name}
                    </h3>
                    {pkg.popular && (
                      <Badge className="bg-primary text-primary-foreground">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {pkg.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{pkg.turnaround}</span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to="/signin">
                  <Button
                    className={`w-full ${pkg.popular ? "" : "variant-outline"}`}
                  >
                    Select Package
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};