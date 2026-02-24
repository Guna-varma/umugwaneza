import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Purchase, InsertPurchase, Supplier, Item } from "@shared/schema";
import { insertPurchaseSchema } from "@shared/schema";
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
import { Plus, ShoppingCart } from "lucide-react";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

function statusColor(status: string) {
  if (status === "FULLY_SETTLED") return "default";
  if (status === "PARTIAL") return "secondary";
  return "destructive";
}

export default function PurchasesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["/api/items?active=true"],
  });

  const form = useForm<InsertPurchase>({
    resolver: zodResolver(insertPurchaseSchema),
    defaultValues: { supplier_id: "", purchase_date: new Date().toISOString().split("T")[0], item_id: "", total_quantity: 0, unit: "KG", unit_price: 0, amount_paid: 0 },
  });

  const qty = form.watch("total_quantity");
  const price = form.watch("unit_price");
  const paid = form.watch("amount_paid");
  const totalCost = (qty || 0) * (price || 0);
  const remaining = totalCost - (paid || 0);

  const createMutation = useMutation({
    mutationFn: async (values: InsertPurchase) => {
      await apiRequest("POST", "/api/purchases", {
        supplier_id: values.supplier_id,
        purchase_date: values.purchase_date,
        item_id: values.item_id,
        total_quantity: values.total_quantity,
        unit: values.unit,
        unit_price: values.unit_price,
        amount_paid: values.amount_paid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/grocery"] });
      toast({ title: "Purchase recorded successfully" });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">Purchases</h1>
          <p className="text-sm text-[#64748b]">Track and manage your grocery purchases</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb]" data-testid="button-add-purchase"><Plus className="h-4 w-4 mr-2" /> New Purchase</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Record Purchase</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="supplier_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-supplier"><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {suppliers?.map((s) => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="item_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-item"><SelectValue placeholder="Select item" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {items?.map((it) => <SelectItem key={it.id} value={it.id}>{it.item_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="purchase_date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-purchase-date" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="total_quantity" render={({ field }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-quantity" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} data-testid="input-unit" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="unit_price" render={({ field }) => (
                  <FormItem><FormLabel>Unit Price (RWF)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-unit-price" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">Total Cost</span><span className="font-semibold text-[#1e293b]">{formatRWF(totalCost)}</span></div>
                </div>
                <FormField control={form.control} name="amount_paid" render={({ field }) => (
                  <FormItem><FormLabel>Amount Paid (RWF)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-amount-paid" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">Remaining</span><span className="font-semibold text-[#1e293b]">{formatRWF(Math.max(0, remaining))}</span></div>
                </div>
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-purchase">
                  {createMutation.isPending ? "Saving..." : "Record Purchase"}
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
          ) : !purchases?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">No purchases yet</p>
              <p className="text-sm text-[#64748b]">Record your first purchase</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">Ref</TableHead>
                    <TableHead className="text-[#64748b]">Date</TableHead>
                    <TableHead className="text-[#64748b]">Supplier</TableHead>
                    <TableHead className="text-[#64748b]">Item</TableHead>
                    <TableHead className="text-[#64748b] text-right">Qty</TableHead>
                    <TableHead className="text-[#64748b] text-right">Total (RWF)</TableHead>
                    <TableHead className="text-[#64748b] text-right">Paid (RWF)</TableHead>
                    <TableHead className="text-[#64748b] text-right">Remaining (RWF)</TableHead>
                    <TableHead className="text-[#64748b]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id} className="border-b border-[#e2e8f0]" data-testid={`row-purchase-${p.id}`}>
                      <TableCell className="font-mono text-xs text-[#1e293b]">{p.reference_no}</TableCell>
                      <TableCell className="text-[#64748b]">{p.purchase_date}</TableCell>
                      <TableCell className="text-[#1e293b]">{p.supplier?.supplier_name || "—"}</TableCell>
                      <TableCell className="text-[#1e293b]">{p.item?.item_name || "—"}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{p.total_quantity} {p.unit}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(p.total_purchase_cost)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(p.amount_paid)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(p.remaining_amount)}</TableCell>
                      <TableCell><Badge variant={statusColor(p.financial_status)}>{p.financial_status.replace("_", " ")}</Badge></TableCell>
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
