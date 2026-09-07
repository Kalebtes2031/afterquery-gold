// src/App.tsx — FINAL PRODUCTION VERSION WITH FORGOT PASSWORD

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import ServiceDetail from "./pages/ServiceDetail";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

import NotFound from "./pages/NotFound";

import CustomerDashboard from "./pages/CustomerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";

import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

import Suppliers from "./pages/Suppliers";
import EmployeeList from "./pages/EmployeeList";

import CustomerReviews from "./pages/CustomerReviews";
import CustomerOrders from "./pages/CustomerOrders";
import Customers from "./pages/Customers";

import Layout from "./components/Layout";
import MyOrders from "./pages/MyOrders";
import BookLaundryForm from "./components/forms/BookLaundryForm";
import StaffOrderForm from "./components/forms/StaffOrderForm";
import CustomerForm from "./components/forms/CustomerForm";
import TrackLaundry from "./pages/CustomerTrackLaundry";
import CustomerTrackLaundry from "./pages/CustomerTrackLaundry";
import ManagerTrackLaundry from "./pages/StaffTrackLaundry";
import LaundryTrackingForm from "./components/forms/LaundryTrackingForm";
import Branches from "./pages/Branches";
import ServiceTypes from "./pages/ServiceTypes";
import PricingConfig from "./pages/PricingConfig";
import PricingConfigForm from "./components/forms/PricingConfigForm";
import AllInvoices from "./pages/AllInvoices";
import InvoiceForm from "./components/forms/InvoiceForm";
import CustomerInvoices from "./pages/CustomerInvoices";
import CustomerInvoiceView from "./pages/CustomerInvoiceView";
import SMSTemplates from "./pages/SMSTemplates";
import SMSLog from "./pages/SMSLog";
import DeliveryNotifications from "./pages/DeliveryNotifications";
import DeliverySlotPage from "./pages/DeliverySlotPage";
import EmployeeForm from "./components/forms/EmployeeForm";
import SupplierForm from "./components/forms/SupplierForm";
import CategoriesList from "./pages/CategoriesList";
import CategoryForm from "./components/forms/CategoryForm";
import UoMList from "./pages/UoMList";
import UoMForm from "./components/forms/UoMForm";
import ItemsList from "./pages/ItemsList";
import ItemForm from "./components/forms/ItemForm";
import PurchaseOrdersList from "./pages/PurchaseOrdersList";
import POForm from "./components/forms/POForm";
import ReceiveStockList from "./pages/ReceiveStockList";
import ReceiveStockForm from "./components/forms/ReceiveStockForm";
import StockList from "./pages/StockList";
import InventoryMovementList from "./pages/InventoryMovementList";
import InventoryMovementForm from "./components/forms/InventoryMovementForm";
import StaffBookLaundryForm from "./components/forms/StaffBookLaundryForm";
import Packages from "./pages/Packages";
import Sizes from "./pages/Sizes";
import SMSConfigPage from "./pages/SMSConfigPage";
import SMSConfigForm from "./components/forms/SMSConfigForm";
import AboutPage from "./pages/AboutPage";
import ForgotPassword from "./pages/ForgotPassword";
import SizeForm from "./components/forms/SizeForm";
import ServiceTypeForm from "./components/forms/ServiceTypeForm";
import AnalyticsChatPage from "./pages/Analyticschatpage";
import RatingConfigs from "./pages/RatingConfigs";
import RatingConfigForm from "./components/forms/Ratingconfigform";
import PackageForm from "./components/forms/PackageForm";


// MASTER PROTECTED ROUTE
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element; allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();
  const { role: urlRole } = useParams<{ role: string }>();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-lg">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (!role || !allowedRoles.includes(role) || role !== urlRole) return <Navigate to="/" replace />;

  return children;
};

// Wrapper for PricingConfigForm
const PricingConfigFormWrapper = ({ mode }: { mode: "add" | "view" | "edit" }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <PricingConfigForm
      mode={mode}
      pricingId={id}
      onSuccess={() => navigate("/lms/manager/utilities/pricing")}
    />
  );
};

// DASHBOARD SWITCHER
const Dashboard = () => {
  const { role } = useAuth();
  switch (role) {
    case "customer": return <CustomerDashboard />;
    case "employee": return <EmployeeDashboard />;
    case "manager": return <ManagerDashboard />;
    default: return <Navigate to="/" replace />;
  }
};

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Index />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/about-us" element={<AboutPage />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} /> {/* ← NEW ROUTE */}

            <Route path="/delivery-slot/:id" element={<DeliverySlotPage />} />

            {/* MAIN LMS ROUTES — ALL PROTECTED BY ROLE IN URL */}
            <Route path="/lms/:role" element={<ProtectedRoute allowedRoles={["customer", "employee", "manager"]}><Layout /></ProtectedRoute>}>
              
              {/* DASHBOARD */}
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* ==================== CUSTOMER ONLY ==================== */}
              <Route path="book-laundry" element={<ProtectedRoute allowedRoles={["customer"]}><BookLaundryForm mode="add" /></ProtectedRoute>} />
              <Route path="order/:id/continue" element={<ProtectedRoute allowedRoles={["customer"]}><BookLaundryForm mode="continue" /></ProtectedRoute>} />
              <Route path="my-orders" element={<ProtectedRoute allowedRoles={["customer"]}><MyOrders /></ProtectedRoute>} />
              <Route path="track-laundry" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerTrackLaundry /></ProtectedRoute>} />
              <Route path="track-laundry/:id" element={<ProtectedRoute allowedRoles={["customer"]}><LaundryTrackingForm mode="view" /></ProtectedRoute>} />
              <Route path="invoices" element={<CustomerInvoices />} />
              <Route path="invoice/:id" element={<CustomerInvoiceView />} />

              {/* Customer: View & Edit Own Order */}
              <Route path="order/:id" element={<ProtectedRoute allowedRoles={["customer"]}><BookLaundryForm mode="view" /></ProtectedRoute>} />
              <Route path="order/:id/edit" element={<ProtectedRoute allowedRoles={["customer"]}><BookLaundryForm mode="edit" /></ProtectedRoute>} />

              {/* ==================== EMPLOYEE & MANAGER ==================== */}
              {/* Purchase Orders */}
              <Route path="utilities/purchase-orders" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><PurchaseOrdersList /></ProtectedRoute>} />
              <Route path="utilities/purchase-orders/add" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><POForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/purchase-orders/:id" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><POForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/purchase-orders/:id/edit" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><POForm mode="edit" /></ProtectedRoute>} />
              <Route path="utilities/purchase-orders/:id/cancel" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><POForm mode="cancel" /></ProtectedRoute>} />

              <Route path="book-laundry-staff" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><StaffBookLaundryForm /></ProtectedRoute>} />

              {/* Stock & Inventory */}
              <Route path="utilities/stock-list" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><StockList /></ProtectedRoute>} />
              <Route path="utilities/inventory-movement" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><InventoryMovementList /></ProtectedRoute>} />
              <Route path="utilities/inventory-movement/use" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><InventoryMovementForm /></ProtectedRoute>} />
              <Route path="utilities/receive-stock" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><ReceiveStockList /></ProtectedRoute>} />
              <Route path="utilities/receive-stock/add" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><ReceiveStockForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/receive-stock/:id" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><ReceiveStockForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/receive-stock/:id/edit" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><ReceiveStockForm mode="edit" /></ProtectedRoute>} />

              {/* Orders & Tracking */}
              <Route path="customer-orders" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><CustomerOrders /></ProtectedRoute>} />
              <Route path="view-order/:id" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><StaffOrderForm mode="view" /></ProtectedRoute>} />  
              <Route path="serve-order/:id" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><StaffOrderForm mode="serve" /></ProtectedRoute>} /> 
              <Route path="stftrack-laundry" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><ManagerTrackLaundry /></ProtectedRoute>} />
              <Route path="stftrack-laundry/:id/record" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><LaundryTrackingForm mode="edit" /></ProtectedRoute>} />
              <Route path="stftrack-laundry/:id/track" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><LaundryTrackingForm mode="edit" /></ProtectedRoute>} />
              <Route path="stftrack-laundry/:id/view" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><LaundryTrackingForm mode="view" /></ProtectedRoute>} />

              {/* Utilities & Config */}
              <Route path="utilities/sms-templates" element={<ProtectedRoute allowedRoles={["manager"]}><SMSTemplates /></ProtectedRoute>} />
              <Route path="utilities/sms-log" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><SMSLog /></ProtectedRoute>} />
              <Route path="delivery-notifications" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><DeliveryNotifications /></ProtectedRoute>} />

              {/* Invoicing */}
              <Route path="all-invoices" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><AllInvoices /></ProtectedRoute>} />
              <Route path="invoice/new" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><InvoiceForm mode="new" /></ProtectedRoute>} />
              <Route path="invoice/:id/view" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><InvoiceForm mode="view" /></ProtectedRoute>} />
              <Route path="invoice/:id/edit" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><InvoiceForm mode="edit" /></ProtectedRoute>} />
              <Route path="invoice/:id/cancel" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><InvoiceForm mode="cancel" /></ProtectedRoute>} />
              <Route path="invoice/:id/balance" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><InvoiceForm mode="balance" /></ProtectedRoute>} />

              {/* Manager: Customers */}
              <Route path="customers" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><Customers /></ProtectedRoute>} />
              <Route path="add-customer" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><CustomerForm mode="add" /></ProtectedRoute>} />
              <Route path="customer/:id" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><CustomerForm mode="view" /></ProtectedRoute>} />
              <Route path="customer/:id/edit" element={<ProtectedRoute allowedRoles={["manager", "employee"]}><CustomerForm mode="edit" /></ProtectedRoute>} />

              <Route path="customer-reviews" element={<ProtectedRoute allowedRoles={["employee", "manager"]}><CustomerReviews /></ProtectedRoute>} />
              <Route path="utilities/rating-config" element={<ProtectedRoute allowedRoles={["manager"]}><RatingConfigs /></ProtectedRoute>} />
              <Route path="add-rating-config" element={<ProtectedRoute allowedRoles={["manager"]}><RatingConfigForm mode="add" /></ProtectedRoute>} />
              <Route path="rating-config/:id" element={<ProtectedRoute allowedRoles={["manager"]}><RatingConfigForm mode="view" /></ProtectedRoute>} />
              <Route path="rating-config/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><RatingConfigForm mode="edit" /></ProtectedRoute>} />
              {/* Manager: Employees */}
              <Route path="employee-list" element={<ProtectedRoute allowedRoles={["manager"]}><EmployeeList /></ProtectedRoute>} />
              <Route path="add-employee" element={<ProtectedRoute allowedRoles={["manager"]}><EmployeeForm mode="add" /></ProtectedRoute>} />
              <Route path="employee/:id" element={<ProtectedRoute allowedRoles={["manager"]}><EmployeeForm mode="view" /></ProtectedRoute>} />
              <Route path="employee/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><EmployeeForm mode="edit" /></ProtectedRoute>} />

              {/* Manager: Suppliers & Items */}
              <Route path="utilities/suppliers" element={<ProtectedRoute allowedRoles={["manager"]}><Suppliers /></ProtectedRoute>} />
              <Route path="utilities/suppliers/add" element={<ProtectedRoute allowedRoles={["manager"]}><SupplierForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/suppliers/:id" element={<ProtectedRoute allowedRoles={["manager"]}><SupplierForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/suppliers/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><SupplierForm mode="edit" /></ProtectedRoute>} />

              {/* Categories, UoM, Items */}
              <Route path="utilities/categories" element={<ProtectedRoute allowedRoles={["manager"]}><CategoriesList /></ProtectedRoute>} />
              <Route path="utilities/categories/add" element={<ProtectedRoute allowedRoles={["manager"]}><CategoryForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/categories/:id" element={<ProtectedRoute allowedRoles={["manager"]}><CategoryForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/categories/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><CategoryForm mode="edit" /></ProtectedRoute>} />

              <Route path="utilities/uom" element={<ProtectedRoute allowedRoles={["manager"]}><UoMList /></ProtectedRoute>} />
              <Route path="utilities/uom/add" element={<ProtectedRoute allowedRoles={["manager"]}><UoMForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/uom/:id" element={<ProtectedRoute allowedRoles={["manager"]}><UoMForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/uom/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><UoMForm mode="edit" /></ProtectedRoute>} />

              <Route path="utilities/items" element={<ProtectedRoute allowedRoles={["manager"]}><ItemsList /></ProtectedRoute>} />
              <Route path="utilities/items/add" element={<ProtectedRoute allowedRoles={["manager"]}><ItemForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/items/:id" element={<ProtectedRoute allowedRoles={["manager"]}><ItemForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/items/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><ItemForm mode="edit" /></ProtectedRoute>} />

              {/* Branches, Services, Pricing, Packages, Sizes */}
              <Route path="utilities/branches" element={<ProtectedRoute allowedRoles={["manager"]}><Branches mode="list" /></ProtectedRoute>} />
              <Route path="utilities/branches/add" element={<ProtectedRoute allowedRoles={["manager"]}><Branches mode="add" /></ProtectedRoute>} />
              <Route path="utilities/branches/:id" element={<ProtectedRoute allowedRoles={["manager"]}><Branches mode="view" /></ProtectedRoute>} />
              <Route path="utilities/branches/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><Branches mode="edit" /></ProtectedRoute>} />

              <Route path="utilities/service-types" element={<ProtectedRoute allowedRoles={["manager"]}><ServiceTypes /></ProtectedRoute>} />
              <Route path="utilities/service-types/add" element={<ProtectedRoute allowedRoles={["manager"]}><ServiceTypeForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/service-types/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><ServiceTypeForm mode="edit" /></ProtectedRoute>} />
              <Route path="utilities/service-types/:id" element={<ProtectedRoute allowedRoles={["manager"]}><ServiceTypeForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/pricing" element={<ProtectedRoute allowedRoles={["manager"]}><PricingConfig /></ProtectedRoute>} />
<Route path="utilities/pricing/add" element={<ProtectedRoute allowedRoles={["manager"]}><PricingConfigFormWrapper mode="add" /></ProtectedRoute>} />
<Route path="utilities/pricing/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><PricingConfigFormWrapper mode="edit" /></ProtectedRoute>} />
<Route path="utilities/pricing/:id" element={<ProtectedRoute allowedRoles={["manager"]}><PricingConfigFormWrapper mode="view" /></ProtectedRoute>} /> 
              <Route path="utilities/packages" element={<ProtectedRoute allowedRoles={["manager"]}><Packages /></ProtectedRoute>} />
              <Route path="utilities/packages/:id" element={<ProtectedRoute allowedRoles={["manager"]}><PackageForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/packages/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><PackageForm mode="edit" /></ProtectedRoute>} />
              <Route path="utilities/packages/add" element={<ProtectedRoute allowedRoles={["manager"]}><PackageForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/sizes" element={<ProtectedRoute allowedRoles={["manager"]}><Sizes /></ProtectedRoute>} />
              <Route path="utilities/sizes/add" element={<ProtectedRoute allowedRoles={["manager"]}><SizeForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/sizes/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><SizeForm mode="edit" /></ProtectedRoute>} />
              <Route path="utilities/sizes/:id" element={<ProtectedRoute allowedRoles={["manager"]}><SizeForm mode="view" /></ProtectedRoute>} />

              {/* SMS & Notifications */}
              <Route path="utilities/sms-config" element={<ProtectedRoute allowedRoles={["manager"]}><SMSConfigPage /></ProtectedRoute>} />
              <Route path="utilities/sms-config/add" element={<ProtectedRoute allowedRoles={["manager"]}><SMSConfigForm mode="add" /></ProtectedRoute>} />
              <Route path="utilities/sms-config/:id" element={<ProtectedRoute allowedRoles={["manager"]}><SMSConfigForm mode="view" /></ProtectedRoute>} />
              <Route path="utilities/sms-config/:id/edit" element={<ProtectedRoute allowedRoles={["manager"]}><SMSConfigForm mode="edit" /></ProtectedRoute>} />

              <Route path="analytics-chat" element={<ProtectedRoute allowedRoles={["manager"]}><AnalyticsChatPage /></ProtectedRoute>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;