// src/components/dashboard/EmployeesTab.tsx
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock, TrendingUp, Calendar } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6"];

const EmployeesTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["employeesStats"],
    queryFn: async () => {
      // Fetch all employees
      const employeesQuery = query(collection(db, "users"), where("role", "==", "employee"));
      const employeesSnap = await getDocs(employeesQuery);

      // Fetch all laundry orders to calculate performance
      const ordersSnap = await getDocs(collection(db, "laundryOrders"));

      let totalEmployees = employeesSnap.size;
      let monthlyNew = 0;
      let activeEmployees = 0; // Employees with at least one order processed in last 30 days

      const currentMonthStart = startOfMonth(new Date());
      const monthlyNewMap: Record<string, number> = {};

      const employeePerformance: Record<string, { orders: number; name: string }> = {};
      const activeEmployeeIds = new Set<string>();

      // Process employees
      employeesSnap.forEach(doc => {
        const emp = doc.data();
        const empId = doc.id;
        const name = emp.name || emp.username || emp.email || "Unknown";

        employeePerformance[empId] = { orders: 0, name };

        const createdAt = emp.createdAt?.toDate();
        if (createdAt) {
          if (createdAt >= currentMonthStart) {
            monthlyNew++;
          }
          const monthKey = format(createdAt, "MMM yyyy");
          monthlyNewMap[monthKey] = (monthlyNewMap[monthKey] || 0) + 1;
        }
      });

      // Process orders to count per employee (use trackedAt or updatedAt as proxy)
      ordersSnap.forEach(doc => {
        const order = doc.data();
        const trackedAt = order.trackedAt?.toDate() || order.updatedAt?.toDate();
        if (trackedAt && trackedAt >= subMonths(new Date(), 1)) {
          // Assume orders are assigned to employees – if no direct field, use last updater or approximate
          // For simplicity, count total recent orders as shared workload
          activeEmployees = totalEmployees; // Placeholder – improve if you have employee assignment field
        }
      });

      // Top 5 employees (mock – replace with real if you track employee per order)
      const topEmployees = Object.values(employeePerformance)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      // Monthly new employees
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const key = format(month, "MMM yyyy");
        monthlyData.push({
          month: key,
          newEmployees: monthlyNewMap[key] || 0,
        });
      }

      // Pie: Experience level (mock based on join date – improve with real data)
      const pieData = [
        { name: "New (<3 months)", value: monthlyNewMap[format(new Date(), "MMM yyyy")] || 0 + (monthlyNewMap[format(subMonths(new Date(), 1), "MMM yyyy")] || 0) },
        { name: "Experienced", value: totalEmployees - monthlyNew },
      ];

      return {
        totalEmployees,
        monthlyNew,
        activeEmployees,
        topEmployees,
        monthlyData,
        pieData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-xl text-muted-foreground">Loading employee insights...</p>
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
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalEmployees}</p>
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
              <UserCheck className="w-12 h-12 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-3xl font-bold text-purple-600">{data.activeEmployees}</p>
              </div>
              <Clock className="w-12 h-12 text-purple-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Orders per Employee</p>
                <p className="text-3xl font-bold text-orange-600">
                  {data.totalEmployees > 0 ? (data.topEmployees.reduce((sum, e) => sum + e.orders, 0) / data.totalEmployees).toFixed(1) : "0"}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart - Employee Experience */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Employee Experience Levels</CardTitle>
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

        {/* Bar Chart - New Employees */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">New Employees (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="newEmployees" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Employees */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Top Performing Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No performance data yet</p>
            ) : (
              data.topEmployees.map((emp, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <p className="font-medium text-lg">{emp.name}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{emp.orders} orders handled</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesTab;