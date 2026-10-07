import "dotenv/config";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const payload = jwt.verify(
      token,
      String(process.env.JWT_SECRET || "")
    );

    if (!payload?.userId) {
      return res.status(401).json({
        message: "Invalid session payload.",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, balance, created_at")
      .eq("id", payload.userId)
      .maybeSingle();

    if (error) {
      console.error("Auth database error:", error.message);

      return res.status(500).json({
        message: "Could not verify account.",
      });
    }

    if (!user) {
      return res.status(401).json({
        message: "Account not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification error:", {
      name: error.name,
      message: error.message,
    });

    return res.status(401).json({
      message: "Invalid or expired session.",
      error: error.name,
    });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required.",
    });
  }

  next();
}
