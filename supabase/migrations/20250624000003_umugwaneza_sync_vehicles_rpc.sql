-- UMUGWANEZA: Sync vehicles from public.vehicles (Hapyjo) into umugwaneza.vehicles

CREATE OR REPLACE FUNCTION umugwaneza.sync_vehicles_from_hapyjo(p_default_business_id TEXT)
RETURNS JSONB AS $$
DECLARE
  r RECORD;
  synced INT := 0;
  v_type TEXT;
  existing_id UUID;
BEGIN
  IF p_default_business_id IS NULL OR (umugwaneza.current_user_business_id() IS NULL AND umugwaneza.current_user_role() != 'SYSTEM_ADMIN') THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  FOR r IN SELECT id, type, vehicle_number_or_id FROM public.vehicles
  LOOP
    v_type := CASE WHEN LOWER(COALESCE(r.type, '')) = 'machine' THEN 'MACHINE' ELSE 'TRUCK' END;
    SELECT id INTO existing_id FROM umugwaneza.vehicles
     WHERE business_id = p_default_business_id AND hapyjo_vehicle_id = r.id::TEXT LIMIT 1;
    IF existing_id IS NOT NULL THEN
      UPDATE umugwaneza.vehicles SET
        vehicle_name = COALESCE(r.vehicle_number_or_id, 'Vehicle ' || r.id),
        vehicle_type = v_type,
        updated_at = now()
      WHERE id = existing_id;
    ELSE
      INSERT INTO umugwaneza.vehicles (
        business_id, hapyjo_vehicle_id, vehicle_name, vehicle_type,
        rental_type, ownership_type, base_rate, current_status
      )
      VALUES (
        p_default_business_id,
        r.id::TEXT,
        COALESCE(r.vehicle_number_or_id, 'Vehicle ' || r.id),
        v_type,
        'DAY',
        'OWN',
        0,
        'AVAILABLE'
      );
    END IF;
    synced := synced + 1;
  END LOOP;
  RETURN jsonb_build_object('synced', synced, 'message', 'Sync completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION umugwaneza.sync_vehicles_from_hapyjo(TEXT) TO authenticated;
