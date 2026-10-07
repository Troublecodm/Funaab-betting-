import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const ADMIN_EMAIL = "admin@funaab.local";
const ADMIN_PASSWORD = "AdminPass123!";
const ADMIN_NAME = "FUNAAB League Admin";

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const { data: existingAdmin, error: findError } = await supabase
      .from("users")
      .select("id, name, email, role, balance")
      .eq("email", ADMIN_EMAIL)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (existingAdmin) {
      const { data: admin, error: updateError } = await supabase
        .from("users")
        .update({
          name: ADMIN_NAME,
          password: passwordHash,
          role: "admin",
        })
        .eq("id", existingAdmin.id)
        .select("id, name, email, role, balance")
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log("Admin account updated:");
      console.log(admin);
      return;
    }

    const { data: admin, error: insertError } = await supabase
      .from("users")
      .insert({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: passwordHash,
        role: "admin",
        balance: 1000,
      })
      .select("id, name, email, role, balance")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    await supabase.from("transactions").insert({
      user_id: admin.id,
      type: "welcome",
      amount: 1000,
      description: "Admin account starting balance",
    });

    console.log("Admin account created:");
    console.log(admin);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  }
}

seedAdmin();
