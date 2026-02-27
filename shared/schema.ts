import { z } from "zod";

export type Business = {
  id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type Item = {
  id: string;
  business_id: string;
  item_name: string;
  measurement_type: "WEIGHT" | "VOLUME";
  base_unit: "KG" | "LITRE";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  business_id: string;
  supplier_name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  business_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  segment: "GROCERY" | "FLEET";
  created_at: string;
  updated_at: string;
};

export type Purchase = {
  id: string;
  business_id: string;
  supplier_id: string;
  reference_no: string;
  purchase_date: string;
  item_id: string;
  total_quantity: number;
  unit: string;
  unit_price: number;
  total_purchase_cost: number;
  package_size: number | null;
  package_count: number | null;
  amount_paid: number;
  remaining_amount: number;
  financial_status: "PENDING" | "PARTIAL" | "FULLY_SETTLED";
  amount_due_date: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  item?: Item;
};

export type Sale = {
  id: string;
  business_id: string;
  customer_id: string;
  reference_no: string;
  sale_date: string;
  item_id: string;
  total_quantity: number;
  unit: string;
  unit_price: number;
  total_sale_amount: number;
  package_size: number | null;
  package_count: number | null;
  amount_received: number;
  remaining_amount: number;
  financial_status: "PENDING" | "PARTIAL" | "FULLY_RECEIVED";
  amount_due_date: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  item?: Item;
};

export type GroceryPayment = {
  id: string;
  business_id: string;
  reference_type: "PURCHASE" | "SALE";
  reference_id: string;
  amount: number;
  payment_date: string;
  mode: string;
  notes: string | null;
  created_at: string;
};

export type ExternalAssetOwner = {
  id: string;
  business_id: string;
  owner_name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  business_id: string;
  hapyjo_vehicle_id: string | null;
  vehicle_name: string;
  vehicle_type: "TRUCK" | "MACHINE";
  rental_type: "DAY" | "HOUR" | "MONTH";
  ownership_type: "OWN" | "EXTERNAL";
  base_rate: number;
  current_status: "AVAILABLE" | "RENTED_OUT" | "RENTED_IN" | "MAINTENANCE" | "OFFLINE";
  current_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RentalContract = {
  id: string;
  business_id: string;
  vehicle_id: string;
  rental_direction: "OUTGOING" | "INCOMING";
  rental_type: "DAY" | "HOUR" | "MONTH" | null;
  customer_id: string | null;
  external_owner_id: string | null;
  rental_start_datetime: string;
  rental_end_datetime: string;
  rate: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  financial_status: "PENDING" | "PARTIAL" | "FULLY_SETTLED";
  operational_status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  customer?: Customer;
  external_owner?: ExternalAssetOwner;
};

export type RentalPayment = {
  id: string;
  business_id: string;
  rental_contract_id: string;
  amount: number;
  payment_date: string;
  mode: string;
  notes: string | null;
  created_at: string;
};

export type HapyjoVehicle = {
  id: string;
  vehicle_number_or_id: string;
  type: string;
  site_id?: string;
};

export const insertItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  measurement_type: z.enum(["WEIGHT", "VOLUME"]),
  base_unit: z.enum(["KG", "LITRE"]),
  is_active: z.boolean().default(true),
});
export type InsertItem = z.infer<typeof insertItemSchema>;

export const insertSupplierSchema = z.object({
  supplier_name: z.string().min(1, "Supplier name is required"),
  phone: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export const insertCustomerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  phone: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  segment: z.enum(["GROCERY", "FLEET"]).default("GROCERY"),
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export const insertPurchaseSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  purchase_date: z.string().min(1, "Date is required"),
  item_id: z.string().min(1, "Item is required"),
  total_quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unit_price: z.number().positive("Unit price must be positive"),
  amount_paid: z.number().min(0, "Amount paid cannot be negative").default(0),
  amount_due_date: z.string().nullable().optional(),
  package_size: z.number().nullable().default(null),
  package_count: z.number().nullable().default(null),
});
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export const insertSaleSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  sale_date: z.string().min(1, "Date is required"),
  item_id: z.string().min(1, "Item is required"),
  total_quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  unit_price: z.number().positive("Unit price must be positive"),
  amount_received: z.number().min(0, "Amount received cannot be negative").default(0),
  amount_due_date: z.string().nullable().optional(),
  package_size: z.number().nullable().default(null),
  package_count: z.number().nullable().default(null),
});
export type InsertSale = z.infer<typeof insertSaleSchema>;

export const insertGroceryPaymentSchema = z.object({
  reference_type: z.enum(["PURCHASE", "SALE"]),
  reference_id: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Date is required"),
  mode: z.string().min(1, "Payment mode is required"),
  notes: z.string().nullable().default(null),
});
export type InsertGroceryPayment = z.infer<typeof insertGroceryPaymentSchema>;

export const insertExternalOwnerSchema = z.object({
  owner_name: z.string().min(1, "Owner name is required"),
  phone: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type InsertExternalOwner = z.infer<typeof insertExternalOwnerSchema>;

export const insertVehicleSchema = z.object({
  vehicle_name: z.string().min(1, "Vehicle name is required"),
  vehicle_type: z.enum(["TRUCK", "MACHINE"]),
  rental_type: z.enum(["DAY", "HOUR", "MONTH"]),
  ownership_type: z.enum(["OWN", "EXTERNAL"]),
  base_rate: z.number().min(0, "Rate cannot be negative").default(0),
  current_status: z.enum(["AVAILABLE", "RENTED_OUT", "RENTED_IN", "MAINTENANCE", "OFFLINE"]).default("AVAILABLE"),
  current_location: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export const insertRentalContractSchema = z.object({
  vehicle_id: z.string().min(1, "Vehicle is required"),
  rental_direction: z.enum(["OUTGOING", "INCOMING"]),
  rental_type: z.enum(["DAY", "HOUR", "MONTH"]).optional(),
  customer_id: z.string().nullable().default(null),
  external_owner_id: z.string().nullable().default(null),
  rental_start_datetime: z.string().min(1, "Start date is required"),
  rental_end_datetime: z.string().min(1, "End date is required"),
  rate: z.number().positive("Rate must be positive"),
  location: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type InsertRentalContract = z.infer<typeof insertRentalContractSchema>;

export const insertRentalPaymentSchema = z.object({
  rental_contract_id: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Date is required"),
  mode: z.string().min(1, "Payment mode is required"),
  notes: z.string().nullable().default(null),
});
export type InsertRentalPayment = z.infer<typeof insertRentalPaymentSchema>;

export type AuthUser = {
  role: "SYSTEM_ADMIN" | "OWNER";
  admin_name?: string;
  owner_name?: string;
  business_id?: string;
};

export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
