import { 
  Package, Truck, Sparkles, Shield, Check, Clock, LucideIcon 
} from "lucide-react";

// Type definitions
export interface ServicePackage {
  name: string;
  price: string;
  turnaround: string;
  features: string[];
  popular?: boolean;
}

export interface ProcessStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface ServiceDetail {
  title: string;
  tagline: string;
  description: string;
  packages: ServicePackage[];
  process: ProcessStep[];
  whyChoose: string[];
}

export type ServiceSlug = 
  | "laundry-services"
  | "duvet-cleaning"
  | "mat-cleaning"
  | "carpet-cleaning"
  | "eyelet-curtains"
  | "pillows"
  | "suits";

// Service details data
export const SERVICE_DETAILS: Record<ServiceSlug, ServiceDetail> = {
  "laundry-services": {
    title: "Laundry Services",
    tagline: "Professional Care for Your Everyday Clothing",
    description: "Our comprehensive laundry service offers three flexible packages to suit your needs. From quick wash to premium care with ironing, we handle everything from everyday wear to delicate fabrics with expert attention.",
    packages: [
      {
        name: "Lite",
        price: "KSh 70/kg",
        turnaround: "24 hours",
        features: [
          "Professional washing and dry spinning",
          "Quick turnaround",
          "Free pickup & delivery",
          "Eco-friendly detergents",
          "Basic folding"
        ],
        popular: false,
      },
      {
        name: "Standard",
        price: "KSh 100/kg",
        turnaround: "24 hours",
        features: [
          "Professional washing & drying",
          "Neatly folded clothes",
          "Convenient packaging",
          "Free pickup & delivery",
          "Stain treatment included",
          "Quality inspection"
        ],
        popular: true,
      },
      {
        name: "Premium",
        price: "KSh 150/kg",
        turnaround: "48 hours",
        features: [
          "Professional washing & drying",
          "Expert ironing service",
          "Premium packaging",
          "Free pickup & delivery",
          "Priority handling",
          "Delicate fabric care",
          "Hanger service available"
        ],
        popular: false,
      },
    ],
    process: [
      { title: "Book Online", description: "Schedule pickup via our website or app", icon: Package },
      { title: "We Collect", description: "Free pickup from your location", icon: Truck },
      { title: "Wash & Care", description: "Professional cleaning with premium products", icon: Sparkles },
      { title: "Quality Check", description: "Thorough inspection before packaging", icon: Shield },
      { title: "Delivery", description: "Fresh laundry delivered to your door", icon: Truck },
    ],
    whyChoose: [
      "State-of-the-art washing equipment",
      "Premium eco-friendly detergents",
      "Trained laundry professionals",
      "24-hour turnaround guarantee"
    ],
  },
  "duvet-cleaning": {
    title: "Duvet Cleaning",
    tagline: "Deep Clean for Fresh, Fluffy Bedding",
    description: "Specialized cleaning service for duvets, comforters, and heavy bedding. Our process removes allergens, dust mites, and stains while preserving the loft and comfort of your bedding.",
    packages: [
      {
        name: "4 by 6",
        price: "KSh 500",
        turnaround: "48 hours",
        features: [
          "Deep cleaning process",
          "Allergen removal",
          "Fresh & fluffy results",
          "Free pickup & delivery",
          "Stain treatment",
          "Fabric protection",
          "Premium packaging"
        ],
        popular: false,
      },
      {
        name: "5 by 6",
        price: "KSh 600",
        turnaround: "48 hours",
        features: [
          "Deep cleaning process",
          "Allergen removal",
          "Fresh & fluffy results",
          "Free pickup & delivery",
          "Stain treatment",
          "Fabric protection",
          "Premium packaging"
        ],
        popular: true,
      },
      {
        name: "6 by 6",
        price: "KSh 700",
        turnaround: "48 hours",
        features: [
          "Deep cleaning process",
          "Allergen removal",
          "Fresh & fluffy results",
          "Free pickup & delivery",
          "Stain treatment",
          "Fabric protection",
          "Premium packaging"
        ],
        popular: false,
      }
    ],
    process: [
      { title: "Inspection", description: "Check for stains and fabric type", icon: Shield },
      { title: "Pre-treatment", description: "Apply specialized cleaning solutions", icon: Sparkles },
      { title: "Deep Wash", description: "Thorough cleaning in large machines", icon: Sparkles },
      { title: "Drying", description: "Gentle drying to restore loft", icon: Clock },
      { title: "Quality Check", description: "Final inspection and packaging", icon: Check },
    ],
    whyChoose: [
      "Specialized equipment for large items",
      "Hypoallergenic cleaning products",
      "Preserves duvet loft and warmth",
      "Removes dust mites and allergens"
    ],
  },
  "mat-cleaning": {
    title: "Mat Cleaning",
    tagline: "Professional Deep Cleaning for Mats & Rugs",
    description: "Expert mat and rug cleaning using professional equipment and eco-friendly solutions. We remove deep-set dirt, stains, and odors, leaving your mats fresh and revitalized.",
    packages: [
      {
        name: "Small Mat",
        price: "KSh 200/piece",
        turnaround: "24 hours",
        features: [
          "Deep steam cleaning",
          "Stain removal",
          "Odor elimination",
          "Fast drying",
          "Free pickup & delivery",
          "Eco-friendly products"
        ],
        popular: true,
      },
      {
        name: "Medium Mat",
        price: "KSh 250/piece",
        turnaround: "24 hours",
        features: [
          "Deep steam cleaning",
          "Advanced stain removal",
          "Odor elimination",
          "Fast drying",
          "Free pickup & delivery",
          "Eco-friendly products",
          "Fabric protection"
        ],
        popular: false,
      },
      {
        name: "Large Mat",
        price: "KSh 1000/piece",
        turnaround: "24-48 hours",
        features: [
          "Intensive steam cleaning",
          "Advanced stain removal",
          "Odor elimination",
          "Professional equipment",
          "Free pickup & delivery",
          "Fabric protection",
          "Color restoration"
        ],
        popular: false,
      },
    ],
    process: [
      { title: "Assessment", description: "Evaluate mat condition and material", icon: Shield },
      { title: "Pre-vacuum", description: "Remove loose dirt and debris", icon: Sparkles },
      { title: "Pre-treatment", description: "Apply specialized cleaning solutions", icon: Sparkles },
      { title: "Steam Clean", description: "Deep clean with professional equipment", icon: Clock },
      { title: "Drying", description: "Quick-dry process", icon: Clock },
      { title: "Final Check", description: "Quality inspection and finishing", icon: Check },
    ],
    whyChoose: [
      "Professional cleaning equipment",
      "Safe for all mat materials",
      "Quick turnaround time",
      "Extends mat lifespan"
    ],
  },
  "carpet-cleaning": {
    title: "Carpet Cleaning",
    tagline: "Professional Deep Cleaning for Carpets & Rugs",
    description: "Expert carpet cleaning using industrial-grade equipment and eco-friendly solutions. We remove deep-set dirt, stains, and odors, leaving your carpets fresh and revitalized.",
    packages: [
      {
        name: "Fluffy Carpet (Small)",
        price: "KSh 500",
        turnaround: "2-3 days",
        features: [
          "Intensive steam cleaning",
          "Advanced stain removal",
          "Odor elimination",
          "Professional equipment",
          "Fabric protection treatment",
          "Spot cleaning service"
        ],
        popular: true,
      },
      {
        name: "Hard Carpet (Small)",
        price: "KSh 700",
        turnaround: "2-3 days",
        features: [
          "Deep steam cleaning",
          "Stain removal",
          "Odor elimination",
          "Professional equipment",
          "Fast drying"
        ],
        popular: false,
      },
      {
        name: "Hard Carpet (Large)",
        price: "KSh 1000",
        turnaround: "2-3 days",
        features: [
          "Intensive steam cleaning",
          "Advanced stain removal",
          "Odor elimination",
          "Professional equipment",
          "Fabric protection treatment",
          "Spot cleaning service"
        ],
        popular: false,
      },
    ],
    process: [
      { title: "Assessment", description: "Evaluate carpet condition and stains", icon: Shield },
      { title: "Pre-vacuum", description: "Remove loose dirt and debris", icon: Sparkles },
      { title: "Pre-treatment", description: "Apply stain removal solutions", icon: Sparkles },
      { title: "Steam Clean", description: "Deep clean with hot water extraction", icon: Clock },
      { title: "Drying", description: "Quick-dry process", icon: Clock },
      { title: "Final Inspection", description: "Quality check and touch-ups", icon: Check },
    ],
    whyChoose: [
      "Industrial-grade equipment",
      "Eco-friendly cleaning solutions",
      "Extends carpet lifespan",
      "Removes allergens and bacteria"
    ],
  },
  "eyelet-curtains": {
    title: "Eyelet Curtains Cleaning",
    tagline: "Specialized Care for Your Window Treatments",
    description: "Professional curtain cleaning service that preserves fabric quality while removing dust, stains, and allergens. Our gentle cleaning process ensures your curtains look fresh and beautiful.",
    packages: [
      {
        name: "Single Pair",
        price: "KSh 800/pair",
        turnaround: "3 days",
        features: [
          "Gentle fabric cleaning",
          "Dust & allergen removal",
          "Stain treatment",
          "Free pickup & delivery",
          "Professional pressing",
          "Quality inspection"
        ],
        popular: true,
      },
      {
        name: "Two Pairs",
        price: "KSh 1500",
        turnaround: "3 days",
        features: [
          "Gentle fabric cleaning",
          "Dust & allergen removal",
          "Advanced stain treatment",
          "Free pickup & delivery",
          "Professional pressing",
          "Quality inspection",
          "10% discount"
        ],
        popular: false,
      },
      {
        name: "Three+ Pairs",
        price: "KSh 600/pair",
        turnaround: "3-4 days",
        features: [
          "Gentle fabric cleaning",
          "Dust & allergen removal",
          "Advanced stain treatment",
          "Free pickup & delivery",
          "Professional pressing",
          "Priority service",
          "20% discount"
        ],
        popular: false,
      },
    ],
    process: [
      { title: "Inspection", description: "Check fabric type and condition", icon: Shield },
      { title: "Dust Removal", description: "Thorough dust and allergen removal", icon: Sparkles },
      { title: "Gentle Wash", description: "Specialized cleaning for delicate fabrics", icon: Sparkles },
      { title: "Stain Treatment", description: "Spot treatment for stubborn marks", icon: Clock },
      { title: "Pressing", description: "Professional finishing and pressing", icon: Clock },
      { title: "Quality Check", description: "Final inspection and packaging", icon: Check },
    ],
    whyChoose: [
      "Safe for all curtain fabrics",
      "Preserves color and texture",
      "Removes dust mites and allergens",
      "Professional finishing"
    ],
  },
  "pillows": {
    title: "Pillow Cleaning",
    tagline: "Hygienic Deep Clean for Better Sleep",
    description: "Professional pillow cleaning and sanitization service. Our hypoallergenic treatment removes dust mites, allergens, and odors while restoring comfort and freshness to your pillows.",
    packages: [
      {
        name: "Single Pillow",
        price: "KSh 350/piece",
        turnaround: "24 hours",
        features: [
          "Deep cleaning process",
          "Allergen removal",
          "Dust mite elimination",
          "Hypoallergenic treatment",
          "Free pickup & delivery",
          "Fresh & fluffy results"
        ],
        popular: false,
      },
      {
        name: "Pair of Pillows",
        price: "KSh 650",
        turnaround: "24 hours",
        features: [
          "Deep cleaning process",
          "Allergen removal",
          "Dust mite elimination",
          "Hypoallergenic treatment",
          "Free pickup & delivery",
          "Fresh & fluffy results",
          "10% savings"
        ],
        popular: true,
      },
      {
        name: "Four+ Pillows",
        price: "KSh 300/piece",
        turnaround: "24-48 hours",
        features: [
          "Deep cleaning process",
          "Advanced allergen removal",
          "Dust mite elimination",
          "Hypoallergenic treatment",
          "Free pickup & delivery",
          "Premium sanitization",
          "20% savings"
        ],
        popular: false,
      },
    ],
    process: [
      { title: "Inspection", description: "Check pillow type and condition", icon: Shield },
      { title: "Pre-treatment", description: "Apply specialized cleaning solutions", icon: Sparkles },
      { title: "Deep Clean", description: "Thorough washing process", icon: Sparkles },
      { title: "Sanitization", description: "Hypoallergenic treatment", icon: Clock },
      { title: "Drying", description: "Gentle drying to restore fluffiness", icon: Clock },
      { title: "Quality Check", description: "Final inspection and packaging", icon: Check },
    ],
    whyChoose: [
      "Hypoallergenic cleaning products",
      "Safe for all pillow types",
      "Improves sleep quality",
      "Extends pillow lifespan"
    ],
  },
  "suits": {
    title: "Suit Cleaning",
    tagline: "Premium Care for Your Professional Attire",
    description: "Expert dry cleaning and pressing service for suits, blazers, and formal wear. We use specialized techniques to preserve fabric quality while delivering a crisp, professional finish.",
    packages: [
      {
        name: "Two-Piece Suit",
        price: "KSh 600",
        turnaround: "24 hours",
        features: [
          "Expert dry cleaning",
          "Professional pressing",
          "Premium finishing",
          "Protective packaging",
          "Free pickup & delivery"
        ],
        popular: true,
      },
      {
        name: "Three-Piece Suit",
        price: "KSh 1000",
        turnaround: "24 hours",
        features: [
          "Expert dry cleaning",
          "Professional pressing",
          "Premium finishing",
          "Protective packaging",
          "Free pickup & delivery",
          "Vest included"
        ],
        popular: false,
      },
    ],
    process: [
      { title: "Inspection", description: "Check for stains and fabric type", icon: Shield },
      { title: "Dry Cleaning", description: "Gentle cleaning with specialized solvents", icon: Sparkles },
      { title: "Stain Treatment", description: "Spot cleaning for stubborn marks", icon: Sparkles },
      { title: "Pressing", description: "Professional steam pressing", icon: Clock },
      { title: "Finishing", description: "Final touches and quality check", icon: Check },
      { title: "Packaging", description: "Protected in garment bags", icon: Package },
    ],
    whyChoose: [
      "Specialized dry cleaning process",
      "Expert fabric knowledge",
      "Professional pressing equipment",
      "Preserves suit longevity"
    ],
  },
};