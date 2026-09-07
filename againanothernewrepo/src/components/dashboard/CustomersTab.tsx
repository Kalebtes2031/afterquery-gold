// src/components/dashboard/CustomersTab.tsx
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserPlus, Activity } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6"]; // Blue, Green, Orange, Purple

const CustomersTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["customersStats"],
    queryFn: async () => {
      // Fetch all customers
      const customersQuery = query(collection(db, "users"), where("role", "==", "customer"));
      const customersSnap = await getDocs(customersQuery);

      // Fetch all laundry orders
      const ordersSnap = await getDocs(collection(db, "laundryOrders"));

      let totalCustomers = customersSnap.size;
      let monthlyNew = 0;
      let activeCustomersCount = 0;
      const activeCustomerIds = new Set<string>();

      const currentMonthStart = startOfMonth(new Date());
      const monthlyNewMap: Record<string, number> = {};

      const customerOrderCounts: Record<string, number> = {};
      const customerNames: Record<string, string> = {};

      // Process customers
      customersSnap.forEach(doc => {
        const cust = doc.data();
        const custId = doc.id;
        customerNames[custId] = cust.name || cust.email || "Unknown";
        customerOrderCounts[custId] = 0;

        const createdAt = cust.createdAt?.toDate();
        if (createdAt) {
          if (createdAt >= currentMonthStart) {
            monthlyNew++;
          }
          const monthKey = format(createdAt, "MMM yyyy");
          monthlyNewMap[monthKey] = (monthlyNewMap[monthKey] || 0) + 1;
        }
      });

      // Process orders
      ordersSnap.forEach(doc => {
        const order = doc.data();
        const customerId = order.customerId;
        if (customerOrderCounts[customerId] !== undefined) {
          customerOrderCounts[customerId]++;

          // Active customer: has at least one order not delivered
          if (order.status !== "delivered") {
            activeCustomerIds.add(customerId);
          }
        }
      });

      activeCustomersCount = activeCustomerIds.size;

      // Top 5 customers by order count
      const topCustomers = Object.entries(customerOrderCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({
          name: customerNames[id],
          orders: count,
        }));

      // Monthly new customers data (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const key = format(month, "MMM yyyy");
        monthlyData.push({
          month: key,
          newCustomers: monthlyNewMap[key] || 0,
        });
      }

      // Pie chart: Customer activity tiers
      const highActivity = topCustomers.filter(c => c.orders > 5).length;
      const mediumActivity = topCustomers.filter(c => c.orders >= 2 && c.orders <= 5).length;
      const lowActivity = topCustomers.filter(c => c.orders === 1).length;
      const noOrders = totalCustomers - Object.keys(customerOrderCounts).filter(id => customerOrderCounts[id] > 0).length;

      const pieData = [
        { name: "High Activity (>5 orders)", value: highActivity },
        { name: "Medium (2-5 orders)", value: mediumActivity },
        { name: "Low (1 order)", value: lowActivity },
        { name: "Inactive (0 orders)", value: noOrders },
      ];

      return {
        totalCustomers,
        monthlyNew,
        activeCustomers: activeCustomersCount,
        topCustomers,
        monthlyData,
        pieData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-xl text-muted-foreground">Loading customer insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Card className="border-l-4 border-l-green-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold text-green-600">{data.monthlyNew}</p>
              </div>
              <UserPlus className="w-12 h-12 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-3xl font-bold text-purple-600">{data.activeCustomers}</p>
                <p className="text-xs text-muted-foreground mt-1">With ongoing laundry</p>
              </div>
              <Activity className="w-12 h-12 text-purple-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Orders per Customer</p>
                <p className="text-3xl font-bold text-orange-600">
                  {data.totalCustomers > 0 
                    ? (data.topCustomers.reduce((sum, c) => sum + c.orders, 0) / data.totalCustomers).toFixed(1)
                    : "0"}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart - Customer Activity */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Customer Activity Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {data.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Monthly New Customers */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">New Customers (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="newCustomers" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Growth Trend */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Customer Growth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="newCustomers" 
                stroke="#8b5cf6" 
                strokeWidth={3} 
                dot={{ fill: "#8b5cf6", r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Top 5 Loyal Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            ) : (
              data.topCustomers.map((cust, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <p className="font-medium text-lg">{cust.name}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{cust.orders} orders</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersTab;