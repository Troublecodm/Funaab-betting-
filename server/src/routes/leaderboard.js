import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, balance")
      .eq("role", "user")
      .order("balance", { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({
        message: error.message,
      });
    }

    const users = (data || []).map((user) => ({
      _id: user.id,
      name: user.name,
      balance: user.balance,
      totalWon: 0,
    }));

    /*
      Calculate total winnings from the transaction history.
    */
    if (users.length) {
      const ids = users.map((user) => user._id);

      const { data: wins, error: winsError } = await supabase
        .from("transactions")
        .select("user_id, amount")
        .eq("type", "win")
        .in("user_id", ids);

      if (!winsError && wins) {
        const totals = {};

        for (const win of wins) {
          totals[win.user_id] =
            (totals[win.user_id] || 0) + Number(win.amount);
        }

        for (const user of users) {
          user.totalWon = totals[user._id] || 0;
        }
      }
    }

    res.json({
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
