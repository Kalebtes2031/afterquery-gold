// src/components/Navbar.tsx
import { useEffect, useState } from "react";
import { Menu, X, LogOut, ExternalLink, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

interface NavbarProps {
  onMobileSidebarOpen?: () => void;
}

const Navbar = ({ onMobileSidebarOpen }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, branchName, logout } = useAuth();

  const isLmsPage = location.pathname.startsWith("/lms");
  const isHomePage = location.pathname === "/";
  const isPublicPage = !isLmsPage;

  const isEmployee = role === "employee";

  // Fetch user data from users table
  useEffect(() => {
    if (!user?.uid || !isLmsPage) return;

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            name: data.name || data.displayName || "",
            email: data.email || "",
            phone: data.phone || data.phoneNumber || "",
          });
        } else {
          // Fallback to auth user data
          setUserData({
            name: user.displayName || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to auth user data
        setUserData({
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
        });
      }
    };

    fetchUserData();
  }, [user?.uid, isLmsPage]);

  // Track scroll for floating effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when user drawer is open
  useEffect(() => {
    document.body.style.overflow = isUserDrawerOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isUserDrawerOpen]);

  const menuItems = [
    { label: "Services", href: isHomePage ? "#services" : "/#services" },
    { label: "About", href: isHomePage ? "#about" : "/#about" },
    { label: "Testimonials", href: isHomePage ? "#testimonials" : "/#testimonials" },
    { label: "FAQ", href: isHomePage ? "#faq" : "/#faq" },
    { label: "Contact", href: isHomePage ? "#contact" : "/#contact" },
  ];

  const getDashboardRoute = () => {
    if (!role) return "/signin";
    return `/lms/${role}/dashboard`;
  };

  const handleSignOut = async () => {
    await logout();
    setIsOpen(false);
    setIsUserDrawerOpen(false);
    navigate("/");
  };

  // Get display name for LMS navbar
  const getDisplayName = () => {
    if (userData?.name) return userData.name;
    if (isEmployee && branchName) return branchName;
    if (userData?.email) return userData.email.split("@")[0];
    return "User";
  };

  // Get display email for LMS navbar
  const getDisplayEmail = () => {
    if (userData?.email) return userData.email;
    return user?.email || "";
  };

  // ============ PUBLIC PAGES - UNCHANGED ============
  if (isPublicPage) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'py-3' 
          : 'py-6'
      }`}>
        <div className="container w-full px-4 sm:px-6 lg:px-8">
          <div className={`relative transition-all duration-300 ${
            isScrolled
              ? 'bg-background/95 backdrop-blur-lg border border-border/50 shadow-lg shadow-black/5'
              : 'bg-background/80 backdrop-blur-md border border-border/30'
          } rounded-full`}>
            <div className="flex items-center justify-between h-16 px-6">
              
              {/* LOGO - Left Side */}
              <Link to="/" className="flex items-center gap-3 group relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <span className="text-primary-foreground font-bold text-lg">LR</span>
                  </div>
                </div>
                <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  LAUNDRY ROOM
                </span>
              </Link>

              {/* CENTER MENU - Desktop Only */}
              <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                {menuItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              {/* RIGHT SIDE - CTA */}
              <div className="hidden lg:flex items-center gap-3">
                {user ? (
                  <div className="flex items-center gap-2">
                    <Link to={getDashboardRoute()}>
                      <Button 
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                      >
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSignOut}
                      className="rounded-full"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Link to="/signin">
                    <Button 
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                    >
                      Book Now
                    </Button>
                  </Link>
                )}
              </div>

              {/* MOBILE MENU BUTTON */}
              <button
                className="lg:hidden text-foreground p-2 hover:bg-muted rounded-full transition-colors"
                onClick={() => setIsOpen(!isOpen)}
              >
                 <Menu size={24} />
              </button>
            </div>

            {/* MOBILE MENU DROPDOWN */}
            {isOpen && (
              <div className="lg:hidden absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-lg border border-border/50 rounded-3xl shadow-xl overflow-hidden animate-fade-in">
                <div className="flex flex-col p-4 space-y-2">
                  {menuItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="px-4 py-3 text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}

                  <div className="pt-2 border-t border-border/50">
                    {user ? (
                      <div className="space-y-2">
                        <Link to={getDashboardRoute()} onClick={() => setIsOpen(false)}>
                          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl">
                            Dashboard
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          className="w-full rounded-2xl" 
                          onClick={handleSignOut}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <Link to="/signin" onClick={() => setIsOpen(false)}>
                        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl">
                          Book Now
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    );
  }

  // ============ LMS PAGES - UPDATED WITH PROFILE DRAWER ============
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Left Side: Hamburger (Mobile) + Logo */}
            <div className="flex items-center gap-3">
              {/* Hamburger - PERMANENT background, visible always */}
              <button
                onClick={onMobileSidebarOpen}
                className="lg:hidden p-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                <Menu className="h-6 w-6 text-white" />
              </button>

              {/* LOGO */}
              <Link to="/" className="flex items-center gap-2 group">
                <span className="hidden sm:block text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  LAUNDRY ROOM
                </span>
              </Link>
            </div>

            {/* Right Side: Profile */}
            <div className="flex items-center gap-3">
              {/* Profile Button - Shows full name */}
              <button
                onClick={() => setIsUserDrawerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <span className="text-sm font-medium max-w-[200px] truncate">
                  {getDisplayName()}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ============ USER PROFILE DRAWER (Slides from RIGHT) ============ */}
      {isUserDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setIsUserDrawerOpen(false)}
          />

          {/* User Drawer - Right Side */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <h2 className="text-lg font-bold text-foreground">Profile</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsUserDrawerOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* User Info Section */}
            <div className="p-6 border-b border-border">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold text-2xl">
                    {getDisplayName()[0]?.toUpperCase() || "?"}
                  </span>
                </div>

                {/* User Details */}
                {isEmployee && branchName && (
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    {branchName}
                  </p>
                )}
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {getDisplayName()}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {getDisplayEmail()}
                </p>
                {userData?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {userData.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-1 p-4 space-y-3">
              <Link to="/" onClick={() => setIsUserDrawerOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <ExternalLink className="w-5 h-5" />
                  <span className="font-medium">Go to Website</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </Button>
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-border bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">
                Laundry Room Management System
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;