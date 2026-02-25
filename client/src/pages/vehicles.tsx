import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { Vehicle, InsertVehicle } from "@shared/schema";
import { insertVehicleSchema } from "@shared/schema";
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
import { Plus, Truck, RefreshCw } from "lucide-react";

function statusVariant(status: string) {
  switch (status) {
    case "AVAILABLE": return "default";
    case "RENTED_OUT": return "secondary";
    case "RENTED_IN": return "secondary";
    case "MAINTENANCE": return "destructive";
    case "OFFLINE": return "destructive";
    default: return "secondary";
  }
}

export default function VehiclesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["umugwaneza", "vehicles", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("vehicles").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: { vehicle_name: "", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 0, current_status: "AVAILABLE", current_location: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (values: InsertVehicle) => {
      const { error } = await db().from("vehicles").insert({ ...values, business_id: businessId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "vehicles", businessId] });
      toast({ title: t("common.vehicle_added") });
      form.reset();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await db().rpc("sync_vehicles_from_hapyjo", { p_default_business_id: businessId });
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "vehicles", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "rental"] });
      toast({ title: t("vehicles.sync_complete"), description: (data as any)?.message ?? "Vehicles synced from HAPYJO." });
    } catch (e: any) {
      toast({ title: t("vehicles.sync_failed"), description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("vehicles.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("vehicles.subtitle")}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" className="h-12 border-[#e2e8f0]" onClick={handleSync} disabled={syncing} data-testid="button-sync-vehicles">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> {syncing ? t("vehicles.syncing") : t("vehicles.sync_vehicles")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 bg-[#2563eb] transition-transform duration-200 hover:scale-[1.02]" data-testid="button-add-vehicle"><Plus className="h-4 w-4 mr-2" /> {t("vehicles.add_vehicle")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("vehicles.add_new_vehicle")}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                  <FormField control={form.control} name="vehicle_name" render={({ field }) => (
                    <FormItem><FormLabel>{t("vehicles.vehicle_name")}</FormLabel><FormControl><Input {...field} data-testid="input-vehicle-name" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="vehicle_type" render={({ field }) => (
                      <FormItem><FormLabel>{t("vehicles.type")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="TRUCK">{t("vehicles.truck")}</SelectItem><SelectItem value="MACHINE">{t("vehicles.machine")}</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rental_type" render={({ field }) => (
                      <FormItem><FormLabel>{t("vehicles.rental_type")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="DAY">{t("vehicles.day")}</SelectItem><SelectItem value="HOUR">{t("vehicles.hour")}</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="ownership_type" render={({ field }) => (
                      <FormItem><FormLabel>{t("vehicles.ownership")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="OWN">{t("vehicles.own")}</SelectItem><SelectItem value="EXTERNAL">{t("vehicles.external")}</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="base_rate" render={({ field }) => (
                      <FormItem><FormLabel>{t("vehicles.base_rate")}</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="current_location" render={({ field }) => (
                    <FormItem><FormLabel>{t("vehicles.location")}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>{t("vehicles.notes")}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full h-12 bg-[#2563eb]" disabled={createMutation.isPending} data-testid="button-submit-vehicle">
                    {createMutation.isPending ? t("vehicles.adding") : t("vehicles.add")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !vehicles?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="h-12 w-12 text-[#64748b] mb-4" />
              <p className="text-[#1e293b] font-medium">{t("vehicles.no_vehicles")}</p>
              <p className="text-sm text-[#64748b]">{t("vehicles.add_first")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">{t("vehicles.name")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("vehicles.type")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("vehicles.rental")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("vehicles.ownership")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("vehicles.base_rate")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("common.status")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("vehicles.location")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v, i) => (
                    <TableRow key={v.id} className="border-b border-[#e2e8f0] animate-row-slide" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-vehicle-${v.id}`}>
                      <TableCell className="font-medium text-[#1e293b]">{v.vehicle_name}</TableCell>
                      <TableCell className="text-[#64748b]">{v.vehicle_type}</TableCell>
                      <TableCell className="text-[#64748b]">{v.rental_type}</TableCell>
                      <TableCell className="text-[#64748b]">{v.ownership_type}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{new Intl.NumberFormat("en-RW").format(v.base_rate)}</TableCell>
                      <TableCell><Badge variant={statusVariant(v.current_status)}>{v.current_status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-[#64748b]">{v.current_location || "—"}</TableCell>
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
