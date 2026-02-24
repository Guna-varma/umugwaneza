import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
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

const BUSINESS_ID = "biz_001";

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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const isOutgoing = direction === "OUTGOING";

  const { data: contracts, isLoading } = useQuery<RentalContract[]>({
    queryKey: ["/rental-contracts", direction],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_contracts")
        .select("*, vehicle:vehicles(*), customer:customers(*), external_owner:external_asset_owners(*)")
        .eq("business_id", BUSINESS_ID)
        .eq("rental_direction", direction)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("business_id", BUSINESS_ID);
      return data || [];
    },
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").eq("business_id", BUSINESS_ID);
      return data || [];
    },
  });

  const { data: externalOwners } = useQuery<ExternalAssetOwner[]>({
    queryKey: ["/external-owners"],
    queryFn: async () => {
      const { data } = await supabase.from("external_asset_owners").select("*").eq("business_id", BUSINESS_ID);
      return data || [];
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
      const vehicle = vehicles?.find((v) => v.id === values.vehicle_id);
      if (!vehicle) throw new Error("Vehicle not found");

      const { data: overlapping } = await supabase
        .from("rental_contracts")
        .select("id")
        .eq("vehicle_id", values.vehicle_id)
        .eq("operational_status", "ACTIVE")
        .lt("rental_start_datetime", values.rental_end_datetime)
        .gt("rental_end_datetime", values.rental_start_datetime);

      if (overlapping && overlapping.length > 0) {
        throw new Error("This vehicle has an overlapping active rental contract for the selected period.");
      }

      const total = calculateTotal(values.rental_start_datetime, values.rental_end_datetime, values.rate, vehicle.rental_type);

      const { error } = await supabase.from("rental_contracts").insert({
        ...values,
        business_id: BUSINESS_ID,
        rental_direction: direction,
        total_amount: total,
        amount_paid: 0,
        remaining_amount: total,
        financial_status: "PENDING",
        operational_status: "ACTIVE",
      });
      if (error) throw error;

      const newStatus = isOutgoing ? "RENTED_OUT" : "RENTED_IN";
      await supabase.from("vehicles").update({ current_status: newStatus }).eq("id", values.vehicle_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/rental-contracts", direction] });
      queryClient.invalidateQueries({ queryKey: ["/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/rental"] });
      toast({ title: "Rental contract created" });
      form.reset({ vehicle_id: "", rental_direction: direction, customer_id: null, external_owner_id: null, rental_start_datetime: "", rental_end_datetime: "", rate: 0, location: "", notes: "" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: async (contract: RentalContract) => {
      await supabase.from("rental_contracts").update({ operational_status: "COMPLETED" }).eq("id", contract.id);
      await supabase.from("vehicles").update({ current_status: "AVAILABLE" }).eq("id", contract.vehicle_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/rental-contracts", direction] });
      queryClient.invalidateQueries({ queryKey: ["/vehicles"] });
      toast({ title: "Contract marked as completed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payForm = useForm<InsertRentalPayment>({
    resolver: zodResolver(insertRentalPaymentSchema),
    defaultValues: { rental_contract_id: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "" },
  });

  const payMutation = useMutation({
    mutationFn: async (values: InsertRentalPayment) => {
      const { error } = await supabase.from("rental_payments").insert({ ...values, business_id: BUSINESS_ID });
      if (error) throw error;
      if (selectedContract) {
        const newPaid = selectedContract.amount_paid + values.amount;
        const newRemaining = Math.max(0, selectedContract.total_amount - newPaid);
        let status: "PENDING" | "PARTIAL" | "FULLY_SETTLED" = "PARTIAL";
        if (newRemaining <= 0) status = "FULLY_SETTLED";
        await supabase.from("rental_contracts").update({ amount_paid: newPaid, remaining_amount: newRemaining, financial_status: status }).eq("id", selectedContract.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/rental-contracts", direction] });
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        payForm.reset();
        setPayOpen(false);
        setSelectedContract(null);
      }, 800);
      toast({ title: "Payment recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const Icon = isOutgoing ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">
            {isOutgoing ? "Outgoing Rentals" : "Incoming Rentals"}
          </h1>
          <p className="text-sm text-[#64748b]">
            {isOutgoing ? "Rent out your vehicles to customers" : "Rent vehicles from external owners"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#2563eb]" data-testid="button-add-rental"><Plus className="h-4 w-4 mr-2" /> New Contract</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New {isOutgoing ? "Outgoing" : "Incoming"} Rental</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="vehicle_id" render={({ field }) => (
                  <FormItem><FormLabel>Vehicle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicles?.map((v) => <SelectItem key={v.id} value={v.id}>{v.vehicle_name} ({v.vehicle_type})</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                {isOutgoing ? (
                  <FormField control={form.control} name="customer_id" render={({ field }) => (
                    <FormItem><FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <FormField control={form.control} name="external_owner_id" render={({ field }) => (
                    <FormItem><FormLabel>External Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {externalOwners?.map((o) => <SelectItem key={o.id} value={o.id}>{o.owner_name}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="rental_start_datetime" render={({ field }) => (
                  <FormItem><FormLabel>Start Date/Time</FormLabel><FormControl><Input type="datetime-local" {...field} data-testid="input-start" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rental_end_datetime" render={({ field }) => (
                  <FormItem><FormLabel>End Date/Time</FormLabel><FormControl><Input type="datetime-local" {...field} data-testid="input-end" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rate" render={({ field }) => (
                  <FormItem><FormLabel>Rate per {rentalType === "HOUR" ? "Hour" : "Day"} (RWF)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-rate" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9]">
                  <div className="flex justify-between text-sm"><span className="text-[#64748b]">Estimated Total</span><span className="font-semibold text-[#1e293b]">{formatRWF(autoTotal)}</span></div>
                </div>
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-rental">
                  {createMutation.isPending ? "Creating..." : "Create Contract"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Rental Payment</DialogTitle></DialogHeader>
          {paymentSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-[400ms] ease-in-out">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-[#1e293b]">Payment Recorded!</p>
            </div>
          ) : (
            <Form {...payForm}>
              <form onSubmit={payForm.handleSubmit((v) => payMutation.mutate(v))} className="space-y-4">
                {selectedContract && (
                  <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f1f5f9] text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-[#64748b]">Total</span><span className="text-[#1e293b]">{formatRWF(selectedContract.total_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-[#64748b]">Paid</span><span className="text-[#1e293b]">{formatRWF(selectedContract.amount_paid)}</span></div>
                    <div className="flex justify-between font-medium"><span className="text-[#64748b]">Remaining</span><span className="text-[#1e293b]">{formatRWF(selectedContract.remaining_amount)}</span></div>
                  </div>
                )}
                <FormField control={payForm.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount (RWF)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="payment_date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="mode" render={({ field }) => (
                  <FormItem><FormLabel>Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={payForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={payMutation.isPending}>
                  {payMutation.isPending ? "Processing..." : "Record Payment"}
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
              <p className="text-[#1e293b] font-medium">No {isOutgoing ? "outgoing" : "incoming"} rentals yet</p>
              <p className="text-sm text-[#64748b]">Create your first rental contract</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">Vehicle</TableHead>
                    <TableHead className="text-[#64748b]">{isOutgoing ? "Customer" : "Owner"}</TableHead>
                    <TableHead className="text-[#64748b]">Start</TableHead>
                    <TableHead className="text-[#64748b]">End</TableHead>
                    <TableHead className="text-[#64748b] text-right">Total (RWF)</TableHead>
                    <TableHead className="text-[#64748b] text-right">Paid (RWF)</TableHead>
                    <TableHead className="text-[#64748b]">Financial</TableHead>
                    <TableHead className="text-[#64748b]">Status</TableHead>
                    <TableHead className="text-[#64748b]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id} className="border-b border-[#e2e8f0]" data-testid={`row-rental-${c.id}`}>
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
                            }} data-testid={`button-pay-${c.id}`}>Pay</Button>
                          )}
                          {c.operational_status === "ACTIVE" && (
                            <Button variant="outline" size="sm" onClick={() => completeMutation.mutate(c)} data-testid={`button-complete-${c.id}`}>Complete</Button>
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
