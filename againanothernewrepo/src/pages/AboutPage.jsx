import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Heart, Leaf, TrendingUp, Users, Target, ArrowRight, Star, Clock, Shield, Zap } from "lucide-react";
import corporateOffice from "@/assets/corporate-office.jpg";
import { Link } from "react-router-dom";

const AboutPage = () => {
  const milestones = [
    { year: "2019", title: "Company Founded", description: "Started our journey in Chuka Ndagani with a vision to revolutionize laundry services in Kenya." },
    { year: "2021", title: "Major Expansion", description: "Opened 3 new service centers across Nairobi, reaching thousands of new customers." },
    { year: "2023", title: "10K Orders Milestone", description: "Celebrated serving over 10,000 orders, establishing ourselves as a trusted brand." },
    { year: "2024", title: "Industry Recognition", description: "Awarded 'Best Laundry Service in Kenya' for excellence and customer satisfaction." },
  ];

  const values = [
    {
      icon: Award,
      title: "Excellence",
      description: "We set the highest standards in every aspect of our service, from washing to customer care. Our commitment to quality is unwavering.",
      stats: { value: "99.5%", label: "Satisfaction Rate" },
    },
    {
      icon: Heart,
      title: "Customer Care",
      description: "Your garments and your time are precious. We treat every item with meticulous attention and respect, just as we would our own.",
      stats: { value: "24hrs", label: "Turnaround" },
    },
    {
      icon: Leaf,
      title: "Sustainability",
      description: "We're committed to eco-friendly practices, using biodegradable detergents and water-saving technologies to protect our planet.",
      stats: { value: "40%", label: "Water Saved" },
    },
    {
      icon: Shield,
      title: "Trust & Reliability",
      description: "Thousands of customers trust us with their garments. We've built our reputation through consistent, dependable service.",
      stats: { value: "5+", label: "Years" },
    },
  ];

  const stats = [
    { icon: TrendingUp, value: "5+", label: "Years in Business", description: "Serving Kenya with excellence" },
    { icon: Users, value: "10K+", label: "Happy Customers", description: "Trusted by thousands" },
    { icon: Target, value: "50K+", label: "Orders Completed", description: "And counting" },
    { icon: Star, value: "4.9", label: "Average Rating", description: "Consistently excellent" },
  ];

  const team = [
    {
      role: "Expert Team",
      description: "Our trained professionals bring years of experience in fabric care and laundry science.",
      icon: Users,
    },
    {
      role: "Modern Equipment",
      description: "State-of-the-art washing and drying machines ensure the best results every time.",
      icon: Zap,
    },
    {
      role: "Quality Assurance",
      description: "Every order undergoes rigorous quality checks before delivery to your doorstep.",
      icon: Shield,
    },
    {
      role: "Fast Service",
      description: "24-hour turnaround as standard, with express options available for urgent needs.",
      icon: Clock,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
          <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Heart className="w-4 h-4" />
                <span>About Laundry Room Inc.</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                Kenya's Most Trusted
                <span className="block text-primary">Laundry Service</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Since 2019, we've been delivering premium laundry and cleaning services to homes and businesses across Kenya. Our mission is simple: give you back your time while delivering exceptional results.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="text-center border-border/40 hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardContent className="p-6 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                        <div className="text-sm font-semibold text-foreground mb-1">{stat.label}</div>
                        <div className="text-xs text-muted-foreground">{stat.description}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    Built for Your Convenience
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Laundry Room Inc. was founded in 2019 in Chuka Ndagani with a simple belief: everyone deserves more time for what truly matters. We saw how laundry consumed valuable hours and knew there had to be a better way.
                  </p>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Today, we're proud to serve thousands of customers across Kenya with the same dedication to quality and convenience that inspired us from day one. Our team of skilled professionals treats every garment with care, whether it's everyday wear or your most delicate fabrics.
                  </p>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    We're not just cleaning clothes—we're giving you back your time and peace of mind.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Link to="/signin">
                    <Button size="lg" className="group">
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/#services">
                    <Button size="lg" variant="outline">
                      View Services
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <img 
                    src={corporateOffice} 
                    alt="Laundry Room Inc. facility" 
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </div>
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10" />
                <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-accent/20 rounded-full blur-2xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Journey</h2>
                <p className="text-lg text-muted-foreground">
                  Key milestones in our growth story
                </p>
              </div>

              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <Card key={index} className="border-border/40 hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">{milestone.year}</span>
                          </div>
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-xl font-bold text-foreground mb-2">{milestone.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{milestone.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Core Values</h2>
                <p className="text-lg text-muted-foreground">
                  The principles that guide everything we do
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {values.map((value, index) => {
                  const Icon = value.icon;
                  return (
                    <Card key={index} className="group relative overflow-hidden border-border/40 hover:border-primary/50 hover:shadow-lg transition-all">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity" />
                      <CardContent className="relative p-8 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-7 h-7 text-primary" />
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-foreground">{value.stats.value}</div>
                            <div className="text-xs text-muted-foreground">{value.stats.label}</div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{value.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Team/Capabilities Section */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What Sets Us Apart</h2>
                <p className="text-lg text-muted-foreground">
                  The expertise and technology behind our exceptional service
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {team.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Card key={index} className="border-border/40 hover:border-primary/50 transition-all hover:shadow-lg">
                      <CardContent className="p-6 flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground mb-2">{item.role}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6 p-8 rounded border border-primary/10">
              <h3 className="text-3xl font-bold text-foreground">
                Experience the Difference
              </h3>
              <p className="text-lg text-muted-foreground">
                Join thousands of satisfied customers who trust us with their laundry
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signin">
                  <Button size="lg" className="group">
                    Book Your First Wash
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/#services">
                  <Button size="lg" variant="outline">
                    Explore Services
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;