import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import type { Item } from "@shared/schema";

/** Same formula as Record Sale: stock = purchases - sales (total_quantity); sack/can counts = net package_count per package_size from purchases minus sales. */
type PurchaseRow = { item_id: string; total_quantity: number; package_size: number | null; package_count: number | null };
type SaleRow = { item_id: string; total_quantity: number; package_size?: number | null; package_count?: number | null };

export default function StockPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";

  const { data: items, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["umugwaneza", "items", businessId, "active"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("items")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("item_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery<PurchaseRow[]>({
    queryKey: ["umugwaneza", "purchases-stock", businessId],
    queryFn: async () => {
      const { data, error } = await db()
        .from("purchases")
        .select("item_id, total_quantity, package_size, package_count")
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: sales, isLoading: salesLoading } = useQuery<SaleRow[]>({
    queryKey: ["umugwaneza", "sales", businessId],
    queryFn: async () => {
      const { data, error } = await db()
        .from("sales")
        .select("item_id, total_quantity, package_size, package_count")
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const stockByItem = useMemo(() => {
    const st: Record<string, number> = {};
    purchases?.forEach((p) => {
      st[p.item_id] = (st[p.item_id] ?? 0) + p.total_quantity;
    });
    sales?.forEach((s) => {
      st[s.item_id] = (st[s.item_id] ?? 0) - s.total_quantity;
    });
    return st;
  }, [purchases, sales]);

  const stockPacksByItem = useMemo(() => {
    const packs: Record<string, Record<number, number>> = {};
    purchases?.forEach((p) => {
      if (p.package_size != null && p.package_count != null) {
        const size = Number(p.package_size);
        const count = Number(p.package_count);
        if (!packs[p.item_id]) packs[p.item_id] = {};
        packs[p.item_id][size] = (packs[p.item_id][size] ?? 0) + count;
      }
    });
    sales?.forEach((s) => {
      if (s.package_size != null && s.package_count != null) {
        const size = Number(s.package_size);
        const count = Number(s.package_count);
        if (!packs[s.item_id]) packs[s.item_id] = {};
        packs[s.item_id][size] = (packs[s.item_id][size] ?? 0) - count;
      }
    });
    return packs;
  }, [purchases, sales]);

  const rows = useMemo(() => {
    if (!items?.length) return [];
    return items.map((i) => {
      const stock = Math.max(0, stockByItem[i.id] ?? 0);
      const packs = stockPacksByItem[i.id] ?? {};
      const isWeight = (i.measurement_type || i.base_unit) === "WEIGHT" || (i.base_unit || "").toUpperCase() === "KG";
      return {
        id: i.id,
        item: i.item_name,
        current_stock: stock,
        unit: (i.base_unit || "").toUpperCase() === "LITRE" ? "L" : "KG",
        measurement_type: i.measurement_type || "",
        sacks_50: isWeight ? (packs[50] ?? null) : null,
        sacks_25: isWeight ? (packs[25] ?? null) : null,
        cans_20: !isWeight ? (packs[20] ?? null) : null,
        cans_5: !isWeight ? (packs[5] ?? null) : null,
      };
    });
  }, [items, stockByItem, stockPacksByItem]);

  const isLoading = itemsLoading || purchasesLoading || salesLoading;

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
                  {rows.map((r) => (
                    <TableRow key={r.id} className="border-b border-[#e2e8f0]">
                      <TableCell className="font-medium text-[#1e293b]">{r.item}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">
                        {new Intl.NumberFormat("en-RW").format(r.current_stock)} {r.unit}
                      </TableCell>
                      <TableCell className="text-right text-[#64748b]">{r.sacks_50 != null ? new Intl.NumberFormat("en-RW").format(Math.max(0, r.sacks_50)) : "—"}</TableCell>
                      <TableCell className="text-right text-[#64748b]">{r.sacks_25 != null ? new Intl.NumberFormat("en-RW").format(Math.max(0, r.sacks_25)) : "—"}</TableCell>
                      <TableCell className="text-right text-[#64748b]">{r.cans_20 != null ? new Intl.NumberFormat("en-RW").format(Math.max(0, r.cans_20)) : "—"}</TableCell>
                      <TableCell className="text-right text-[#64748b]">{r.cans_5 != null ? new Intl.NumberFormat("en-RW").format(Math.max(0, r.cans_5)) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
