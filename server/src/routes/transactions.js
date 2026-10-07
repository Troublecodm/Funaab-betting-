import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, type, amount, description, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        message: error.message,
      });
    }

    const transactions = (data || []).map((transaction) => ({
      _id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      createdAt: transaction.created_at,
    }));

    res.json({
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Could not load transaction history.",
    });
  }
});

export default router;
