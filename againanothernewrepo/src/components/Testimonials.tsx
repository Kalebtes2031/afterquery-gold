import TestimonialSphere, { type TestimonialData } from "@/components/ui/image-sphere";
import { useState, useEffect, useRef } from "react";
import { Star, Quote, TrendingUp, Users, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Testimonials = ({ id }: { id?: string }) => {
  const [visibleStats, setVisibleStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const testimonials: TestimonialData[] = [
    {
      id: "test-1",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768625755/olawale-munna-_ObjhzjnMmc-unsplash_op8cod.jpg",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768624376/WhatsApp_Image_2025-12-24_at_12.40.06_nepycy.jpg",
      name: "James Ochieng",
      role: "Business Professional",
      rating: 5,
      text: "Absolutely fantastic service! My clothes come back fresh and perfectly folded every time. The pickup and delivery is so convenient."
    },
    {
      id: "test-2",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768625758/christina-wocintechchat-com-m-S3GrMiUhpNU-unsplash_r39yi5.jpg",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768624376/WhatsApp_Image_2025-12-24_at_12.34.39_u64kg7.jpg",
      name: "Sarah Mwangi",
      role: "University Student",
      rating: 5,
      text: "As a busy student, this service is a lifesaver. Affordable prices and quick turnaround. Highly recommended!"
    },
    {
      id: "test-3",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768625752/victoria-heath-16aAmc4f7fA-unsplash_gw0noc.jpg",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624387/WhatsApp_Image_2025-12-24_at_12.52.22_hc2bor.jpg",
      name: "Grace Wanjiru",
      role: "Healthcare Worker",
      rating: 5,
      text: "Professional and reliable. They handle my uniforms with such care. The stain removal is incredible!"
    },
    {
      id: "test-4",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768626978/download_xtbcrr.jpg",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624385/WhatsApp_Image_2025-12-24_at_12.52.59_magcn0.jpg",
      name: "David Kamau",
      role: "Restaurant Owner",
      rating: 5,
      text: "Perfect for my restaurant linens! Always clean, always on time. Their attention to detail is outstanding."
    },
    {
      id: "test-5",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768639051/african-woman-posing-looking-up_23-2148747978_wtu5cy.avif",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624380/WhatsApp_Image_2025-12-24_at_12.48.53_o6whsm.jpg",
      name: "Mary Njeri",
      role: "Fashion Designer",
      rating: 5,
      text: "They understand fabric care like no one else. My delicate designs are in safe hands with this team."
    },
    {
      id: "test-6",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768639417/african-american-man-using-phone_1303-14440_ewaplo.avif",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624388/WhatsApp_Image_2025-12-24_at_12.54.27_gxrmgi.jpg",
      name: "Peter Omondi",
      role: "Corporate Executive",
      rating: 5,
      text: "Impeccable service for my business attire. The express service has saved me multiple times before important meetings."
    },
    {
      id: "test-6",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768625756/rui-silvestre-jCeVRUQslTs-unsplash_jgli73.jpg",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624388/WhatsApp_Image_2025-12-24_at_12.54.27_gxrmgi.jpg",
      name: "Alderine Mwikali",
      role: "Corporate Executive",
      rating: 5,
      text: "Impeccable service for my business attire. The express service has saved me multiple times before important meetings."
    },
    {
      id: "test-6",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768639418/handsome-man-using-modern-smartphone-outdoors_23-2149073851_e7j4fi.avif",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624388/WhatsApp_Image_2025-12-24_at_12.54.27_gxrmgi.jpg",
      name: "George Ngugi",
      role: "Corporate Executive",
      rating: 5,
      text: "Impeccable service for my business attire. The express service has saved me multiple times before important meetings."
    },
    {
      id: "test-5",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768639418/black-women-4957031_640_e3ego2.jpg",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624380/WhatsApp_Image_2025-12-24_at_12.48.53_o6whsm.jpg",
      name: "Linda Qwenye",
      role: "Fashion Designer",
      rating: 5,
      text: "They understand fabric care like no one else. My delicate designs are in safe hands with this team."
    },
    {
      id: "test-5",
      profilePic: "https://res.cloudinary.com/dmf5esgcd/image/upload/v1768639418/portrait-happy-young-woman_23-2149309250_y0janq.avif",
      whatsappScreenshot: "https://res.cloudinary.com/dmf5esgcd/image/upload/c_crop,w_765,h_1500/v1768624380/WhatsApp_Image_2025-12-24_at_12.48.53_o6whsm.jpg",
      name: "June Achieng",
      role: "Fashion Designer",
      rating: 5,
      text: "They understand fabric care like no one else. My delicate designs are in safe hands with this team."
    },
  ];

  const IMAGES: TestimonialData[] = [];
  for (let i = 0; i < 60; i++) {
    const baseIndex = i % testimonials.length;
    const baseTestimonial = testimonials[baseIndex];
    IMAGES.push({
      ...baseTestimonial,
      id: `test-${i + 1}`,
      alt: `${baseTestimonial.name} (${Math.floor(i / testimonials.length) + 1})`
    });
  }

  const [config, setConfig] = useState({
    containerSize: 600,
    sphereRadius: 220,
    dragSensitivity: 0.8,
    momentumDecay: 0.96,
    maxRotationSpeed: 6,
    baseImageScale: 0.15,
    hoverScale: 1.2,
    perspective: 1000,
    autoRotate: true,
    autoRotateSpeed: 0.2
  });

  const stats = [
    { icon: Users, value: "10K+", label: "Happy Customers", color: "primary" },
    { icon: Star, value: "4.9", label: "Average Rating", color: "accent" },
    { icon: TrendingUp, value: "98%", label: "Return Rate", color: "primary" },
    { icon: Award, value: "5+", label: "Years Experience", color: "accent" },
  ];

  const featuredTestimonials = testimonials.slice(0, 3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setConfig(prev => ({
          ...prev,
          containerSize: 340,
          sphereRadius: 113,
          baseImageScale: 0.14
        }));
      } else if (width < 768) {
        setConfig(prev => ({
          ...prev,
          containerSize: 450,
          sphereRadius: 150,
          baseImageScale: 0.14
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          containerSize: 600,
          sphereRadius: 220,
          baseImageScale: 0.15
        }));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll animation for stats
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleStats(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={id}
      className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden"
    >
      {/* Subtle Background */}
      <div className="absolute top-40 left-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-40 right-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      
      {/* MATCHING HERO SECTION SPACING */}
      <div className="relative z-20 px-4 sm:px-6 lg:px-12">
        <div className="lg:px-10 xl:px-22">
          
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Quote className="w-4 h-4" />
              <span>Testimonials</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Loved by Customers
              <span className="block text-primary">Across Kenya</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join thousands of satisfied customers who trust us with their laundry every week.
            </p>
          </div>

          {/* Main Content - Sphere with Side Content */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">
            
            {/* LEFT SIDE - Featured Testimonials */}
            <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
              {featuredTestimonials.map((testimonial, index) => (
                <Card 
                  key={testimonial.id}
                  className={`border-border/50 hover:border-primary/50 transition-all hover:shadow-lg ${
                    visibleStats ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms`, transitionDuration: '700ms' }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={testimonial.profilePic}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {testimonial.name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {testimonial.text}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CENTER - Sphere */}
            <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
              <div className="relative">
                <TestimonialSphere
                  testimonials={IMAGES}
                  {...config}
                />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                  <p className="text-sm text-primary font-medium">
                    Drag to explore • Click to view
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Stats */}
            <div 
              ref={statsRef}
              className="lg:col-span-3 space-y-4 order-3"
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className={`border-border/50 hover:border-primary/50 transition-all hover:shadow-lg ${
                      visibleStats ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms`, transitionDuration: '700ms' }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 text-${stat.color}`} />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-foreground">
                            {stat.value}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Bottom Social Proof Bar */}
          <div className="max-w-4xl mx-auto">
            <div className=" border border-primary/10 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {testimonials.slice(0, 4).map((t, i) => (
                      <img
                        key={i}
                        src={t.profilePic}
                        alt={t.name}
                        className="w-10 h-10 rounded-full border-2 border-background object-cover"
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Join 10,000+ satisfied customers
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">
                        4.9/5 from 2,500+ reviews
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-2xl md:text-3xl font-bold text-primary">98%</p>
                  <p className="text-xs text-muted-foreground">Customer Return Rate</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Testimonials;