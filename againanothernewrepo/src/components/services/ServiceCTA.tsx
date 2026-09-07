import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const ServiceCTA = () => {
  return (
    <section className="py-16">
      <div className="px-6 sm:px-8 lg:px-16 xl:px-24">
        <div className="max-w-3xl mx-auto text-center space-y-6 p-8 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
          <h3 className="text-3xl font-bold text-foreground">
            Ready to Experience Premium Care?
          </h3>
          <p className="text-lg text-muted-foreground">
            Book now and enjoy free pickup and delivery across Nairobi
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signin">
              <Button size="lg" className="group">
                Book This Service
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};