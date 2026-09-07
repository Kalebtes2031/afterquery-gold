// // src/pages/customer/CustomerDashboard.tsx
// import { useState, useEffect } from "react";
// import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
// import { db } from "@/firebase";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "@/context/AuthContext";
// import { 
//   Package, Truck, Receipt, Clock, Plus, ArrowRight, TrendingUp, 
//   Gift, Sparkles, Star, ChevronRight, Zap, Info, CheckCircle2,
//   Calendar, MapPin, Award, Bell, Activity, Phone, User
// } from "lucide-react";
// import { format, differenceInDays } from "date-fns";
// import { toast } from "sonner";

// const CustomerDashboard = () => {
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   const [stats, setStats] = useState({
//     activeOrders: 0,
//     readyForPickup: 0,
//     totalOrders: 0,
//     outstandingBalance: 0,
//   });

//   const [trends, setTrends] = useState({
//     activeOrdersChange: 0,
//     totalOrdersChange: 12,
//   });

//   const [loyaltyPoints, setLoyaltyPoints] = useState(0);
//   const [loyaltyNextReward, setLoyaltyNextReward] = useState(500);
//   const [loyaltyTier, setLoyaltyTier] = useState("Silver");

//   const [activeOrders, setActiveOrders] = useState<any[]>([]);
//   const [activeInvoices, setActiveInvoices] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [showOnboarding, setShowOnboarding] = useState(false);

//   useEffect(() => {
//     if (!user?.uid) return;

//     const loadData = async () => {
//       setIsLoading(true);
      
//       // Load Orders
//       const ordersQuery = query(
//         collection(db, "laundryOrders"),
//         where("customerId", "==", user.uid),
//         orderBy("bookedAt", "desc")
//       );

//       const unsubOrders = onSnapshot(ordersQuery, (snap) => {
//         const orders = snap.docs.map(doc => {
//           const data = doc.data();
          
//           // Mock data for testing - remove when real data is available
//           const mockRiderInfo = data.status === 'collected' || data.status === 'in washing' || data.status === 'ready' ? {
//             riderName: data.riderName || "John Kamau",
//             riderPhone: data.riderPhone || "+254712345678",
//             estimatedDeliveryTime: data.estimatedDeliveryTime || "2:00 PM - 4:00 PM"
//           } : {
//             riderName: data.riderName,
//             riderPhone: data.riderPhone,
//             estimatedDeliveryTime: data.estimatedDeliveryTime
//           };
          
//           return {
//             id: doc.id,
//             laundryId: data.laundryId || "Unknown",
//             mainServiceName: data.mainServiceName || "Laundry Service",
//             status: data.status || "pending",
//             bookedAt: data.bookedAt || { toDate: () => new Date() },
//             totalKgs: data.totalKgs ?? data.quantity ?? 0,
//             totalQuantity: data.totalQuantity ?? data.quantity ?? 0,
//             estimatedDelivery: data.estimatedDelivery,
//             estimatedDeliveryTime: mockRiderInfo.estimatedDeliveryTime,
//             laundryName: data.laundryName || "Premium Laundry",
//             riderName: mockRiderInfo.riderName,
//             riderPhone: mockRiderInfo.riderPhone,
//           };
//         });

//         const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status || "pending"));
//         const ready = orders.filter(o => (o.status || "pending") === "ready");

//         setActiveOrders(active);
//         setStats(prev => ({
//           ...prev,
//           activeOrders: active.length,
//           readyForPickup: ready.length,
//           totalOrders: orders.length,
//         }));

//         // Check if first time user
//         if (orders.length === 0) {
//           setShowOnboarding(true);
//         }

//         setIsLoading(false);
//       });

//       // Load Invoices
//       const invoicesQuery = query(
//         collection(db, "invoices"),
//         where("customerId", "==", user.uid)
//       );

//       const unsubInvoices = onSnapshot(invoicesQuery, (snap) => {
//         const invoices = snap.docs.map(doc => {
//           const data = doc.data();
//           return {
//             id: doc.id,
//             invoiceNumber: data.invoiceNumber || data.laundryId || "Unknown",
//             totalBill: data.totalBill ?? 0,
//             amountPaid: data.amountPaid ?? data.paidAmount ?? 0,
//             balance: data.balance ?? 0,
//             status: data.status || "pending",
//             dueDate: data.dueDate,
//           };
//         });

//         const filtered = invoices.filter(
//           inv => inv.status !== "cancelled" && inv.balance > 0
//         );

//         const totalBalance = filtered.reduce((sum, inv) => sum + inv.balance, 0);

//         setActiveInvoices(filtered);
//         setStats(prev => ({
//           ...prev,
//           outstandingBalance: totalBalance,
//         }));
//       });

//       return () => {
//         unsubOrders();
//         unsubInvoices();
//       };
//     };

//     loadData();
//   }, [user?.uid]);

//   const getStatusConfig = (status: string = "pending") => {
//     const configs: Record<string, { 
//       bg: string; 
//       text: string; 
//       dot: string;
//       label: string;
//       progress: number;
//     }> = {
//       pending: { 
//         bg: "bg-amber-50", 
//         text: "text-amber-700", 
//         dot: "bg-amber-500",
//         label: "Pending Pickup",
//         progress: 20
//       },
//       collected: { 
//         bg: "bg-blue-50", 
//         text: "text-blue-700", 
//         dot: "bg-blue-500",
//         label: "In Transit",
//         progress: 40
//       },
//       "in washing": { 
//         bg: "bg-indigo-50", 
//         text: "text-indigo-700", 
//         dot: "bg-indigo-500",
//         label: "Being Cleaned",
//         progress: 60
//       },
//       ready: { 
//         bg: "bg-emerald-50", 
//         text: "text-emerald-700", 
//         dot: "bg-emerald-500",
//         label: "Ready for Pickup",
//         progress: 80
//       },
//       delivered: { 
//         bg: "bg-purple-50", 
//         text: "text-purple-700", 
//         dot: "bg-purple-500",
//         label: "Completed",
//         progress: 100
//       },
//       cancelled: { 
//         bg: "bg-red-50", 
//         text: "text-red-700", 
//         dot: "bg-red-500",
//         label: "Cancelled",
//         progress: 0
//       },
//     };
//     return configs[status] || configs.pending;
//   };

//   const getGreeting = () => {
//     const hour = new Date().getHours();
//     if (hour < 12) return "Good morning";
//     if (hour < 17) return "Good afternoon";
//     return "Good evening";
//   };

//   const firstName = user?.displayName?.split(" ")[0] || "there";

//   // Skeleton loader
//   if (isLoading) {
//     return (
//       <div className="space-y-4 pb-20 animate-pulse">
//         <div className="h-8 bg-slate-200 rounded-lg w-64"></div>
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//           {[1,2,3,4].map(i => (
//             <div key={i} className="h-36 bg-slate-200 rounded-2xl"></div>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-24">
//       {/* Premium Header with Greeting */}
//       <div className="relative overflow-hidden">
//         {/* Gradient background */}
//         <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5 rounded-3xl"></div>
        
//         <div className="relative p-6 sm:p-8">
//           <div className="flex items-start justify-between gap-4">
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center gap-2 mb-2">
//                 <p className="text-sm sm:text-base font-medium text-slate-600">
//                   {getGreeting()},
//                 </p>
//                 {stats.totalOrders > 10 && (
//                   <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
//                     <Star className="w-3 h-3 fill-amber-500" />
//                     {loyaltyTier}
//                   </span>
//                 )}
//               </div>
//               <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 truncate">
//                 {firstName}! 👋
//               </h1>
//               <p className="text-sm sm:text-base text-slate-600">
//                 {activeOrders.length > 0 
//                   ? `You have ${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''}`
//                   : "Everything's all caught up"}
//               </p>
//             </div>

//             {/* CTA Button */}
//             <button
//               onClick={() => navigate("/lms/customer/book-laundry")}
//               className="
//                 group relative flex items-center gap-2
//                 px-4 py-3 sm:px-6 sm:py-3.5
//                 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
//                 text-white rounded-2xl
//                 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40
//                 transition-all duration-300 hover:scale-105
//                 flex-shrink-0
//               "
//             >
//               <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
//               <Plus className="w-4 h-4 sm:w-5 sm:h-5 relative" />
//               <span className="hidden sm:inline font-semibold relative">Book Now</span>
//               <span className="sm:hidden font-semibold relative">Book</span>
//             </button>
//           </div>

//           {/* Quick Stats Row - Mobile optimized */}
//           {stats.totalOrders > 0 && (
//             <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
//               <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
//                 <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
//                 <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Total Orders</p>
//               </div>
//               <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
//                 <p className="text-lg sm:text-2xl font-bold text-orange-600">
//                   {stats.outstandingBalance > 0 ? `${stats.outstandingBalance.toLocaleString()}` : '0'}
//                 </p>
//                 <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Balance (KSh)</p>
//               </div>
//               <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
//                 <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.readyForPickup}</p>
//                 <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Ready</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* First Time User Onboarding */}
//       {showOnboarding && (
//         <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
//           <div className="flex items-start gap-4">
//             <div className="p-3 bg-blue-600 rounded-xl flex-shrink-0">
//               <Sparkles className="w-6 h-6 text-white" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <h3 className="text-lg font-bold text-slate-900 mb-1">Welcome to Premium Laundry!</h3>
//               <p className="text-sm text-slate-700 mb-4">
//                 Get started in 3 easy steps and enjoy professional laundry service at your doorstep.
//               </p>
              
//               <div className="space-y-3 mb-4">
//                 <div className="flex items-start gap-3">
//                   <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
//                   <div>
//                     <p className="font-semibold text-slate-900 text-sm">Book Your First Order</p>
//                     <p className="text-xs text-slate-600">Choose your service and schedule pickup</p>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
//                   <div>
//                     <p className="font-semibold text-slate-900 text-sm">We Handle the Rest</p>
//                     <p className="text-xs text-slate-600">Professional cleaning with real-time tracking</p>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
//                   <div>
//                     <p className="font-semibold text-slate-900 text-sm">Earn Rewards</p>
//                     <p className="text-xs text-slate-600">Get points and discounts on every order</p>
//                   </div>
//                 </div>
//               </div>

//               <button
//                 onClick={() => {
//                   navigate("/lms/customer/book-laundry");
//                   setShowOnboarding(false);
//                 }}
//                 className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 group"
//               >
//                 Book Your First Order
//                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Urgent Actions Banner - Outstanding Balance Only */}
//       {stats.outstandingBalance > 0 && (
//         <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
//           <div className="flex items-center gap-4">
//             <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl flex-shrink-0">
//               <Receipt className="w-6 h-6" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <h3 className="font-bold text-lg mb-1">
//                 Outstanding Balance: KSh {stats.outstandingBalance.toLocaleString()}
//               </h3>
//               <p className="text-sm text-white/90">
//                 You have {activeInvoices.length} pending invoice{activeInvoices.length !== 1 ? 's' : ''}
//               </p>
//             </div>
//             <button 
//               onClick={() => navigate("/lms/customer/invoices")}
//               className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl font-semibold hover:bg-white/90 transition-colors flex-shrink-0"
//             >
//               Pay Now
//               <ArrowRight className="w-4 h-4" />
//             </button>
//           </div>
//           <button 
//             onClick={() => navigate("/lms/customer/invoices")}
//             className="sm:hidden w-full mt-4 px-5 py-2.5 bg-white text-orange-600 rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
//           >
//             Pay Now
//             <ArrowRight className="w-4 h-4" />
//           </button>
//         </div>
//       )}

//       {/* Loyalty Rewards Card - Coming Soon */}
//       <div className="relative overflow-hidden">
//         {/* Coming Soon Overlay */}
//         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
//           <div className="text-center">
//             <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg mb-2">
//               <Sparkles className="w-5 h-5" />
//               <span className="font-bold text-lg">Coming Soon</span>
//             </div>
//             <p className="text-sm text-slate-600 mt-2">Exciting rewards program launching soon!</p>
//           </div>
//         </div>

//         {/* Faded Card Content */}
//         <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 shadow-sm">
//           {/* Subtle gradient accent */}
//           <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -mr-24 -mt-24 opacity-50"></div>
          
//           <div className="relative">
//             <div className="flex items-start justify-between mb-5">
//               <div className="flex items-center gap-3">
//                 <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
//                   <Gift className="w-6 h-6 text-blue-600" />
//                 </div>
//                 <div>
//                   <h3 className="text-lg sm:text-xl font-bold text-slate-900">Loyalty Rewards</h3>
//                   <p className="text-sm text-slate-600">Earn points with every order</p>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
//                   0
//                 </p>
//                 <p className="text-sm text-slate-500 font-medium">points</p>
//               </div>
//             </div>

//             {/* Progress to next reward */}
//             <div className="mb-4">
//               <div className="flex items-center justify-between text-sm mb-2">
//                 <span className="text-slate-700 font-medium">Next reward at 500 points</span>
//                 <span className="font-semibold text-blue-600">0%</span>
//               </div>
//               <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
//                 <div 
//                   className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
//                   style={{ width: '0%' }}
//                 ></div>
//               </div>
//               <p className="text-xs text-slate-600 mt-2">
//                 500 more points to unlock your first reward
//               </p>
//             </div>

//             {/* Benefits - Simple and clean */}
//             <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
//               <div className="flex items-center gap-2">
//                 <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
//                   <Zap className="w-4 h-4 text-blue-600" />
//                 </div>
//                 <div>
//                   <p className="text-xs text-slate-500">Active discount</p>
//                   <p className="text-sm font-bold text-slate-900">10% off</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
//                   <Award className="w-4 h-4 text-indigo-600" />
//                 </div>
//                 <div>
//                   <p className="text-xs text-slate-500">Member tier</p>
//                   <p className="text-sm font-bold text-slate-900">Silver</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Active Orders Section - Enhanced */}
//       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
//         <div className="p-6 sm:p-8 border-b border-slate-100">
//           <div className="flex items-center justify-between">
//             <div>
//               <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Active Orders</h2>
//               <p className="text-sm text-slate-600">Track your laundry in real-time</p>
//             </div>
//             {activeOrders.length > 0 && (
//               <button
//                 onClick={() => navigate("/lms/customer/my-orders")}
//                 className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
//               >
//                 View all
//                 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//               </button>
//             )}
//           </div>
//         </div>

//         {activeOrders.length === 0 ? (
//           <div className="p-12 sm:p-16 text-center">
//             <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
//               <Package className="w-10 h-10 text-slate-400" />
//             </div>
//             <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Orders</h3>
//             <p className="text-slate-600 mb-6 max-w-sm mx-auto">
//               You're all caught up! Ready to schedule your next laundry pickup?
//             </p>
//             <button
//               onClick={() => navigate("/lms/customer/book-laundry")}
//               className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
//             >
//               <Plus className="w-5 h-5" />
//               Book Your Next Order
//             </button>
//           </div>
//         ) : (
//           <div className="divide-y divide-slate-100">
//             {activeOrders.slice(0, 3).map((order) => {
//               const statusConfig = getStatusConfig(order.status);
//               const daysUntilDelivery = order.estimatedDelivery 
//                 ? differenceInDays(order.estimatedDelivery.toDate(), new Date())
//                 : null;
              
//               // Show rider info only for collected, in washing, or ready statuses
//               const showRiderInfo = order.riderName && ['collected', 'in washing', 'ready'].includes(order.status);

//               return (
//                 <div
//                   key={order.id}
//                   onClick={() => navigate(`/lms/customer/track-laundry/${order.id}`)}
//                   className="p-5 sm:p-6 hover:bg-slate-50 transition-all cursor-pointer group"
//                 >
//                   {/* Mobile-optimized layout */}
//                   <div className="flex items-start gap-4">
//                     <div className="relative flex-shrink-0">
//                       <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
//                         <Package className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
//                       </div>
//                       {order.status === "ready" && (
//                         <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
//                           <CheckCircle2 className="w-3 h-3 text-white" />
//                         </div>
//                       )}
//                     </div>

//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-start justify-between gap-3 mb-2">
//                         <div className="flex-1 min-w-0">
//                           <p className="font-bold text-slate-900 mb-1 truncate">{order.laundryId}</p>
//                           <p className="text-sm text-slate-600 truncate">{order.mainServiceName}</p>
//                         </div>
//                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusConfig.bg} ${statusConfig.text} flex-shrink-0`}>
//                           <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`}></span>
//                           {statusConfig.label}
//                         </span>
//                       </div>

//                       {/* Progress bar */}
//                       <div className="mb-3">
//                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
//                           <div 
//                             className={`h-full rounded-full transition-all duration-500 ${statusConfig.dot.replace('bg-', 'bg-')}`}
//                             style={{ width: `${statusConfig.progress}%` }}
//                           ></div>
//                         </div>
//                       </div>

//                       {/* Primary info row - Date & Delivery Time */}
//                       <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
//                         <div className="flex items-center gap-3 flex-wrap">
//                           <span className="flex items-center gap-1 text-slate-600">
//                             <Calendar className="w-3.5 h-3.5" />
//                             {format(order.bookedAt.toDate(), "MMM d")}
//                           </span>
//                           {order.estimatedDeliveryTime && (
//                             <span className="flex items-center gap-1 text-blue-600 font-medium">
//                               <Clock className="w-3.5 h-3.5" />
//                               {order.estimatedDeliveryTime}
//                             </span>
//                           )}
//                           {!order.estimatedDeliveryTime && daysUntilDelivery !== null && daysUntilDelivery >= 0 && (
//                             <span className="flex items-center gap-1 text-blue-600 font-medium">
//                               <Clock className="w-3.5 h-3.5" />
//                               {daysUntilDelivery === 0 ? 'Today' : `${daysUntilDelivery}d left`}
//                             </span>
//                           )}
//                         </div>
//                         <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
//                       </div>

//                       {/* Rider info - Only show when assigned */}
//                       {showRiderInfo && (
//                         <div className="mt-3 pt-3 border-t border-slate-100">
//                           <div className="flex items-center justify-between gap-4">
//                             <div className="flex items-center gap-2 min-w-0 flex-1">
//                               <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
//                                 <User className="w-4 h-4 text-blue-600" />
//                               </div>
//                               <div className="min-w-0">
//                                 <p className="text-xs text-slate-500">Your rider</p>
//                                 <p className="text-sm font-semibold text-slate-900 truncate">{order.riderName}</p>
//                               </div>
//                             </div>
                            
//                             {order.riderPhone && (
//                               <a
//                                 href={`tel:${order.riderPhone}`}
//                                 onClick={(e) => e.stopPropagation()}
//                                 className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex-shrink-0"
//                               >
//                                 <Phone className="w-3.5 h-3.5" />
//                                 <span className="hidden sm:inline">Call</span>
//                               </a>
//                             )}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* Quick Actions Grid - Mobile optimized */}
//       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
//         <button
//           onClick={() => navigate("/lms/customer/my-orders")}
//           className="group p-5 bg-white hover:bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-blue-300 transition-all text-left"
//         >
//           <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
//             <Truck className="w-6 h-6 text-blue-600" />
//           </div>
//           <p className="font-bold text-slate-900 mb-1">Track Orders</p>
//           <p className="text-xs text-slate-600">Real-time updates</p>
//         </button>

//         <button
//           onClick={() => navigate("/lms/customer/invoices")}
//           className="group p-5 bg-white hover:bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-orange-300 transition-all text-left"
//         >
//           <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
//             <Receipt className="w-6 h-6 text-orange-600" />
//           </div>
//           <p className="font-bold text-slate-900 mb-1">Invoices</p>
//           <p className="text-xs text-slate-600">View & pay</p>
//         </button>

//         <button
//           onClick={() => toast.info("Promotions coming soon!")}
//           className="group p-5 bg-white hover:bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-purple-300 transition-all text-left"
//         >
//           <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
//             <Zap className="w-6 h-6 text-purple-600" />
//           </div>
//           <p className="font-bold text-slate-900 mb-1">Promotions</p>
//           <p className="text-xs text-slate-600">Save more</p>
//         </button>

//         <button
//           onClick={() => toast.info("Support chat opening soon!")}
//           className="group p-5 bg-white hover:bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-green-300 transition-all text-left"
//         >
//           <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
//             <Activity className="w-6 h-6 text-green-600" />
//           </div>
//           <p className="font-bold text-slate-900 mb-1">Support</p>
//           <p className="text-xs text-slate-600">Get help</p>
//         </button>
//       </div>

//       {/* Recent Activity / Tips Section */}
//       <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-200">
//         <div className="flex items-center gap-3 mb-4">
//           <div className="p-2 bg-blue-100 rounded-lg">
//             <Info className="w-5 h-5 text-blue-600" />
//           </div>
//           <h3 className="font-bold text-slate-900">Did You Know?</h3>
//         </div>
//         <p className="text-sm text-slate-700 leading-relaxed">
//           You earn <span className="font-bold text-blue-600">10 points</span> for every KSh 100 spent. 
//           Redeem your points for discounts on future orders or unlock exclusive perks!
//         </p>
//       </div>
//     </div>
//   );
// };

// export default CustomerDashboard;


// src/pages/CustomerDashboard.tsx
// src/pages/customer/CustomerDashboard.tsx
// src/pages/customer/CustomerDashboard.tsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  Package, Truck, Receipt, Plus, Gift, 
  ChevronRight, User, Phone, Navigation, MessageCircle, 
  TrendingUp, Info, HelpCircle, Clock, Copy
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import RatingPopup from "@/components/rating/RatingPopup";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customerData, setCustomerData] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);

  const [stats, setStats] = useState({
    activeOrders: 0,
    readyForPickup: 0,
    totalOrders: 0,
    outstandingBalance: 0,
    loyaltyPoints: 450,
  });

  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [activeInvoices, setActiveInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeDelivery = activeOrders.find(o => 
    (o.status === 'ready' || o.riderName) && o.status !== "delivered"
  );

  // Fetch customer data from users table
  useEffect(() => {
    if (!user?.uid) return;

    const fetchCustomerData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCustomerData({
            name: data.name || data.displayName || "",
            email: data.email || "",
            phone: data.phone || data.phoneNumber || "",
          });
        } else {
          // Fallback to auth user data
          setCustomerData({
            name: user.displayName || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
          });
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
        // Fallback to auth user data
        setCustomerData({
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
        });
      }
    };

    fetchCustomerData();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const loadData = async () => {
      setIsLoading(true);
      
      const ordersQuery = query(
        collection(db, "laundryOrders"),
        where("customerId", "==", user.uid),
        orderBy("bookedAt", "desc")
      );

      const unsubOrders = onSnapshot(ordersQuery, (snap) => {
        const orders = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            laundryId: data.laundryId || "Unknown",
            mainServiceName: data.mainServiceName || "Laundry Service",
            status: data.status || "pending",
            bookedAt: data.bookedAt || { toDate: () => new Date() },
            riderName: data.riderName,
            riderPhone: data.riderPhone,
            riderPhoto: data.riderPhoto,
            vehicleType: data.vehicleType,
            eta: data.eta ? data.eta.toDate?.() : null,
          };
        });

        const active = orders.filter(o => 
          !["delivered", "cancelled"].includes(o.status || "pending")
        );
        const ready = orders.filter(o => o.status === "ready");

        setActiveOrders(active);
        setStats(prev => ({
          ...prev,
          activeOrders: active.length,
          readyForPickup: ready.length,
          totalOrders: orders.length,
        }));
        setIsLoading(false);
      });

      const invoicesQuery = query(
        collection(db, "invoices"),
        where("customerId", "==", user.uid)
      );

      const unsubInvoices = onSnapshot(invoicesQuery, (snap) => {
        const invoices = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            invoiceNumber: data.invoiceNumber || data.laundryId || "Unknown",
            totalBill: data.totalBill ?? 0,
            balance: data.balance ?? 0,
          };
        });

        const filtered = invoices.filter(inv => inv.balance > 0);
        const totalBalance = filtered.reduce((sum, inv) => sum + inv.balance, 0);

        setActiveInvoices(filtered);
        setStats(prev => ({ ...prev, outstandingBalance: totalBalance }));
      });

      return () => { unsubOrders(); unsubInvoices(); };
    };

    loadData();
  }, [user?.uid]);

  const getStatusConfig = (status: string = "pending") => {
    const configs: Record<string, { bg: string; text: string; dot: string; label: string; progress: number }> = {
      pending:    { bg: "bg-slate-100",   text: "text-slate-700",   dot: "bg-slate-400",   label: "Pending",    progress: 20 },
      collected:  { bg: "bg-accent/10",    text: "text-accent",    dot: "bg-accent",    label: "Collected",  progress: 40 },
      "in washing": { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent", label: "Washing",    progress: 60 },
      ready:      { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", label: "Ready",      progress: 80 },
      delivered:  { bg: "bg-slate-100",  text: "text-slate-700",  dot: "bg-slate-400",  label: "Completed",  progress: 100 },
    };
    return configs[status] || configs.pending;
  };

  const formatETA = (etaDate: Date | null) => {
    if (!etaDate) return null;
    if (isPast(etaDate)) return "Was expected earlier";
    if (isToday(etaDate)) return `Today at ${format(etaDate, "h:mm a")}`;
    if (isTomorrow(etaDate)) return `Tomorrow at ${format(etaDate, "h:mm a")}`;
    return format(etaDate, "MMM d 'at' h:mm a");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Phone number copied!");
  };

  // Get first name from customer data
  const getFirstName = () => {
    if (customerData?.name) {
      return customerData.name.split(" ")[0];
    }
    if (customerData?.email) {
      return customerData.email.split("@")[0];
    }
    return "there";
  };

  // Loading state
  if (isLoading || !customerData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-lg w-64"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Popup */}
      <RatingPopup currentPage="dashboard" />
      
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            Hi, {getFirstName()}! 
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">Track your laundry and rewards here.</p>
        </div>
        <button
          onClick={() => navigate("/lms/customer/book-laundry")}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Book Laundry</span><span className="xs:hidden">Book</span>
        </button>
      </div>

      {/* STAT CARDS - Consistent theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="p-2 bg-accent/10 w-fit rounded-lg mb-3"><Package className="w-5 h-5 text-accent" /></div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeOrders}</p>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Orders</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="p-2 bg-accent/10 w-fit rounded-lg mb-3"><Truck className="w-5 h-5 text-accent" /></div>
          <p className="text-2xl font-bold text-slate-900">{stats.readyForPickup}</p>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Ready</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="p-2 bg-orange-50 w-fit rounded-lg mb-3"><Receipt className="w-5 h-5 text-orange-600" /></div>
          <p className="text-2xl font-bold text-orange-600">KSh {stats.outstandingBalance.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Balance Due</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full mb-1.5">
                Coming Soon
              </span>
              <p className="text-sm font-medium text-slate-600">something exciting coming soon!</p>
            </div>
          </div>

          <div className="flex justify-between items-start mb-3 opacity-70">
            <div className="p-2 bg-accent/10 rounded-lg"><Gift className="w-5 h-5 text-accent" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900 opacity-70">{stats.loyaltyPoints}</p>
          <div className="flex items-center gap-1 opacity-70">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Loyalty Points</p>
            <div title="Earn points with every order – more info coming soon!" className="cursor-help">
              <HelpCircle className="w-3 h-3 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      {/* RIDER CARD */}
      {activeDelivery && (
        <div className="bg-white rounded-xl border border-accent/20 shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {activeDelivery.riderPhoto ? (
                  <img src={activeDelivery.riderPhoto} alt="Rider" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Rider: {activeDelivery.riderName}</h3>
                
                <p className="text-slate-600 text-sm mt-0.5 font-medium">
                  Delivering order <span className="font-mono text-accent">#{activeDelivery.laundryId}</span>
                </p>

                <p className="text-slate-600 text-sm flex items-center gap-1.5 mt-1">
                  <Navigation className="w-3.5 h-3.5 text-accent" /> Out for Delivery
                </p>
                {activeDelivery.eta && (
                  <p className="text-slate-600 text-sm mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    ETA: {formatETA(activeDelivery.eta)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-700 font-mono text-sm">
                    {activeDelivery.riderPhone || "No number available"}
                  </span>
                  {activeDelivery.riderPhone && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => copyToClipboard(activeDelivery.riderPhone)}
                            className="text-slate-400 hover:text-accent transition-colors"
                            aria-label="Copy phone number"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Copy number</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>

            <div>
              {activeDelivery.riderPhone && (
                <a
                  href={`tel:${activeDelivery.riderPhone}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium transition-colors border border-accent/20"
                >
                  <Phone className="w-4 h-4" />
                  Call Rider
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Current Progress */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900">Current Progress</h2>
              <button onClick={() => navigate("/lms/customer/my-orders")} className="text-xs font-semibold text-accent hover:underline">
                View All
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-400 text-sm">No active laundry orders.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeOrders.slice(0, 3).map((order) => {
                  const config = getStatusConfig(order.status);
                  const etaText = formatETA(order.eta);

                  return (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/lms/customer/track-laundry/${order.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">#{order.laundryId}</p>
                          <p className="text-[11px] text-slate-500">{order.mainServiceName}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-slate-100 rounded-full mb-2">
                        <div className={`h-full ${config.dot} transition-all duration-500 rounded-full`} style={{ width: `${config.progress}%` }} />
                      </div>

                      {etaText && order.status !== "delivered" && (
                        <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>ETA: {etaText}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Invoices */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900">Pending Invoices</h2>
            </div>
            {activeInvoices.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No pending bills. High five! 🎉</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                    <tr>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Balance</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono font-semibold text-accent">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">KSh {inv.balance.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => navigate(`/lms/customer/invoice/${inv.id}`)} className="text-accent font-semibold hover:underline">
                            Pay →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-accent">
              <TrendingUp className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900">Weekly Insight</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              You've saved roughly <span className="font-bold text-slate-700">6 hours</span> of chores this week by using our service!
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2 text-slate-700">
              <Info className="w-4 h-4" />
              <h3 className="font-bold text-sm">Pro Tip</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Did you know you can redeem your <span className="text-accent font-bold">Loyalty Points</span> for free ironing? 
              Check the rewards section soon!
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Quick Support</h3>
            <button className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">Chat with Support</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-accent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;