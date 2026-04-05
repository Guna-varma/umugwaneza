import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/supabase";
import { useLocation, Link } from "wouter";
import type { RentalContract, RentalUsage, Vehicle, Customer } from "@shared/schema";
import { rentalUsageLineCharge } from "@/lib/rentalUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import * as XLSX from "xlsx";
import { CalendarDays, Download, Save, ArrowLeft } from "lucide-react";

type DayRow = {
  usage_date: string;
  day_fraction: number;
  machine_hours: number | null;
  notes: string;
};

type UsageWithContract = RentalUsage & {
  rental_contract?: (RentalContract & { vehicle?: Vehicle; customer?: Customer }) | null;
};

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Date bounds aligned with DB trigger (usage_date between start::date and end::date inclusive). */
function getContractDateBounds(contract: RentalContract) {
  const start = parseISO(contract.rental_start_datetime.slice(0, 10));
  const end = parseISO(contract.rental_end_datetime.slice(0, 10));
  const startYmd = toYmd(start);
  const endYmd = toYmd(end);
  const calendarDaysInPeriod = eachDayOfInterval({ start, end }).length;
  return { start, end, startYmd, endYmd, calendarDaysInPeriod };
}

function validateUsageDatesInContract(rows: DayRow[], startYmd: string, endYmd: string): string | null {
  for (const row of rows) {
    if (row.usage_date < startYmd || row.usage_date > endYmd) {
      return row.usage_date;
    }
  }
  return null;
}

const UPSERT_BATCH_SIZE = 120;

export default function RentalWorkingLogPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = user?.business_id ?? "biz_001";
  const [location] = useLocation();

  const contractFromQuery = useMemo(() => {
    if (typeof window === "undefined") return "";
    const q = new URLSearchParams(window.location.search);
    return q.get("contract") ?? "";
  }, [location]);

  const [selectedContractId, setSelectedContractId] = useState(contractFromQuery);
  useEffect(() => {
    if (contractFromQuery) setSelectedContractId(contractFromQuery);
  }, [contractFromQuery]);

  const [dayRows, setDayRows] = useState<DayRow[]>([]);

  const [reportFrom, setReportFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [reportTo, setReportTo] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [reportContractFilter, setReportContractFilter] = useState<string>("");
  const [reportGranularity, setReportGranularity] = useState<"daily" | "weekly" | "monthly">("daily");

  const { data: contracts, isLoading: loadingContracts } = useQuery<RentalContract[]>({
    queryKey: ["umugwaneza", "rental_contracts", businessId, "OUTGOING", "active_log"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("rental_contracts")
        .select("*, vehicle:vehicles(*), customer:customers(*)")
        .eq("business_id", businessId)
        .eq("rental_direction", "OUTGOING")
        .in("operational_status", ["ACTIVE", "COMPLETED"])
        .order("rental_start_datetime", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const selectedContract = contracts?.find((c) => c.id === selectedContractId) ?? null;
  const vehicle = selectedContract?.vehicle;
  const rentalType = selectedContract?.rental_type || "DAY";

  const contractSummary = useMemo(() => {
    if (!selectedContract) return null;
    const bounds = getContractDateBounds(selectedContract);
    const today = startOfDay(new Date());
    const endDay = startOfDay(bounds.end);
    const diff = differenceInCalendarDays(endDay, today);
    const os = selectedContract.operational_status;
    let expiryMessageKey: string;
    let expiryParams: Record<string, string | number> = {};
    if (os === "COMPLETED" || os === "CANCELLED") {
      expiryMessageKey = "rental_usage.expiry_status_completed";
    } else if (diff < 0) {
      expiryMessageKey = "rental_usage.expired_days_ago";
      expiryParams = { days: Math.abs(diff) };
    } else if (diff === 0) {
      expiryMessageKey = "rental_usage.expires_today";
    } else {
      expiryMessageKey = "rental_usage.expires_in_days";
      expiryParams = { days: diff };
    }
    return { bounds, diff, expiryMessageKey, expiryParams };
  }, [selectedContract]);

  const { data: usageRows, isLoading: loadingUsage } = useQuery<RentalUsage[]>({
    queryKey: ["umugwaneza", "rental_usage", businessId, selectedContractId],
    queryFn: async () => {
      if (!selectedContractId) return [];
      const { data, error } = await db()
        .from("rental_usage")
        .select("*")
        .eq("rental_contract_id", selectedContractId)
        .order("usage_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!selectedContractId,
  });

  useEffect(() => {
    if (!selectedContract) {
      setDayRows([]);
      return;
    }
    const start = parseISO(selectedContract.rental_start_datetime.slice(0, 10));
    const end = parseISO(selectedContract.rental_end_datetime.slice(0, 10));
    const days = eachDayOfInterval({ start, end });
    const byDate = new Map((usageRows ?? []).map((u) => [u.usage_date, u]));
    setDayRows(
      days.map((d) => {
        const ymd = toYmd(d);
        const u = byDate.get(ymd);
        return {
          usage_date: ymd,
          day_fraction: u?.day_fraction ?? 0,
          machine_hours: u?.machine_hours ?? null,
          notes: u?.notes ?? "",
        };
      }),
    );
  }, [selectedContract, usageRows]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContractId || !selectedContract) throw new Error("No contract");
      const { startYmd, endYmd } = getContractDateBounds(selectedContract);
      const invalidDate = validateUsageDatesInContract(dayRows, startYmd, endYmd);
      if (invalidDate) {
        throw new Error(`__DATE_VALIDATION__${invalidDate}`);
      }
      const payload = dayRows.map((row) => ({
        business_id: businessId,
        rental_contract_id: selectedContractId,
        usage_date: row.usage_date,
        day_fraction: row.day_fraction,
        machine_hours: rentalType === "HOUR" ? (row.machine_hours ?? 0) : null,
        notes: row.notes.trim() || null,
      }));
      for (let i = 0; i < payload.length; i += UPSERT_BATCH_SIZE) {
        const chunk = payload.slice(i, i + UPSERT_BATCH_SIZE);
        const { error } = await db().from("rental_usage").upsert(chunk, {
          onConflict: "rental_contract_id,usage_date",
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_usage", businessId, selectedContractId] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_contracts", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["umugwaneza", "rental_usage_report"] });
      toast({ title: t("rental_usage.saved") });
    },
    onError: (e: Error) => {
      if (e.message.startsWith("__DATE_VALIDATION__")) {
        const bad = e.message.replace("__DATE_VALIDATION__", "");
        const b = selectedContract ? getContractDateBounds(selectedContract) : null;
        toast({
          title: t("rental_usage.validation_date_title"),
          description: t("rental_usage.validation_date_desc", {
            date: bad,
            start: b?.startYmd ?? "",
            end: b?.endYmd ?? "",
          }),
          variant: "destructive",
        });
        return;
      }
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    },
  });

  const projectedTotal = useMemo(() => {
    if (!selectedContract) return 0;
    const rate = selectedContract.rate;
    return dayRows.reduce(
      (sum, row) =>
        sum + rentalUsageLineCharge(rentalType, rate, row.day_fraction, row.machine_hours),
      0,
    );
  }, [dayRows, selectedContract, rentalType]);

  const workingDayUnits = useMemo(
    () => dayRows.reduce((s, r) => s + r.day_fraction, 0),
    [dayRows],
  );
  const totalMachineHours = useMemo(
    () => dayRows.reduce((s, r) => s + (r.machine_hours ?? 0), 0),
    [dayRows],
  );

  const { data: reportData, isLoading: loadingReport } = useQuery<UsageWithContract[]>({
    queryKey: ["umugwaneza", "rental_usage_report", businessId, reportFrom, reportTo, reportContractFilter],
    queryFn: async () => {
      let q = db()
        .from("rental_usage")
        .select("*")
        .eq("business_id", businessId)
        .gte("usage_date", reportFrom)
        .lte("usage_date", reportTo);
      if (reportContractFilter) {
        q = q.eq("rental_contract_id", reportContractFilter);
      }
      const { data: usage, error } = await q.order("usage_date", { ascending: true });
      if (error) throw new Error(error.message);
      if (!usage?.length) return [];
      const contractIds = Array.from(new Set(usage.map((u) => u.rental_contract_id)));
      const { data: cts, error: err2 } = await db()
        .from("rental_contracts")
        .select("id, rate, rental_type, vehicle_id, customer_id, vehicle:vehicles(vehicle_name), customer:customers(customer_name)")
        .in("id", contractIds);
      if (err2) throw new Error(err2.message);
      const cmap = new Map(
        (cts ?? []).map((c: Record<string, unknown> & { id: string; vehicle?: unknown; customer?: unknown }) => {
          const v = Array.isArray(c.vehicle) ? (c.vehicle[0] as Vehicle) : (c.vehicle as Vehicle | undefined);
          const cu = Array.isArray(c.customer) ? (c.customer[0] as Customer) : (c.customer as Customer | undefined);
          const merged = { ...c, vehicle: v, customer: cu } as RentalContract & { vehicle?: Vehicle; customer?: Customer };
          return [c.id, merged] as [string, RentalContract & { vehicle?: Vehicle; customer?: Customer }];
        }),
      );
      return usage.map((u) => ({ ...u, rental_contract: cmap.get(u.rental_contract_id) ?? null }));
    },
  });

  const dailyReportRows = useMemo(() => {
    const rows = reportData ?? [];
    return rows.map((r) => {
      const rc = r.rental_contract;
      const rt = rc?.rental_type || "DAY";
      const charge = rentalUsageLineCharge(rt, rc?.rate ?? 0, r.day_fraction, r.machine_hours);
      return {
        date: r.usage_date,
        vehicle: rc?.vehicle?.vehicle_name ?? "—",
        customer: rc?.customer?.customer_name ?? "—",
        dayFraction: r.day_fraction,
        hours: r.machine_hours,
        charge,
        notes: r.notes,
      };
    });
  }, [reportData]);

  const weeklyReportRows = useMemo(() => {
    const map = new Map<string, { weekLabel: string; charge: number; days: number; hours: number }>();
    for (const r of dailyReportRows) {
      const d = parseISO(r.date);
      const wk = startOfWeek(d, { weekStartsOn: 1 });
      const key = toYmd(wk);
      const prev = map.get(key) ?? {
        weekLabel: `${format(wk, "MMM d")} – ${format(endOfWeek(d, { weekStartsOn: 1 }), "MMM d, yyyy")}`,
        charge: 0,
        days: 0,
        hours: 0,
      };
      prev.charge += r.charge;
      prev.days += r.dayFraction;
      prev.hours += r.hours ?? 0;
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [dailyReportRows]);

  const monthlyReportRows = useMemo(() => {
    const map = new Map<string, { month: string; charge: number; days: number; hours: number }>();
    for (const r of dailyReportRows) {
      const d = parseISO(r.date);
      const m = startOfMonth(d);
      const key = format(m, "yyyy-MM");
      const prev = map.get(key) ?? { month: format(m, "MMMM yyyy"), charge: 0, days: 0, hours: 0 };
      prev.charge += r.charge;
      prev.days += r.dayFraction;
      prev.hours += r.hours ?? 0;
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [dailyReportRows]);

  const exportExcel = (sheetName: string, rows: Record<string, string | number>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, `umugwaneza-rental-${sheetName.replace(/\s+/g, "-")}-${reportFrom}_to_${reportTo}.xlsx`);
  };

  const updateRow = (idx: number, patch: Partial<DayRow>) => {
    setDayRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-page-fade max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/rentals/outgoing">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-[#64748b]">
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("rental_usage.back_outgoing")}
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b]">{t("rental_usage.title")}</h1>
          <p className="text-sm text-[#64748b] mt-1 max-w-2xl">{t("rental_usage.subtitle")}</p>
        </div>
      </div>

      <Card className="border border-[#e2e8f0]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> {t("rental_usage.contract_section")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingContracts ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <div className="max-w-md">
              <label className="text-sm font-medium text-[#1e293b]">{t("rental_usage.select_contract")}</label>
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("rental_usage.select_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(contracts ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.vehicle?.vehicle_name ?? "—"} — {c.customer?.customer_name ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedContract && contractSummary && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#1e293b] mb-3">{t("rental_usage.contract_summary_title")}</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rental_usage.summary_customer")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{selectedContract.customer?.customer_name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.vehicle")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{vehicle?.vehicle_name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("vehicles.type")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{vehicle?.vehicle_type ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rental_usage.summary_rental_from")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">
                      {new Date(selectedContract.rental_start_datetime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rental_usage.summary_rental_to")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">
                      {new Date(selectedContract.rental_end_datetime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rental_usage.summary_period_calendar_days")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{contractSummary.bounds.calendarDaysInPeriod}</dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rental_usage.summary_expiry")}</dt>
                    <dd className="mt-0.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium ${
                          selectedContract.operational_status === "COMPLETED" || selectedContract.operational_status === "CANCELLED"
                            ? "bg-slate-100 text-slate-800"
                            : contractSummary.diff < 0
                              ? "bg-amber-50 text-amber-900"
                              : contractSummary.diff <= 7
                                ? "bg-amber-50 text-amber-900"
                                : "bg-emerald-50 text-emerald-900"
                        }`}
                      >
                        {t(contractSummary.expiryMessageKey, contractSummary.expiryParams)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.status")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{selectedContract.operational_status}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.financial")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{selectedContract.financial_status.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.charge_customer_per")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{rentalType}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rental_usage.contract_rate_label")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">
                      {formatRWF(selectedContract.rate)}
                      <span className="text-[#64748b] text-xs ml-1 font-normal">
                        {rentalType === "HOUR"
                          ? t("rentals.rate_per_hour")
                          : rentalType === "MONTH"
                            ? t("rentals.rate_per_month")
                            : t("rentals.rate_per_day")}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.total_rwf")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{formatRWF(selectedContract.total_amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.paid_rwf")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{formatRWF(selectedContract.amount_paid)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.remaining")}</dt>
                    <dd className="font-medium text-[#1e293b] mt-0.5">{formatRWF(selectedContract.remaining_amount)}</dd>
                  </div>
                  {selectedContract.location ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.location")}</dt>
                      <dd className="text-[#1e293b] mt-0.5">{selectedContract.location}</dd>
                    </div>
                  ) : null}
                  {selectedContract.notes ? (
                    <div className="lg:col-span-3">
                      <dt className="text-[#64748b] text-xs uppercase tracking-wide">{t("rentals.notes")}</dt>
                      <dd className="text-[#1e293b] mt-0.5 whitespace-pre-wrap">{selectedContract.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs text-[#64748b]">
                {t("rental_usage.contract_hint")}
                <span className="block mt-2 text-[#475569]">{t("rental_usage.validation_backend_note")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">{t("rental_usage.tab_log")}</TabsTrigger>
          <TabsTrigger value="reports">{t("rental_usage.tab_reports")}</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4 mt-4">
          {!selectedContractId ? (
            <p className="text-sm text-[#64748b]">{t("rental_usage.pick_contract")}</p>
          ) : loadingUsage ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-[#64748b]">{t("rental_usage.summary_billable")}: </span>
                    <span className="font-semibold text-[#1e293b]">{formatRWF(projectedTotal)}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b]">{t("rental_usage.summary_day_units")}: </span>
                    <span className="font-semibold">{workingDayUnits.toFixed(1)}</span>
                  </div>
                  {rentalType === "HOUR" && (
                    <div>
                      <span className="text-[#64748b]">{t("rental_usage.summary_hours")}: </span>
                      <span className="font-semibold">{totalMachineHours.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-[#2563eb]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? t("rental_usage.saving") : t("rental_usage.save_usage")}
                </Button>
              </div>

              <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("rental_usage.col_date")}</TableHead>
                      {rentalType === "HOUR" ? (
                        <>
                          <TableHead>{t("rental_usage.col_hours")}</TableHead>
                          <TableHead>{t("rental_usage.col_day_portion")}</TableHead>
                        </>
                      ) : (
                        <TableHead>{t("rental_usage.col_working_day")}</TableHead>
                      )}
                      <TableHead className="text-right">{t("rental_usage.col_charge")}</TableHead>
                      <TableHead>{t("rental_usage.col_notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayRows.map((row, idx) => {
                      const charge = selectedContract
                        ? rentalUsageLineCharge(
                            rentalType,
                            selectedContract.rate,
                            row.day_fraction,
                            row.machine_hours,
                          )
                        : 0;
                      return (
                        <TableRow key={row.usage_date}>
                          <TableCell className="whitespace-nowrap text-[#64748b]">{row.usage_date}</TableCell>
                          {rentalType === "HOUR" ? (
                            <>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  className="w-28 h-9"
                                  value={row.machine_hours ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    updateRow(idx, {
                                      machine_hours: v === "" ? null : Number(v),
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={String(row.day_fraction)}
                                  onValueChange={(v) => updateRow(idx, { day_fraction: Number(v) })}
                                >
                                  <SelectTrigger className="w-36 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">{t("rental_usage.off")}</SelectItem>
                                    <SelectItem value="0.5">{t("rental_usage.half")}</SelectItem>
                                    <SelectItem value="1">{t("rental_usage.full")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </>
                          ) : (
                            <TableCell>
                              <Select
                                value={String(row.day_fraction)}
                                onValueChange={(v) => updateRow(idx, { day_fraction: Number(v) })}
                              >
                                <SelectTrigger className="w-40 h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">{t("rental_usage.off")}</SelectItem>
                                  <SelectItem value="0.5">{t("rental_usage.half")}</SelectItem>
                                  <SelectItem value="1">{t("rental_usage.full")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          <TableCell className="text-right font-medium">{formatRWF(charge)}</TableCell>
                          <TableCell className="min-w-[140px]">
                            <Textarea
                              className="min-h-[36px] text-sm"
                              value={row.notes}
                              onChange={(e) => updateRow(idx, { notes: e.target.value })}
                              rows={1}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-[#64748b] block mb-1">{t("rental_usage.report_from")}</label>
              <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] block mb-1">{t("rental_usage.report_to")}</label>
              <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
            </div>
            <div className="min-w-[200px]">
              <label className="text-xs text-[#64748b] block mb-1">{t("rental_usage.report_contract")}</label>
              <Select value={reportContractFilter || "__all__"} onValueChange={(v) => setReportContractFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("rental_usage.all_contracts")}</SelectItem>
                  {(contracts ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.vehicle?.vehicle_name ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingReport ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={reportGranularity === "daily" ? "default" : "outline"}
                  size="sm"
                  className={reportGranularity === "daily" ? "bg-[#2563eb]" : ""}
                  onClick={() => setReportGranularity("daily")}
                >
                  {t("rental_usage.report_daily")}
                </Button>
                <Button
                  type="button"
                  variant={reportGranularity === "weekly" ? "default" : "outline"}
                  size="sm"
                  className={reportGranularity === "weekly" ? "bg-[#2563eb]" : ""}
                  onClick={() => setReportGranularity("weekly")}
                >
                  {t("rental_usage.report_weekly")}
                </Button>
                <Button
                  type="button"
                  variant={reportGranularity === "monthly" ? "default" : "outline"}
                  size="sm"
                  className={reportGranularity === "monthly" ? "bg-[#2563eb]" : ""}
                  onClick={() => setReportGranularity("monthly")}
                >
                  {t("rental_usage.report_monthly")}
                </Button>
              </div>

              {reportGranularity === "daily" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportExcel(
                        "daily",
                        dailyReportRows.map((r) => ({
                          Date: r.date,
                          Vehicle: r.vehicle,
                          Customer: r.customer,
                          Day_units: r.dayFraction,
                          Hours: r.hours ?? "",
                          Charge_RWF: Math.round(r.charge),
                          Notes: r.notes ?? "",
                        })),
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-2" /> {t("rental_usage.export_excel")}
                  </Button>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("rental_usage.col_date")}</TableHead>
                          <TableHead>{t("rentals.vehicle")}</TableHead>
                          <TableHead>{t("rentals.customer")}</TableHead>
                          <TableHead>{t("rental_usage.day_units")}</TableHead>
                          <TableHead>{t("rental_usage.col_hours")}</TableHead>
                          <TableHead className="text-right">{t("rental_usage.col_charge")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyReportRows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.vehicle}</TableCell>
                            <TableCell>{r.customer}</TableCell>
                            <TableCell>{r.dayFraction}</TableCell>
                            <TableCell>{r.hours ?? "—"}</TableCell>
                            <TableCell className="text-right">{formatRWF(r.charge)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {reportGranularity === "weekly" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportExcel(
                        "weekly",
                        weeklyReportRows.map((r) => ({
                          Week: r.weekLabel,
                          Charge_RWF: Math.round(r.charge),
                          Day_units: r.days.toFixed(2),
                          Hours: r.hours.toFixed(1),
                        })),
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-2" /> {t("rental_usage.export_excel")}
                  </Button>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("rental_usage.week")}</TableHead>
                        <TableHead className="text-right">{t("rental_usage.col_charge")}</TableHead>
                        <TableHead>{t("rental_usage.day_units")}</TableHead>
                        <TableHead>{t("rental_usage.col_hours")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyReportRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.weekLabel}</TableCell>
                          <TableCell className="text-right">{formatRWF(r.charge)}</TableCell>
                          <TableCell>{r.days.toFixed(2)}</TableCell>
                          <TableCell>{r.hours.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {reportGranularity === "monthly" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportExcel(
                        "monthly",
                        monthlyReportRows.map((r) => ({
                          Month: r.month,
                          Charge_RWF: Math.round(r.charge),
                          Day_units: r.days.toFixed(2),
                          Hours: r.hours.toFixed(1),
                        })),
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-2" /> {t("rental_usage.export_excel")}
                  </Button>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("rental_usage.month")}</TableHead>
                        <TableHead className="text-right">{t("rental_usage.col_charge")}</TableHead>
                        <TableHead>{t("rental_usage.day_units")}</TableHead>
                        <TableHead>{t("rental_usage.col_hours")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReportRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.month}</TableCell>
                          <TableCell className="text-right">{formatRWF(r.charge)}</TableCell>
                          <TableCell>{r.days.toFixed(2)}</TableCell>
                          <TableCell>{r.hours.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
