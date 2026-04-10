import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import { exportReportWorkbook } from "@/lib/reportWorkbook";
import { useAuth } from "@/lib/useAuth";
import { rentalUsageLineCharge } from "@/lib/rentalUsage";
import {
  buildCustomerBreakdownRows,
  buildRentalUsageExecutiveSummary,
  buildVehicleBreakdownRows,
  type RentalUsageDetailRow,
} from "@/lib/rentalReportAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, FileText, Search, Truck, Wallet } from "lucide-react";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount));
}

const REPORT_TYPES = [
  { value: "daily", group: "grocery" },
  { value: "monthly", group: "grocery" },
  { value: "custom", group: "grocery" },
  { value: "purchases", group: "grocery" },
  { value: "sales", group: "grocery" },
  { value: "profit", group: "grocery" },
  { value: "outstanding_payables", group: "grocery" },
  { value: "outstanding_receivables", group: "grocery" },
  { value: "stock_summary", group: "grocery" },
  { value: "supplier_ledger", group: "grocery" },
  { value: "customer_ledger", group: "grocery" },
  { value: "daily", group: "rental" },
  { value: "monthly", group: "rental" },
  { value: "custom", group: "rental" },
  { value: "rental_outgoing", group: "rental" },
  { value: "rental_incoming", group: "rental" },
  { value: "vehicle_utilization", group: "rental" },
  { value: "rental_profit", group: "rental" },
];

type ReportGroup = "grocery" | "rental";

const GROCERY_REPORT_TYPES = REPORT_TYPES.filter((rt) => rt.group === "grocery");
const RENTAL_REPORT_TYPES = REPORT_TYPES.filter((rt) => rt.group === "rental");

export default function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "";
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = String(new Date().getMonth() + 1);
  const currentYear = String(new Date().getFullYear());

  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [supplierId, setSupplierId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [generateKey, setGenerateKey] = useState("");
  const [activeGroup, setActiveGroup] = useState<ReportGroup>("grocery");

  const { data: suppliers } = useQuery({
    queryKey: ["umugwaneza", "suppliers", "active"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("suppliers")
        .select("id, supplier_name")
        .eq("is_active", true)
        .order("supplier_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: customers } = useQuery({
    queryKey: ["umugwaneza", "customers", "active"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("customers")
        .select("id, customer_name")
        .eq("is_active", true)
        .order("customer_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  /** Supabase may return JSONB RPC result as the object or as [object]; normalize for consistent use. */
  function normalizeReportPayload(data: any): any {
    if (data == null) return data;
    let out = Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (out && typeof out === "object" && !Array.isArray(out) && Object.keys(out).length === 1) {
      const val = Object.values(out)[0];
      if (val && typeof val === "object") out = val;
    }
    return out;
  }

  function getMonthDateRange(month: string, year: string) {
    const from = new Date(Number(year), Number(month) - 1, 1);
    const to = new Date(Number(year), Number(month), 0);
    const toYmd = (value: Date) => value.toISOString().split("T")[0];
    return { from: toYmd(from), to: toYmd(to) };
  }

  async function fetchRentalUsageRangeReport(reportFrom: string, reportTo: string) {
    if (!businessId) {
      return {
        reportSource: "rental_usage",
        rows: [],
        vehicleBreakdownRows: [],
        customerBreakdownRows: [],
        totalBillable: 0,
        totalDayUnits: 0,
        activeVehicles: 0,
        activeCustomers: 0,
        averageEntryCharge: 0,
        topVehicle: "—",
        topVehicleCharge: 0,
        topCustomer: "—",
        topCustomerCharge: 0,
        totalEntries: 0,
        contractCount: 0,
      };
    }

    const { data: usage, error } = await db()
      .from("rental_usage")
      .select("*")
      .eq("business_id", businessId)
      .gte("usage_date", reportFrom)
      .lte("usage_date", reportTo)
      .order("usage_date", { ascending: true });

    if (error) throw new Error(error.message);
    if (!usage?.length) {
      return {
        reportSource: "rental_usage",
        rows: [],
        vehicleBreakdownRows: [],
        customerBreakdownRows: [],
        totalBillable: 0,
        totalDayUnits: 0,
        activeVehicles: 0,
        activeCustomers: 0,
        averageEntryCharge: 0,
        topVehicle: "—",
        topVehicleCharge: 0,
        topCustomer: "—",
        topCustomerCharge: 0,
        totalEntries: 0,
        contractCount: 0,
      };
    }

    const contractIds = Array.from(new Set(usage.map((row: any) => row.rental_contract_id)));
    const { data: contracts, error: contractsError } = await db()
      .from("rental_contracts")
      .select("id, rate, rental_type, rental_direction, vehicle:vehicles(vehicle_name), customer:customers(customer_name)")
      .eq("business_id", businessId)
      .eq("rental_direction", "OUTGOING")
      .in("id", contractIds);

    if (contractsError) throw new Error(contractsError.message);

    const contractMap = new Map(
      (contracts ?? []).map((contract: any) => [
        contract.id,
        {
          rate: Number(contract.rate) || 0,
          rental_type: contract.rental_type || "DAY",
          vehicle_name: Array.isArray(contract.vehicle) ? contract.vehicle[0]?.vehicle_name : contract.vehicle?.vehicle_name,
          customer_name: Array.isArray(contract.customer) ? contract.customer[0]?.customer_name : contract.customer?.customer_name,
        },
      ]),
    );

    const detailRows: RentalUsageDetailRow[] = usage
      .filter((row: any) => contractMap.has(row.rental_contract_id))
      .map((row: any) => {
        const contract = contractMap.get(row.rental_contract_id);
        const charge = rentalUsageLineCharge(contract?.rental_type, contract?.rate ?? 0, row.day_fraction, row.machine_hours);
        return {
          contractId: row.rental_contract_id,
          date: row.usage_date,
          vehicle: contract?.vehicle_name ?? "—",
          customer: contract?.customer_name ?? "—",
          dayUnits: Number(row.day_fraction) || 0,
          hours: Number(row.machine_hours) || 0,
          charge,
          notes: row.notes ?? "",
        };
      });

    const executiveSummary = buildRentalUsageExecutiveSummary(detailRows);
    const vehicleBreakdownRows = buildVehicleBreakdownRows(detailRows);
    const customerBreakdownRows = buildCustomerBreakdownRows(detailRows);

    return {
      reportSource: "rental_usage",
      rows: detailRows.map((row) => ({
        date: row.date,
        vehicle: row.vehicle,
        customer: row.customer,
        dayUnits: row.dayUnits,
        hours: row.hours,
        charge: row.charge,
      })),
      vehicleBreakdownRows,
      customerBreakdownRows,
      totalBillable: executiveSummary.totalCharge,
      totalDayUnits: executiveSummary.totalDayUnits,
      activeVehicles: executiveSummary.vehicleCount,
      activeCustomers: executiveSummary.customerCount,
      averageEntryCharge: executiveSummary.averageChargePerEntry,
      topVehicle: executiveSummary.topVehicleLabel,
      topVehicleCharge: executiveSummary.topVehicleCharge,
      topCustomer: executiveSummary.topCustomerLabel,
      topCustomerCharge: executiveSummary.topCustomerCharge,
      totalEntries: executiveSummary.totalEntries,
      contractCount: executiveSummary.contractCount,
    };
  }

  async function fetchReport(): Promise<any> {
    let data: any;
    switch (reportType) {
      case "daily": {
        if (activeGroup === "rental") {
          return fetchRentalUsageRangeReport(selectedDate, selectedDate);
        }
        const res = await db().rpc("report_daily", { p_date: selectedDate });
        if (res.error) throw new Error(res.error.message);
        data = res.data;
        return normalizeReportPayload(data);
      }
      case "monthly": {
        if (activeGroup === "rental") {
          const range = getMonthDateRange(selectedMonth, selectedYear);
          return fetchRentalUsageRangeReport(range.from, range.to);
        }
        const res = await db().rpc("report_monthly", { p_month: parseInt(selectedMonth, 10), p_year: parseInt(selectedYear, 10) });
        if (res.error) throw new Error(res.error.message);
        data = res.data;
        return normalizeReportPayload(data);
      }
      case "custom": {
        if (activeGroup === "rental") {
          return fetchRentalUsageRangeReport(fromDate, toDate);
        }
        const res = await db().rpc("report_custom", { p_from: fromDate, p_to: toDate });
        if (res.error) throw new Error(res.error.message);
        data = res.data;
        return normalizeReportPayload(data);
      }
      case "purchases": {
        const supId = supplierId && supplierId !== "all" ? supplierId : null;
        const { data, error } = await db().rpc("report_purchases", { p_from: fromDate, p_to: toDate, p_supplier_id: supId });
        if (error) throw new Error(error.message);
        return data;
      }
      case "sales": {
        const custId = customerId && customerId !== "all" ? customerId : null;
        const { data, error } = await db().rpc("report_sales", { p_from: fromDate, p_to: toDate, p_customer_id: custId });
        if (error) throw new Error(error.message);
        return data;
      }
      case "profit": {
        const { data, error } = await db().rpc("report_profit", { p_from: fromDate, p_to: toDate });
        if (error) throw new Error(error.message);
        return data;
      }
      case "outstanding_payables": {
        const supId = supplierId && supplierId !== "all" ? supplierId : null;
        const { data, error } = await db().rpc("report_outstanding_payables", { p_supplier_id: supId });
        if (error) throw new Error(error.message);
        return data;
      }
      case "outstanding_receivables": {
        const custId = customerId && customerId !== "all" ? customerId : null;
        const { data, error } = await db().rpc("report_outstanding_receivables", { p_customer_id: custId });
        if (error) throw new Error(error.message);
        return data;
      }
      case "stock_summary": {
        const { data, error } = await db().rpc("report_stock_summary");
        if (error) throw new Error(error.message);
        return data;
      }
      case "supplier_ledger": {
        const { data, error } = await db().rpc("report_supplier_ledger", { p_supplier_id: supplierId, p_from: fromDate || null, p_to: toDate || null });
        if (error) throw new Error(error.message);
        return data;
      }
      case "customer_ledger": {
        const { data, error } = await db().rpc("report_customer_ledger", { p_customer_id: customerId, p_from: fromDate || null, p_to: toDate || null });
        if (error) throw new Error(error.message);
        return data;
      }
      case "rental_outgoing": {
        const { data, error } = await db().rpc("report_rental_outgoing", { p_from: fromDate, p_to: toDate });
        if (error) throw new Error(error.message);
        return data;
      }
      case "rental_incoming": {
        const { data, error } = await db().rpc("report_rental_incoming", { p_from: fromDate, p_to: toDate });
        if (error) throw new Error(error.message);
        return data;
      }
      case "vehicle_utilization": {
        const { data, error } = await db().rpc("report_vehicle_utilization", { p_from: fromDate, p_to: toDate });
        if (error) throw new Error(error.message);
        return data;
      }
      case "rental_profit": {
        const { data, error } = await db().rpc("report_rental_profit", { p_from: fromDate || null, p_to: toDate || null });
        if (error) throw new Error(error.message);
        return data;
      }
      default: {
        const res = await db().rpc("report_daily", { p_date: selectedDate });
        if (res.error) throw new Error(res.error.message);
        return normalizeReportPayload(res.data);
      }
    }
  }

  const queryKey = ["report", activeGroup, businessId, reportType, selectedDate, selectedMonth, selectedYear, fromDate, toDate, supplierId, customerId, generateKey];
  const { data: reportData, isLoading } = useQuery<any>({
    queryKey,
    queryFn: fetchReport,
    enabled: !!generateKey,
  });

  const handleGenerate = () => {
    setGenerateKey(String(Date.now()));
  };

  const needsDateRange = ["custom", "purchases", "sales", "profit", "supplier_ledger", "customer_ledger", "rental_outgoing", "rental_incoming", "vehicle_utilization", "rental_profit"].includes(reportType);
  const needsSupplier = ["purchases", "outstanding_payables", "supplier_ledger"].includes(reportType);
  const needsCustomer = ["sales", "outstanding_receivables", "customer_ledger"].includes(reportType);
  const requiresSupplier = reportType === "supplier_ledger";
  const requiresCustomer = reportType === "customer_ledger";

  const visibleReportTypes = activeGroup === "grocery" ? GROCERY_REPORT_TYPES : RENTAL_REPORT_TYPES;

  function handleGroupChange(group: ReportGroup) {
    setActiveGroup(group);
    const allowed = group === "grocery" ? GROCERY_REPORT_TYPES : RENTAL_REPORT_TYPES;
    if (!allowed.some((rt) => rt.value === reportType)) {
      const fallback = group === "grocery" ? "daily" : (RENTAL_REPORT_TYPES[0]?.value ?? "rental_outgoing");
      setReportType(fallback);
    }
    setGenerateKey("");
  }

  function getReportFilename() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const base = "UMUGWANEZA_LTD";
    switch (reportType) {
      case "daily": return `${base}_Daily_Report_${selectedDate}.xlsx`;
      case "monthly": return `${base}_Monthly_Report_${months[parseInt(selectedMonth, 10) - 1]}_${selectedYear}.xlsx`;
      case "custom": return `${base}_Custom_Report_${fromDate}_to_${toDate}.xlsx`;
      case "purchases": return `${base}_Purchases_Report_${fromDate}_to_${toDate}.xlsx`;
      case "sales": return `${base}_Sales_Report_${fromDate}_to_${toDate}.xlsx`;
      case "profit": return `${base}_Profit_Report_${fromDate}_to_${toDate}.xlsx`;
      case "outstanding_payables": return `${base}_Outstanding_Payables_${today}.xlsx`;
      case "outstanding_receivables": return `${base}_Outstanding_Receivables_${today}.xlsx`;
      case "stock_summary": return `${base}_Stock_Summary_${today}.xlsx`;
      case "supplier_ledger": return `${base}_Supplier_Ledger_${fromDate}_to_${toDate}.xlsx`;
      case "customer_ledger": return `${base}_Customer_Ledger_${fromDate}_to_${toDate}.xlsx`;
      case "rental_outgoing": return `${base}_Rental_Outgoing_${fromDate}_to_${toDate}.xlsx`;
      case "rental_incoming": return `${base}_Rental_Incoming_${fromDate}_to_${toDate}.xlsx`;
      case "vehicle_utilization": return `${base}_Vehicle_Utilization_${fromDate}_to_${toDate}.xlsx`;
      case "rental_profit": return `${base}_Rental_Profit_${fromDate}_to_${toDate}.xlsx`;
      default: return `${base}_Report_${today}.xlsx`;
    }
  }

  type ColDef = { key: string; label: string; align?: string };

  function getColumns(): ColDef[] {
    switch (reportType) {
      case "daily": case "monthly": case "custom":
        if (activeGroup === "rental") {
          return [
            { key: "date", label: t("reports.date") },
            { key: "vehicle", label: t("reports.col_vehicle") },
            { key: "customer", label: t("reports.col_customer") },
            { key: "dayUnits", label: t("rental_usage.day_units"), align: "right" },
            { key: "hours", label: t("rental_usage.col_hours"), align: "right" },
            { key: "charge", label: t("rental_usage.col_charge"), align: "right" },
          ];
        }
        return [
          { key: "date", label: t("reports.date") }, { key: "type", label: t("reports.type") },
          { key: "reference", label: t("reports.reference") }, { key: "party", label: t("reports.party") },
          { key: "item_vehicle", label: t("reports.item_vehicle") }, { key: "quantity", label: t("reports.quantity") },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "paid", label: t("reports.paid_rwf"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "purchases":
        return [
          { key: "date", label: t("reports.date") }, { key: "supplier", label: t("reports.col_supplier") },
          { key: "item", label: t("reports.col_item") }, { key: "quantity", label: t("reports.quantity") },
          { key: "unit", label: t("reports.col_unit") }, { key: "unit_price", label: t("reports.col_unit_price"), align: "right" },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "paid", label: t("reports.paid_rwf"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "sales":
        return [
          { key: "date", label: t("reports.date") }, { key: "customer", label: t("reports.col_customer") },
          { key: "item", label: t("reports.col_item") }, { key: "quantity", label: t("reports.quantity") },
          { key: "unit", label: t("reports.col_unit") }, { key: "unit_price", label: t("reports.col_unit_price"), align: "right" },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "received", label: t("reports.col_received"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "profit":
        return [
          { key: "date", label: t("reports.date") },
          { key: "totalSales", label: t("reports.total_sales"), align: "right" },
          { key: "totalPurchases", label: t("reports.total_purchases"), align: "right" },
          { key: "profit", label: t("reports.col_profit"), align: "right" },
        ];
      case "outstanding_payables":
        return [
          { key: "date", label: t("reports.date") }, { key: "supplier", label: t("reports.col_supplier") },
          { key: "item", label: t("reports.col_item") },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "paid", label: t("reports.paid_rwf"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "outstanding_receivables":
        return [
          { key: "date", label: t("reports.date") }, { key: "customer", label: t("reports.col_customer") },
          { key: "item", label: t("reports.col_item") },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "received", label: t("reports.col_received"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "stock_summary":
        return [
          { key: "item", label: t("reports.col_item") },
          { key: "totalPurchased", label: t("reports.col_total_purchased"), align: "right" },
          { key: "totalSold", label: t("reports.col_total_sold"), align: "right" },
          { key: "currentStock", label: t("reports.col_current_stock"), align: "right" },
          { key: "unit", label: t("reports.col_unit") },
        ];
      case "supplier_ledger":
        return [
          { key: "date", label: t("reports.date") }, { key: "reference", label: t("reports.reference") },
          { key: "purchaseAmount", label: t("reports.col_purchase_amount"), align: "right" },
          { key: "paymentAmount", label: t("reports.col_payment_amount"), align: "right" },
          { key: "balance", label: t("reports.col_balance"), align: "right" },
        ];
      case "customer_ledger":
        return [
          { key: "date", label: t("reports.date") }, { key: "reference", label: t("reports.reference") },
          { key: "saleAmount", label: t("reports.col_sale_amount"), align: "right" },
          { key: "paymentAmount", label: t("reports.col_payment_amount"), align: "right" },
          { key: "balance", label: t("reports.col_balance"), align: "right" },
        ];
      case "rental_outgoing":
        return [
          { key: "customer", label: t("reports.col_customer") }, { key: "vehicle", label: t("reports.col_vehicle") },
          { key: "period", label: t("reports.col_period") },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "paid", label: t("reports.paid_rwf"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "rental_incoming":
        return [
          { key: "externalOwner", label: t("reports.col_external_owner") }, { key: "vehicle", label: t("reports.col_vehicle") },
          { key: "period", label: t("reports.col_period") },
          { key: "total", label: t("reports.total_rwf"), align: "right" },
          { key: "paid", label: t("reports.paid_rwf"), align: "right" },
          { key: "remaining", label: t("reports.remaining_rwf"), align: "right" },
          { key: "status", label: t("reports.status") },
        ];
      case "vehicle_utilization":
        return [
          { key: "vehicle", label: t("reports.col_vehicle") }, { key: "type", label: t("reports.type") },
          { key: "totalRentalDays", label: t("reports.col_rental_days"), align: "right" },
          { key: "rentalCount", label: t("reports.col_rental_count"), align: "right" },
          { key: "totalRevenue", label: t("reports.col_revenue"), align: "right" },
          { key: "utilization", label: t("reports.col_utilization"), align: "right" },
          { key: "availability", label: t("reports.col_availability"), align: "right" },
        ];
      case "rental_profit":
        return [];
      default:
        return [];
    }
  }

  function getSummaryLines(): { label: string; value: string }[] {
    if (!reportData) return [];
    if (activeGroup === "rental" && ["daily", "monthly", "custom"].includes(reportType) && reportData.reportSource === "rental_usage") {
      return [
        { label: t("rental_usage.summary_total_charge"), value: `${formatRWF(reportData.totalBillable || 0)} RWF` },
        { label: t("rental_usage.summary_total_day_units"), value: Number(reportData.totalDayUnits || 0).toFixed(2) },
        { label: t("rental_usage.summary_active_vehicles"), value: String(reportData.activeVehicles || 0) },
        { label: t("rental_usage.summary_avg_entry_charge"), value: `${formatRWF(reportData.averageEntryCharge || 0)} RWF` },
        { label: t("rental_usage.summary_top_vehicle"), value: reportData.topVehicle ? `${reportData.topVehicle} • ${formatRWF(reportData.topVehicleCharge || 0)} RWF` : "—" },
        { label: t("rental_usage.summary_top_customer"), value: reportData.topCustomer ? `${reportData.topCustomer} • ${formatRWF(reportData.topCustomerCharge || 0)} RWF` : "—" },
      ];
    }
    if (activeGroup === "rental" && ["daily", "monthly", "custom"].includes(reportType)) {
      const rev = reportData.totalRentalRevenue || 0;
      const cost = reportData.totalRentalCost || 0;
      return [
        { label: t("reports.total_rental_revenue"), value: formatRWF(rev) },
        { label: t("reports.total_rental_cost"), value: formatRWF(cost) },
        { label: t("reports.net_profit"), value: formatRWF(rev - cost) },
      ];
    }
    if (activeGroup === "grocery" && ["daily", "monthly", "custom"].includes(reportType)) {
      const purchase = reportData.totalPurchase || 0;
      const sales = reportData.totalSales || 0;
      return [
        { label: t("reports.total_purchases"), value: formatRWF(purchase) },
        { label: t("reports.total_sales"), value: formatRWF(sales) },
        { label: t("reports.net_profit"), value: formatRWF(sales - purchase) },
      ];
    }
    switch (reportType) {
      case "daily": case "monthly": case "custom":
        return [
          { label: t("reports.total_purchases"), value: formatRWF(reportData.totalPurchase || 0) },
          { label: t("reports.total_sales"), value: formatRWF(reportData.totalSales || 0) },
          { label: t("reports.total_rental_revenue"), value: formatRWF(reportData.totalRentalRevenue || 0) },
          { label: t("reports.total_rental_cost"), value: formatRWF(reportData.totalRentalCost || 0) },
          { label: t("reports.net_profit"), value: formatRWF(reportData.netProfit || 0) },
        ];
      case "purchases":
        return [
          { label: t("reports.col_total_purchased_amount"), value: formatRWF(reportData.totalPurchased || 0) },
          { label: t("reports.col_total_paid"), value: formatRWF(reportData.totalPaid || 0) },
          { label: t("reports.col_total_outstanding"), value: formatRWF(reportData.totalOutstanding || 0) },
        ];
      case "sales":
        return [
          { label: t("reports.total_sales"), value: formatRWF(reportData.totalSales || 0) },
          { label: t("reports.col_total_received"), value: formatRWF(reportData.totalReceived || 0) },
          { label: t("reports.col_total_outstanding"), value: formatRWF(reportData.totalOutstanding || 0) },
        ];
      case "profit":
        return [
          { label: t("reports.col_grand_total_sales"), value: formatRWF(reportData.grandTotalSales || 0) },
          { label: t("reports.col_grand_total_purchases"), value: formatRWF(reportData.grandTotalPurchases || 0) },
          { label: t("reports.net_profit"), value: formatRWF(reportData.netProfit || 0) },
        ];
      case "outstanding_payables":
        return [{ label: t("reports.col_total_outstanding"), value: formatRWF(reportData.totalOutstanding || 0) }];
      case "outstanding_receivables":
        return [{ label: t("reports.col_total_outstanding"), value: formatRWF(reportData.totalOutstanding || 0) }];
      case "supplier_ledger":
        return [{ label: t("reports.col_final_balance"), value: formatRWF(reportData.finalBalance || 0) }];
      case "customer_ledger":
        return [{ label: t("reports.col_final_balance"), value: formatRWF(reportData.finalBalance || 0) }];
      case "rental_outgoing":
        return [
          { label: t("reports.col_total_revenue"), value: formatRWF(reportData.totalRevenue || 0) },
          { label: t("reports.col_total_received"), value: formatRWF(reportData.totalReceived || 0) },
          { label: t("reports.col_total_outstanding"), value: formatRWF(reportData.totalOutstanding || 0) },
        ];
      case "rental_incoming":
        return [
          { label: t("reports.col_total_cost"), value: formatRWF(reportData.totalCost || 0) },
          { label: t("reports.col_total_paid"), value: formatRWF(reportData.totalPaid || 0) },
          { label: t("reports.col_total_outstanding"), value: formatRWF(reportData.totalOutstanding || 0) },
        ];
      case "vehicle_utilization": {
        const utilizationRows: any[] = reportData.rows || [];
        const totalVehicles = utilizationRows.length;
        const activeVehicles = utilizationRows.filter((row: any) => Number(row.totalRentalDays || 0) > 0).length;
        const totalRentalDays = utilizationRows.reduce((sum: number, row: any) => sum + (Number(row.totalRentalDays) || 0), 0);
        const totalRevenue = utilizationRows.reduce((sum: number, row: any) => sum + (Number(row.totalRevenue) || 0), 0);
        const averageUtilization = totalVehicles > 0
          ? utilizationRows.reduce((sum: number, row: any) => sum + Math.max(0, 100 - (Number(row.availability) || 0)), 0) / totalVehicles
          : 0;

        return [
          { label: t("reports.col_total_vehicles"), value: String(totalVehicles) },
          { label: t("reports.col_active_vehicles"), value: String(activeVehicles) },
          { label: t("reports.col_total_rental_days"), value: String(totalRentalDays) },
          { label: t("reports.col_total_revenue"), value: formatRWF(totalRevenue) },
          { label: t("reports.col_avg_utilization"), value: `${averageUtilization.toFixed(1)}%` },
        ];
      }
      case "rental_profit":
        return [
          { label: t("reports.col_total_revenue"), value: formatRWF(reportData.totalRevenue || 0) },
          { label: t("reports.col_total_cost"), value: formatRWF(reportData.totalCost || 0) },
          { label: t("reports.net_profit"), value: formatRWF(reportData.netProfit || 0) },
        ];
      default:
        return [];
    }
  }

  function formatCellValue(key: string, value: any) {
    if (value === null || value === undefined) return "—";
    if (key === "status") return <Badge variant="secondary" data-testid={`badge-status-${value}`}>{String(value).replace(/_/g, " ")}</Badge>;
    if (key === "type") return <Badge variant="secondary">{value}</Badge>;
    if (["total", "paid", "remaining", "received", "unit_price", "totalSales", "totalPurchases", "profit", "purchaseAmount", "paymentAmount", "balance", "saleAmount", "totalRevenue", "charge"].includes(key)) {
      return formatRWF(Number(value) || 0);
    }
    if (["currentStock", "totalPurchased", "totalSold", "totalRentalDays", "rentalCount"].includes(key)) {
      return new Intl.NumberFormat("en-RW").format(Number(value) || 0);
    }
    if (key === "dayUnits") return Number(value || 0).toFixed(2);
    if (key === "hours") return Number(value || 0) > 0 ? Number(value || 0).toFixed(1) : "—";
    if (key === "availability" || key === "utilization") return `${value}%`;
    return String(value);
  }

  const columns = getColumns();
  const summaryLines = getSummaryLines();
  const rawRows: any[] = reportData?.rows || [];
  const isRentalUsageReplica = activeGroup === "rental" && ["daily", "monthly", "custom"].includes(reportType) && reportData?.reportSource === "rental_usage";
  const isRentalUnified = activeGroup === "rental" && ["daily", "monthly", "custom"].includes(reportType);
  const isGroceryUnified = activeGroup === "grocery" && ["daily", "monthly", "custom"].includes(reportType);
  const rows = isRentalUsageReplica
    ? rawRows
    : isRentalUnified
    ? rawRows.filter((r: any) => r.type === "Rental Out" || r.type === "Rental In")
    : isGroceryUnified
      ? rawRows.filter((r: any) => r.type !== "Rental Out" && r.type !== "Rental In")
      : rawRows;
  const hasReport = !!reportData;
  const reportError = hasReport && reportData?.error ? String(reportData.error) : null;
  const hasRows = rows.length > 0;
  const hasSummaryOnly = reportType === "rental_profit" && hasReport;
  const canDownloadExcel = hasReport;
  const canGenerate = reportType === "supplier_ledger" ? !!supplierId : reportType === "customer_ledger" ? !!customerId : true;

  const reportFilters = useMemo(() => {
    const filters: { label: string; value: string }[] = [];
    filters.push({ label: t("reports.report_type"), value: t(`reports.type_${reportType}`) });
    if (activeGroup === "grocery" || activeGroup === "rental") {
      filters.push({
        label: t("reports.report_category"),
        value: activeGroup === "grocery" ? t("reports.grocery_tab") : t("reports.rental_tab"),
      });
    }
    if (reportType === "daily") {
      filters.push({ label: t("reports.date"), value: selectedDate });
    }
    if (reportType === "monthly") {
      filters.push({ label: t("reports.filter_month"), value: `${t(`reports.month_${selectedMonth}`)} ${selectedYear}` });
    }
    if (needsDateRange) {
      filters.push({ label: t("reports.from_date"), value: fromDate });
      filters.push({ label: t("reports.to_date"), value: toDate });
    }
    if (needsSupplier) {
      const supplierName = (suppliers as any[])?.find((supplier: any) => supplier.id === supplierId)?.supplier_name;
      filters.push({ label: t("reports.filter_supplier"), value: supplierName || t("reports.select_all") });
    }
    if (needsCustomer) {
      const customerName = (customers as any[])?.find((customer: any) => customer.id === customerId)?.customer_name;
      filters.push({ label: t("reports.filter_customer"), value: customerName || t("reports.select_all") });
    }
    return filters;
  }, [
    activeGroup,
    customerId,
    customers,
    fromDate,
    needsCustomer,
    needsDateRange,
    needsSupplier,
    reportType,
    selectedDate,
    selectedMonth,
    selectedYear,
    supplierId,
    suppliers,
    t,
    toDate,
  ]);

  const reportSummaryCards = useMemo(
    () => summaryLines.map((line, index) => ({
      ...line,
      icon:
        reportType === "vehicle_utilization"
          ? index === 0
            ? Truck
            : index === 3
              ? Wallet
              : BarChart3
          : index % 2 === 0
            ? Wallet
            : BarChart3,
      accent:
        index === 0 ? "bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]"
        : index === 1 ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]"
        : index === 2 ? "bg-[#fffbeb] border-[#fde68a] text-[#b45309]"
        : "bg-[#f8fafc] border-[#cbd5e1] text-[#334155]",
    })),
    [reportType, summaryLines],
  );

  function downloadExcel() {
    if (!reportData) return;

    const detailRows = rows.map((row: Record<string, unknown>) =>
      Object.fromEntries(
        columns.map((column) => [column.key, row[column.key] as string | number | boolean | null | undefined]),
      ),
    );

    const sections = columns.length > 0
      ? [
          {
            title: t("reports.detail_section"),
            columns: columns.map((column) => ({ key: column.key, label: column.label })),
            rows: detailRows,
            emptyMessage: t("reports.no_data"),
          },
        ]
      : [];

    if (reportType === "vehicle_utilization" && rows.length > 0) {
      const rankedVehicles = [...rows]
        .sort((a: any, b: any) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0))
        .slice(0, 10)
        .map((row: any) => ({
          vehicle: row.vehicle,
          type: row.type,
          totalRentalDays: Number(row.totalRentalDays) || 0,
          rentalCount: Number(row.rentalCount) || 0,
          totalRevenue: Math.round(Number(row.totalRevenue) || 0),
          utilization: `${Number(row.utilization) || 0}%`,
          availability: `${Number(row.availability) || 0}%`,
        }));

      sections.push({
        title: t("reports.vehicle_rankings"),
        columns: [
          { key: "vehicle", label: t("reports.col_vehicle") },
          { key: "type", label: t("reports.type") },
          { key: "totalRentalDays", label: t("reports.col_rental_days") },
          { key: "rentalCount", label: t("reports.col_rental_count") },
          { key: "totalRevenue", label: t("reports.col_revenue") },
          { key: "utilization", label: t("reports.col_utilization") },
          { key: "availability", label: t("reports.col_availability") },
        ],
        rows: rankedVehicles,
        emptyMessage: t("reports.no_data"),
      });
    }

    if (isRentalUsageReplica) {
      const vehicleBreakdownRows: any[] = reportData.vehicleBreakdownRows || [];
      const customerBreakdownRows: any[] = reportData.customerBreakdownRows || [];

      sections.push({
        title: t("rental_usage.vehicle_summary"),
        columns: [
          { key: "label", label: t("reports.col_vehicle") },
          { key: "contractCount", label: t("rental_usage.col_contracts") },
          { key: "entries", label: t("rental_usage.col_entries") },
          { key: "dayUnits", label: t("rental_usage.day_units") },
          { key: "hours", label: t("rental_usage.col_hours") },
          { key: "charge", label: t("rental_usage.col_charge") },
        ],
        rows: vehicleBreakdownRows.map((row: any) => ({
          label: row.label,
          contractCount: row.contractCount,
          entries: row.entries,
          dayUnits: Number(row.dayUnits || 0).toFixed(2),
          hours: Number(row.hours || 0).toFixed(1),
          charge: Math.round(Number(row.charge) || 0),
        })),
        emptyMessage: t("reports.no_data"),
      });

      sections.push({
        title: t("rental_usage.customer_summary"),
        columns: [
          { key: "label", label: t("reports.col_customer") },
          { key: "contractCount", label: t("rental_usage.col_contracts") },
          { key: "entries", label: t("rental_usage.col_entries") },
          { key: "dayUnits", label: t("rental_usage.day_units") },
          { key: "hours", label: t("rental_usage.col_hours") },
          { key: "charge", label: t("rental_usage.col_charge") },
        ],
        rows: customerBreakdownRows.map((row: any) => ({
          label: row.label,
          contractCount: row.contractCount,
          entries: row.entries,
          dayUnits: Number(row.dayUnits || 0).toFixed(2),
          hours: Number(row.hours || 0).toFixed(1),
          charge: Math.round(Number(row.charge) || 0),
        })),
        emptyMessage: t("reports.no_data"),
      });
    }

    exportReportWorkbook({
      fileName: getReportFilename(),
      sheetName: "report",
      title: t("reports.export_title"),
      subtitle: activeGroup === "grocery" ? t("reports.grocery_tab") : t("reports.rental_tab"),
      filters: reportFilters,
      metrics: reportSummaryCards.map((card) => ({ label: card.label, value: card.value })),
      sections,
    });
  }

  function renderReportContent() {
    return (
      <>
        <Card className="border border-[#e2e8f0] bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-[#64748b]">{t("reports.report_type")}</Label>
                <Select value={reportType} onValueChange={(v) => { setReportType(v); setGenerateKey(""); }}>
                  <SelectTrigger data-testid="select-report-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {visibleReportTypes.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {t(`reports.type_${rt.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reportType === "daily" && (
                <div>
                  <Label className="text-sm text-[#64748b]">{t("reports.date")}</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border-[#e2e8f0]" data-testid="input-report-date" />
                </div>
              )}

              {reportType === "monthly" && (
                <>
                  <div>
                    <Label className="text-sm text-[#64748b]">{t("reports.filter_month")}</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger data-testid="select-month"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{t(`reports.month_${i + 1}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-[#64748b]">{t("reports.filter_year")}</Label>
                    <Input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border-[#e2e8f0]" data-testid="input-year" />
                  </div>
                </>
              )}

              {needsDateRange && (
                <>
                  <div>
                    <Label className="text-sm text-[#64748b]">{t("reports.from_date")}</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border-[#e2e8f0]" data-testid="input-from-date" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#64748b]">{t("reports.to_date")}</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border-[#e2e8f0]" data-testid="input-to-date" />
                  </div>
                </>
              )}

              {needsSupplier && (
                <div>
                  <Label className="text-sm text-[#64748b]">{t("reports.filter_supplier")}{requiresSupplier ? " *" : ""}</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger data-testid="select-supplier"><SelectValue placeholder={t("reports.select_all")} /></SelectTrigger>
                    <SelectContent>
                      {!requiresSupplier && <SelectItem value="all">{t("reports.select_all")}</SelectItem>}
                      {(suppliers as any[])?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsCustomer && (
                <div>
                  <Label className="text-sm text-[#64748b]">{t("reports.filter_customer")}{requiresCustomer ? " *" : ""}</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger data-testid="select-customer"><SelectValue placeholder={t("reports.select_all")} /></SelectTrigger>
                    <SelectContent>
                      {!requiresCustomer && <SelectItem value="all">{t("reports.select_all")}</SelectItem>}
                      {(customers as any[])?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button className="h-10 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" onClick={handleGenerate} disabled={!canGenerate} data-testid="button-generate">
                <Search className="h-4 w-4 mr-2" /> {t("reports.generate")}
              </Button>
              <Button variant="outline" className="h-10 border-[#e2e8f0]" onClick={downloadExcel} disabled={!canDownloadExcel} data-testid="button-download-excel" title={canDownloadExcel ? t("reports.download_excel") : t("reports.generate_first_hint")}>
                <Download className="h-4 w-4 mr-2" /> {t("reports.download_excel")}
              </Button>
              {!hasReport && <span className="text-sm text-[#64748b]">{t("reports.generate_first_hint")}</span>}
            </div>
          </CardContent>
        </Card>

        {reportSummaryCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {reportSummaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`rounded-xl border p-4 ${card.accent}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{card.label}</p>
                      <p className="mt-2 text-xl font-bold text-[#0f172a]">{card.value}</p>
                    </div>
                    <Icon className="h-5 w-5 opacity-80" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reportType === "rental_profit" && reportData ? (
          <Card className="border border-[#e2e8f0] bg-white">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[#f1f5f9] rounded-lg">
                  <p className="text-sm text-[#64748b]">{t("reports.col_total_revenue")}</p>
                  <p className="text-2xl font-bold text-[#1e293b]">{formatRWF(reportData.totalRevenue || 0)} RWF</p>
                  <p className="text-xs text-[#64748b]">{reportData.outgoingCount || 0} {t("reports.contracts")}</p>
                </div>
                <div className="text-center p-4 bg-[#f1f5f9] rounded-lg">
                  <p className="text-sm text-[#64748b]">{t("reports.col_total_cost")}</p>
                  <p className="text-2xl font-bold text-[#1e293b]">{formatRWF(reportData.totalCost || 0)} RWF</p>
                  <p className="text-xs text-[#64748b]">{reportData.incomingCount || 0} {t("reports.contracts")}</p>
                </div>
                <div className="text-center p-4 bg-[#2563eb]/10 rounded-lg">
                  <p className="text-sm text-[#64748b]">{t("reports.net_profit")}</p>
                  <p className={`text-2xl font-bold ${(reportData.netProfit || 0) >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRWF(reportData.netProfit || 0)} RWF</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-[#e2e8f0] bg-white">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !hasReport ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-[#64748b] mb-4" />
                <p className="text-[#1e293b] font-medium">{t("reports.generate_first_hint")}</p>
                <p className="text-sm text-[#64748b]">{t("reports.subtitle")}</p>
              </div>
            ) : reportError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-[#64748b] mb-4" />
                <p className="text-[#1e293b] font-medium">{t("reports.no_data")}</p>
                <p className="text-sm text-red-600">{reportError}</p>
              </div>
            ) : !hasRows && !hasSummaryOnly ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-[#64748b] mb-4" />
                  <p className="text-[#1e293b] font-medium">{t("reports.no_data")}</p>
                  <p className="text-sm text-[#64748b]">{t("reports.select_different_date")}</p>
                  {summaryLines.length > 0 && (
                    <div className="mt-4 text-left w-full max-w-sm border border-[#e2e8f0] rounded-lg p-4 bg-[#f8fafc]">
                      <p className="text-sm font-medium text-[#1e293b] mb-2">{t("reports.totals")}</p>
                      {summaryLines.map((line, i) => (
                        <p key={i} className="text-sm text-[#64748b] flex justify-between"><span>{line.label}</span><span className="font-medium text-[#1e293b]">{line.value}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#e2e8f0]">
                        {columns.map((col) => (
                          <TableHead key={col.key} className={`text-[#64748b] ${col.align === "right" ? "text-right" : ""}`}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row: any, i: number) => (
                        <TableRow key={i} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }}>
                          {columns.map((col) => (
                            <TableCell key={col.key} className={`${col.align === "right" ? "text-right" : ""} text-[#1e293b]`}>
                              {formatCellValue(col.key, row[col.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {summaryLines.length > 0 && (
                        <>
                          <TableRow className="bg-[#f1f5f9] font-bold border-t-2 border-[#e2e8f0]">
                            <TableCell colSpan={columns.length} className="text-[#1e293b]">{t("reports.totals")}</TableCell>
                          </TableRow>
                          {summaryLines.map((line, i) => (
                            <TableRow key={`summary-${i}`} className={`bg-[#f1f5f9] ${i === summaryLines.length - 1 ? "border-t-2 border-[#e2e8f0] font-bold text-base" : ""}`}>
                              <TableCell colSpan={Math.max(1, columns.length - 1)} className="text-[#64748b] font-medium">{line.label}</TableCell>
                              <TableCell className="text-right font-bold text-[#1e293b]">{line.value}</TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("reports.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("reports.subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeGroup} onValueChange={(v) => handleGroupChange(v as ReportGroup)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="grocery" data-testid="tab-grocery-reports">
            <FileText className="h-4 w-4 mr-2" /> {t("reports.grocery_tab")}
          </TabsTrigger>
          <TabsTrigger value="rental" data-testid="tab-rental-reports">
            <FileText className="h-4 w-4 mr-2" /> {t("reports.rental_tab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="grocery" className="mt-4 space-y-6">
          {renderReportContent()}
        </TabsContent>
        <TabsContent value="rental" className="mt-4 space-y-6">
          {renderReportContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
