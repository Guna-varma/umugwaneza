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
  monthRevenue?: number;
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
