import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount));
}

type ReportRow = {
  type: string;
  reference: string;
  party: string;
  item_vehicle: string;
  quantity: string;
  total: number;
  paid: number;
  remaining: number;
  status: string;
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: reportData, isLoading } = useQuery<{ rows: ReportRow[]; totalPurchase: number; totalSales: number; totalRentalRevenue: number; totalRentalCost: number; netProfit: number }>({
    queryKey: ["/api/reports/daily?date=" + selectedDate],
  });

  const downloadCSV = () => {
    if (!reportData) return;
    const headers = [t("reports.date"), t("reports.type"), t("reports.reference"), t("reports.party"), t("reports.item_vehicle"), t("reports.quantity"), t("reports.total_rwf"), t("reports.paid_rwf"), t("reports.remaining_rwf"), t("reports.status")];
    const csvRows = [headers.join(",")];
    for (const r of reportData.rows) {
      csvRows.push([selectedDate, r.type, r.reference, `"${r.party}"`, `"${r.item_vehicle}"`, `"${r.quantity}"`, r.total, r.paid, r.remaining, r.status].join(","));
    }
    csvRows.push("");
    csvRows.push(["", "", "", "", "", t("reports.totals"), "", "", "", ""].join(","));
    csvRows.push(["", t("reports.total_purchases"), "", "", "", "", reportData.totalPurchase, "", "", ""].join(","));
    csvRows.push(["", t("reports.total_sales"), "", "", "", "", reportData.totalSales, "", "", ""].join(","));
    csvRows.push(["", t("reports.total_rental_revenue"), "", "", "", "", reportData.totalRentalRevenue, "", "", ""].join(","));
    csvRows.push(["", t("reports.total_rental_cost"), "", "", "", "", reportData.totalRentalCost, "", "", ""].join(","));
    csvRows.push(["", t("reports.net_profit"), "", "", "", "", reportData.netProfit, "", "", ""].join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UMUGWANEZA_LTD_Report_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("reports.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("reports.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-[#64748b]">{t("reports.date")}:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-44 border-[#e2e8f0]"
              data-testid="input-report-date"
            />
          </div>
          <Button variant="outline" className="h-12 border-[#e2e8f0]" onClick={downloadCSV} disabled={!reportData?.rows.length} data-testid="button-download-csv">
            <Download className="h-4 w-4 mr-2" /> {t("reports.download_csv")}
          </Button>
        </div>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !reportData?.rows.length ? (
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
                    <TableHead className="text-[#64748b]">{t("reports.date")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("reports.type")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("reports.reference")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("reports.party")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("reports.item_vehicle")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("reports.quantity")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("reports.total_rwf")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("reports.paid_rwf")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("reports.remaining_rwf")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("reports.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.rows.map((r, i) => (
                    <TableRow key={i} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }}>
                      <TableCell className="text-[#64748b]">{selectedDate}</TableCell>
                      <TableCell><Badge variant="secondary">{r.type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-[#1e293b]">{r.reference}</TableCell>
                      <TableCell className="text-[#1e293b]">{r.party}</TableCell>
                      <TableCell className="text-[#1e293b]">{r.item_vehicle}</TableCell>
                      <TableCell className="text-[#64748b]">{r.quantity}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(r.total)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(r.paid)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(r.remaining)}</TableCell>
                      <TableCell><Badge variant="secondary">{r.status.replace("_", " ")}</Badge></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#f1f5f9] font-bold border-t-2 border-[#e2e8f0]">
                    <TableCell colSpan={6} className="text-[#1e293b]">{t("reports.totals")}</TableCell>
                    <TableCell colSpan={4} className="text-right text-[#1e293b]"></TableCell>
                  </TableRow>
                  <TableRow className="bg-[#f1f5f9]">
                    <TableCell colSpan={6} className="text-[#64748b] font-medium">{t("reports.total_purchases")}</TableCell>
                    <TableCell className="text-right font-bold text-[#1e293b]">{formatRWF(reportData.totalPurchase)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                  <TableRow className="bg-[#f1f5f9]">
                    <TableCell colSpan={6} className="text-[#64748b] font-medium">{t("reports.total_sales")}</TableCell>
                    <TableCell className="text-right font-bold text-[#1e293b]">{formatRWF(reportData.totalSales)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                  <TableRow className="bg-[#f1f5f9]">
                    <TableCell colSpan={6} className="text-[#64748b] font-medium">{t("reports.total_rental_revenue")}</TableCell>
                    <TableCell className="text-right font-bold text-[#1e293b]">{formatRWF(reportData.totalRentalRevenue)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                  <TableRow className="bg-[#f1f5f9]">
                    <TableCell colSpan={6} className="text-[#64748b] font-medium">{t("reports.total_rental_cost")}</TableCell>
                    <TableCell className="text-right font-bold text-[#1e293b]">{formatRWF(reportData.totalRentalCost)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                  <TableRow className="bg-[#f1f5f9] border-t-2 border-[#e2e8f0]">
                    <TableCell colSpan={6} className="text-[#1e293b] font-bold text-base">{t("reports.net_profit")}</TableCell>
                    <TableCell className="text-right font-bold text-base text-[#1e293b]">{formatRWF(reportData.netProfit)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
