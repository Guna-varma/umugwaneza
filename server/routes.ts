import type { Express } from "express";
import { createServer, type Server } from "http";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const BUSINESS_ID = "biz_001";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== INIT / SEED ====================
  app.post("/api/init", async (_req, res) => {
    try {
      const { data: existing } = await supabase.from("businesses").select("id").eq("id", BUSINESS_ID).maybeSingle();
      if (existing) {
        return res.json({ status: "already_initialized" });
      }

      await supabase.from("businesses").insert({ id: BUSINESS_ID, name: "UMUGWANEZA LTD", currency: "RWF" });

      const suppliers = [
        { business_id: BUSINESS_ID, supplier_name: "COPRIMU Cooperative", phone: "+250788100001", address: "Muhanga, Southern Province", notes: "Maize and beans cooperative" },
        { business_id: BUSINESS_ID, supplier_name: "Kigali Grain Traders", phone: "+250788100002", address: "Kigali, Nyarugenge", notes: "Premium rice and wheat flour distributor" },
        { business_id: BUSINESS_ID, supplier_name: "Inyange Industries", phone: "+250788100003", address: "Kigali, Masaka", notes: "Cooking oil and dairy wholesale" },
        { business_id: BUSINESS_ID, supplier_name: "MINIMEX Rwanda", phone: "+250788100004", address: "Kigali, Special Economic Zone", notes: "Flour milling and salt" },
        { business_id: BUSINESS_ID, supplier_name: "Rubavu Lake Trading", phone: "+250788100005", address: "Rubavu, Western Province", notes: "Sugar and salt from upcountry" },
      ];
      const { data: suppliersData } = await supabase.from("suppliers").insert(suppliers).select("id");

      const customers = [
        { business_id: BUSINESS_ID, customer_name: "Marché de Kimironko", phone: "+250788200001", address: "Kigali, Kimironko", notes: "Large retail market" },
        { business_id: BUSINESS_ID, customer_name: "Simba Supermarket", phone: "+250788200002", address: "Kigali, Kicukiro", notes: "Supermarket chain" },
        { business_id: BUSINESS_ID, customer_name: "Musanze Fresh Foods", phone: "+250788200003", address: "Musanze, Northern Province", notes: "Regional food distributor" },
        { business_id: BUSINESS_ID, customer_name: "Huye Market Vendors Assoc.", phone: "+250788200004", address: "Huye, Southern Province", notes: "Market vendors association" },
        { business_id: BUSINESS_ID, customer_name: "Hotel Gorillas Kigali", phone: "+250788200005", address: "Kigali, Nyarutarama", notes: "Hospitality client" },
      ];
      const { data: customersData } = await supabase.from("customers").insert(customers).select("id");

      const items = [
        { business_id: BUSINESS_ID, item_name: "Umuceri (Rice)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Ibishyimbo (Beans)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Ibigori (Maize)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Amavuta y'igikoni (Cooking Oil)", measurement_type: "VOLUME", base_unit: "LITRE", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Isukari (Sugar)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Umunyu (Salt)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Ifu y'ingano (Wheat Flour)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
      ];
      const { data: itemsData } = await supabase.from("items").insert(items).select("id");

      const extOwners = [
        { business_id: BUSINESS_ID, owner_name: "Jean-Pierre HABIMANA", phone: "+250788300001", address: "Huye, Southern Province", notes: "Owns 2 excavators" },
        { business_id: BUSINESS_ID, owner_name: "Marie Claire UWIMANA", phone: "+250788300002", address: "Musanze, Northern Province", notes: "Truck fleet owner" },
        { business_id: BUSINESS_ID, owner_name: "Emmanuel NSABIMANA", phone: "+250788300003", address: "Rubavu, Western Province", notes: "Heavy machinery operator" },
      ];
      const { data: extOwnersData } = await supabase.from("external_asset_owners").insert(extOwners).select("id");

      let hapyjoVehicles: any[] = [];
      try {
        const { data: existingHapyjo } = await supabase.from("vehicles").select("id");
        if (!existingHapyjo || existingHapyjo.length === 0) {
          const seedVehicles = [
            { vehicle_number_or_id: "RAA 100A", type: "truck", site_id: "site_001" },
            { vehicle_number_or_id: "RAB 200B", type: "truck", site_id: "site_001" },
            { vehicle_number_or_id: "RAC 300C", type: "machine", site_id: "site_001" },
            { vehicle_number_or_id: "RAD 400D", type: "machine", site_id: "site_001" },
            { vehicle_number_or_id: "RAE 500E", type: "truck", site_id: "site_001" },
          ];
          const { data: seeded } = await supabase.from("vehicles").insert(seedVehicles).select("*");
          hapyjoVehicles = seeded || [];
        } else {
          const { data: all } = await supabase.from("vehicles").select("*");
          hapyjoVehicles = all || [];
        }
      } catch (e) {
        console.log("HAPYJO vehicles table not accessible, creating local vehicles");
      }

      if (hapyjoVehicles.length > 0) {
        for (const hv of hapyjoVehicles) {
          const vehicleType = (hv.type || "").toLowerCase() === "machine" ? "MACHINE" : "TRUCK";
          await supabase.from("fleet_vehicles").insert({
            business_id: BUSINESS_ID,
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
      } else {
        const localVehicles = [
          { business_id: BUSINESS_ID, vehicle_name: "RAA 100A", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 150000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
          { business_id: BUSINESS_ID, vehicle_name: "RAB 200B", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 150000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
          { business_id: BUSINESS_ID, vehicle_name: "RAC 300C", vehicle_type: "MACHINE", rental_type: "HOUR", ownership_type: "OWN", base_rate: 200000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
          { business_id: BUSINESS_ID, vehicle_name: "RAD 400D", vehicle_type: "MACHINE", rental_type: "HOUR", ownership_type: "OWN", base_rate: 200000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
          { business_id: BUSINESS_ID, vehicle_name: "RAE 500E", vehicle_type: "TRUCK", rental_type: "DAY", ownership_type: "OWN", base_rate: 180000, current_status: "AVAILABLE", current_location: "Kigali Depot" },
        ];
        await supabase.from("fleet_vehicles").insert(localVehicles);
      }

      const today = new Date().toISOString().split("T")[0];
      if (suppliersData && itemsData) {
        await supabase.from("purchases").insert([
          { business_id: BUSINESS_ID, supplier_id: suppliersData[0].id, reference_no: "PUR-SEED01", purchase_date: today, item_id: itemsData[0].id, total_quantity: 500, unit: "KG", unit_price: 1200, total_purchase_cost: 600000, amount_paid: 400000, remaining_amount: 200000, financial_status: "PARTIAL" },
          { business_id: BUSINESS_ID, supplier_id: suppliersData[1].id, reference_no: "PUR-SEED02", purchase_date: today, item_id: itemsData[1].id, total_quantity: 1000, unit: "KG", unit_price: 800, total_purchase_cost: 800000, amount_paid: 800000, remaining_amount: 0, financial_status: "FULLY_SETTLED" },
        ]);
      }

      if (customersData && itemsData) {
        await supabase.from("sales").insert([
          { business_id: BUSINESS_ID, customer_id: customersData[0].id, reference_no: "SAL-SEED01", sale_date: today, item_id: itemsData[0].id, total_quantity: 200, unit: "KG", unit_price: 1500, total_sale_amount: 300000, amount_received: 300000, remaining_amount: 0, financial_status: "FULLY_RECEIVED" },
          { business_id: BUSINESS_ID, customer_id: customersData[1].id, reference_no: "SAL-SEED02", sale_date: today, item_id: itemsData[1].id, total_quantity: 300, unit: "KG", unit_price: 1000, total_sale_amount: 300000, amount_received: 100000, remaining_amount: 200000, financial_status: "PARTIAL" },
        ]);
      }

      const { data: vehiclesData } = await supabase.from("fleet_vehicles").select("id").eq("business_id", BUSINESS_ID).limit(2);
      if (vehiclesData && vehiclesData.length >= 2 && customersData && extOwnersData) {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
        await supabase.from("rental_contracts").insert([
          { business_id: BUSINESS_ID, vehicle_id: vehiclesData[0].id, rental_direction: "OUTGOING", customer_id: customersData[0].id, rental_start_datetime: startDate.toISOString(), rental_end_datetime: endDate.toISOString(), rate: 150000, total_amount: 750000, amount_paid: 300000, remaining_amount: 450000, financial_status: "PARTIAL", operational_status: "ACTIVE", location: "Nyamirambo Road Expansion" },
          { business_id: BUSINESS_ID, vehicle_id: vehiclesData[1].id, rental_direction: "INCOMING", external_owner_id: extOwnersData[0].id, rental_start_datetime: startDate.toISOString(), rental_end_datetime: endDate.toISOString(), rate: 200000, total_amount: 1000000, amount_paid: 500000, remaining_amount: 500000, financial_status: "PARTIAL", operational_status: "ACTIVE", location: "Huye-Muhanga Highway Project" },
        ]);
        await supabase.from("fleet_vehicles").update({ current_status: "RENTED_OUT" }).eq("id", vehiclesData[0].id);
        await supabase.from("fleet_vehicles").update({ current_status: "RENTED_IN" }).eq("id", vehiclesData[1].id);
      }

      res.json({ status: "initialized" });
    } catch (error: any) {
      console.error("Init error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== BUSINESSES (Admin) ====================
  app.get("/api/businesses", async (_req, res) => {
    const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/businesses", async (req, res) => {
    const { name } = req.body;
    const id = "biz_" + Date.now().toString(36);
    const { data, error } = await supabase.from("businesses").insert({ id, name, currency: "RWF" }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== ITEMS ====================
  app.get("/api/items", async (_req, res) => {
    const activeOnly = _req.query.active === "true";
    let query = supabase.from("items").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/items", async (req, res) => {
    const { data, error } = await supabase.from("items").insert({ ...req.body, business_id: BUSINESS_ID }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== SUPPLIERS ====================
  app.get("/api/suppliers", async (_req, res) => {
    const { data, error } = await supabase.from("suppliers").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/suppliers", async (req, res) => {
    const { data, error } = await supabase.from("suppliers").insert({ ...req.body, business_id: BUSINESS_ID }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== CUSTOMERS ====================
  app.get("/api/customers", async (_req, res) => {
    const { data, error } = await supabase.from("customers").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/customers", async (req, res) => {
    const { data, error } = await supabase.from("customers").insert({ ...req.body, business_id: BUSINESS_ID }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== PURCHASES ====================
  app.get("/api/purchases", async (req, res) => {
    let query = supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (req.query.pending === "true") query = query.gt("remaining_amount", 0);
    if (req.query.date) query = query.eq("purchase_date", req.query.date as string);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/purchases", async (req, res) => {
    const { supplier_id, purchase_date, item_id, total_quantity, unit, unit_price, amount_paid } = req.body;
    const total = total_quantity * unit_price;
    const paid = amount_paid || 0;
    const rem = Math.max(0, total - paid);
    let status = "PENDING";
    if (paid >= total) status = "FULLY_SETTLED";
    else if (paid > 0) status = "PARTIAL";
    const refNo = "PUR-" + Date.now().toString(36).toUpperCase();
    const { data, error } = await supabase.from("purchases").insert({
      business_id: BUSINESS_ID, supplier_id, reference_no: refNo, purchase_date, item_id,
      total_quantity, unit, unit_price, total_purchase_cost: total, amount_paid: paid,
      remaining_amount: rem, financial_status: status,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== SALES ====================
  app.get("/api/sales", async (req, res) => {
    let query = supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (req.query.pending === "true") query = query.gt("remaining_amount", 0);
    if (req.query.date) query = query.eq("sale_date", req.query.date as string);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/sales", async (req, res) => {
    const { customer_id, sale_date, item_id, total_quantity, unit, unit_price, amount_received } = req.body;
    const total = total_quantity * unit_price;
    const received = amount_received || 0;
    const rem = Math.max(0, total - received);
    let status = "PENDING";
    if (received >= total) status = "FULLY_RECEIVED";
    else if (received > 0) status = "PARTIAL";
    const refNo = "SAL-" + Date.now().toString(36).toUpperCase();
    const { data, error } = await supabase.from("sales").insert({
      business_id: BUSINESS_ID, customer_id, reference_no: refNo, sale_date, item_id,
      total_quantity, unit, unit_price, total_sale_amount: total, amount_received: received,
      remaining_amount: rem, financial_status: status,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== GROCERY PAYMENTS ====================
  app.get("/api/grocery-payments", async (_req, res) => {
    const { data, error } = await supabase.from("grocery_payments").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/grocery-payments", async (req, res) => {
    const { reference_type, reference_id, amount, payment_date, mode, notes } = req.body;
    const { error: payError } = await supabase.from("grocery_payments").insert({ business_id: BUSINESS_ID, reference_type, reference_id, amount, payment_date, mode, notes });
    if (payError) return res.status(500).json({ error: payError.message });

    if (reference_type === "PURCHASE") {
      const { data: purchase } = await supabase.from("purchases").select("*").eq("id", reference_id).single();
      if (purchase) {
        const newPaid = purchase.amount_paid + amount;
        const newRem = Math.max(0, purchase.total_purchase_cost - newPaid);
        let status = "PARTIAL";
        if (newRem <= 0) status = "FULLY_SETTLED";
        await supabase.from("purchases").update({ amount_paid: newPaid, remaining_amount: newRem, financial_status: status }).eq("id", reference_id);
      }
    } else {
      const { data: sale } = await supabase.from("sales").select("*").eq("id", reference_id).single();
      if (sale) {
        const newReceived = sale.amount_received + amount;
        const newRem = Math.max(0, sale.total_sale_amount - newReceived);
        let status = "PARTIAL";
        if (newRem <= 0) status = "FULLY_RECEIVED";
        await supabase.from("sales").update({ amount_received: newReceived, remaining_amount: newRem, financial_status: status }).eq("id", reference_id);
      }
    }

    res.json({ success: true });
  });

  // ==================== EXTERNAL ASSET OWNERS ====================
  app.get("/api/external-owners", async (_req, res) => {
    const { data, error } = await supabase.from("external_asset_owners").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/external-owners", async (req, res) => {
    const { data, error } = await supabase.from("external_asset_owners").insert({ ...req.body, business_id: BUSINESS_ID }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== VEHICLES ====================
  app.get("/api/vehicles", async (_req, res) => {
    const { data, error } = await supabase.from("fleet_vehicles").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/vehicles", async (req, res) => {
    const { data, error } = await supabase.from("fleet_vehicles").insert({ ...req.body, business_id: BUSINESS_ID }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/vehicles/sync", async (_req, res) => {
    try {
      let hapyjoVehicles: any[] = [];
      try {
        const { data } = await supabase.from("vehicles").select("*");
        hapyjoVehicles = data || [];
      } catch {
        return res.status(400).json({ error: "Could not access HAPYJO vehicles table" });
      }

      if (hapyjoVehicles.length === 0) {
        return res.json({ synced: 0, message: "No vehicles found in HAPYJO" });
      }

      let synced = 0;
      for (const hv of hapyjoVehicles) {
        const vehicleType = (hv.type || "").toLowerCase() === "machine" ? "MACHINE" : "TRUCK";
        const { data: existing } = await supabase.from("fleet_vehicles").select("id").eq("business_id", BUSINESS_ID).eq("hapyjo_vehicle_id", String(hv.id)).maybeSingle();

        if (existing) {
          await supabase.from("fleet_vehicles").update({ vehicle_name: hv.vehicle_number_or_id || `Vehicle ${hv.id}`, vehicle_type: vehicleType }).eq("id", existing.id);
        } else {
          await supabase.from("fleet_vehicles").insert({
            business_id: BUSINESS_ID, hapyjo_vehicle_id: String(hv.id),
            vehicle_name: hv.vehicle_number_or_id || `Vehicle ${hv.id}`,
            vehicle_type: vehicleType, rental_type: "DAY", ownership_type: "OWN", base_rate: 0, current_status: "AVAILABLE",
          });
        }
        synced++;
      }

      res.json({ synced, message: `${synced} vehicles synced from HAPYJO` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== RENTAL CONTRACTS ====================
  app.get("/api/rental-contracts", async (req, res) => {
    const direction = req.query.direction as string;
    let query = supabase.from("rental_contracts")
      .select("*, vehicle:fleet_vehicles(*), customer:customers(*), external_owner:external_asset_owners(*)")
      .eq("business_id", BUSINESS_ID)
      .order("created_at", { ascending: false });
    if (direction) query = query.eq("rental_direction", direction);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/rental-contracts", async (req, res) => {
    const { vehicle_id, rental_direction, customer_id, external_owner_id, rental_start_datetime, rental_end_datetime, rate, location, notes } = req.body;

    const { data: vehicle } = await supabase.from("fleet_vehicles").select("*").eq("id", vehicle_id).single();
    if (!vehicle) return res.status(400).json({ error: "Vehicle not found" });

    const { data: overlapping } = await supabase.from("rental_contracts").select("id")
      .eq("vehicle_id", vehicle_id).eq("operational_status", "ACTIVE")
      .lt("rental_start_datetime", rental_end_datetime).gt("rental_end_datetime", rental_start_datetime);

    if (overlapping && overlapping.length > 0) {
      return res.status(400).json({ error: "This vehicle has an overlapping active rental contract for the selected period." });
    }

    const diffMs = new Date(rental_end_datetime).getTime() - new Date(rental_start_datetime).getTime();
    let total = 0;
    if (vehicle.rental_type === "HOUR") {
      total = Math.ceil(diffMs / (1000 * 60 * 60)) * rate;
    } else {
      total = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) * rate;
    }

    const { data, error } = await supabase.from("rental_contracts").insert({
      business_id: BUSINESS_ID, vehicle_id, rental_direction, customer_id: customer_id || null,
      external_owner_id: external_owner_id || null, rental_start_datetime, rental_end_datetime,
      rate, total_amount: total, amount_paid: 0, remaining_amount: total,
      financial_status: "PENDING", operational_status: "ACTIVE", location, notes,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    const newStatus = rental_direction === "OUTGOING" ? "RENTED_OUT" : "RENTED_IN";
    await supabase.from("fleet_vehicles").update({ current_status: newStatus }).eq("id", vehicle_id);

    res.json(data);
  });

  app.patch("/api/rental-contracts/:id/complete", async (req, res) => {
    const { id } = req.params;
    const { data: contract } = await supabase.from("rental_contracts").select("vehicle_id").eq("id", id).single();
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    await supabase.from("rental_contracts").update({ operational_status: "COMPLETED" }).eq("id", id);
    await supabase.from("fleet_vehicles").update({ current_status: "AVAILABLE" }).eq("id", contract.vehicle_id);
    res.json({ success: true });
  });

  // ==================== RENTAL PAYMENTS ====================
  app.post("/api/rental-payments", async (req, res) => {
    const { rental_contract_id, amount, payment_date, mode, notes } = req.body;
    const { error } = await supabase.from("rental_payments").insert({ business_id: BUSINESS_ID, rental_contract_id, amount, payment_date, mode, notes });
    if (error) return res.status(500).json({ error: error.message });

    const { data: contract } = await supabase.from("rental_contracts").select("*").eq("id", rental_contract_id).single();
    if (contract) {
      const newPaid = contract.amount_paid + amount;
      const newRem = Math.max(0, contract.total_amount - newPaid);
      let status = "PARTIAL";
      if (newRem <= 0) status = "FULLY_SETTLED";
      await supabase.from("rental_contracts").update({ amount_paid: newPaid, remaining_amount: newRem, financial_status: status }).eq("id", rental_contract_id);
    }

    res.json({ success: true });
  });

  // ==================== DASHBOARD ====================
  app.get("/api/dashboard/grocery", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.substring(0, 7) + "-01";
    const [itemsRes, todaySalesRes, monthlySalesRes, monthlyPurchasesRes, purchasesPayable, salesReceivable] = await Promise.all([
      supabase.from("items").select("id", { count: "exact" }).eq("business_id", BUSINESS_ID).eq("is_active", true),
      supabase.from("sales").select("total_sale_amount").eq("business_id", BUSINESS_ID).eq("sale_date", today),
      supabase.from("sales").select("total_sale_amount").eq("business_id", BUSINESS_ID).gte("sale_date", monthStart),
      supabase.from("purchases").select("total_purchase_cost").eq("business_id", BUSINESS_ID).gte("purchase_date", monthStart),
      supabase.from("purchases").select("remaining_amount").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0),
      supabase.from("sales").select("remaining_amount").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0),
    ]);

    res.json({
      totalStock: itemsRes.count || 0,
      todaySales: (todaySalesRes.data || []).reduce((s: number, r: any) => s + (r.total_sale_amount || 0), 0),
      monthlySales: (monthlySalesRes.data || []).reduce((s: number, r: any) => s + (r.total_sale_amount || 0), 0),
      monthlyProfit: (monthlySalesRes.data || []).reduce((s: number, r: any) => s + (r.total_sale_amount || 0), 0) - (monthlyPurchasesRes.data || []).reduce((s: number, r: any) => s + (r.total_purchase_cost || 0), 0),
      payables: (purchasesPayable.data || []).reduce((s: number, r: any) => s + (r.remaining_amount || 0), 0),
      receivables: (salesReceivable.data || []).reduce((s: number, r: any) => s + (r.remaining_amount || 0), 0),
    });
  });

  app.get("/api/dashboard/rental", async (_req, res) => {
    const { data: vehicles } = await supabase.from("fleet_vehicles").select("current_status").eq("business_id", BUSINESS_ID);
    const v = vehicles || [];
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.substring(0, 7) + "-01";
    const { data: monthContracts } = await supabase.from("rental_contracts").select("rental_direction, total_amount").eq("business_id", BUSINESS_ID).gte("rental_start_datetime", monthStart + "T00:00:00");

    res.json({
      total: v.length,
      available: v.filter((x: any) => x.current_status === "AVAILABLE").length,
      rentedOut: v.filter((x: any) => x.current_status === "RENTED_OUT").length,
      rentedIn: v.filter((x: any) => x.current_status === "RENTED_IN").length,
      maintenance: v.filter((x: any) => x.current_status === "MAINTENANCE").length,
      todayRevenue: 0,
      monthRevenue: (monthContracts || []).filter((c: any) => c.rental_direction === "OUTGOING").reduce((s: number, r: any) => s + (r.total_amount || 0), 0),
    });
  });

  // ==================== RENTAL PAYMENTS (GET) ====================
  app.get("/api/rental-payments", async (_req, res) => {
    const { data, error } = await supabase.from("rental_payments").select("*, rental_contract:rental_contracts(*, vehicle:fleet_vehicles(*), customer:customers(*), external_owner:external_asset_owners(*))").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/rental-contracts-pending", async (_req, res) => {
    const { data, error } = await supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), customer:customers(*), external_owner:external_asset_owners(*)").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ==================== REPORTS ====================

  function buildUnifiedRows(purchasesData: any[], salesData: any[], outgoingData: any[], incomingData: any[]) {
    const rows: any[] = [];
    for (const p of purchasesData) {
      rows.push({ date: p.purchase_date, type: "Purchase", reference: p.reference_no, party: p.supplier?.supplier_name || "—", item_vehicle: p.item?.item_name || "—", quantity: `${p.total_quantity} ${p.unit}`, unit: p.unit, unit_price: p.unit_price, total: p.total_purchase_cost, paid: p.amount_paid, remaining: p.remaining_amount, status: p.financial_status });
    }
    for (const s of salesData) {
      rows.push({ date: s.sale_date, type: "Sale", reference: s.reference_no, party: s.customer?.customer_name || "—", item_vehicle: s.item?.item_name || "—", quantity: `${s.total_quantity} ${s.unit}`, unit: s.unit, unit_price: s.unit_price, total: s.total_sale_amount, paid: s.amount_received, remaining: s.remaining_amount, status: s.financial_status });
    }
    for (const r of outgoingData) {
      rows.push({ date: (r.rental_start_datetime || "").split("T")[0], type: "Rental Out", reference: `RNT-${r.id.slice(0, 8)}`, party: r.customer?.customer_name || "—", item_vehicle: r.vehicle?.vehicle_name || "—", quantity: "—", unit: "—", unit_price: r.rate, total: r.total_amount, paid: r.amount_paid, remaining: r.remaining_amount, status: r.financial_status });
    }
    for (const r of incomingData) {
      rows.push({ date: (r.rental_start_datetime || "").split("T")[0], type: "Rental In", reference: `RNT-${r.id.slice(0, 8)}`, party: r.external_owner?.owner_name || "—", item_vehicle: r.vehicle?.vehicle_name || "—", quantity: "—", unit: "—", unit_price: r.rate, total: r.total_amount, paid: r.amount_paid, remaining: r.remaining_amount, status: r.financial_status });
    }
    return rows;
  }

  function computeSummary(rows: any[]) {
    const totalPurchase = rows.filter(r => r.type === "Purchase").reduce((s, r) => s + r.total, 0);
    const totalSales = rows.filter(r => r.type === "Sale").reduce((s, r) => s + r.total, 0);
    const totalRentalRevenue = rows.filter(r => r.type === "Rental Out").reduce((s, r) => s + r.total, 0);
    const totalRentalCost = rows.filter(r => r.type === "Rental In").reduce((s, r) => s + r.total, 0);
    const totalPaid = rows.reduce((s, r) => s + (r.paid || 0), 0);
    const totalReceived = rows.filter(r => r.type === "Sale").reduce((s, r) => s + (r.paid || 0), 0);
    const totalOutstandingPayables = rows.filter(r => r.type === "Purchase" || r.type === "Rental In").reduce((s, r) => s + (r.remaining || 0), 0);
    const totalOutstandingReceivables = rows.filter(r => r.type === "Sale" || r.type === "Rental Out").reduce((s, r) => s + (r.remaining || 0), 0);
    return { totalPurchase, totalSales, totalRentalRevenue, totalRentalCost, totalPaid, totalReceived, totalOutstandingPayables, totalOutstandingReceivables, netProfit: totalSales - totalPurchase + totalRentalRevenue - totalRentalCost };
  }

  app.get("/api/reports/daily", async (req, res) => {
    const date = req.query.date as string || new Date().toISOString().split("T")[0];
    const [purchasesRes, salesRes, outgoingRes, incomingRes] = await Promise.all([
      supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).eq("purchase_date", date),
      supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).eq("sale_date", date),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), customer:customers(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "OUTGOING").gte("rental_start_datetime", date + "T00:00:00").lte("rental_start_datetime", date + "T23:59:59"),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), external_owner:external_asset_owners(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "INCOMING").gte("rental_start_datetime", date + "T00:00:00").lte("rental_start_datetime", date + "T23:59:59"),
    ]);
    const rows = buildUnifiedRows(purchasesRes.data || [], salesRes.data || [], outgoingRes.data || [], incomingRes.data || []);
    res.json({ rows, ...computeSummary(rows) });
  });

  app.get("/api/reports/monthly", async (req, res) => {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const [purchasesRes, salesRes, outgoingRes, incomingRes] = await Promise.all([
      supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).gte("purchase_date", fromDate).lte("purchase_date", toDate),
      supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).gte("sale_date", fromDate).lte("sale_date", toDate),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), customer:customers(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "OUTGOING").gte("rental_start_datetime", fromDate + "T00:00:00").lte("rental_start_datetime", toDate + "T23:59:59"),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), external_owner:external_asset_owners(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "INCOMING").gte("rental_start_datetime", fromDate + "T00:00:00").lte("rental_start_datetime", toDate + "T23:59:59"),
    ]);
    const rows = buildUnifiedRows(purchasesRes.data || [], salesRes.data || [], outgoingRes.data || [], incomingRes.data || []);
    res.json({ rows, ...computeSummary(rows) });
  });

  app.get("/api/reports/custom", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    if (!fromDate || !toDate) return res.status(400).json({ error: "from and to dates required" });
    const [purchasesRes, salesRes, outgoingRes, incomingRes] = await Promise.all([
      supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).gte("purchase_date", fromDate).lte("purchase_date", toDate),
      supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).gte("sale_date", fromDate).lte("sale_date", toDate),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), customer:customers(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "OUTGOING").gte("rental_start_datetime", fromDate + "T00:00:00").lte("rental_start_datetime", toDate + "T23:59:59"),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), external_owner:external_asset_owners(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "INCOMING").gte("rental_start_datetime", fromDate + "T00:00:00").lte("rental_start_datetime", toDate + "T23:59:59"),
    ]);
    const rows = buildUnifiedRows(purchasesRes.data || [], salesRes.data || [], outgoingRes.data || [], incomingRes.data || []);
    res.json({ rows, ...computeSummary(rows) });
  });

  app.get("/api/reports/purchases", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    const supplierId = req.query.supplier_id as string;
    let query = supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).order("purchase_date", { ascending: true });
    if (fromDate) query = query.gte("purchase_date", fromDate);
    if (toDate) query = query.lte("purchase_date", toDate);
    if (supplierId) query = query.eq("supplier_id", supplierId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((p: any) => ({
      date: p.purchase_date, supplier: p.supplier?.supplier_name || "—", item: p.item?.item_name || "—",
      quantity: p.total_quantity, unit: p.unit, unit_price: p.unit_price,
      total: p.total_purchase_cost, paid: p.amount_paid, remaining: p.remaining_amount, status: p.financial_status,
    }));
    const totalPurchased = rows.reduce((s: number, r: any) => s + r.total, 0);
    const totalPaid = rows.reduce((s: number, r: any) => s + r.paid, 0);
    const totalOutstanding = rows.reduce((s: number, r: any) => s + r.remaining, 0);
    res.json({ rows, totalPurchased, totalPaid, totalOutstanding });
  });

  app.get("/api/reports/sales", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    const customerId = req.query.customer_id as string;
    let query = supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).order("sale_date", { ascending: true });
    if (fromDate) query = query.gte("sale_date", fromDate);
    if (toDate) query = query.lte("sale_date", toDate);
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((s: any) => ({
      date: s.sale_date, customer: s.customer?.customer_name || "—", item: s.item?.item_name || "—",
      quantity: s.total_quantity, unit: s.unit, unit_price: s.unit_price,
      total: s.total_sale_amount, received: s.amount_received, remaining: s.remaining_amount, status: s.financial_status,
    }));
    const totalSales = rows.reduce((s: number, r: any) => s + r.total, 0);
    const totalReceived = rows.reduce((s: number, r: any) => s + r.received, 0);
    const totalOutstanding = rows.reduce((s: number, r: any) => s + r.remaining, 0);
    res.json({ rows, totalSales, totalReceived, totalOutstanding, netProfit: totalSales });
  });

  app.get("/api/reports/profit", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    let purchaseQuery = supabase.from("purchases").select("purchase_date, total_purchase_cost").eq("business_id", BUSINESS_ID);
    let salesQuery = supabase.from("sales").select("sale_date, total_sale_amount").eq("business_id", BUSINESS_ID);
    if (fromDate) { purchaseQuery = purchaseQuery.gte("purchase_date", fromDate); salesQuery = salesQuery.gte("sale_date", fromDate); }
    if (toDate) { purchaseQuery = purchaseQuery.lte("purchase_date", toDate); salesQuery = salesQuery.lte("sale_date", toDate); }
    const [pRes, sRes] = await Promise.all([purchaseQuery, salesQuery]);
    const dateMap: Record<string, { sales: number; purchases: number }> = {};
    for (const p of pRes.data || []) {
      if (!dateMap[p.purchase_date]) dateMap[p.purchase_date] = { sales: 0, purchases: 0 };
      dateMap[p.purchase_date].purchases += p.total_purchase_cost;
    }
    for (const s of sRes.data || []) {
      if (!dateMap[s.sale_date]) dateMap[s.sale_date] = { sales: 0, purchases: 0 };
      dateMap[s.sale_date].sales += s.total_sale_amount;
    }
    const rows = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
      date, totalSales: v.sales, totalPurchases: v.purchases, profit: v.sales - v.purchases,
    }));
    const grandTotalSales = rows.reduce((s, r) => s + r.totalSales, 0);
    const grandTotalPurchases = rows.reduce((s, r) => s + r.totalPurchases, 0);
    res.json({ rows, grandTotalSales, grandTotalPurchases, netProfit: grandTotalSales - grandTotalPurchases });
  });

  app.get("/api/reports/outstanding-payables", async (req, res) => {
    const supplierId = req.query.supplier_id as string;
    let query = supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0).order("purchase_date", { ascending: true });
    if (supplierId) query = query.eq("supplier_id", supplierId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((p: any) => ({
      date: p.purchase_date, supplier: p.supplier?.supplier_name || "—", item: p.item?.item_name || "—",
      total: p.total_purchase_cost, paid: p.amount_paid, remaining: p.remaining_amount, status: p.financial_status,
    }));
    const totalOutstanding = rows.reduce((s: number, r: any) => s + r.remaining, 0);
    res.json({ rows, totalOutstanding });
  });

  app.get("/api/reports/outstanding-receivables", async (req, res) => {
    const customerId = req.query.customer_id as string;
    let query = supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0).order("sale_date", { ascending: true });
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((s: any) => ({
      date: s.sale_date, customer: s.customer?.customer_name || "—", item: s.item?.item_name || "—",
      total: s.total_sale_amount, received: s.amount_received, remaining: s.remaining_amount, status: s.financial_status,
    }));
    const totalOutstanding = rows.reduce((s: number, r: any) => s + r.remaining, 0);
    res.json({ rows, totalOutstanding });
  });

  app.get("/api/reports/stock-summary", async (req, res) => {
    const [purchasesRes, salesRes, itemsRes] = await Promise.all([
      supabase.from("purchases").select("item_id, total_quantity").eq("business_id", BUSINESS_ID),
      supabase.from("sales").select("item_id, total_quantity").eq("business_id", BUSINESS_ID),
      supabase.from("items").select("*").eq("business_id", BUSINESS_ID).eq("is_active", true),
    ]);
    const purchasedMap: Record<string, number> = {};
    for (const p of purchasesRes.data || []) { purchasedMap[p.item_id] = (purchasedMap[p.item_id] || 0) + p.total_quantity; }
    const soldMap: Record<string, number> = {};
    for (const s of salesRes.data || []) { soldMap[s.item_id] = (soldMap[s.item_id] || 0) + s.total_quantity; }
    const rows = (itemsRes.data || []).map((item: any) => {
      const purchased = purchasedMap[item.id] || 0;
      const sold = soldMap[item.id] || 0;
      return { item: item.item_name, totalPurchased: purchased, totalSold: sold, currentStock: purchased - sold, unit: item.base_unit, measurementType: item.measurement_type };
    });
    res.json({ rows });
  });

  app.get("/api/reports/supplier-ledger", async (req, res) => {
    const supplierId = req.query.supplier_id as string;
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    if (!supplierId) return res.status(400).json({ error: "supplier_id required" });
    let purchaseQuery = supabase.from("purchases").select("reference_no, purchase_date, total_purchase_cost").eq("business_id", BUSINESS_ID).eq("supplier_id", supplierId).order("purchase_date", { ascending: true });
    let paymentQuery = supabase.from("grocery_payments").select("reference_id, payment_date, amount").eq("business_id", BUSINESS_ID).eq("reference_type", "PURCHASE").order("payment_date", { ascending: true });
    if (fromDate) { purchaseQuery = purchaseQuery.gte("purchase_date", fromDate); paymentQuery = paymentQuery.gte("payment_date", fromDate); }
    if (toDate) { purchaseQuery = purchaseQuery.lte("purchase_date", toDate); paymentQuery = paymentQuery.lte("payment_date", toDate); }
    const [pRes, pmtRes] = await Promise.all([purchaseQuery, paymentQuery]);
    const entries: any[] = [];
    for (const p of pRes.data || []) {
      entries.push({ date: p.purchase_date, reference: p.reference_no, purchaseAmount: p.total_purchase_cost, paymentAmount: 0 });
    }
    for (const pm of pmtRes.data || []) {
      entries.push({ date: pm.payment_date, reference: `PMT-${pm.reference_id.slice(0, 8)}`, purchaseAmount: 0, paymentAmount: pm.amount });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    const rows = entries.map(e => {
      balance = balance + e.purchaseAmount - e.paymentAmount;
      return { ...e, balance };
    });
    res.json({ rows, finalBalance: balance });
  });

  app.get("/api/reports/customer-ledger", async (req, res) => {
    const customerId = req.query.customer_id as string;
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    if (!customerId) return res.status(400).json({ error: "customer_id required" });
    let salesQuery = supabase.from("sales").select("reference_no, sale_date, total_sale_amount").eq("business_id", BUSINESS_ID).eq("customer_id", customerId).order("sale_date", { ascending: true });
    let paymentQuery = supabase.from("grocery_payments").select("reference_id, payment_date, amount").eq("business_id", BUSINESS_ID).eq("reference_type", "SALE").order("payment_date", { ascending: true });
    if (fromDate) { salesQuery = salesQuery.gte("sale_date", fromDate); paymentQuery = paymentQuery.gte("payment_date", fromDate); }
    if (toDate) { salesQuery = salesQuery.lte("sale_date", toDate); paymentQuery = paymentQuery.lte("payment_date", toDate); }
    const [sRes, pmtRes] = await Promise.all([salesQuery, paymentQuery]);
    const entries: any[] = [];
    for (const s of sRes.data || []) {
      entries.push({ date: s.sale_date, reference: s.reference_no, saleAmount: s.total_sale_amount, paymentAmount: 0 });
    }
    for (const pm of pmtRes.data || []) {
      entries.push({ date: pm.payment_date, reference: `PMT-${pm.reference_id.slice(0, 8)}`, saleAmount: 0, paymentAmount: pm.amount });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    const rows = entries.map(e => {
      balance = balance + e.saleAmount - e.paymentAmount;
      return { ...e, balance };
    });
    res.json({ rows, finalBalance: balance });
  });

  app.get("/api/reports/rental-outgoing", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    let query = supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), customer:customers(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "OUTGOING").order("rental_start_datetime", { ascending: true });
    if (fromDate) query = query.gte("rental_start_datetime", fromDate + "T00:00:00");
    if (toDate) query = query.lte("rental_start_datetime", toDate + "T23:59:59");
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((r: any) => ({
      customer: r.customer?.customer_name || "—", vehicle: r.vehicle?.vehicle_name || "—",
      period: `${(r.rental_start_datetime || "").split("T")[0]} to ${(r.rental_end_datetime || "").split("T")[0]}`,
      total: r.total_amount, paid: r.amount_paid, remaining: r.remaining_amount, status: r.financial_status,
    }));
    const totalRevenue = rows.reduce((s: number, r: any) => s + r.total, 0);
    const totalReceived = rows.reduce((s: number, r: any) => s + r.paid, 0);
    const totalOutstanding = rows.reduce((s: number, r: any) => s + r.remaining, 0);
    res.json({ rows, totalRevenue, totalReceived, totalOutstanding });
  });

  app.get("/api/reports/rental-incoming", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    let query = supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(*), external_owner:external_asset_owners(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "INCOMING").order("rental_start_datetime", { ascending: true });
    if (fromDate) query = query.gte("rental_start_datetime", fromDate + "T00:00:00");
    if (toDate) query = query.lte("rental_start_datetime", toDate + "T23:59:59");
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const rows = (data || []).map((r: any) => ({
      externalOwner: r.external_owner?.owner_name || "—", vehicle: r.vehicle?.vehicle_name || "—",
      period: `${(r.rental_start_datetime || "").split("T")[0]} to ${(r.rental_end_datetime || "").split("T")[0]}`,
      total: r.total_amount, paid: r.amount_paid, remaining: r.remaining_amount, status: r.financial_status,
    }));
    const totalCost = rows.reduce((s: number, r: any) => s + r.total, 0);
    const totalPaid = rows.reduce((s: number, r: any) => s + r.paid, 0);
    const totalOutstanding = rows.reduce((s: number, r: any) => s + r.remaining, 0);
    res.json({ rows, totalCost, totalPaid, totalOutstanding });
  });

  app.get("/api/reports/vehicle-utilization", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    const { data: vehicles } = await supabase.from("fleet_vehicles").select("*").eq("business_id", BUSINESS_ID);
    let rentalQuery = supabase.from("rental_contracts").select("vehicle_id, rental_direction, total_amount, rental_start_datetime, rental_end_datetime").eq("business_id", BUSINESS_ID);
    if (fromDate) rentalQuery = rentalQuery.gte("rental_start_datetime", fromDate + "T00:00:00");
    if (toDate) rentalQuery = rentalQuery.lte("rental_start_datetime", toDate + "T23:59:59");
    const { data: rentals } = await rentalQuery;
    const vehicleMap: Record<string, { totalDays: number; totalRevenue: number; rentalCount: number }> = {};
    for (const r of rentals || []) {
      if (!vehicleMap[r.vehicle_id]) vehicleMap[r.vehicle_id] = { totalDays: 0, totalRevenue: 0, rentalCount: 0 };
      const diffMs = new Date(r.rental_end_datetime).getTime() - new Date(r.rental_start_datetime).getTime();
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      vehicleMap[r.vehicle_id].totalDays += days;
      if (r.rental_direction === "OUTGOING") vehicleMap[r.vehicle_id].totalRevenue += r.total_amount;
      vehicleMap[r.vehicle_id].rentalCount++;
    }
    const periodDays = fromDate && toDate ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))) : 30;
    const rows = (vehicles || []).map((v: any) => {
      const usage = vehicleMap[v.id] || { totalDays: 0, totalRevenue: 0, rentalCount: 0 };
      return { vehicle: v.vehicle_name, type: v.vehicle_type, totalRentalDays: usage.totalDays, totalRevenue: usage.totalRevenue, rentalCount: usage.rentalCount, availability: Math.max(0, Math.round((1 - usage.totalDays / periodDays) * 100)) };
    });
    res.json({ rows });
  });

  app.get("/api/reports/rental-profit", async (req, res) => {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    let outQuery = supabase.from("rental_contracts").select("total_amount, rental_start_datetime").eq("business_id", BUSINESS_ID).eq("rental_direction", "OUTGOING");
    let inQuery = supabase.from("rental_contracts").select("total_amount, rental_start_datetime").eq("business_id", BUSINESS_ID).eq("rental_direction", "INCOMING");
    if (fromDate) { outQuery = outQuery.gte("rental_start_datetime", fromDate + "T00:00:00"); inQuery = inQuery.gte("rental_start_datetime", fromDate + "T00:00:00"); }
    if (toDate) { outQuery = outQuery.lte("rental_start_datetime", toDate + "T23:59:59"); inQuery = inQuery.lte("rental_start_datetime", toDate + "T23:59:59"); }
    const [outRes, inRes] = await Promise.all([outQuery, inQuery]);
    const totalRevenue = (outRes.data || []).reduce((s: number, r: any) => s + r.total_amount, 0);
    const totalCost = (inRes.data || []).reduce((s: number, r: any) => s + r.total_amount, 0);
    res.json({ totalRevenue, totalCost, netProfit: totalRevenue - totalCost, outgoingCount: (outRes.data || []).length, incomingCount: (inRes.data || []).length });
  });

  // ==================== NOTIFICATIONS ====================
  app.get("/api/notifications", async (_req, res) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const [purchasesRes, salesRes, grocPayRes, rentalPayRes, contractsRes, vehiclesRes] = await Promise.all([
      supabase.from("purchases").select("*, supplier:suppliers(supplier_name), item:items(item_name)").eq("business_id", BUSINESS_ID).gte("created_at", sevenDaysAgo + "T00:00:00").order("created_at", { ascending: false }).limit(20),
      supabase.from("sales").select("*, customer:customers(customer_name), item:items(item_name)").eq("business_id", BUSINESS_ID).gte("created_at", sevenDaysAgo + "T00:00:00").order("created_at", { ascending: false }).limit(20),
      supabase.from("grocery_payments").select("*").eq("business_id", BUSINESS_ID).gte("created_at", sevenDaysAgo + "T00:00:00").order("created_at", { ascending: false }).limit(10),
      supabase.from("rental_payments").select("*, rental_contract:rental_contracts(vehicle_id)").eq("business_id", BUSINESS_ID).gte("created_at", sevenDaysAgo + "T00:00:00").order("created_at", { ascending: false }).limit(10),
      supabase.from("rental_contracts").select("*, vehicle:fleet_vehicles(vehicle_name), customer:customers(customer_name), external_owner:external_asset_owners(owner_name)").eq("business_id", BUSINESS_ID).gte("created_at", sevenDaysAgo + "T00:00:00").order("created_at", { ascending: false }).limit(10),
      supabase.from("fleet_vehicles").select("*").eq("business_id", BUSINESS_ID).neq("current_status", "AVAILABLE").limit(10),
    ]);
    const notifications: any[] = [];
    for (const p of purchasesRes.data || []) {
      notifications.push({ id: `pur-${p.id}`, type: "purchase", title: `Purchase: ${p.reference_no}`, description: `${p.item?.item_name || "Item"} from ${p.supplier?.supplier_name || "supplier"} - ${p.total_purchase_cost} RWF`, timestamp: p.created_at, status: p.financial_status });
    }
    for (const s of salesRes.data || []) {
      notifications.push({ id: `sal-${s.id}`, type: "sale", title: `Sale: ${s.reference_no}`, description: `${s.item?.item_name || "Item"} to ${s.customer?.customer_name || "customer"} - ${s.total_sale_amount} RWF`, timestamp: s.created_at, status: s.financial_status });
    }
    for (const gp of grocPayRes.data || []) {
      notifications.push({ id: `gpay-${gp.id}`, type: "payment", title: `Payment: ${gp.reference_type}`, description: `${gp.amount} RWF via ${gp.mode}`, timestamp: gp.created_at, status: "COMPLETED" });
    }
    for (const rp of rentalPayRes.data || []) {
      notifications.push({ id: `rpay-${rp.id}`, type: "rental_payment", title: `Rental Payment`, description: `${rp.amount} RWF via ${rp.mode}`, timestamp: rp.created_at, status: "COMPLETED" });
    }
    for (const rc of contractsRes.data || []) {
      const party = rc.rental_direction === "OUTGOING" ? rc.customer?.customer_name : rc.external_owner?.owner_name;
      notifications.push({ id: `rnt-${rc.id}`, type: "rental", title: `Rental ${rc.rental_direction}: ${rc.vehicle?.vehicle_name || "Vehicle"}`, description: `${party || "Party"} - ${rc.total_amount} RWF (${rc.operational_status})`, timestamp: rc.created_at, status: rc.financial_status });
    }
    for (const v of vehiclesRes.data || []) {
      if (v.current_status === "MAINTENANCE") {
        notifications.push({ id: `veh-${v.id}`, type: "vehicle_alert", title: `Vehicle: ${v.vehicle_name}`, description: `Status: ${v.current_status} at ${v.current_location || "unknown"}`, timestamp: v.updated_at, status: "WARNING" });
      }
    }
    const overduePayables = await supabase.from("purchases").select("reference_no, remaining_amount, supplier:suppliers(supplier_name)").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0);
    for (const op of overduePayables.data || []) {
      notifications.push({ id: `overdue-${op.reference_no}`, type: "overdue", title: `Outstanding: ${op.reference_no}`, description: `${op.remaining_amount} RWF to ${op.supplier?.supplier_name || "supplier"}`, timestamp: new Date().toISOString(), status: "PENDING" });
    }
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(notifications.slice(0, 50));
  });

  return httpServer;
}
