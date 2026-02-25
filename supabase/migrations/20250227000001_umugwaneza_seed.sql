-- Umugwaneza: seed data for demo (only if biz_001 does not exist)
-- Auth users (Admin@umugwaneza.com, owner@umugwaneza.com) must be created via scripts/seed-umugwaneza-auth.js

INSERT INTO public.businesses (id, name, currency)
SELECT 'biz_001', 'UMUGWANEZA LTD', 'RWF'
WHERE NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = 'biz_001');

-- Seed only when business was just inserted or is empty
DO $$
DECLARE
  bid TEXT := 'biz_001';
  s1 UUID; s2 UUID; s3 UUID; s4 UUID; s5 UUID;
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  i1 UUID; i2 UUID; i3 UUID; i4 UUID; i5 UUID; i6 UUID; i7 UUID;
  e1 UUID; e2 UUID; e3 UUID;
  v1 UUID; v2 UUID; v3 UUID; v4 UUID; v5 UUID;
  rc1 UUID; rc2 UUID;
  td DATE := CURRENT_DATE;
  yd DATE := CURRENT_DATE - INTERVAL '1 day';
  lm DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE business_id = bid LIMIT 1) THEN
    INSERT INTO public.suppliers (business_id, supplier_name, phone, address, notes) VALUES
      (bid, 'COPRIMU Cooperative', '+250788100001', 'Muhanga, Southern Province', 'Maize and beans cooperative'),
      (bid, 'Kigali Grain Traders', '+250788100002', 'Kigali, Nyarugenge', 'Premium rice and wheat flour distributor'),
      (bid, 'Inyange Industries', '+250788100003', 'Kigali, Masaka', 'Cooking oil and dairy wholesale'),
      (bid, 'MINIMEX Rwanda', '+250788100004', 'Kigali, Special Economic Zone', 'Flour milling and salt'),
      (bid, 'Rubavu Lake Trading', '+250788100005', 'Rubavu, Western Province', 'Sugar and salt from upcountry');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE business_id = bid LIMIT 1) THEN
    INSERT INTO public.customers (business_id, customer_name, phone, address, notes) VALUES
      (bid, 'Marché de Kimironko', '+250788200001', 'Kigali, Kimironko', 'Large retail market'),
      (bid, 'Simba Supermarket', '+250788200002', 'Kigali, Kicukiro', 'Supermarket chain'),
      (bid, 'Musanze Fresh Foods', '+250788200003', 'Musanze, Northern Province', 'Regional food distributor'),
      (bid, 'Huye Market Vendors Assoc.', '+250788200004', 'Huye, Southern Province', 'Market vendors association'),
      (bid, 'Hotel Gorillas Kigali', '+250788200005', 'Kigali, Nyarutarama', 'Hospitality client');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.items WHERE business_id = bid LIMIT 1) THEN
    INSERT INTO public.items (business_id, item_name, measurement_type, base_unit, is_active) VALUES
      (bid, 'Umuceri (Rice)', 'WEIGHT', 'KG', true),
      (bid, 'Ibishyimbo (Beans)', 'WEIGHT', 'KG', true),
      (bid, 'Ibigori (Maize)', 'WEIGHT', 'KG', true),
      (bid, 'Amavuta y''igikoni (Cooking Oil)', 'VOLUME', 'LITRE', true),
      (bid, 'Isukari (Sugar)', 'WEIGHT', 'KG', true),
      (bid, 'Umunyu (Salt)', 'WEIGHT', 'KG', true),
      (bid, 'Ifu y''ingano (Wheat Flour)', 'WEIGHT', 'KG', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.external_asset_owners WHERE business_id = bid LIMIT 1) THEN
    INSERT INTO public.external_asset_owners (business_id, owner_name, phone, address, notes) VALUES
      (bid, 'Jean-Pierre HABIMANA', '+250788300001', 'Huye, Southern Province', 'Owns 2 excavators'),
      (bid, 'Marie Claire UWIMANA', '+250788300002', 'Musanze, Northern Province', 'Truck fleet owner'),
      (bid, 'Emmanuel NSABIMANA', '+250788300003', 'Rubavu, Western Province', 'Heavy machinery operator');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fleet_vehicles WHERE business_id = bid LIMIT 1) THEN
    INSERT INTO public.fleet_vehicles (business_id, vehicle_name, vehicle_type, rental_type, ownership_type, base_rate, current_status, current_location) VALUES
      (bid, 'RAA 100A', 'TRUCK', 'DAY', 'OWN', 150000, 'AVAILABLE', 'Kigali Depot'),
      (bid, 'RAB 200B', 'TRUCK', 'DAY', 'OWN', 150000, 'AVAILABLE', 'Kigali Depot'),
      (bid, 'RAC 300C', 'MACHINE', 'HOUR', 'OWN', 200000, 'AVAILABLE', 'Kigali Depot'),
      (bid, 'RAD 400D', 'MACHINE', 'HOUR', 'OWN', 200000, 'AVAILABLE', 'Kigali Depot'),
      (bid, 'RAE 500E', 'TRUCK', 'DAY', 'OWN', 180000, 'AVAILABLE', 'Kigali Depot');
  END IF;

  -- Purchases (need supplier + item ids)
  IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE business_id = bid LIMIT 1) THEN
    SELECT id INTO s1 FROM public.suppliers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO s2 FROM public.suppliers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO s3 FROM public.suppliers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 2;
    SELECT id INTO s4 FROM public.suppliers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 3;
    SELECT id INTO i1 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO i2 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO i3 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 2;
    SELECT id INTO i4 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 3;
    SELECT id INTO i5 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 4;
    INSERT INTO public.purchases (business_id, supplier_id, reference_no, purchase_date, item_id, total_quantity, unit, unit_price, total_purchase_cost, amount_paid, remaining_amount, financial_status) VALUES
      (bid, s1, 'PUR-SEED01', td, i1, 500, 'KG', 1200, 600000, 400000, 200000, 'PARTIAL'),
      (bid, s2, 'PUR-SEED02', td, i2, 1000, 'KG', 800, 800000, 800000, 0, 'FULLY_SETTLED'),
      (bid, s3, 'PUR-SEED03', yd, i3, 800, 'KG', 600, 480000, 0, 480000, 'PENDING'),
      (bid, s1, 'PUR-SEED04', lm, i4, 200, 'LITRE', 3500, 700000, 700000, 0, 'FULLY_SETTLED'),
      (bid, s4, 'PUR-SEED05', td, i5, 100, 'KG', 1800, 180000, 180000, 0, 'FULLY_SETTLED');
  END IF;

  -- Sales
  IF NOT EXISTS (SELECT 1 FROM public.sales WHERE business_id = bid LIMIT 1) THEN
    SELECT id INTO c1 FROM public.customers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO c2 FROM public.customers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO c3 FROM public.customers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 2;
    SELECT id INTO c4 FROM public.customers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 3;
    SELECT id INTO c5 FROM public.customers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 4;
    SELECT id INTO i1 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO i2 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO i3 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 4;
    SELECT id INTO i4 FROM public.items WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 3;
    INSERT INTO public.sales (business_id, customer_id, reference_no, sale_date, item_id, total_quantity, unit, unit_price, total_sale_amount, amount_received, remaining_amount, financial_status) VALUES
      (bid, c1, 'SAL-SEED01', td, i1, 200, 'KG', 1500, 300000, 300000, 0, 'FULLY_RECEIVED'),
      (bid, c2, 'SAL-SEED02', td, i2, 300, 'KG', 1000, 300000, 100000, 200000, 'PARTIAL'),
      (bid, c3, 'SAL-SEED03', yd, i1, 150, 'KG', 1450, 217500, 217500, 0, 'FULLY_RECEIVED'),
      (bid, c4, 'SAL-SEED04', lm, i3, 50, 'KG', 2200, 110000, 0, 110000, 'PENDING'),
      (bid, c5, 'SAL-SEED05', td, i4, 30, 'LITRE', 4500, 135000, 135000, 0, 'FULLY_RECEIVED');
  END IF;

  -- Rental contracts + payments (need vehicles and customers/owners)
  IF NOT EXISTS (SELECT 1 FROM public.rental_contracts WHERE business_id = bid LIMIT 1) THEN
    SELECT id INTO v1 FROM public.fleet_vehicles WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO v2 FROM public.fleet_vehicles WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO c1 FROM public.customers WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    SELECT id INTO e1 FROM public.external_asset_owners WHERE business_id = bid ORDER BY created_at LIMIT 1 OFFSET 0;
    IF v1 IS NOT NULL AND v2 IS NOT NULL AND c1 IS NOT NULL AND e1 IS NOT NULL THEN
      INSERT INTO public.rental_contracts (business_id, vehicle_id, rental_direction, customer_id, external_owner_id, rental_start_datetime, rental_end_datetime, rate, total_amount, amount_paid, remaining_amount, financial_status, operational_status, location)
      VALUES
        (bid, v1, 'OUTGOING', c1, NULL, (td || ' 08:00:00')::TIMESTAMPTZ, (td || ' 08:00:00')::TIMESTAMPTZ + INTERVAL '5 days', 150000, 750000, 300000, 450000, 'PARTIAL', 'ACTIVE', 'Nyamirambo Road Expansion'),
        (bid, v2, 'INCOMING', NULL, e1, (td || ' 08:00:00')::TIMESTAMPTZ, (td || ' 08:00:00')::TIMESTAMPTZ + INTERVAL '5 days', 200000, 1000000, 500000, 500000, 'PARTIAL', 'ACTIVE', 'Huye-Muhanga Highway Project');
      SELECT id INTO rc1 FROM public.rental_contracts WHERE business_id = bid AND rental_direction = 'OUTGOING' LIMIT 1;
      SELECT id INTO rc2 FROM public.rental_contracts WHERE business_id = bid AND rental_direction = 'INCOMING' LIMIT 1;
      INSERT INTO public.rental_payments (business_id, rental_contract_id, amount, payment_date, mode, notes) VALUES
        (bid, rc1, 150000, td, 'BANK_TRANSFER', 'First instalment'),
        (bid, rc1, 150000, td, 'CASH', 'Second instalment'),
        (bid, rc2, 250000, td, 'MOBILE_MONEY', 'Advance payment'),
        (bid, rc2, 250000, td, 'BANK_TRANSFER', 'Second instalment');
      UPDATE public.fleet_vehicles SET current_status = 'RENTED_OUT' WHERE id = v1;
      UPDATE public.fleet_vehicles SET current_status = 'RENTED_IN' WHERE id = v2;
    END IF;
  END IF;
END $$;
