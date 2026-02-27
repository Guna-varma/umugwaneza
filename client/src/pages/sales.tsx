import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { Sale, InsertSale, Customer, Item } from "@shared/schema";
import { insertSaleSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { AmountInput } from "@/components/ui/amount-input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp } from "lucide-react";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

function statusColor(status: string) {
  if (status === "DELAYED") return "destructive";
  if (status === "FULLY_RECEIVED") return "default";
  if (status === "PARTIAL") return "secondary";
  return "destructive";
}

function saleDisplayStatus(s: Sale): string {
  if (s.remaining_amount > 0 && s.amount_due_date) {
    const today = new Date().toISOString().split("T")[0];
    if (today > s.amount_due_date) return "DELAYED";
  }
  return s.financial_status;
}

export default function SalesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["umugwaneza", "sales", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: purchasesForStock } = useQuery<{ item_id: string; total_quantity: number; package_size: number | null; package_count: number | null }[]>({
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

  const stockByItem = useMemo(() => {
    const st: Record<string, number> = {};
    purchasesForStock?.forEach((p) => {
      st[p.item_id] = (st[p.item_id] ?? 0) + p.total_quantity;
    });
    sales?.forEach((s) => {
      st[s.item_id] = (st[s.item_id] ?? 0) - s.total_quantity;
    });
    return st;
  }, [purchasesForStock, sales]);

  const stockPacksByItem = useMemo(() => {
    const packs: Record<string, Record<number, number>> = {};
    purchasesForStock?.forEach((p) => {
      if (p.package_size != null && p.package_count != null) {
        const size = Number(p.package_size);
        const count = Number(p.package_count);
        if (!packs[p.item_id]) packs[p.item_id] = {};
        packs[p.item_id][size] = (packs[p.item_id][size] ?? 0) + count;
      }
    });
    sales?.forEach((s) => {
      if ((s as any).package_size != null && (s as any).package_count != null) {
        const size = Number((s as any).package_size);
        const count = Number((s as any).package_count);
        if (!packs[s.item_id]) packs[s.item_id] = {};
        packs[s.item_id][size] = (packs[s.item_id][size] ?? 0) - count;
      }
    });
    return packs;
  }, [purchasesForStock, sales]);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["umugwaneza", "customers", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("customers").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["umugwaneza", "items", businessId, "active"],
    queryFn: async () => {
      const { data, error } = await db().from("items").select("*").eq("business_id", businessId).eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const form = useForm<InsertSale>({
    resolver: zodResolver(insertSaleSchema),
    defaultValues: { customer_id: "", sale_date: new Date().toISOString().split("T")[0], item_id: "", total_quantity: 0, unit: "KG", unit_price: 0, amount_received: 0, amount_due_date: undefined },
  });

  const itemId = form.watch("item_id");
  const selectedItem = items?.find((i) => i.id === itemId);
  const isWeight = selectedItem?.measurement_type === "WEIGHT";
  const [packSize, setPackSize] = useState<number>(50);
  const [packCount, setPackCount] = useState<number>(0);
  type PriceBasis = "per_kg" | "per_sack_25" | "per_sack_50" | "per_litre" | "per_can_5" | "per_can_20";
  const [priceBasis, setPriceBasis] = useState<PriceBasis>("per_kg");

  const priceMultiplier = (basis: PriceBasis): number => {
    switch (basis) {
      case "per_kg": return 1;
      case "per_sack_25": return 25;
      case "per_sack_50": return 50;
      case "per_litre": return 1;
      case "per_can_5": return 5;
      case "per_can_20": return 20;
      default: return 1;
    }
  };

  useEffect(() => {
    if (!selectedItem) {
      setPackCount(0);
      setPackSize(50);
      setPriceBasis("per_kg");
      form.setValue("total_quantity", 0);
      form.setValue("unit", "");
      form.setValue("unit_price", 0);
      return;
    }
    if (selectedItem.measurement_type === "WEIGHT") {
      setPackSize(50);
      setPriceBasis("per_kg");
    } else {
      setPackSize(20);
      setPriceBasis("per_litre");
    }
    setPackCount(0);
    form.setValue("total_quantity", 0);
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!selectedItem) return;
    const total = packCount * packSize;
    form.setValue("total_quantity", total);
  }, [packSize, packCount, selectedItem?.id]);

  const qty = form.watch("total_quantity");
  const price = form.watch("unit_price");
  const received = form.watch("amount_received");
  const totalAmount = (qty || 0) * (price || 0);
  const remaining = totalAmount - (received || 0);

  const createMutation = useMutation({
    mutationFn: async (values: InsertSale) => {
      const total = values.total_quantity * values.unit_price;
      const received = values.amount_received ?? 0;
      const remaining = Math.max(0, total - received);
      let financial_status = "PENDING";
      if (received >= total) financial_status = "FULLY_RECEIVED";
      else if (received > 0) financial_status = "PARTIAL";
      const refNo = "SAL-" + Date.now().toString(36).toUpperCase();
      const { error } = await db().from("sales").insert({
        business_id: businessId,
        customer_id: values.customer_id,
        reference_no: refNo,
        sale_date: values.sale_date,
        item_id: values.item_id,
        total_quantity: values.total_quantity,
        unit: values.unit,
        unit_price: values.unit_price,
        total_sale_amount: total,
        package_size: selectedItem ? packSize : null,
        package_count: selectedItem ? packCount : null,
        amount_received: received,
        remaining_amount: remaining,
        financial_status,
        amount_due_date: values.amount_due_date && values.amount_due_date.trim() ? values.amount_due_date.trim() : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "sales", businessId] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "purchases-stock", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "grocery"] });
      toast({ title: t("common.sale_recorded") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-page-fade max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] truncate" data-testid="text-page-title">{t("sales.title")}</h1>
          <p className="text-sm text-[#64748b] mt-0.5">{t("sales.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPackCount(0); setPackSize(50); } }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto min-h-[44px] h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02] touch-manipulation flex-shrink-0" data-testid="button-add-sale"><Plus className="h-4 w-4 mr-2" /> {t("sales.new_sale")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("sales.record_sale")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pr-6 sm:pr-0">
                <FormField control={form.control} name="customer_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sales.customer")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-customer"><SelectValue placeholder={t("sales.select_customer")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="item_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sales.item")}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const it = items?.find((i) => i.id === value);
                        if (it) form.setValue("unit", it.base_unit === "LITRE" ? "Litre" : "KG");
                        else form.setValue("unit", "");
                      }}
                      value={field.value}
                    >
                      <FormControl><SelectTrigger data-testid="select-item"><SelectValue placeholder={t("sales.select_item")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {items?.map((it) => <SelectItem key={it.id} value={it.id}>{it.item_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedItem && (() => {
                      const stock = stockByItem[selectedItem.id] ?? 0;
                      const unit = form.watch("unit");
                      const packs = stockPacksByItem[selectedItem.id] || {};
                      const isKg = unit === "KG";
                      const sizeA = isKg ? 50 : 20;
                      const sizeB = isKg ? 25 : 5;
                      const countA = packs[sizeA] ?? 0;
                      const countB = packs[sizeB] ?? 0;
                      return (
                        <div className="text-sm mt-1 space-y-0.5">
                          <p className="text-[#64748b]">
                            {t("sales.available_stock")}:{" "}
                            <span className="font-medium text-[#1e293b]" data-testid="text-available-stock">
                              {stock} {unit}
                            </span>
                          </p>
                          <p className="text-[#64748b]" data-testid="text-available-packs">
                            {isKg ? "50 kg sacks" : "20 L cans"}:{" "}
                            <span className="font-medium text-[#1e293b]">
                              {countA > 0 ? `${countA} units` : "Unavailable"}
                            </span>
                            {"  |  "}
                            {isKg ? "25 kg sacks" : "5 L cans"}:{" "}
                            <span className="font-medium text-[#1e293b]">
                              {countB > 0 ? `${countB} units` : "Unavailable"}
                            </span>
                          </p>
                        </div>
                      );
                    })()}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sale_date" render={({ field }) => (
                  <FormItem><FormLabel>{t("sales.date")}</FormLabel><FormControl><Input type="date" {...field} data-testid="input-sale-date" /></FormControl><FormMessage /></FormItem>
                )} />
                {selectedItem && (
                  <>
                    <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f8fafc] space-y-3">
                      <p className="text-sm font-medium text-[#1e293b]">{t("sales.packaging")}</p>
                      {isWeight ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormItem>
                            <FormLabel>{t("sales.sack_size")}</FormLabel>
                            <Select value={String(packSize)} onValueChange={(v) => setPackSize(Number(v))}>
                              <SelectTrigger data-testid="select-sack-size"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="25">25 kg</SelectItem>
                                <SelectItem value="50">50 kg</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                          <FormItem>
                            <FormLabel>{t("sales.number_of_sacks")}</FormLabel>
                            <NumberInput value={packCount} onChange={(n) => setPackCount(n)} step={1} placeholder="0" data-testid="input-number-sacks" />
                          </FormItem>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormItem>
                            <FormLabel>{t("sales.can_size")}</FormLabel>
                            <Select value={String(packSize)} onValueChange={(v) => setPackSize(Number(v))}>
                              <SelectTrigger data-testid="select-can-size"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="20">20 Litre</SelectItem>
                                <SelectItem value="5">5 Litre</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                          <FormItem>
                            <FormLabel>{t("sales.number_of_cans")}</FormLabel>
                            <NumberInput value={packCount} onChange={(n) => setPackCount(n)} step={1} placeholder="0" data-testid="input-number-cans" />
                          </FormItem>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-[#64748b]">{t("sales.total_quantity_calc")}</span>
                        <span className="font-semibold text-[#1e293b]" data-testid="text-total-quantity">{form.watch("total_quantity")} {form.watch("unit")}</span>
                      </div>
                    </div>
                    <FormField control={form.control} name="unit" render={({ field }) => (
                      <FormItem className="sr-only"><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="total_quantity" render={({ field }) => (
                      <FormItem className="sr-only"><FormControl><Input type="number" value={field.value} readOnly /></FormControl></FormItem>
                    )} />
                  </>
                )}
                {selectedItem && (
                  <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f8fafc] space-y-3">
                    <p className="text-sm font-medium text-[#1e293b]">{t("sales.price")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel className="text-[#64748b]">{t("sales.enter_price_as")}</FormLabel>
                        <Select value={priceBasis} onValueChange={(v) => setPriceBasis(v as PriceBasis)}>
                          <SelectTrigger data-testid="select-price-per" className="min-h-[44px] touch-manipulation">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {isWeight ? (
                              <>
                                <SelectItem value="per_kg">{t("sales.price_per_kg")}</SelectItem>
                                <SelectItem value="per_sack_25">{t("sales.price_per_sack_25")}</SelectItem>
                                <SelectItem value="per_sack_50">{t("sales.price_per_sack_50")}</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="per_litre">{t("sales.price_per_litre")}</SelectItem>
                                <SelectItem value="per_can_5">{t("sales.price_per_can_5")}</SelectItem>
                                <SelectItem value="per_can_20">{t("sales.price_per_can_20")}</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </FormItem>
                      <FormField
                        control={form.control}
                        name="unit_price"
                        render={({ field }) => {
                          const mult = priceMultiplier(priceBasis);
                          const displayValue = (field.value ?? 0) * mult;
                          return (
                            <FormItem>
                              <FormLabel>{t("sales.unit_price")}</FormLabel>
                              <FormControl>
                                <AmountInput
                                  value={displayValue}
                                  onChange={(val) => field.onChange(Number(val) / mult)}
                                  onBlur={field.onBlur}
                                  step={0.01}
                                  placeholder="0"
                                  data-testid="input-unit-price"
                                  className="min-h-[44px] touch-manipulation"
                                />
                              </FormControl>
                              {mult > 1 && (
                                <p className="text-xs text-[#64748b]">
                                  = {formatRWF(field.value ?? 0)} per {isWeight ? "kg" : "Litre"}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
                {!selectedItem && (
                  <FormField control={form.control} name="unit_price" render={({ field }) => (
                    <FormItem><FormLabel>{t("sales.unit_price")}</FormLabel><FormControl><AmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.01} placeholder="0" data-testid="input-unit-price" /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">{t("sales.total_amount")}</span><span className="font-semibold text-[#1e293b]">{formatRWF(totalAmount)}</span></div>
                </div>
                <FormField control={form.control} name="amount_received" render={({ field }) => (
                  <FormItem><FormLabel>{t("sales.amount_received")}</FormLabel><FormControl><AmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} step={0.01} placeholder="0" data-testid="input-amount-received" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="amount_due_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sales.amount_due_date")}</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-amount-due-date" className="min-h-[44px] touch-manipulation" /></FormControl>
                    <p className="text-xs text-[#64748b]">{t("sales.amount_due_date_hint")}</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">{t("sales.remaining")}</span><span className="font-semibold text-[#1e293b]">{formatRWF(Math.max(0, remaining))}</span></div>
                </div>
                <Button type="submit" className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" disabled={createMutation.isPending} data-testid="button-submit-sale">
                  {createMutation.isPending ? t("sales.saving") : t("sales.record")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#e2e8f0] bg-white overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !sales?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("sales.no_sales")}</p>
              <p className="text-sm text-[#64748b]">{t("sales.add_first")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">{t("sales.ref")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("sales.date")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("sales.customer")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("sales.item")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("sales.quantity")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("sales.total_rwf")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("sales.received_rwf")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("sales.remaining_rwf")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("sales.due_date")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s, i) => {
                    const displayStatus = saleDisplayStatus(s);
                    return (
                    <TableRow key={s.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-sale-${s.id}`}>
                      <TableCell className="font-mono text-xs text-[#1e293b]">{s.reference_no}</TableCell>
                      <TableCell className="text-[#64748b]">{s.sale_date}</TableCell>
                      <TableCell className="text-[#1e293b]">{s.customer?.customer_name || "—"}</TableCell>
                      <TableCell className="text-[#1e293b]">{s.item?.item_name || "—"}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{s.total_quantity} {s.unit}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(s.total_sale_amount)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(s.amount_received)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(s.remaining_amount)}</TableCell>
                      <TableCell className="text-[#64748b]">{s.amount_due_date || "—"}</TableCell>
                      <TableCell><Badge variant={statusColor(displayStatus)}>{displayStatus.replace("_", " ")}</Badge></TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
