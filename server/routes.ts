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
        { business_id: BUSINESS_ID, supplier_name: "Kigali Rice Suppliers", phone: "+250788100001", address: "Kigali, Nyarugenge", notes: "Premium rice distributor" },
        { business_id: BUSINESS_ID, supplier_name: "Rwanda Sugar Co.", phone: "+250788100002", address: "Kamonyi, Southern Province", notes: "Sugar wholesale" },
        { business_id: BUSINESS_ID, supplier_name: "Great Lakes Oil Ltd", phone: "+250788100003", address: "Rubavu, Western Province", notes: "Cooking oil supplier" },
      ];
      const { data: suppliersData } = await supabase.from("suppliers").insert(suppliers).select("id");

      const customers = [
        { business_id: BUSINESS_ID, customer_name: "Hotel des Mille Collines", phone: "+250788200001", address: "Kigali CBD", notes: "Hotel chain" },
        { business_id: BUSINESS_ID, customer_name: "Nakumatt Supermarket", phone: "+250788200002", address: "Kigali, Kicukiro", notes: "Retail chain" },
        { business_id: BUSINESS_ID, customer_name: "Bourbon Coffee", phone: "+250788200003", address: "Kigali, Kimihurura", notes: "Coffee shop chain" },
      ];
      const { data: customersData } = await supabase.from("customers").insert(customers).select("id");

      const items = [
        { business_id: BUSINESS_ID, item_name: "Rice (Basmati)", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Sugar", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Cooking Oil", measurement_type: "VOLUME", base_unit: "LITRE", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Wheat Flour", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
        { business_id: BUSINESS_ID, item_name: "Salt", measurement_type: "WEIGHT", base_unit: "KG", is_active: true },
      ];
      const { data: itemsData } = await supabase.from("items").insert(items).select("id");

      const extOwners = [
        { business_id: BUSINESS_ID, owner_name: "Jean-Pierre HABIMANA", phone: "+250788300001", address: "Huye, Southern Province", notes: "Owns 2 excavators" },
        { business_id: BUSINESS_ID, owner_name: "Marie Claire UWIMANA", phone: "+250788300002", address: "Musanze, Northern Province", notes: "Truck fleet owner" },
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
          { business_id: BUSINESS_ID, vehicle_id: vehiclesData[0].id, rental_direction: "OUTGOING", customer_id: customersData[0].id, rental_start_datetime: startDate.toISOString(), rental_end_datetime: endDate.toISOString(), rate: 150000, total_amount: 750000, amount_paid: 300000, remaining_amount: 450000, financial_status: "PARTIAL", operational_status: "ACTIVE", location: "Kigali Construction Site" },
          { business_id: BUSINESS_ID, vehicle_id: vehiclesData[1].id, rental_direction: "INCOMING", external_owner_id: extOwnersData[0].id, rental_start_datetime: startDate.toISOString(), rental_end_datetime: endDate.toISOString(), rate: 200000, total_amount: 1000000, amount_paid: 500000, remaining_amount: 500000, financial_status: "PARTIAL", operational_status: "ACTIVE", location: "Huye Road Project" },
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

  // ==================== REPORTS ====================
  app.get("/api/reports/daily", async (req, res) => {
    const date = req.query.date as string || new Date().toISOString().split("T")[0];
    const [purchasesRes, salesRes, outgoingRes, incomingRes] = await Promise.all([
      supabase.from("purchases").select("*, supplier:suppliers(*), item:items(*)").eq("business_id", BUSINESS_ID).eq("purchase_date", date),
      supabase.from("sales").select("*, customer:customers(*), item:items(*)").eq("business_id", BUSINESS_ID).eq("sale_date", date),
      supabase.from("rental_contracts").select("*, vehicle:vehicles(*), customer:customers(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "OUTGOING").gte("rental_start_datetime", date + "T00:00:00").lte("rental_start_datetime", date + "T23:59:59"),
      supabase.from("rental_contracts").select("*, vehicle:vehicles(*), external_owner:external_asset_owners(*)").eq("business_id", BUSINESS_ID).eq("rental_direction", "INCOMING").gte("rental_start_datetime", date + "T00:00:00").lte("rental_start_datetime", date + "T23:59:59"),
    ]);

    const rows: any[] = [];
    for (const p of purchasesRes.data || []) {
      rows.push({ type: "Purchase", reference: p.reference_no, party: p.supplier?.supplier_name || "—", item_vehicle: p.item?.item_name || "—", quantity: `${p.total_quantity} ${p.unit}`, total: p.total_purchase_cost, paid: p.amount_paid, remaining: p.remaining_amount, status: p.financial_status });
    }
    for (const s of salesRes.data || []) {
      rows.push({ type: "Sale", reference: s.reference_no, party: s.customer?.customer_name || "—", item_vehicle: s.item?.item_name || "—", quantity: `${s.total_quantity} ${s.unit}`, total: s.total_sale_amount, paid: s.amount_received, remaining: s.remaining_amount, status: s.financial_status });
    }
    for (const r of outgoingRes.data || []) {
      rows.push({ type: "Rental Out", reference: `RNT-${r.id.slice(0, 8)}`, party: r.customer?.customer_name || "—", item_vehicle: r.vehicle?.vehicle_name || "—", quantity: "—", total: r.total_amount, paid: r.amount_paid, remaining: r.remaining_amount, status: r.financial_status });
    }
    for (const r of incomingRes.data || []) {
      rows.push({ type: "Rental In", reference: `RNT-${r.id.slice(0, 8)}`, party: r.external_owner?.owner_name || "—", item_vehicle: r.vehicle?.vehicle_name || "—", quantity: "—", total: r.total_amount, paid: r.amount_paid, remaining: r.remaining_amount, status: r.financial_status });
    }

    const totalPurchase = rows.filter(r => r.type === "Purchase").reduce((s, r) => s + r.total, 0);
    const totalSales = rows.filter(r => r.type === "Sale").reduce((s, r) => s + r.total, 0);
    const totalRentalRevenue = rows.filter(r => r.type === "Rental Out").reduce((s, r) => s + r.total, 0);
    const totalRentalCost = rows.filter(r => r.type === "Rental In").reduce((s, r) => s + r.total, 0);

    res.json({ rows, totalPurchase, totalSales, totalRentalRevenue, totalRentalCost, netProfit: totalSales - totalPurchase + totalRentalRevenue - totalRentalCost });
  });

  return httpServer;
}
