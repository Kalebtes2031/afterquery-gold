// src/components/dashboard/GeneralTab.tsx — FINAL FIXED & SAFE
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getCountFromServer, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { format, eachDayOfInterval, subDays } from "date-fns";

const GeneralTab = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["generalStats"],
    queryFn: async () => {
      try {
        const [customersSnap, pendingSnap, readySnap, activeSnap] = await Promise.all([
          getCountFromServer(query(collection(db, "users"), where("role", "==", "customer"))),
          getCountFromServer(query(collection(db, "laundryOrders"), where("deliveryConfirmedAt", "==", null))),
          getCountFromServer(query(collection(db, "laundryOrders"), where("status", "==", "ready"))),
          getCountFromServer(query(collection(db, "laundryOrders"), where("status", "!=", "delivered"))),
        ]);

        // Fetch orders for weekly trend
        const ordersSnap = await getDocs(collection(db, "laundryOrders"));

        const last7DaysMap: Record<string, number> = {};
        const weekDays = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

        weekDays.forEach(day => {
          last7DaysMap[format(day, "EEE")] = 0;
        });

        let thisMonthOrders = 0;
        const currentMonth = format(new Date(), "yyyy-MM");

        ordersSnap.forEach(doc => {
          const order = doc.data();
          const bookedAt = order.bookedAt?.toDate();
          if (bookedAt) {
            const dayKey = format(bookedAt, "EEE");
            const monthKey = format(bookedAt, "yyyy-MM");

            if (last7DaysMap[dayKey] !== undefined) {
              last7DaysMap[dayKey]++;
            }
            if (monthKey === currentMonth) {
              thisMonthOrders++;
            }
          }
        });

        const weeklyData = weekDays.map(day => ({
          day: format(day, "EEE"),
          orders: last7DaysMap[format(day, "EEE")] || 0,
        }));

        return {
          totalCustomers: customersSnap.data().count,
          pendingDeliveries: pendingSnap.data().count,
          readyForDelivery: readySnap.data().count,
          activeLaundry: activeSnap.data().count,
          thisMonthOrders,
          weeklyData,
        };
      } catch (error) {
        // console.error("Error fetching dashboard stats:", error);
        throw error; // Let React Query handle error state
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-xl text-muted-foreground">Loading dashboard stats...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-xl text-destructive">Failed to load dashboard data</p>
        <p className="text-muted-foreground">Check Firestore rules or try refreshing</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-blue-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalCustomers}</p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Deliveries</p>
                <p className="text-3xl font-bold text-orange-600">{data.pendingDeliveries}</p>
              </div>
              <Truck className="w-12 h-12 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready for Delivery</p>
                <p className="text-3xl font-bold text-green-600">{data.readyForDelivery}</p>
              </div>
              <Package className="w-12 h-12 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Laundry</p>
                <p className="text-3xl font-bold text-purple-600">{data.activeLaundry}</p>
              </div>
              <Clock className="w-12 h-12 text-purple-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month Orders</p>
                <p className="text-3xl font-bold text-teal-600">{data.thisMonthOrders}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-teal-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Weekly Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Daily Orders This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeneralTab;