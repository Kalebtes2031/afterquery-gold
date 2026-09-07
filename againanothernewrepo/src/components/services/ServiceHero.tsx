import { Sparkles } from "lucide-react";

interface ServiceHeroProps {
  title: string;
  tagline: string;
  description: string;
}

export const ServiceHero = ({ title, tagline, description }: ServiceHeroProps) => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-8 overflow-hidden">
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 px-6 sm:px-8 lg:px-16 xl:px-24">
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Premium Service</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              {tagline}
            </p>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-12">
        <div className="px-6 sm:px-8 lg:px-16 xl:px-24">
          <div className="max-w-4xl">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </section>
    </>
  );
};