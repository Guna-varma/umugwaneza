import { db } from "@/lib/supabase";
import { RentalContract } from "@shared/schema";

export type OutgoingContractUpdateErrorCode =
  | "OVERLAP_CONFLICT"
  | "USAGE_OUT_OF_RANGE"
  | "INVALID_DATE_RANGE"
  | "NOT_EDITABLE_STATUS";

export class OutgoingContractUpdateError extends Error {
  code: OutgoingContractUpdateErrorCode;
  details?: Record<string, unknown>;

  constructor(code: OutgoingContractUpdateErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "OutgoingContractUpdateError";
    this.code = code;
    this.details = details;
  }
}

export type UpdateOutgoingContractPatch = {
  rental_start_datetime: string;
  rental_end_datetime: string;
  rate: number;
  rental_type: "DAY" | "HOUR" | "MONTH";
  location?: string | null;
  notes?: string | null;
};

function calculateTotal(start: string, end: string, rate: number, rentalType: "DAY" | "HOUR" | "MONTH") {
  if (!start || !end || !rate) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return 0;
  if (rentalType === "HOUR") {
    const hours = diffMs / (1000 * 60 * 60);
    return Math.ceil(hours) * rate;
  }
  if (rentalType === "MONTH") {
    const days = diffMs / (1000 * 60 * 60 * 24);
    const months = Math.ceil(days / 30);
    return months * rate;
  }
  const days = diffMs / (1000 * 60 * 60 * 24);
  return Math.ceil(days) * rate;
}

function financialStatusFromAmounts(amountPaid: number, remainingAmount: number): RentalContract["financial_status"] {
  if (remainingAmount <= 0) return "FULLY_SETTLED";
  if (amountPaid > 0) return "PARTIAL";
  return "PENDING";
}

function toDateOnly(value: string) {
  return value.includes("T") ? value.split("T")[0] : value;
}

export async function updateOutgoingContract(
  businessId: string,
  contractId: string,
  patch: UpdateOutgoingContractPatch,
) {
  const startDate = new Date(patch.rental_start_datetime);
  const endDate = new Date(patch.rental_end_datetime);
  if (!(startDate.getTime() < endDate.getTime())) {
    throw new OutgoingContractUpdateError(
      "INVALID_DATE_RANGE",
      "End date/time must be after start date/time.",
    );
  }

  const { data: existing, error: existingError } = await db()
    .from("rental_contracts")
    .select("id, rental_direction, operational_status, rental_type, amount_paid")
    .eq("id", contractId)
    .eq("business_id", businessId)
    .single();

  if (existingError || !existing) {
    throw new OutgoingContractUpdateError(
      "NOT_EDITABLE_STATUS",
      existingError?.message || "Contract not found or not editable.",
    );
  }

  if (existing.rental_direction !== "OUTGOING" || existing.operational_status !== "ACTIVE") {
    throw new OutgoingContractUpdateError(
      "NOT_EDITABLE_STATUS",
      "Only ACTIVE outgoing contracts can be edited.",
    );
  }

  const fromDate = toDateOnly(patch.rental_start_datetime);
  const toDate = toDateOnly(patch.rental_end_datetime);
  const { data: outOfRangeUsage, error: usageError } = await db()
    .from("rental_usage")
    .select("usage_date, day_fraction, machine_hours")
    .eq("business_id", businessId)
    .eq("rental_contract_id", contractId)
    .or(`usage_date.lt.${fromDate},usage_date.gt.${toDate}`)
    .order("usage_date", { ascending: true });

  if (usageError) {
    throw new Error(usageError.message);
  }

  const billableOutOfRange = (outOfRangeUsage ?? []).filter((row: any) => Number(row.day_fraction || 0) > 0 || Number(row.machine_hours || 0) > 0);
  if (billableOutOfRange.length > 0) {
    const dates = billableOutOfRange.map((row: any) => row.usage_date);
    throw new OutgoingContractUpdateError(
      "USAGE_OUT_OF_RANGE",
      `Cannot save because ${dates.length} usage entr${dates.length === 1 ? "y is" : "ies are"} outside the selected date range.`,
      { count: dates.length, dates },
    );
  }

  const totalAmount = calculateTotal(
    patch.rental_start_datetime,
    patch.rental_end_datetime,
    Number(patch.rate) || 0,
    patch.rental_type || existing.rental_type || "DAY",
  );
  const amountPaid = Number(existing.amount_paid) || 0;
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);
  const financialStatus = financialStatusFromAmounts(amountPaid, remainingAmount);

  const { data: updated, error: updateError } = await db()
    .from("rental_contracts")
    .update({
      rental_start_datetime: patch.rental_start_datetime,
      rental_end_datetime: patch.rental_end_datetime,
      rate: patch.rate,
      rental_type: patch.rental_type,
      total_amount: totalAmount,
      remaining_amount: remainingAmount,
      financial_status: financialStatus,
      location: patch.location || null,
      notes: patch.notes || null,
    })
    .eq("id", contractId)
    .eq("business_id", businessId)
    .select("*, vehicle:vehicles(*), customer:customers(*), external_owner:external_asset_owners(*)")
    .single();

  if (updateError) {
    const normalized = updateError.message.toLowerCase();
    if (normalized.includes("overlap") || normalized.includes("already has active rental")) {
      throw new OutgoingContractUpdateError(
        "OVERLAP_CONFLICT",
        "This timeline overlaps with another active contract for the same vehicle.",
      );
    }
    throw new Error(updateError.message);
  }

  return updated as RentalContract;
}


