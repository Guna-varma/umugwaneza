/**
 * Creates Umugwaneza auth users and app users (umugwaneza.users) in Supabase.
 * Run once after migrations. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage: node scripts/seed-umugwaneza-auth.js
 *
 * Creates:
 * - Business biz_001 (Umugwaneza Ltd) in umugwaneza.businesses
 * - Admin@umugwaneza.com / umugwaneza@2026 (role: SYSTEM_ADMIN, business_id: null)
 * - owner@umugwaneza.com / umugwaneza@2026 (role: OWNER, business_id: biz_001)
 *
 * Test credentials (document in README or .env.example): owner@umugwaneza.com / umugwaneza@2026
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
    const envPath = join(root, ".env");
    const content = readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim().replace(/^\uFEFF/, "");
        env[key] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    });
  } catch (_) {}
  return env;
}

const env = { ...process.env, ...loadEnv() };
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const umugwaneza = () => supabase.schema("umugwaneza");

const USERS = [
  { email: "Admin@umugwaneza.com", password: "umugwaneza@2026", role: "SYSTEM_ADMIN", business_id: null, full_name: "System Admin" },
  { email: "owner@umugwaneza.com", password: "umugwaneza@2026", role: "OWNER", business_id: "biz_001", full_name: "Owner" },
];

async function ensureBusiness() {
  const { data: existing } = await umugwaneza().from("businesses").select("id").eq("id", "biz_001").maybeSingle();
  if (existing) {
    console.log("Business biz_001 already exists.");
    return;
  }
  const { error } = await umugwaneza().from("businesses").insert({ id: "biz_001", name: "Umugwaneza Ltd", currency: "RWF" });
  if (error) {
    console.error("Failed to create business biz_001:", error.message);
    throw error;
  }
  console.log("Created business biz_001.");
}

async function main() {
  await ensureBusiness();

  for (const u of USERS) {
    const { data: existing } = await umugwaneza().from("users").select("id").eq("email", u.email).maybeSingle();
    if (existing) {
      console.log("App user already exists:", u.email);
      continue;
    }

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message && createError.message.includes("already been registered")) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers?.users?.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
        if (authUser) {
          const { error: appUserError } = await umugwaneza().from("users").insert({
            auth_user_id: authUser.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            business_id: u.business_id,
          });
          if (appUserError) console.error("App user insert error for", u.email, appUserError);
          else console.log("App user created for existing auth user:", u.email);
        }
      } else {
        console.error("Create user error for", u.email, createError);
      }
      continue;
    }

    if (!userData?.user?.id) {
      console.error("No user id returned for", u.email);
      continue;
    }

    const { error: appUserError } = await umugwaneza().from("users").insert({
      auth_user_id: userData.user.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      business_id: u.business_id,
    });
    if (appUserError) {
      console.error("App user insert error for", u.email, appUserError);
    } else {
      console.log("Created auth user and app user:", u.email, u.role);
    }
  }
  console.log("Done. Test login: owner@umugwaneza.com / umugwaneza@2026");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
