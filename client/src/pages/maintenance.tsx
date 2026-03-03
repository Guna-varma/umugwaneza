import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import type { Vehicle, MaintenanceRecord } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle } from "lucide-react";

function formatRWF(n: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(n));
}

const MAINTENANCE_TYPES = ["Preventive", "Repair", "Breakdown", "Service"] as const;
const STATUS_VALUES = ["Scheduled", "In_Progress", "Completed"] as const;

function statusVariant(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "default";
    case "RENTED_OUT":
      return "secondary";
    case "RENTED_IN":
      return "secondary";
    case "MAINTENANCE":
      return "destructive";
    case "OFFLINE":
      return "outline";
    default:
      return "secondary";
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "bg-[#10b981]/15 text-[#059669] border-[#10b981]/30";
    case "RENTED_OUT":
      return "bg-[#3b82f6]/15 text-[#2563eb] border-[#3b82f6]/30";
    case "RENTED_IN":
      return "bg-[#8b5cf6]/15 text-[#7c3aed] border-[#8b5cf6]/30";
    case "MAINTENANCE":
      return "bg-[#ef4444]/15 text-[#dc2626] border-[#ef4444]/30";
    default:
      return "";
  }
}

type MaintenanceFormState = {
  maintenance_type: "" | (typeof MAINTENANCE_TYPES)[number];
  vendor_name: string;
  invoice_number: string;
  start_date: string;
  expected_completion_date: string;
  completion_date: string;
  status: (typeof STATUS_VALUES)[number];
  cost: string;
  description: string;
  next_service_date: string;
  notes: string;
};

const defaultFormState: MaintenanceFormState = {
  maintenance_type: "",
  vendor_name: "",
  invoice_number: "",
  start_date: new Date().toISOString().split("T")[0],
  expected_completion_date: "",
  completion_date: "",
  status: "In_Progress",
  cost: "",
  description: "",
  next_service_date: "",
  notes: "",
};

function normalizeStatus(s: string): "Scheduled" | "In_Progress" | "Completed" {
  if (s === "Completed" || s === "COMPLETED") return "Completed";
  if (s === "In_Progress" || s === "IN_PROGRESS") return "In_Progress";
  return "Scheduled";
}

function statusLabel(status: string, t: (k: string) => string) {
  const n = normalizeStatus(status);
  if (n === "Completed") return t("maintenance.completed");
  if (n === "In_Progress") return t("maintenance.in_progress");
  return t("maintenance.scheduled");
}

export default function MaintenancePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [vehicleForMaintenance, setVehicleForMaintenance] = useState<Vehicle | null>(null);
  const [formState, setFormState] = useState<MaintenanceFormState>(defaultFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["umugwaneza", "vehicles", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("vehicles").select("*").eq("business_id", businessId).order("vehicle_name");
      if (error) throw new Error(error.message);
      const list = data ?? [];
      return [...new Map(list.map((v) => [v.id, v])).values()];
    },
  });

  const { data: records, isLoading: recordsLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["umugwaneza", "maintenance_records", businessId],
    queryFn: async () => {
      const { data, error } = await db().from("maintenance_records").select("*").eq("business_id", businessId).order("start_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  function validate(form: MaintenanceFormState): boolean {
    const err: Record<string, string> = {};
    if (!form.start_date) err.start_date = t("maintenance.start_date_required");
    const costNum = form.cost === "" ? 0 : Number(form.cost);
    if (Number.isNaN(costNum) || costNum < 0) err.cost = t("maintenance.cost_min");
    if (form.status === "Completed") {
      if (!form.completion_date) err.completion_date = t("maintenance.completion_required_when_completed");
      else if (form.start_date && form.completion_date < form.start_date) err.completion_date = t("maintenance.completion_after_start");
    }
    setFormErrors(err);
    return Object.keys(err).length === 0;
  }

  const markUnderMaintenanceMutation = useMutation({
    mutationFn: async ({ vehicle, form }: { vehicle: Vehicle; form: MaintenanceFormState }) => {
      const payload = {
        business_id: businessId,
        vehicle_id: vehicle.id,
        start_date: form.start_date || new Date().toISOString().split("T")[0],
        description: form.description || null,
        cost: form.cost ? Number(form.cost) : 0,
        next_service_date: form.next_service_date || null,
        notes: form.notes || null,
        status: form.status,
        maintenance_type: form.maintenance_type || null,
        vendor_name: form.vendor_name || null,
        invoice_number: form.invoice_number || null,
        expected_completion_date: form.expected_completion_date || null,
        completion_date: form.status === "Completed" ? (form.completion_date || new Date().toISOString().split("T")[0]) : null,
        created_by: user?.id ?? null,
      };
      const { error } = await db().from("maintenance_records").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "vehicles", businessId] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "maintenance_records", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "rental"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "maintenance_top5"] });
      toast({ title: t("maintenance.add_maintenance_record") });
      setMaintenanceDialogOpen(false);
      setVehicleForMaintenance(null);
      setFormState(defaultFormState);
      setFormErrors({});
    },
    onError: (e: unknown) => toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const markAvailableMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const { error: errVehicle } = await db().from("vehicles").update({ current_status: "AVAILABLE" }).eq("id", vehicle.id);
      if (errVehicle) throw new Error(errVehicle.message);
      const openRecords = (records ?? []).filter(
        (r) => r.vehicle_id === vehicle.id && (r.status === "In_Progress" || r.status === "IN_PROGRESS")
      );
      const today = new Date().toISOString().split("T")[0];
      for (const r of openRecords) {
        await db().from("maintenance_records").update({ status: "Completed", end_date: today }).eq("id", r.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "vehicles", businessId] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "maintenance_records", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "rental"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "maintenance_top5"] });
      toast({ title: t("maintenance.mark_available") });
    },
    onError: (e: unknown) => toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const openMaintenanceDialog = (v: Vehicle) => {
    setVehicleForMaintenance(v);
    setFormState({ ...defaultFormState, start_date: new Date().toISOString().split("T")[0] });
    setFormErrors({});
    setMaintenanceDialogOpen(true);
  };

  const submitMaintenance = () => {
    if (!vehicleForMaintenance) return;
    if (!validate(formState)) return;
    markUnderMaintenanceMutation.mutate({ vehicle: vehicleForMaintenance, form: formState });
  };

  const vehicleNames: Record<string, string> = {};
  vehicles?.forEach((v) => (vehicleNames[v.id] = v.vehicle_name));

  const typeLabel = (key: string) => {
    if (key === "Preventive") return t("maintenance.type_preventive");
    if (key === "Repair") return t("maintenance.type_repair");
    if (key === "Breakdown") return t("maintenance.type_breakdown");
    if (key === "Service") return t("maintenance.type_service");
    return key;
  };

  return (
    <div className="p-6 space-y-8 animate-page-fade">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">
          {t("maintenance.title")}
        </h1>
        <p className="text-sm text-[#64748b] mt-0.5">{t("maintenance.subtitle")}</p>
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          <div className="p-4 border-b border-[#e2e8f0]">
            <h2 className="font-semibold text-[#1e293b]">
              {t("maintenance.vehicle")} {t("maintenance.current_status")}
            </h2>
          </div>
          {vehiclesLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !vehicles?.length ? (
            <div className="p-8 text-center text-[#64748b]">{t("maintenance.no_vehicles")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("maintenance.vehicle")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("maintenance.current_status")}</TableHead>
                  <TableHead className="text-[#64748b] text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id} className="border-b border-[#e2e8f0]">
                    <TableCell className="font-medium text-[#1e293b]">{v.vehicle_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(v.current_status) as "default" | "secondary" | "destructive" | "outline"} className={statusBadgeClass(v.current_status)}>
                        {v.current_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {v.current_status === "MAINTENANCE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#10b981] border-[#10b981] hover:bg-[#10b981]/10"
                          onClick={() => markAvailableMutation.mutate(v)}
                          disabled={markAvailableMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t("maintenance.mark_available")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#eab308] border-[#eab308] hover:bg-[#eab308]/10"
                          onClick={() => openMaintenanceDialog(v)}
                          disabled={v.current_status !== "AVAILABLE" && v.current_status !== "OFFLINE"}
                        >
                          <Wrench className="h-4 w-4 mr-1" />
                          {t("maintenance.mark_under_maintenance")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          <div className="p-4 border-b border-[#e2e8f0]">
            <h2 className="font-semibold text-[#1e293b]">{t("maintenance.maintenance_history")}</h2>
          </div>
          {recordsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !records?.length ? (
            <div className="p-8 text-center text-[#64748b]">{t("maintenance.no_maintenance_records")}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#e2e8f0]">
                    <TableHead className="text-[#64748b]">{t("maintenance.vehicle")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.type")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.date")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.vendor_name")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.invoice_number")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.description")}</TableHead>
                    <TableHead className="text-[#64748b] text-right">{t("maintenance.cost")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.expected_completion_date")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.completion_date")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.downtime_days")}</TableHead>
                    <TableHead className="text-[#64748b]">{t("maintenance.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id} className="border-b border-[#e2e8f0]">
                      <TableCell className="text-[#1e293b]">{vehicleNames[r.vehicle_id] ?? r.vehicle_id}</TableCell>
                      <TableCell className="text-[#64748b]">{r.maintenance_type ? typeLabel(r.maintenance_type) : "—"}</TableCell>
                      <TableCell className="text-[#64748b]">{r.start_date}</TableCell>
                      <TableCell className="text-[#64748b] max-w-[120px] truncate">{r.vendor_name ?? "—"}</TableCell>
                      <TableCell className="text-[#64748b]">{r.invoice_number ?? "—"}</TableCell>
                      <TableCell className="text-[#1e293b] max-w-[180px] truncate">{r.description ?? "—"}</TableCell>
                      <TableCell className="text-right text-[#1e293b]">{r.cost != null ? formatRWF(r.cost) + " RWF" : "—"}</TableCell>
                      <TableCell className="text-[#64748b]">{r.expected_completion_date ?? "—"}</TableCell>
                      <TableCell className="text-[#64748b]">{r.completion_date ?? r.end_date ?? "—"}</TableCell>
                      <TableCell className="text-[#64748b]">{r.downtime_days != null ? r.downtime_days : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={normalizeStatus(r.status) === "Completed" ? "default" : "secondary"}>
                          {statusLabel(r.status, t)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("maintenance.mark_under_maintenance")}</DialogTitle>
          </DialogHeader>
          {vehicleForMaintenance && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-[#64748b]">
                {t("maintenance.vehicle")}: <span className="font-medium text-[#1e293b]">{vehicleForMaintenance.vehicle_name}</span>
              </p>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.maintenance_type")}</label>
                <Select
                  value={formState.maintenance_type}
                  onValueChange={(v) => setFormState((s) => ({ ...s, maintenance_type: (v || "") as MaintenanceFormState["maintenance_type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("maintenance.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {typeLabel(opt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.vendor_name")}</label>
                <Input
                  value={formState.vendor_name}
                  onChange={(e) => setFormState((s) => ({ ...s, vendor_name: e.target.value }))}
                  placeholder={t("maintenance.vendor_name")}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.invoice_number")}</label>
                <Input
                  value={formState.invoice_number}
                  onChange={(e) => setFormState((s) => ({ ...s, invoice_number: e.target.value }))}
                  placeholder={t("maintenance.invoice_number")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.start_date")} *</label>
                  <Input
                    type="date"
                    value={formState.start_date}
                    onChange={(e) => setFormState((s) => ({ ...s, start_date: e.target.value }))}
                  />
                  {formErrors.start_date && <p className="text-xs text-red-600">{formErrors.start_date}</p>}
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.expected_completion_date")}</label>
                  <Input
                    type="date"
                    value={formState.expected_completion_date}
                    onChange={(e) => setFormState((s) => ({ ...s, expected_completion_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.status")}</label>
                <Select
                  value={formState.status}
                  onValueChange={(v) => setFormState((s) => ({ ...s, status: v as (typeof STATUS_VALUES)[number] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">{t("maintenance.scheduled")}</SelectItem>
                    <SelectItem value="In_Progress">{t("maintenance.in_progress")}</SelectItem>
                    <SelectItem value="Completed">{t("maintenance.completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formState.status === "Completed" && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.completion_date")} *</label>
                  <Input
                    type="date"
                    value={formState.completion_date}
                    onChange={(e) => setFormState((s) => ({ ...s, completion_date: e.target.value }))}
                  />
                  {formErrors.completion_date && <p className="text-xs text-red-600">{formErrors.completion_date}</p>}
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.cost")} (RWF) *</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.cost}
                  onChange={(e) => setFormState((s) => ({ ...s, cost: e.target.value }))}
                  placeholder="0"
                />
                {formErrors.cost && <p className="text-xs text-red-600">{formErrors.cost}</p>}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.description")}</label>
                <Input
                  value={formState.description}
                  onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                  placeholder={t("maintenance.description")}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.next_service_date")}</label>
                <Input
                  type="date"
                  value={formState.next_service_date}
                  onChange={(e) => setFormState((s) => ({ ...s, next_service_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#1e293b]">{t("maintenance.notes")}</label>
                <Textarea
                  value={formState.notes}
                  onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
                  placeholder={t("maintenance.notes")}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={submitMaintenance} disabled={markUnderMaintenanceMutation.isPending}>
                  {markUnderMaintenanceMutation.isPending ? "…" : t("maintenance.mark_under_maintenance")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
