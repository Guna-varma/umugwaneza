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
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";
import { ChartCard } from "./ChartCard";
import type { GroceryStats } from "./types";
import type { DailyGroceryPoint } from "./types";

const CHART_COLORS = {
  sales: "#06b6d4",
  purchases: "#f43f5e",
  profit: "#10b981",
  lastMonth: "#64748b",
  currentMonth: "#10b981",
};

function formatRWF(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

export function GroceryChartsSection({
  grocery,
  groceryDaily,
}: {
  grocery: GroceryStats;
  groceryDaily: DailyGroceryPoint[];
}) {
  const { t } = useTranslation();

  const last30 = groceryDaily.slice(-30);
  const monthlyPurchases = (Number(grocery.monthlySales) || 0) - (Number(grocery.monthlyProfit) || 0);
  const salesVsPurchasesData = [
    { name: t("dashboard.monthly_sales"), value: Number(grocery.monthlySales) || 0, fill: CHART_COLORS.sales },
    { name: "Purchases", value: monthlyPurchases >= 0 ? monthlyPurchases : 0, fill: CHART_COLORS.purchases },
  ].filter((d) => d.value > 0);

  const receivablesPayablesData = [
    { name: t("dashboard.outstanding_receivables"), amount: Number(grocery.receivables) || 0, fill: "#eab308" },
    { name: t("dashboard.outstanding_payables"), amount: Number(grocery.payables) || 0, fill: "#f43f5e" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t("dashboard.monthly_sales")} subtitle="Last 30 days">
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
                labelStyle={{ color: "#1e293b" }}
                formatter={(value: number) => [formatRWF(value) + " RWF", t("dashboard.monthly_sales")]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke={CHART_COLORS.sales}
                strokeWidth={2}
                dot={false}
                name={t("dashboard.monthly_sales")}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales vs Purchases" subtitle="This month">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={salesVsPurchasesData}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#475569", fontSize: 12 }} tickFormatter={formatRWF} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} width={100} />
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
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={48}>
                {salesVsPurchasesData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dashboard.monthly_profit")} subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={last30} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.profit} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART_COLORS.profit} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#475569", fontSize: 12 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#475569", fontSize: 12 }} tickFormatter={formatRWF} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#1e293b",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatRWF(value) + " RWF", t("dashboard.monthly_profit")]}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke={CHART_COLORS.profit}
                strokeWidth={2}
                fill="url(#profitGrad)"
                name={t("dashboard.monthly_profit")}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Receivables vs Payables" subtitle="Outstanding balances">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={receivablesPayablesData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 12 }}
                tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + "…" : v)}
              />
              <YAxis tick={{ fill: "#475569", fontSize: 12 }} tickFormatter={formatRWF} />
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
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={80}>
                {receivablesPayablesData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
  );
}
