import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InsertGroceryPayment, InsertRentalPayment } from "@shared/schema";
import { insertGroceryPaymentSchema, insertRentalPaymentSchema } from "@shared/schema";
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
import { Plus, CreditCard, Truck } from "lucide-react";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

function GroceryPaymentsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { data: payments, isLoading } = useQuery({ queryKey: ["/api/grocery-payments"] });
  const { data: pendingPurchases } = useQuery<any[]>({ queryKey: ["/api/purchases?pending=true"] });
  const { data: pendingSales } = useQuery<any[]>({ queryKey: ["/api/sales?pending=true"] });

  const form = useForm<InsertGroceryPayment>({
    resolver: zodResolver(insertGroceryPaymentSchema),
    defaultValues: { reference_type: "PURCHASE", reference_id: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "" },
  });

  const refType = form.watch("reference_type");

  const createMutation = useMutation({
    mutationFn: async (values: InsertGroceryPayment) => {
      await apiRequest("POST", "/api/grocery-payments", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases?pending=true"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales?pending=true"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/grocery"] });
      setPaymentSuccess(true);
      setTimeout(() => { setPaymentSuccess(false); form.reset(); setOpen(false); }, 800);
      toast({ title: t("common.payment_recorded") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const references = refType === "PURCHASE" ? pendingPurchases : pendingSales;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-grocery-payment"><Plus className="h-4 w-4 mr-2" /> {t("payments.record_payment")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("payments.record_payment")}</DialogTitle></DialogHeader>
            {paymentSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><CreditCard className="h-8 w-8 text-green-600" /></div>
                <p className="text-lg font-semibold text-[#1e293b]">{t("payments.payment_recorded")}</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                  <FormField control={form.control} name="reference_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.payment_for")}</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v); form.setValue("reference_id", ""); }} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-ref-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="PURCHASE">{t("payments.purchase_pay_supplier")}</SelectItem>
                          <SelectItem value="SALE">{t("payments.sale_receive_customer")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reference_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.reference")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-reference"><SelectValue placeholder={t("payments.select_reference")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {references?.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>{r.reference_no} — {t("payments.remaining_label")}: {formatRWF(r.remaining_amount)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.amount_rwf")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-payment-amount" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="payment_date" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.date")}</FormLabel><FormControl><Input type="date" {...field} data-testid="input-payment-date" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.payment_mode")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-mode"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">{t("payments.cash")}</SelectItem>
                          <SelectItem value="BANK_TRANSFER">{t("payments.bank_transfer")}</SelectItem>
                          <SelectItem value="MOBILE_MONEY">{t("payments.mobile_money")}</SelectItem>
                          <SelectItem value="CHECK">{t("payments.check")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} data-testid="input-payment-notes" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" disabled={createMutation.isPending} data-testid="button-submit-payment">
                    {createMutation.isPending ? t("payments.processing") : t("payments.record")}
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
          ) : !(payments as any[])?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CreditCard className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("payments.no_payments")}</p>
              <p className="text-sm text-[#64748b]">{t("payments.add_first")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("payments.date")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.type")}</TableHead>
                  <TableHead className="text-[#64748b] text-right">{t("payments.amount_rwf")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.mode")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments as any[]).map((p: any, i: number) => (
                  <TableRow key={p.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-payment-${p.id}`}>
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

function RentalPaymentsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { data: rentalPayments, isLoading } = useQuery({ queryKey: ["/api/rental-payments"] });
  const { data: pendingContracts } = useQuery<any[]>({ queryKey: ["/api/rental-contracts-pending"] });

  const form = useForm<InsertRentalPayment>({
    resolver: zodResolver(insertRentalPaymentSchema),
    defaultValues: { rental_contract_id: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertRentalPayment) => {
      await apiRequest("POST", "/api/rental-payments", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rental-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rental-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rental-contracts-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/rental"] });
      setPaymentSuccess(true);
      setTimeout(() => { setPaymentSuccess(false); form.reset(); setOpen(false); }, 800);
      toast({ title: t("common.payment_recorded") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-rental-payment"><Plus className="h-4 w-4 mr-2" /> {t("payments.record_rental_payment")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("payments.record_rental_payment")}</DialogTitle></DialogHeader>
            {paymentSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><Truck className="h-8 w-8 text-green-600" /></div>
                <p className="text-lg font-semibold text-[#1e293b]">{t("payments.payment_recorded")}</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                  <FormField control={form.control} name="rental_contract_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.rental_contract")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-rental-contract"><SelectValue placeholder={t("payments.select_contract")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {pendingContracts?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.vehicle?.vehicle_name || "Vehicle"} — {c.rental_direction} — {t("payments.remaining_label")}: {formatRWF(c.remaining_amount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.amount_rwf")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-rental-payment-amount" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="payment_date" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.date")}</FormLabel><FormControl><Input type="date" {...field} data-testid="input-rental-payment-date" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("payments.payment_mode")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-rental-mode"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">{t("payments.cash")}</SelectItem>
                          <SelectItem value="BANK_TRANSFER">{t("payments.bank_transfer")}</SelectItem>
                          <SelectItem value="MOBILE_MONEY">{t("payments.mobile_money")}</SelectItem>
                          <SelectItem value="CHECK">{t("payments.check")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>{t("payments.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} data-testid="input-rental-payment-notes" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" disabled={createMutation.isPending} data-testid="button-submit-rental-payment">
                    {createMutation.isPending ? t("payments.processing") : t("payments.record")}
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
          ) : !(rentalPayments as any[])?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("payments.no_rental_payments")}</p>
              <p className="text-sm text-[#64748b]">{t("payments.add_first_rental")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("payments.date")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.vehicle")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.direction")}</TableHead>
                  <TableHead className="text-[#64748b] text-right">{t("payments.amount_rwf")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.mode")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("payments.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rentalPayments as any[]).map((p: any, i: number) => (
                  <TableRow key={p.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-rental-payment-${p.id}`}>
                    <TableCell className="text-[#64748b]">{p.payment_date}</TableCell>
                    <TableCell className="text-[#1e293b]">{p.rental_contract?.vehicle?.vehicle_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{p.rental_contract?.rental_direction || "—"}</Badge></TableCell>
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

export default function PaymentsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("payments.title")}</h1>
        <p className="text-sm text-[#64748b]">{t("payments.subtitle")}</p>
      </div>

      <Tabs defaultValue="grocery" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="grocery" data-testid="tab-grocery-payments">
            <CreditCard className="h-4 w-4 mr-2" /> {t("payments.grocery_tab")}
          </TabsTrigger>
          <TabsTrigger value="rental" data-testid="tab-rental-payments">
            <Truck className="h-4 w-4 mr-2" /> {t("payments.rental_tab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="grocery" className="mt-4">
          <GroceryPaymentsTab />
        </TabsContent>
        <TabsContent value="rental" className="mt-4">
          <RentalPaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
