import { useState } from "react";
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
  if (status === "FULLY_RECEIVED") return "default";
  if (status === "PARTIAL") return "secondary";
  return "destructive";
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
    defaultValues: { customer_id: "", sale_date: new Date().toISOString().split("T")[0], item_id: "", total_quantity: 0, unit: "KG", unit_price: 0, amount_received: 0 },
  });

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
        amount_received: received,
        remaining_amount: remaining,
        financial_status,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "sales", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "grocery"] });
      toast({ title: t("common.sale_recorded") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("sales.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("sales.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-sale"><Plus className="h-4 w-4 mr-2" /> {t("sales.new_sale")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("sales.record_sale")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-item"><SelectValue placeholder={t("sales.select_item")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {items?.map((it) => <SelectItem key={it.id} value={it.id}>{it.item_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sale_date" render={({ field }) => (
                  <FormItem><FormLabel>{t("sales.date")}</FormLabel><FormControl><Input type="date" {...field} data-testid="input-sale-date" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="total_quantity" render={({ field }) => (
                    <FormItem><FormLabel>{t("sales.quantity")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-quantity" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>{t("sales.unit")}</FormLabel><FormControl><Input {...field} data-testid="input-unit" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="unit_price" render={({ field }) => (
                  <FormItem><FormLabel>{t("sales.unit_price")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-unit-price" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">{t("sales.total_amount")}</span><span className="font-semibold text-[#1e293b]">{formatRWF(totalAmount)}</span></div>
                </div>
                <FormField control={form.control} name="amount_received" render={({ field }) => (
                  <FormItem><FormLabel>{t("sales.amount_received")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-amount-received" /></FormControl><FormMessage /></FormItem>
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

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
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
                    <TableHead className="text-[#64748b]">{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s, i) => (
                    <TableRow key={s.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-sale-${s.id}`}>
                      <TableCell className="font-mono text-xs text-[#1e293b]">{s.reference_no}</TableCell>
                      <TableCell className="text-[#64748b]">{s.sale_date}</TableCell>
                      <TableCell className="text-[#1e293b]">{s.customer?.customer_name || "—"}</TableCell>
                      <TableCell className="text-[#1e293b]">{s.item?.item_name || "—"}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{s.total_quantity} {s.unit}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(s.total_sale_amount)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(s.amount_received)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(s.remaining_amount)}</TableCell>
                      <TableCell><Badge variant={statusColor(s.financial_status)}>{s.financial_status.replace("_", " ")}</Badge></TableCell>
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
