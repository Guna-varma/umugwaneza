import type { Express } from "express";
import { createServer, type Server } from "http";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "umugwaneza" } });
const supabasePublic = createClient(supabaseUrl, supabaseKey, { db: { schema: "public" } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/init", async (_req, res) => {
    try {
      const { data: existing } = await supabase.from("businesses").select("id").eq("id", "biz_001").maybeSingle();
      if (existing) {
        return res.json({ status: "already_initialized" });
      }

      await supabase.from("businesses").insert({ id: "biz_001", name: "UMUGWANEZA LTD", currency: "RWF" });

      const suppliers = [
        { business_id: "biz_001", supplier_name: "Kigali Rice Suppliers", phone: "+250788100001", address: "Kigali, Nyarugenge", notes: "Premium rice distributor" },
        { business_id: "biz_001", supplier_name: "Rwanda Sugar Co.", phone: "+250788100002", address: "Kamonyi, Southern Province", notes: "Sugar wholesale" },
        { business_id: "biz_001", supplier_name: "Great Lakes Oil Ltd", phone: "+250788100003", address: "Rubavu, Western Province", notes: "Cooking oil supplier" },
      ];
      const { data: suppliersData } = await supabase.from("suppliers").insert(suppliers).select("id");

      const customers = [
        { business_id: "biz_001", customer_name: "Hotel des Mille Collines", phone: "+250788200001", address: "Kigali CBD", notes: "Hotel chain" },
        { business_id: "biz_001", customer_name: "Nakumatt Supermarket", phone: "+250788200002", address: "Kigali, Kicukiro", notes: "Retail chain" },
        { business_id: "biz_001", customer_name: "Bourbon Coffee", phone: "+250788200003", address: "Kigali, Kimihurura", notes: "Coffee shop chain" },
      ];
      const { data: customersData } = await supabase.from("customers").insert(customers).select("id");

      const items = [
        { business_id: "biz_001", item_name: "Rice (Basmati)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: "biz_001", item_name: "Sugar", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: "biz_001", item_name: "Cooking Oil", measurement_type: "VOLUME", base_unit: "LITRE", is_active: true },
        { business_id: "biz_001", item_name: "Wheat Flour", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: "biz_001", item_name: "Salt", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
      ];
      const { data: itemsData } = await supabase.from("items").insert(items).select("id");

      const extOwners = [
        { business_id: "biz_001", owner_name: "Jean-Pierre HABIMANA", phone: "+250788300001", address: "Huye, Southern Province", notes: "Owns 2 excavators" },
        { business_id: "biz_001", owner_name: "Marie Claire UWIMANA", phone: "+250788300002", address: "Musanze, Northern Province", notes: "Truck fleet owner" },
      ];
      const { data: extOwnersData } = await supabase.from("external_asset_owners").insert(extOwners).select("id");

      let hapyjoVehicles: any[] = [];
      const { data: existingHapyjo } = await supabasePublic.from("vehicles").select("id");
      if (!existingHapyjo || existingHapyjo.length === 0) {
        const seedVehicles = [
          { vehicle_number_or_id: "RAA 100A", type: "truck", site_id: "site_001" },
          { vehicle_number_or_id: "RAB 200B", type: "truck", site_id: "site_001" },
          { vehicle_number_or_id: "RAC 300C", type: "machine", site_id: "site_001" },
          { vehicle_number_or_id: "RAD 400D", type: "machine", site_id: "site_001" },
          { vehicle_number_or_id: "RAE 500E", type: "truck", site_id: "site_001" },
        ];
        const { data: seeded } = await supabasePublic.from("vehicles").insert(seedVehicles).select("*");
        hapyjoVehicles = seeded || [];
      } else {
        const { data: all } = await supabasePublic.from("vehicles").select("*");
        hapyjoVehicles = all || [];
      }

      for (const hv of hapyjoVehicles) {
        const vehicleType = (hv.type || "").toLowerCase() === "machine" ? "MACHINE" : "TRUCK";
        await supabase.from("vehicles").insert({
          business_id: "biz_001",
          hapyjo_vehicle_id: String(hv.id),
          vehicle_name: hv.vehicle_number_or_id || `Vehicle ${hv.id}`,
          vehicle_type: vehicleType,
          rental_type: "DAY",
          ownership_type: "OWN",
          base_rate: vehicleType === "TRUCK" ? 150000 : 200000,
          current_status: "AVAILABLE",
          current_location: "Kigali Depot",
        });
      }

      const today = new Date().toISOString().split("T")[0];
      if (suppliersData && itemsData) {
        await supabase.from("purchases").insert([
          {
            business_id: "biz_001", supplier_id: suppliersData[0].id, reference_no: "PUR-SEED01",
            purchase_date: today, item_id: itemsData[0].id, total_quantity: 500, unit: "KG",
            unit_price: 1200, total_purchase_cost: 600000, amount_paid: 400000, remaining_amount: 200000,
            financial_status: "PARTIAL",
          },
          {
            business_id: "biz_001", supplier_id: suppliersData[1].id, reference_no: "PUR-SEED02",
            purchase_date: today, item_id: itemsData[1].id, total_quantity: 1000, unit: "KG",
            unit_price: 800, total_purchase_cost: 800000, amount_paid: 800000, remaining_amount: 0,
            financial_status: "FULLY_SETTLED",
          },
        ]);
      }

      if (customersData && itemsData) {
        await supabase.from("sales").insert([
          {
            business_id: "biz_001", customer_id: customersData[0].id, reference_no: "SAL-SEED01",
            sale_date: today, item_id: itemsData[0].id, total_quantity: 200, unit: "KG",
            unit_price: 1500, total_sale_amount: 300000, amount_received: 300000, remaining_amount: 0,
            financial_status: "FULLY_RECEIVED",
          },
          {
            business_id: "biz_001", customer_id: customersData[1].id, reference_no: "SAL-SEED02",
            sale_date: today, item_id: itemsData[1].id, total_quantity: 300, unit: "KG",
            unit_price: 1000, total_sale_amount: 300000, amount_received: 100000, remaining_amount: 200000,
            financial_status: "PARTIAL",
          },
        ]);
      }

      const { data: vehiclesData } = await supabase.from("vehicles").select("id").eq("business_id", "biz_001").limit(2);
      if (vehiclesData && vehiclesData.length >= 2 && customersData && extOwnersData) {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);

        await supabase.from("rental_contracts").insert([
          {
            business_id: "biz_001", vehicle_id: vehiclesData[0].id, rental_direction: "OUTGOING",
            customer_id: customersData[0].id, rental_start_datetime: startDate.toISOString(),
            rental_end_datetime: endDate.toISOString(), rate: 150000, total_amount: 750000,
            amount_paid: 300000, remaining_amount: 450000, financial_status: "PARTIAL",
            operational_status: "ACTIVE", location: "Kigali Construction Site",
          },
          {
            business_id: "biz_001", vehicle_id: vehiclesData[1].id, rental_direction: "INCOMING",
            external_owner_id: extOwnersData[0].id, rental_start_datetime: startDate.toISOString(),
            rental_end_datetime: endDate.toISOString(), rate: 200000, total_amount: 1000000,
            amount_paid: 500000, remaining_amount: 500000, financial_status: "PARTIAL",
            operational_status: "ACTIVE", location: "Huye Road Project",
          },
        ]);

        await supabase.from("vehicles").update({ current_status: "RENTED_OUT" }).eq("id", vehiclesData[0].id);
        await supabase.from("vehicles").update({ current_status: "RENTED_IN" }).eq("id", vehiclesData[1].id);
      }

      res.json({ status: "initialized" });
    } catch (error: any) {
      console.error("Init error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
