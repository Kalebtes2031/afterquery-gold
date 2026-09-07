// src/components/dashboard/FinancialTab.tsx
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Receipt, Clock, PieChartIcon, BarChartIcon, LineChartIcon, TrendingDown } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { format, subDays, startOfDay, startOfMonth, subMonths } from "date-fns";

const COLORS = ["#22c55e", "#f97316", "#ef4444", "#3b82f6"]; // Green (Cleared), Orange (Pending), Red (Cancelled), Blue (Other)

const FinancialTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["financialStats"],
    queryFn: async () => {
      const invoicesSnap = await getDocs(collection(db, "invoices"));
      
      let totalRevenue = 0; // Sum of all paidAmount from non-cancelled
      let clearedRevenue = 0; // Sum of totalBill from cleared invoices
      let partialPayments = 0; // Sum of paidAmount from balance status
      let totalBalance = 0; // Sum of balance from balance status
      let pendingInvoices = 0; // Count of balance status
      let clearedInvoices = 0; // Count of cleared status
      let cancelledInvoices = 0; // Count of cancelled
      let dailySales = 0; // Today's payments
      let averageInvoice = 0; // Average totalBill (non-cancelled)
      let validInvoiceCount = 0;

      const todayStart = startOfDay(new Date());
      const dailySalesMap = {}; // Last 7 days
      const monthlyRevenueMap = {}; // Last 6 months

      invoicesSnap.forEach(doc => {
        const inv = doc.data();
        
        if (inv.status === "cancelled") {
          cancelledInvoices++;
          return;
        }

        // Total revenue: all paidAmount
        totalRevenue += inv.paidAmount || 0;

        // Balance and pending
        if (inv.status === "balance") {
          totalBalance += inv.balance || 0;
          partialPayments += inv.paidAmount || 0;
          pendingInvoices++;
        }

        // Cleared revenue: full totalBill for cleared
        if (inv.status === "cleared") {
          clearedRevenue += inv.totalBill || 0;
          clearedInvoices++;
        }

        // Average invoice
        if (inv.totalBill) {
          averageInvoice += inv.totalBill;
          validInvoiceCount++;
        }

        // Daily sales from paymentLogs
        if (inv.paymentLogs && inv.paymentLogs.length > 0) {
          inv.paymentLogs.forEach(log => {
            const logDate = log.createdAt?.toDate();
            if (logDate) {
              // Today
              if (logDate >= todayStart) {
                dailySales += log.amount || 0;
              }

              // Last 7 days
              const dayKey = format(logDate, "MMM dd");
              dailySalesMap[dayKey] = (dailySalesMap[dayKey] || 0) + (log.amount || 0);

              // Monthly trend (last 6 months)
              const monthKey = format(logDate, "MMM yyyy");
              monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + (log.amount || 0);
            }
          });
        }
      });

      averageInvoice = validInvoiceCount ? (averageInvoice / validInvoiceCount) : 0;

      // Last 7 days data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const key = format(date, "MMM dd");
        last7Days.push({
          day: key,
          sales: dailySalesMap[key] || 0,
        });
      }

      // Monthly data (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const key = format(month, "MMM yyyy");
        monthlyData.push({
          month: key,
          revenue: monthlyRevenueMap[key] || 0,
        });
      }

      // Pie data for breakdown
      const pieData = [
        { name: "Cleared Revenue", value: clearedRevenue },
        { name: "Partial Payments", value: partialPayments },
        { name: "Outstanding Balance", value: totalBalance },
        
      ];

      return {
        totalRevenue,
        clearedRevenue,
        totalBalance,
        pendingInvoices,
        dailySales,
        averageInvoice,
        clearedInvoices,
        cancelledInvoices,
        last7Days,
        monthlyData,
        pieData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-xl text-muted-foreground">Analyzing finances...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-600 shadow-md hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-3xl font-bold text-green-600">KSh {data.dailySales.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 shadow-md hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">KSh {data.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600 shadow-md hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Balance</p>
                <p className="text-3xl font-bold text-orange-600">KSh {data.totalBalance.toLocaleString()}</p>
              </div>
              <Clock className="w-12 h-12 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-md hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
                <p className="text-3xl font-bold text-purple-600">{data.pendingInvoices}</p>
              </div>
              <Receipt className="w-12 h-12 text-purple-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600 shadow-md hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled Invoices</p>
                <p className="text-3xl font-bold text-red-600">{data.cancelledInvoices}</p>
              </div>
              <TrendingDown className="w-12 h-12 text-red-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-600 shadow-md hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Invoice Value</p>
                <p className="text-3xl font-bold text-indigo-600">KSh {Math.round(data.averageInvoice).toLocaleString()}</p>
              </div>
              <PieChartIcon className="w-12 h-12 text-indigo-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart - Revenue Breakdown */}
        <Card className="shadow-xl border border-gray-200 rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `KSh ${value.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Last 7 Days Sales */}
        <Card className="shadow-xl border border-gray-200 rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Daily Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.last7Days} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `KSh ${value.toLocaleString()}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `KSh ${value.toLocaleString()}`} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Monthly Revenue Trend */}
      <Card className="shadow-xl border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Monthly Revenue Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `KSh ${value.toLocaleString()}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `KSh ${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: "#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialTab;