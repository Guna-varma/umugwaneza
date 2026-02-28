import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import { ChartCard } from "./ChartCard";
import type { RentalStats } from "./types";
import type { DailyRentalPoint, VehicleRevenueRow } from "./types";

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f43f5e", "#eab308"];

function formatRWF(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

export function RentalChartsSection({
  rental,
  rentalDaily,
  topVehicles,
}: {
  rental: RentalStats;
  rentalDaily: DailyRentalPoint[];
  topVehicles: VehicleRevenueRow[];
}) {
  const { t } = useTranslation();

  const total = Number(rental.total) || 0;
  const utilized = (Number(rental.rentedOut) || 0) + (Number(rental.rentedIn) || 0);
  const utilizationPct = total > 0 ? Math.round((utilized / total) * 100) : 0;

  const fleetData = [
    { name: t("dashboard.available"), value: Number(rental.available) || 0, color: "#10b981" },
    { name: t("dashboard.rented_out"), value: Number(rental.rentedOut) || 0, color: "#06b6d4" },
    { name: t("dashboard.rented_in"), value: Number(rental.rentedIn) || 0, color: "#8b5cf6" },
    { name: t("dashboard.maintenance"), value: Number(rental.maintenance) || 0, color: "#eab308" },
  ].filter((d) => d.value > 0);

  const last30 = rentalDaily.slice(-30);
  const topVehiclesChart = topVehicles.slice(0, 8).map((v) => ({
    name: v.vehicleName.length > 12 ? v.vehicleName.slice(0, 10) + "…" : v.vehicleName,
    revenue: v.revenue,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Vehicle Utilization" subtitle="% of fleet in use (rented out or in)">
          <div className="flex items-center justify-center h-[280px]">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray={`${utilizationPct * 2.64} 264`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="dashboard-kpi-value text-3xl text-[#10b981]">{utilizationPct}%</span>
                <span className="text-xs text-[#64748b] mt-0.5">utilized</span>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title={t("dashboard.monthly_rental_revenue")} subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={last30} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#475569", fontSize: 12 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 12 }}
                tickFormatter={formatRWF}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#1e293b",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatRWF(value) + " RWF", "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fleet Status" subtitle="Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={fleetData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {fleetData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#1e293b",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-[#475569]">{value}</span>}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Performing Vehicles" subtitle="By rental revenue">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={topVehiclesChart}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#475569", fontSize: 12 }} tickFormatter={formatRWF} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 12 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#1e293b",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [new Intl.NumberFormat("en-RW").format(Math.round(value)) + " RWF", ""]}
              />
              <Bar dataKey="revenue" fill="#eab308" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
  );
}
