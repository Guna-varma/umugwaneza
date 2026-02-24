import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { Purchase, Sale, InsertGroceryPayment } from "@shared/schema";
import { insertGroceryPaymentSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard } from "lucide-react";

const BUSINESS_ID = "biz_001";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["/grocery-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_payments")
        .select("*")
        .eq("business_id", BUSINESS_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingPurchases } = useQuery<Purchase[]>({
    queryKey: ["/purchases/pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("*, supplier:suppliers(*)")
        .eq("business_id", BUSINESS_ID)
        .gt("remaining_amount", 0);
      return data || [];
    },
  });

  const { data: pendingSales } = useQuery<Sale[]>({
    queryKey: ["/sales/pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("*, customer:customers(*)")
        .eq("business_id", BUSINESS_ID)
        .gt("remaining_amount", 0);
      return data || [];
    },
  });

  const form = useForm<InsertGroceryPayment>({
    resolver: zodResolver(insertGroceryPaymentSchema),
    defaultValues: { reference_type: "PURCHASE", reference_id: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "" },
  });

  const refType = form.watch("reference_type");

  const createMutation = useMutation({
    mutationFn: async (values: InsertGroceryPayment) => {
      const { error: payError } = await supabase.from("grocery_payments").insert({ ...values, business_id: BUSINESS_ID });
      if (payError) throw payError;

      if (values.reference_type === "PURCHASE") {
        const purchase = pendingPurchases?.find((p) => p.id === values.reference_id);
        if (purchase) {
          const newPaid = purchase.amount_paid + values.amount;
          const newRemaining = Math.max(0, purchase.total_purchase_cost - newPaid);
          let status: "PENDING" | "PARTIAL" | "FULLY_SETTLED" = "PARTIAL";
          if (newRemaining <= 0) status = "FULLY_SETTLED";
          await supabase.from("purchases").update({ amount_paid: newPaid, remaining_amount: newRemaining, financial_status: status }).eq("id", purchase.id);
        }
      } else {
        const sale = pendingSales?.find((s) => s.id === values.reference_id);
        if (sale) {
          const newReceived = sale.amount_received + values.amount;
          const newRemaining = Math.max(0, sale.total_sale_amount - newReceived);
          let status: "PENDING" | "PARTIAL" | "FULLY_RECEIVED" = "PARTIAL";
          if (newRemaining <= 0) status = "FULLY_RECEIVED";
          await supabase.from("sales").update({ amount_received: newReceived, remaining_amount: newRemaining, financial_status: status }).eq("id", sale.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/grocery-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/purchases/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/sales/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/grocery"] });
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        form.reset();
        setOpen(false);
      }, 800);
      toast({ title: "Payment recorded successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const references = refType === "PURCHASE" ? pendingPurchases : pendingSales;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">Grocery Payments</h1>
          <p className="text-sm text-[#64748b]">Record and track payments for purchases and sales</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb]" data-testid="button-add-payment"><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            {paymentSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-[400ms] ease-in-out">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-[#1e293b]">Payment Recorded!</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                  <FormField control={form.control} name="reference_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment For</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v); form.setValue("reference_id", ""); }} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-ref-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="PURCHASE">Purchase (Pay Supplier)</SelectItem>
                          <SelectItem value="SALE">Sale (Receive from Customer)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reference_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-reference"><SelectValue placeholder="Select reference" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {references?.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.reference_no} — Remaining: {formatRWF(r.remaining_amount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount (RWF)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-payment-amount" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="payment_date" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-payment-date" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-mode"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                          <SelectItem value="CHECK">Check</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ""} data-testid="input-payment-notes" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-payment">
                    {createMutation.isPending ? "Processing..." : "Record Payment"}
                  </Button>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !payments?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CreditCard className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">No payments yet</p>
              <p className="text-sm text-[#64748b]">Record your first payment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">Date</TableHead>
                  <TableHead className="text-[#64748b]">Type</TableHead>
                  <TableHead className="text-[#64748b] text-right">Amount (RWF)</TableHead>
                  <TableHead className="text-[#64748b]">Mode</TableHead>
                  <TableHead className="text-[#64748b]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id} className="border-b border-[#e2e8f0]" data-testid={`row-payment-${p.id}`}>
                    <TableCell className="text-[#64748b]">{p.payment_date}</TableCell>
                    <TableCell><Badge variant="secondary">{p.reference_type}</Badge></TableCell>
                    <TableCell className="text-right font-medium text-[#1e293b]">{formatRWF(p.amount)}</TableCell>
                    <TableCell className="text-[#64748b]">{p.mode}</TableCell>
                    <TableCell className="text-[#64748b] max-w-[200px] truncate">{p.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
