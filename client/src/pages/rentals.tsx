import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { RentalContract, InsertRentalContract, Vehicle, Customer, ExternalAssetOwner, RentalPayment, InsertRentalPayment } from "@shared/schema";
import { insertRentalContractSchema, insertRentalPaymentSchema } from "@shared/schema";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowUpRight, ArrowDownLeft, CreditCard } from "lucide-react";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

function financialVariant(status: string) {
  if (status === "FULLY_SETTLED") return "default";
  if (status === "PARTIAL") return "secondary";
  return "destructive";
}

function opsVariant(status: string) {
  if (status === "ACTIVE") return "default";
  if (status === "COMPLETED") return "secondary";
  return "destructive";
}

function calculateTotal(start: string, end: string, rate: number, rentalType: string) {
  if (!start || !end || !rate) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return 0;
  if (rentalType === "HOUR") {
    const hours = diffMs / (1000 * 60 * 60);
    return Math.ceil(hours) * rate;
  }
  const days = diffMs / (1000 * 60 * 60 * 24);
  return Math.ceil(days) * rate;
}

export default function RentalsPage({ direction }: { direction: "OUTGOING" | "INCOMING" }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const isOutgoing = direction === "OUTGOING";

  const { data: contracts, isLoading } = useQuery<RentalContract[]>({
    queryKey: ["umugwaneza", "rental_contracts", businessId, direction],
    queryFn: async () => {
      const { data, error } = await db().from("rental_contracts").select("*, vehicle:vehicles(*), customer:customers(*), external_owner:external_asset_owners(*)").eq("business_id", businessId).eq("rental_direction", direction).order("rental_start_datetime", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["umugwaneza", "vehicles", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("vehicles").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
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

  const { data: externalOwners } = useQuery<ExternalAssetOwner[]>({
    queryKey: ["umugwaneza", "external_asset_owners", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("external_asset_owners").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const form = useForm<InsertRentalContract>({
    resolver: zodResolver(insertRentalContractSchema),
    defaultValues: {
      vehicle_id: "", rental_direction: direction, customer_id: null, external_owner_id: null,
      rental_start_datetime: "", rental_end_datetime: "", rate: 0, location: "", notes: "",
    },
  });

  const vehicleId = form.watch("vehicle_id");
  const startDt = form.watch("rental_start_datetime");
  const endDt = form.watch("rental_end_datetime");
  const rate = form.watch("rate");
  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);
  const rentalType = selectedVehicle?.rental_type || "DAY";
  const autoTotal = calculateTotal(startDt, endDt, rate, rentalType);

  const createMutation = useMutation({
    mutationFn: async (values: InsertRentalContract) => {
      const total_amount = autoTotal;
      const { error } = await db().from("rental_contracts").insert({
        business_id: businessId,
        vehicle_id: values.vehicle_id,
        rental_direction: direction,
        customer_id: values.customer_id || null,
        external_owner_id: values.external_owner_id || null,
        rental_start_datetime: values.rental_start_datetime,
        rental_end_datetime: values.rental_end_datetime,
        rate: values.rate,
        total_amount,
        amount_paid: 0,
        remaining_amount: total_amount,
        financial_status: "PENDING",
        operational_status: "ACTIVE",
        location: values.location || null,
        notes: values.notes || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_contracts", businessId, direction] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "vehicles", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "rental"] });
      toast({ title: t("common.rental_created") });
      form.reset({ vehicle_id: "", rental_direction: direction, customer_id: null, external_owner_id: null, rental_start_datetime: "", rental_end_datetime: "", rate: 0, location: "", notes: "" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: async (contract: RentalContract) => {
      const { error: err1 } = await db().from("rental_contracts").update({ operational_status: "COMPLETED" }).eq("id", contract.id);
      if (err1) throw new Error(err1.message);
      const { error: err2 } = await db().from("vehicles").update({ current_status: "AVAILABLE" }).eq("id", contract.vehicle_id);
      if (err2) throw new Error(err2.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_contracts", businessId, direction] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "vehicles", businessId] });
      toast({ title: t("common.contract_completed") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const payForm = useForm<InsertRentalPayment>({
    resolver: zodResolver(insertRentalPaymentSchema),
    defaultValues: { rental_contract_id: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "" },
  });

  const payMutation = useMutation({
    mutationFn: async (values: InsertRentalPayment) => {
      const { error } = await db().from("rental_payments").insert({ ...values, business_id: businessId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_contracts", businessId, direction] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_payments", businessId] });
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        payForm.reset();
        setPayOpen(false);
        setSelectedContract(null);
      }, 800);
      toast({ title: t("common.payment_recorded") });
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const Icon = isOutgoing ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">
            {isOutgoing ? t("rentals.outgoing_title") : t("rentals.incoming_title")}
          </h1>
          <p className="text-sm text-[#64748b]">
            {isOutgoing ? t("rentals.outgoing_subtitle") : t("rentals.incoming_subtitle")}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-rental"><Plus className="h-4 w-4 mr-2" /> {t("rentals.new_contract")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isOutgoing ? t("rentals.new_outgoing") : t("rentals.new_incoming")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="vehicle_id" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.vehicle")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-vehicle"><SelectValue placeholder={t("rentals.select_vehicle")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicles?.map((v) => <SelectItem key={v.id} value={v.id}>{v.vehicle_name} ({v.vehicle_type})</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                {isOutgoing ? (
                  <FormField control={form.control} name="customer_id" render={({ field }) => (
                    <FormItem><FormLabel>{t("rentals.customer")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("rentals.select_customer")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <FormField control={form.control} name="external_owner_id" render={({ field }) => (
                    <FormItem><FormLabel>{t("rentals.external_owner")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("rentals.select_owner")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {externalOwners?.map((o) => <SelectItem key={o.id} value={o.id}>{o.owner_name}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="rental_start_datetime" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.start_datetime")}</FormLabel><FormControl><Input type="datetime-local" {...field} data-testid="input-start" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rental_end_datetime" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.end_datetime")}</FormLabel><FormControl><Input type="datetime-local" {...field} data-testid="input-end" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rate" render={({ field }) => (
                  <FormItem><FormLabel>{rentalType === "HOUR" ? t("rentals.rate_per_hour") : t("rentals.rate_per_day")}</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-rate" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">{t("rentals.estimated_total")}</span><span className="font-semibold text-[#1e293b]">{formatRWF(autoTotal)}</span></div>
                </div>
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.location")}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-rental">
                  {createMutation.isPending ? t("rentals.creating") : t("rentals.create_contract")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("rentals.record_payment")}</DialogTitle></DialogHeader>
          {paymentSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-[#1e293b]">{t("rentals.payment_recorded")}</p>
            </div>
          ) : (
            <Form {...payForm}>
              <form onSubmit={payForm.handleSubmit((v) => payMutation.mutate(v))} className="space-y-4">
                {selectedContract && (
                  <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9] text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-[#64748b]">{t("rentals.total")}</span><span className="text-[#1e293b]">{formatRWF(selectedContract.total_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-[#64748b]">{t("rentals.paid")}</span><span className="text-[#1e293b]">{formatRWF(selectedContract.amount_paid)}</span></div>
                    <div className="flex justify-between font-medium"><span className="text-[#64748b]">{t("rentals.remaining")}</span><span className="text-[#1e293b]">{formatRWF(selectedContract.remaining_amount)}</span></div>
                  </div>
                )}
                <FormField control={payForm.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.amount_rwf")}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="payment_date" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="mode" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.mode")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">{t("rentals.cash")}</SelectItem>
                        <SelectItem value="BANK_TRANSFER">{t("rentals.bank_transfer")}</SelectItem>
                        <SelectItem value="MOBILE_MONEY">{t("rentals.mobile_money")}</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={payForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>{t("rentals.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={payMutation.isPending}>
                  {payMutation.isPending ? t("rentals.recording") : t("rentals.record")}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !contracts?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{isOutgoing ? t("rentals.no_outgoing") : t("rentals.no_incoming")}</p>
              <p className="text-sm text-[#64748b]">{t("rentals.create_first")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">{t("rentals.vehicle")}</TableHead>
                    <TableHead className="text-[#64748b]">{isOutgoing ? t("rentals.customer") : t("rentals.external_owner")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("rentals.start")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("rentals.end")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("rentals.total_rwf")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("rentals.paid_rwf")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("rentals.financial")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("rentals.status")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("rentals.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c, i) => (
                    <TableRow key={c.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-rental-${c.id}`}>
                      <TableCell className="font-medium text-[#1e293b]">{c.vehicle?.vehicle_name || "—"}</TableCell>
                      <TableCell className="text-[#64748b]">{isOutgoing ? c.customer?.customer_name : c.external_owner?.owner_name || "—"}</TableCell>
                      <TableCell className="text-[#64748b] text-xs">{new Date(c.rental_start_datetime).toLocaleString()}</TableCell>
                      <TableCell className="text-[#64748b] text-xs">{new Date(c.rental_end_datetime).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(c.total_amount)}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{formatRWF(c.amount_paid)}</TableCell>
                      <TableCell><Badge variant={financialVariant(c.financial_status)}>{c.financial_status.replace("_", " ")}</Badge></TableCell>
                      <TableCell><Badge variant={opsVariant(c.operational_status)}>{c.operational_status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {c.operational_status === "ACTIVE" && c.remaining_amount > 0 && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedContract(c);
                              payForm.reset({ rental_contract_id: c.id, amount: 0, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "" });
                              setPayOpen(true);
                            }} data-testid={`button-pay-${c.id}`}>{t("rentals.pay")}</Button>
                          )}
                          {c.operational_status === "ACTIVE" && (
                            <Button variant="outline" size="sm" onClick={() => completeMutation.mutate(c)} data-testid={`button-complete-${c.id}`}>{t("rentals.complete")}</Button>
                          )}
                        </div>
                      </TableCell>
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
