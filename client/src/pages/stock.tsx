import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

type StockRow = {
  item: string;
  total_purchased?: number;
  total_sold?: number;
  current_stock: number;
  unit: string;
  measurement_type: string;
};

function normalizePayload(data: any): { rows: StockRow[] } {
  if (data == null) return { rows: [] };
  let out: any = data;
  if (Array.isArray(data) && data.length > 0) out = data[0];
  if (out && typeof out === "object" && !Array.isArray(out)) {
    if (Array.isArray(out.rows)) return { rows: out.rows as StockRow[] };
    const keys = Object.keys(out);
    if (keys.length === 1 && typeof out[keys[0]] === "object" && out[keys[0]]?.rows != null)
      return { rows: (out[keys[0]].rows ?? []) as StockRow[] };
  }
  return { rows: [] };
}

export default function StockPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["umugwaneza", "stock_summary"],
    queryFn: async () => {
      const { data: res, error } = await db().rpc("report_stock_summary");
      if (error) throw new Error(error.message);
      return normalizePayload(res);
    },
  });

  const rows = data?.rows ?? [];

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("stock.title")}</h1>
        <p className="text-sm text-[#64748b] mt-0.5">{t("stock.subtitle")}</p>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !rows.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("stock.no_items")}</p>
              <p className="text-sm text-[#64748b]">{t("stock.add_items_purchases")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">{t("stock.col_item")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("stock.col_stock")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("stock.col_sacks_50kg")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("stock.col_sacks_25kg")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("stock.col_cans_20l")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("stock.col_cans_5l")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const stock = Number(r.current_stock) || 0;
                    const isWeight = (r.measurement_type || r.unit) === "WEIGHT" || (r.unit || "").toUpperCase() === "KG";
                    const sacks50 = isWeight ? Math.floor(stock / 50) : null;
                    const sacks25 = isWeight ? Math.floor(stock / 25) : null;
                    const cans20 = !isWeight ? Math.floor(stock / 20) : null;
                    const cans5 = !isWeight ? Math.floor(stock / 5) : null;
                    const unit = (r.unit || "").toUpperCase() === "LITRE" ? "L" : "KG";
                    return (
                      <TableRow key={r.item} className="border-b border-[#e2e8f0]">
                        <TableCell className="font-medium text-[#1e293b]">{r.item}</TableCell>
                        <TableCell className="text-right text-[#1e293b]">
                          {new Intl.NumberFormat("en-RW").format(stock)} {unit}
                        </TableCell>
                        <TableCell className="text-right text-[#64748b]">{sacks50 != null ? new Intl.NumberFormat("en-RW").format(sacks50) : "—"}</TableCell>
                        <TableCell className="text-right text-[#64748b]">{sacks25 != null ? new Intl.NumberFormat("en-RW").format(sacks25) : "—"}</TableCell>
                        <TableCell className="text-right text-[#64748b]">{cans20 != null ? new Intl.NumberFormat("en-RW").format(cans20) : "—"}</TableCell>
                        <TableCell className="text-right text-[#64748b]">{cans5 != null ? new Intl.NumberFormat("en-RW").format(cans5) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
