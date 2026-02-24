import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Search } from "lucide-react";

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
  { value: "rental_outgoing", group: "rental" },
  { value: "rental_incoming", group: "rental" },
  { value: "vehicle_utilization", group: "rental" },
  { value: "rental_profit", group: "rental" },
];

export default function ReportsPage() {
  const { t } = useTranslation();
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

  const { data: suppliers } = useQuery({ queryKey: ["/api/suppliers"] });
  const { data: customers } = useQuery({ queryKey: ["/api/customers"] });

  function buildQueryUrl() {
    switch (reportType) {
      case "daily": return `/api/reports/daily?date=${selectedDate}`;
      case "monthly": return `/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}`;
      case "custom": return `/api/reports/custom?from=${fromDate}&to=${toDate}`;
      case "purchases": return `/api/reports/purchases?from=${fromDate}&to=${toDate}${supplierId ? `&supplier_id=${supplierId}` : ""}`;
      case "sales": return `/api/reports/sales?from=${fromDate}&to=${toDate}${customerId ? `&customer_id=${customerId}` : ""}`;
      case "profit": return `/api/reports/profit?from=${fromDate}&to=${toDate}`;
      case "outstanding_payables": return `/api/reports/outstanding-payables${supplierId ? `?supplier_id=${supplierId}` : ""}`;
      case "outstanding_receivables": return `/api/reports/outstanding-receivables${customerId ? `?customer_id=${customerId}` : ""}`;
      case "stock_summary": return `/api/reports/stock-summary`;
      case "supplier_ledger": return `/api/reports/supplier-ledger?supplier_id=${supplierId}&from=${fromDate}&to=${toDate}`;
      case "customer_ledger": return `/api/reports/customer-ledger?customer_id=${customerId}&from=${fromDate}&to=${toDate}`;
      case "rental_outgoing": return `/api/reports/rental-outgoing?from=${fromDate}&to=${toDate}`;
      case "rental_incoming": return `/api/reports/rental-incoming?from=${fromDate}&to=${toDate}`;
      case "vehicle_utilization": return `/api/reports/vehicle-utilization?from=${fromDate}&to=${toDate}`;
      case "rental_profit": return `/api/reports/rental-profit?from=${fromDate}&to=${toDate}`;
      default: return `/api/reports/daily?date=${selectedDate}`;
    }
  }

  const queryUrl = generateKey || buildQueryUrl();
  const { data: reportData, isLoading } = useQuery<any>({ queryKey: [queryUrl] });

  const handleGenerate = () => {
    setGenerateKey(buildQueryUrl());
  };

  const needsDateRange = ["custom", "purchases", "sales", "profit", "supplier_ledger", "customer_ledger", "rental_outgoing", "rental_incoming", "vehicle_utilization", "rental_profit"].includes(reportType);
  const needsSupplier = ["purchases", "outstanding_payables", "supplier_ledger"].includes(reportType);
  const needsCustomer = ["sales", "outstanding_receivables", "customer_ledger"].includes(reportType);
  const requiresSupplier = reportType === "supplier_ledger";
  const requiresCustomer = reportType === "customer_ledger";

  function getCsvFilename() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    switch (reportType) {
      case "daily": return `UMUGWANEZA_LTD_Daily_Report_${selectedDate}.csv`;
      case "monthly": return `UMUGWANEZA_LTD_Monthly_Report_${months[parseInt(selectedMonth) - 1]}_${selectedYear}.csv`;
      case "custom": return `UMUGWANEZA_LTD_Custom_Report_${fromDate}_to_${toDate}.csv`;
      default: return `UMUGWANEZA_LTD_${reportType}_Report_${today}.csv`;
    }
  }

  function downloadCSV() {
    if (!reportData?.rows?.length && reportType !== "rental_profit") return;
    const csvRows: string[] = [];
    const cols = getColumns();
    csvRows.push(cols.map(c => c.label).join(","));
    if (reportData?.rows) {
      for (const row of reportData.rows) {
        csvRows.push(cols.map(c => {
          const val = row[c.key];
          if (typeof val === "string" && val.includes(",")) return `"${val}"`;
          return val ?? "";
        }).join(","));
      }
    }
    csvRows.push("");
    csvRows.push(t("reports.totals"));
    const summaryLines = getSummaryLines();
    for (const line of summaryLines) {
      csvRows.push(`${line.label},${line.value}`);
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getCsvFilename();
    a.click();
    URL.revokeObjectURL(url);
  }

  type ColDef = { key: string; label: string; align?: string };

  function getColumns(): ColDef[] {
    switch (reportType) {
      case "daily": case "monthly": case "custom":
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
    switch (reportType) {
      case "daily": case "monthly": case "custom":
        return [
          { label: t("reports.total_purchases"), value: formatRWF(reportData.totalPurchase || 0) },
          { label: t("reports.total_sales"), value: formatRWF(reportData.totalSales || 0) },
          { label: t("reports.total_rental_revenue"), value: formatRWF(reportData.totalRentalRevenue || 0) },
          { label: t("reports.total_rental_cost"), value: formatRWF(reportData.totalRentalCost || 0) },
          { label: t("reports.col_outstanding_payables"), value: formatRWF(reportData.totalOutstandingPayables || 0) },
          { label: t("reports.col_outstanding_receivables"), value: formatRWF(reportData.totalOutstandingReceivables || 0) },
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
    if (["total", "paid", "remaining", "received", "unit_price", "totalSales", "totalPurchases", "profit", "purchaseAmount", "paymentAmount", "balance", "saleAmount", "totalRevenue", "currentStock", "totalPurchased", "totalSold"].includes(key)) {
      return formatRWF(Number(value) || 0);
    }
    if (key === "availability") return `${value}%`;
    return String(value);
  }

  const columns = getColumns();
  const summaryLines = getSummaryLines();
  const rows = reportData?.rows || [];
  const hasData = rows.length > 0 || reportType === "rental_profit";
  const canGenerate = reportType === "supplier_ledger" ? !!supplierId : reportType === "customer_ledger" ? !!customerId : true;

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("reports.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("reports.subtitle")}</p>
        </div>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-[#64748b]">{t("reports.report_type")}</Label>
              <Select value={reportType} onValueChange={(v) => { setReportType(v); setGenerateKey(""); }}>
                <SelectTrigger data-testid="select-report-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("reports.type_daily")}</SelectItem>
                  <SelectItem value="monthly">{t("reports.type_monthly")}</SelectItem>
                  <SelectItem value="custom">{t("reports.type_custom")}</SelectItem>
                  <SelectItem value="purchases">{t("reports.type_purchases")}</SelectItem>
                  <SelectItem value="sales">{t("reports.type_sales")}</SelectItem>
                  <SelectItem value="profit">{t("reports.type_profit")}</SelectItem>
                  <SelectItem value="outstanding_payables">{t("reports.type_outstanding_payables")}</SelectItem>
                  <SelectItem value="outstanding_receivables">{t("reports.type_outstanding_receivables")}</SelectItem>
                  <SelectItem value="stock_summary">{t("reports.type_stock_summary")}</SelectItem>
                  <SelectItem value="supplier_ledger">{t("reports.type_supplier_ledger")}</SelectItem>
                  <SelectItem value="customer_ledger">{t("reports.type_customer_ledger")}</SelectItem>
                  <SelectItem value="rental_outgoing">{t("reports.type_rental_outgoing")}</SelectItem>
                  <SelectItem value="rental_incoming">{t("reports.type_rental_incoming")}</SelectItem>
                  <SelectItem value="vehicle_utilization">{t("reports.type_vehicle_utilization")}</SelectItem>
                  <SelectItem value="rental_profit">{t("reports.type_rental_profit")}</SelectItem>
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

          <div className="flex gap-3">
            <Button className="h-10 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" onClick={handleGenerate} disabled={!canGenerate} data-testid="button-generate">
              <Search className="h-4 w-4 mr-2" /> {t("reports.generate")}
            </Button>
            <Button variant="outline" className="h-10 border-[#e2e8f0]" onClick={downloadCSV} disabled={!hasData} data-testid="button-download-csv">
              <Download className="h-4 w-4 mr-2" /> {t("reports.download_csv")}
            </Button>
          </div>
        </CardContent>
      </Card>

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
            ) : !hasData ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-[#64748b] mb-4" />
                <p className="text-[#1e293b] font-medium">{t("reports.no_data")}</p>
                <p className="text-sm text-[#64748b]">{t("reports.select_different_date")}</p>
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
    </div>
  );
}
