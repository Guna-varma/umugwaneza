/**
 * Seeds umugwaneza schema with full dummy data for biz_001.
 * Run after: node scripts/seed-umugwaneza-auth.js
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Usage: node scripts/seed-umugwaneza-data.js
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const env = {};
  try {
    const content = readFileSync(join(root, ".env"), "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim().replace(/^\uFEFF/, "")] = m[2].trim().replace(/^["']|["']$/g, "");
    });
  } catch (_) {}
  return env;
}

const env = { ...process.env, ...loadEnv() };
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const db = () => supabase.schema("umugwaneza");
const BID = "biz_001";

async function ensureBusiness() {
  const { data } = await db().from("businesses").select("id").eq("id", BID).maybeSingle();
  if (data) return;
  const { error } = await db().from("businesses").insert({ id: BID, name: "Umugwaneza Ltd", currency: "RWF" });
  if (error) throw error;
  console.log("Created business", BID);
}

async function seedItems() {
  const { data: existing } = await db().from("items").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: items, error } = await db().from("items").insert([
    { business_id: BID, item_name: "Umuceri (Rice)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
    { business_id: BID, item_name: "Ibishyimbo (Beans)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
    { business_id: BID, item_name: "Ibigori (Maize)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
    { business_id: BID, item_name: "Amavuta (Cooking Oil)", measurement_type: "VOLUME", base_unit: "LITRE", is_active: true },
    { business_id: BID, item_name: "Isukari (Sugar)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
    { business_id: BID, item_name: "Umunyu (Salt)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
    { business_id: BID, item_name: "Ifu (Wheat Flour)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
  ]).select("id");
  if (error) throw error;
  console.log("Seeded", items?.length ?? 0, "items");
}

async function seedSuppliers() {
  const { data: existing } = await db().from("suppliers").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: rows, error } = await db().from("suppliers").insert([
    { business_id: BID, supplier_name: "COPRIMU Cooperative", phone: "+250788100001", address: "Muhanga" },
    { business_id: BID, supplier_name: "Kigali Grain Traders", phone: "+250788100002", address: "Kigali" },
    { business_id: BID, supplier_name: "Inyange Industries", phone: "+250788100003", address: "Kigali" },
    { business_id: BID, supplier_name: "MINIMEX Rwanda", phone: "+250788100004", address: "Kigali" },
    { business_id: BID, supplier_name: "Rubavu Lake Trading", phone: "+250788100005", address: "Rubavu" },
  ]).select("id");
  if (error) throw error;
  console.log("Seeded", rows?.length ?? 0, "suppliers");
}

async function seedCustomers() {
  const { data: existing } = await db().from("customers").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: rows, error } = await db().from("customers").insert([
    { business_id: BID, customer_name: "Marché de Kimironko", phone: "+250788200001", address: "Kigali" },
    { business_id: BID, customer_name: "Simba Supermarket", phone: "+250788200002", address: "Kigali" },
    { business_id: BID, customer_name: "Musanze Fresh Foods", phone: "+250788200003", address: "Musanze" },
    { business_id: BID, customer_name: "Huye Market Vendors", phone: "+250788200004", address: "Huye" },
    { business_id: BID, customer_name: "Hotel Gorillas Kigali", phone: "+250788200005", address: "Kigali" },
  ]).select("id");
  if (error) throw error;
  console.log("Seeded", rows?.length ?? 0, "customers");
}

async function seedVehicles() {
  const { data: existing } = await db().from("vehicles").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: rows, error } = await db().from("vehicles").insert([
    { business_id: BID, vehicle_name: "RAA 100A", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 150000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
    { business_id: BID, vehicle_name: "RAB 200B", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 150000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
    { business_id: BID, vehicle_name: "RAC 300C", vehicle_type: "MACHINE", rental_type: "HOUR", ownership_type: "OWN", base_rate: 20000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
    { business_id: BID, vehicle_name: "RAD 400D", vehicle_type: "MACHINE", rental_type: "HOUR", ownership_type: "OWN", base_rate: 20000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
    { business_id: BID, vehicle_name: "RAE 500E", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 180000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
  ]).select("id");
  if (error) throw error;
  console.log("Seeded", rows?.length ?? 0, "vehicles");
}

async function seedExternalOwners() {
  const { data: existing } = await db().from("external_asset_owners").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: rows, error } = await db().from("external_asset_owners").insert([
    { business_id: BID, owner_name: "Jean-Pierre HABIMANA", phone: "+250788300001", address: "Huye" },
    { business_id: BID, owner_name: "Marie Claire UWIMANA", phone: "+250788300002", address: "Musanze" },
    { business_id: BID, owner_name: "Emmanuel NSABIMANA", phone: "+250788300003", address: "Rubavu" },
  ]).select("id");
  if (error) throw error;
  console.log("Seeded", rows?.length ?? 0, "external owners");
}

async function seedPurchases() {
  const { data: existing } = await db().from("purchases").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: suppliers } = await db().from("suppliers").select("id").eq("business_id", BID).order("created_at").limit(5);
  const { data: items } = await db().from("items").select("id").eq("business_id", BID).order("created_at").limit(5);
  if (!suppliers?.length || !items?.length) throw new Error("Need suppliers and items first");
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
  const { error } = await db().from("purchases").insert([
    { business_id: BID, supplier_id: suppliers[0].id, reference_no: "PUR-SEED01", purchase_date: today, item_id: items[0].id, total_quantity: 500, unit: "KG", unit_price: 1200, total_purchase_cost: 600000, amount_paid: 400000, remaining_amount: 200000, financial_status: "PARTIAL" },
    { business_id: BID, supplier_id: suppliers[1].id, reference_no: "PUR-SEED02", purchase_date: today, item_id: items[1].id, total_quantity: 1000, unit: "KG", unit_price: 800, total_purchase_cost: 800000, amount_paid: 800000, remaining_amount: 0, financial_status: "FULLY_SETTLED" },
    { business_id: BID, supplier_id: suppliers[2].id, reference_no: "PUR-SEED03", purchase_date: yesterday, item_id: items[2].id, total_quantity: 800, unit: "KG", unit_price: 600, total_purchase_cost: 480000, amount_paid: 0, remaining_amount: 480000, financial_status: "PENDING" },
    { business_id: BID, supplier_id: suppliers[0].id, reference_no: "PUR-SEED04", purchase_date: yesterday, item_id: items[3].id, total_quantity: 200, unit: "LITRE", unit_price: 3500, total_purchase_cost: 700000, amount_paid: 700000, remaining_amount: 0, financial_status: "FULLY_SETTLED" },
    { business_id: BID, supplier_id: suppliers[3].id, reference_no: "PUR-SEED05", purchase_date: today, item_id: items[4].id, total_quantity: 100, unit: "KG", unit_price: 1800, total_purchase_cost: 180000, amount_paid: 180000, remaining_amount: 0, financial_status: "FULLY_SETTLED" },
  ]);
  if (error) throw error;
  console.log("Seeded purchases");
}

async function seedSales() {
  const { data: existing } = await db().from("sales").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: customers } = await db().from("customers").select("id").eq("business_id", BID).order("created_at").limit(5);
  const { data: items } = await db().from("items").select("id").eq("business_id", BID).order("created_at").limit(5);
  if (!customers?.length || !items?.length) throw new Error("Need customers and items first");
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
  const { error } = await db().from("sales").insert([
    { business_id: BID, customer_id: customers[0].id, reference_no: "SAL-SEED01", sale_date: today, item_id: items[0].id, total_quantity: 200, unit: "KG", unit_price: 1500, total_sale_amount: 300000, amount_received: 300000, remaining_amount: 0, financial_status: "FULLY_RECEIVED" },
    { business_id: BID, customer_id: customers[1].id, reference_no: "SAL-SEED02", sale_date: today, item_id: items[1].id, total_quantity: 300, unit: "KG", unit_price: 1000, total_sale_amount: 300000, amount_received: 100000, remaining_amount: 200000, financial_status: "PARTIAL" },
    { business_id: BID, customer_id: customers[2].id, reference_no: "SAL-SEED03", sale_date: yesterday, item_id: items[0].id, total_quantity: 150, unit: "KG", unit_price: 1450, total_sale_amount: 217500, amount_received: 217500, remaining_amount: 0, financial_status: "FULLY_RECEIVED" },
    { business_id: BID, customer_id: customers[3].id, reference_no: "SAL-SEED04", sale_date: yesterday, item_id: items[2].id, total_quantity: 50, unit: "KG", unit_price: 2200, total_sale_amount: 110000, amount_received: 0, remaining_amount: 110000, financial_status: "PENDING" },
    { business_id: BID, customer_id: customers[4].id, reference_no: "SAL-SEED05", sale_date: today, item_id: items[3].id, total_quantity: 30, unit: "LITRE", unit_price: 4500, total_sale_amount: 135000, amount_received: 135000, remaining_amount: 0, financial_status: "FULLY_RECEIVED" },
  ]);
  if (error) throw error;
  console.log("Seeded sales");
}

async function seedGroceryPayments() {
  const { data: existing } = await db().from("grocery_payments").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: purchases } = await db().from("purchases").select("id").eq("business_id", BID).gt("remaining_amount", 0).limit(1);
  const { data: sales } = await db().from("sales").select("id").eq("business_id", BID).gt("remaining_amount", 0).limit(1);
  const today = new Date().toISOString().split("T")[0];
  const inserts = [];
  if (purchases?.length) inserts.push({ business_id: BID, reference_type: "PURCHASE", reference_id: purchases[0].id, amount: 100000, payment_date: today, mode: "BANK_TRANSFER", notes: "Seed payment" });
  if (sales?.length) inserts.push({ business_id: BID, reference_type: "SALE", reference_id: sales[0].id, amount: 50000, payment_date: today, mode: "CASH", notes: "Seed payment" });
  if (inserts.length) {
    const { error } = await db().from("grocery_payments").insert(inserts);
    if (error) throw error;
    console.log("Seeded grocery payments");
  }
}

async function seedRentals() {
  const { data: existing } = await db().from("rental_contracts").select("id").eq("business_id", BID).limit(1);
  if (existing?.length) return;
  const { data: vehicles } = await db().from("vehicles").select("id").eq("business_id", BID).order("created_at").limit(2);
  const { data: customers } = await db().from("customers").select("id").eq("business_id", BID).limit(1);
  const { data: owners } = await db().from("external_asset_owners").select("id").eq("business_id", BID).limit(1);
  if (!vehicles?.length || !customers?.length || !owners?.length) return;
  const start = new Date();
  const end = new Date(start.getTime() + 5 * 864e5);
  const { data: contracts, error: err1 } = await db().from("rental_contracts").insert([
    { business_id: BID, vehicle_id: vehicles[0].id, rental_direction: "OUTGOING", customer_id: customers[0].id, external_owner_id: null, rental_start_datetime: start.toISOString(), rental_end_datetime: end.toISOString(), rate: 150000, total_amount: 750000, amount_paid: 300000, remaining_amount: 450000, financial_status: "PARTIAL", operational_status: "ACTIVE", location: "Nyamirambo" },
    { business_id: BID, vehicle_id: vehicles[1].id, rental_direction: "INCOMING", customer_id: null, external_owner_id: owners[0].id, rental_start_datetime: start.toISOString(), rental_end_datetime: end.toISOString(), rate: 200000, total_amount: 1000000, amount_paid: 500000, remaining_amount: 500000, financial_status: "PARTIAL", operational_status: "ACTIVE", location: "Huye" },
  ]).select("id");
  if (err1) throw err1;
  if (contracts?.length >= 2) {
    const { error: err2 } = await db().from("rental_payments").insert([
      { business_id: BID, rental_contract_id: contracts[0].id, amount: 150000, payment_date: new Date().toISOString().split("T")[0], mode: "BANK_TRANSFER", notes: "First instalment" },
      { business_id: BID, rental_contract_id: contracts[0].id, amount: 150000, payment_date: new Date().toISOString().split("T")[0], mode: "CASH", notes: "Second instalment" },
      { business_id: BID, rental_contract_id: contracts[1].id, amount: 250000, payment_date: new Date().toISOString().split("T")[0], mode: "MOBILE_MONEY", notes: "Advance" },
    ]);
    if (err2) throw err2;
    await db().from("vehicles").update({ current_status: "RENTED_OUT" }).eq("id", vehicles[0].id);
    await db().from("vehicles").update({ current_status: "RENTED_IN" }).eq("id", vehicles[1].id);
    console.log("Seeded rental contracts and payments");
  }
}

async function main() {
  await ensureBusiness();
  await seedItems();
  await seedSuppliers();
  await seedCustomers();
  await seedVehicles();
  await seedExternalOwners();
  await seedPurchases();
  await seedSales();
  await seedGroceryPayments();
  await seedRentals();
  console.log("Done. Log in as owner@umugwaneza.com to see data.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
