import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["/api/items?active=true"],
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
      await apiRequest("POST", "/api/sales", {
        customer_id: values.customer_id,
        sale_date: values.sale_date,
        item_id: values.item_id,
        total_quantity: values.total_quantity,
        unit: values.unit,
        unit_price: values.unit_price,
        amount_received: values.amount_received,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/grocery"] });
      toast({ title: "Sale recorded successfully" });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">Sales</h1>
          <p className="text-sm text-[#64748b]">Track and manage your sales</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb]" data-testid="button-add-sale"><Plus className="h-4 w-4 mr-2" /> New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="customer_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-customer"><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
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
                <FormField control={form.control} name="sale_date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-sale-date" /></FormControl><FormMessage /></FormItem>
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
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">Total Amount</span><span className="font-semibold text-[#1e293b]">{formatRWF(totalAmount)}</span></div>
                </div>
                <FormField control={form.control} name="amount_received" render={({ field }) => (
                  <FormItem><FormLabel>Amount Received (RWF)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-amount-received" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">Remaining</span><span className="font-semibold text-[#1e293b]">{formatRWF(Math.max(0, remaining))}</span></div>
                </div>
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-sale">
                  {createMutation.isPending ? "Saving..." : "Record Sale"}
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
              <p className="text-[#1e293b] font-medium">No sales yet</p>
              <p className="text-sm text-[#64748b]">Record your first sale</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">Ref</TableHead>
                    <TableHead className="text-[#64748b]">Date</TableHead>
                    <TableHead className="text-[#64748b]">Customer</TableHead>
                    <TableHead className="text-[#64748b]">Item</TableHead>
                    <TableHead className="text-[#64748b] text-right">Qty</TableHead>
                    <TableHead className="text-[#64748b] text-right">Total (RWF)</TableHead>
                    <TableHead className="text-[#64748b] text-right">Received (RWF)</TableHead>
                    <TableHead className="text-[#64748b] text-right">Remaining (RWF)</TableHead>
                    <TableHead className="text-[#64748b]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id} className="border-b border-[#e2e8f0]" data-testid={`row-sale-${s.id}`}>
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
