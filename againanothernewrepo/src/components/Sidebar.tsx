// src/components/Sidebar.tsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, List, Truck, Star, Book, Users, FileText, LogOut,
  X, ChevronDown, ChevronRight, Settings, ChevronLeft,
  ShoppingCart, PackageCheck, Package, Navigation, Bot,
  Briefcase, DollarSign, BarChart3, Wrench, MessageSquare,
  StarIcon,
  SpeakerIcon,
  Megaphone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface SidebarProps {
  pendingDeliveries?: number;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | null;
}

interface MenuGroup {
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
}

type SidebarItem = MenuItem | MenuGroup;

const Sidebar = ({
  pendingDeliveries = 0,
  isCollapsed = false,
  onCollapseChange,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) => {
  const { user, role, branchName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    // Smart defaults: Only frequently used groups open by default
    "Manage Orders": true,        // Most important - open by default
    "Manage Customers": false,    // Secondary - closed by default
    "Stock Control": false,       // Advanced - closed by default
    "Admin Utilities": false,     // Manager only - closed by default
  });

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  const isEmployee = role === "employee";
  const basePath = role ? `/lms/${role}` : "/";

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    onMobileClose?.();
    navigate("/");
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroup = (item: SidebarItem): item is MenuGroup => "items" in item;

  // ============ CUSTOMER MENU (Simple, no grouping needed) ============
  const customerMenu: SidebarItem[] = [
    { 
      label: "Dashboard", 
      href: "/lms/customer/dashboard", 
      icon: <Home className="w-5 h-5" /> 
    },
    { 
      label: "Book Order", 
      href: "/lms/customer/book-laundry", 
      icon: <Book className="w-5 h-5" /> 
    },
    { 
      label: "My Orders", 
      href: "/lms/customer/my-orders", 
      icon: <List className="w-5 h-5" /> 
    },
    { 
      label: "Track Orders", 
      href: "/lms/customer/track-laundry", 
      icon: <Navigation className="w-5 h-5" /> 
    },
    { 
      label: "Invoices", 
      href: "/lms/customer/invoices", 
      icon: <FileText className="w-5 h-5" /> 
    },
  ];

  // ============ STAFF/EMPLOYEE MENU (Grouped) ============
  const staffMenu: SidebarItem[] = [
    // Dashboard - standalone
    { 
      label: "Dashboard", 
      href: `${basePath}/dashboard`, 
      icon: <Home className="w-5 h-5" /> 
    },

    // Manage Orders Group (Open by default)
    {
      label: "Manage Orders",
      icon: <Briefcase className="w-5 h-5" />,
      items: [
        { 
          label: "Customer Orders", 
          href: `${basePath}/customer-orders`, 
          icon: <Book className="w-4 h-4" /> 
        },
        { 
          label: "Track Laundry", 
          href: `${basePath}/stftrack-laundry`, 
          icon: <List className="w-4 h-4" /> 
        },
        { 
          label: "Book for Customer", 
          href: `${basePath}/book-laundry-staff`, 
          icon: <Book className="w-4 h-4" /> 
        },
        {
          label: "Confirm Delivery",
          href: `${basePath}/delivery-notifications`,
          icon: <Truck className="w-4 h-4" />,
          badge: pendingDeliveries || null,
        },
      ],
    },

    // Manage Customers Group (Closed by default)
    {
      label: "Manage Customers",
      icon: <Users className="w-5 h-5" />,
      items: [
        { 
          label: "All Customers", 
          href: `${basePath}/customers`, 
          icon: <Users className="w-4 h-4" /> 
        },
        { 
          label: "Customer Reviews", 
          href: `${basePath}/customer-reviews`, 
          icon: <Star className="w-4 h-4" /> 
        },
        {
          label: "Campains",
          href: "/lms/manager/utilities/rating-config",
          icon: <Megaphone className="w-4 h-4"/>
        },
      ],
    },

    // Invoices - standalone
    { 
      label: "Invoices", 
      href: `${basePath}/all-invoices`, 
      icon: <FileText className="w-5 h-5" /> 
    },

    // Stock Control Group (Closed by default)
    {
      label: "Stock Control",
      icon: <Package className="w-5 h-5" />,
      items: [
        {
          label: "Purchase Orders",
          href: `${basePath}/utilities/purchase-orders`,
          icon: <ShoppingCart className="w-4 h-4" />,
        },
        {
          label: "Receive Stock",
          href: `${basePath}/utilities/receive-stock`,
          icon: <PackageCheck className="w-4 h-4" />,
        },
        {
          label: "Stock List",
          href: `${basePath}/utilities/stock-list`,
          icon: <Package className="w-4 h-4" />,
        },
        {
          label: "Inventory Movement",
          href: `${basePath}/utilities/inventory-movement`,
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
  ];

  // ============ MANAGER ADDITIONAL MENU ============
  const managerAdditional: SidebarItem[] = [
    // Employee Management - standalone
    { 
      label: "Manage Employees", 
      href: "/lms/manager/employee-list", 
      icon: <Users className="w-5 h-5" /> 
    },

    // Analytics - standalone
    { 
      label: "Analytics Chat", 
      href: "/lms/manager/analytics-chat", 
      icon: <Bot className="w-5 h-5" /> 
    },

    // Admin Utilities Group (Closed by default)
    {
      label: "Admin Utilities",
      icon: <Settings className="w-5 h-5" />,
      items: [
        { 
          label: "Branches", 
          href: "/lms/manager/utilities/branches",
          icon: <Briefcase className="w-4 h-4" />
        },
        { 
          label: "Service Types", 
          href: "/lms/manager/utilities/service-types",
          icon: <Wrench className="w-4 h-4" />
        },
        { 
          label: "Pricing Config", 
          href: "/lms/manager/utilities/pricing",
          icon: <DollarSign className="w-4 h-4" />
        },
        { 
          label: "SMS Templates", 
          href: "/lms/manager/utilities/sms-templates",
          icon: <MessageSquare className="w-4 h-4" />
        },
        { 
          label: "SMS Log", 
          href: "/lms/manager/utilities/sms-log",
          icon: <List className="w-4 h-4" />
        },
        { 
          label: "Suppliers", 
          href: "/lms/manager/utilities/suppliers",
          icon: <Users className="w-4 h-4" />
        },
        { 
          label: "Categories", 
          href: "/lms/manager/utilities/categories",
          icon: <List className="w-4 h-4" />
        },
        { 
          label: "Units of Measure", 
          href: "/lms/manager/utilities/uom",
          icon: <BarChart3 className="w-4 h-4" />
        },
        { 
          label: "Item Registry", 
          href: "/lms/manager/utilities/items",
          icon: <Package className="w-4 h-4" />
        },
        { 
          label: "Packages", 
          href: "/lms/manager/utilities/packages",
          icon: <Package className="w-4 h-4" />
        },
        { 
          label: "Sizes", 
          href: "/lms/manager/utilities/sizes",
          icon: <List className="w-4 h-4" />
        },
        { 
          label: "SMS Config", 
          href: "/lms/manager/utilities/sms-config",
          icon: <Settings className="w-4 h-4" />
        },
        
      ],
    },
  ];

  // Determine menu based on role
  const menuItems: SidebarItem[] =
    role === "customer"
      ? customerMenu
      : role === "employee"
      ? staffMenu
      : [...staffMenu, ...managerAdditional];

  // ============ RENDER SINGLE MENU ITEM ============
  const renderMenuItem = (item: MenuItem, isMobile: boolean, isNested: boolean = false) => (
    <Tooltip key={item.label}>
      <TooltipTrigger asChild>
        <Link
          to={item.href}
          onClick={() => isMobile && onMobileClose?.()}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            isNested ? 'text-sm' : ''
          } ${
            location.pathname === item.href
              ? "bg-accent/10 text-accent font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
          } ${!isMobile && isCollapsed ? "justify-center" : ""}`}
        >
          {item.icon}
          {(isMobile || !isCollapsed) && (
            <span className={location.pathname === item.href ? "font-medium" : ""}>{item.label}</span>
          )}
          {item.badge && (isMobile || !isCollapsed) && (
            <Badge className="ml-auto bg-orange-500">{item.badge}</Badge>
          )}
        </Link>
      </TooltipTrigger>
      {!isMobile && isCollapsed && (
        <TooltipContent side="right">
          <p>{item.label}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );

  // ============ RENDER MENU GROUP ============
  const renderMenuGroup = (group: MenuGroup, isMobile: boolean) => {
    const isExpanded = expandedGroups[group.label];

    return (
      <div key={group.label}>
        <button
          onClick={() => toggleGroup(group.label)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-accent ${
            !isMobile && isCollapsed ? "justify-center" : ""
          }`}
        >
          {group.icon}
          {(isMobile || !isCollapsed) && (
            <>
              <span className="font-medium flex-1 text-left">{group.label}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </>
          )}
        </button>

        {(isMobile || !isCollapsed) && isExpanded && (
          <div className="ml-6 mt-1 space-y-1 border-l-2 border-border pl-2">
            {group.items.map((subItem) => renderMenuItem(subItem, isMobile, true))}
          </div>
        )}
      </div>
    );
  };

  // ============ RENDER ALL ITEMS ============
  const renderAllItems = (isMobile: boolean) => (
    <>
      {menuItems.map((item) => 
        isGroup(item) 
          ? renderMenuGroup(item, isMobile) 
          : renderMenuItem(item, isMobile, false)
      )}
    </>
  );

  return (
    <TooltipProvider>
      {/* ============ MOBILE DRAWER ============ */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={onMobileClose}
          />

          {/* Drawer */}
          <div className="md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border z-50 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl">
            {/* Header with LAUNDRY ROOM branding */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">LR</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    LAUNDRY ROOM
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={onMobileClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {renderAllItems(true)}
              </nav>
            </div>

            {/* Footer - Logout */}
            <div className="p-4 border-t border-border bg-card">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ============ DESKTOP SIDEBAR ============ */}
      <div
        className={`hidden md:flex fixed top-16 left-0 h-[calc(100vh-4rem)] bg-card border-r border-border flex-col transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-2 pt-4">
          <nav className="space-y-1">
            {renderAllItems(false)}
          </nav>

          {/* Collapse Toggle */}
          <div className="pt-4 mt-4 border-t border-border">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCollapseChange?.(false)}
                    className="w-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand Sidebar</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCollapseChange?.(true)}
                className="w-full justify-start gap-2 text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Collapse Sidebar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-2 border-t border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 ${
                  isCollapsed ? "justify-center" : "justify-start"
                }`}
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                {!isCollapsed && <span className="font-medium">Logout</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Logout</TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;