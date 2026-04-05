/** Dashboard API / RPC response shapes */

export type GroceryStats = {
  totalStock?: number;
  todaySales?: number;
  monthlySales?: number;
  monthlyProfit?: number;
  payables?: number;
  receivables?: number;
};

export type RentalStats = {
  total?: number;
  available?: number;
  rentedOut?: number;
  rentedIn?: number;
  maintenance?: number;
  todayRevenue?: number;
  todayExpense?: number;
  monthRevenue?: number;
  monthExpense?: number;
  monthRentExpense?: number;
  monthMaintenanceExpense?: number;
  monthProfit?: number;
  maintenanceExpenseYTD?: number;
  maintenanceDowntimeDaysMonth?: number;
  maintenanceRecordCountMonth?: number;
  /** Billable amount from logged working days/hours (outgoing), today */
  todayEarnedOutgoing?: number;
  /** Billable amount from logged working days/hours (outgoing), this month */
  monthEarnedOutgoing?: number;
};

export type MonthlyRentalPoint = {
  month: string;
  totalIncome: number;
  totalRentExpense?: number;
  totalMaintenanceExpense?: number;
  totalExpense: number;
  profit: number;
};

/** Trend data for charts (backend can provide these arrays) */
export type DailyGroceryPoint = {
  date: string; // YYYY-MM-DD
  sales: number;
  purchases: number;
  profit: number;
};

export type DailyRentalPoint = {
  date: string;
  revenue: number;
};

export type VehicleRevenueRow = {
  vehicleName: string;
  vehicleId: string;
  revenue: number;
  contractCount: number;
};

export type DashboardTrends = {
  groceryDaily: DailyGroceryPoint[];
  rentalDaily: DailyRentalPoint[];
  topVehicles: VehicleRevenueRow[];
};
