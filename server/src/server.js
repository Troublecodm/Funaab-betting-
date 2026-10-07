import transactionRoutes from "./routes/transactions.js";
import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import matchRoutes from "./routes/matches.js";
import betRoutes from "./routes/bets.js";
import leaderboardRoutes from "./routes/leaderboard.js";

const app = express();

const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ?.split(",")
      .map((value) => value.trim()) || true,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);
app.use("/api/transactions", transactionRoutes);
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "funaab-league-api",
    message: "FUNAAB League API is running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "funaab-league-api",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      return res.status(500).json({
        ok: false,
        database: false,
        error: error.message,
      });
    }

    res.json({
      ok: true,
      database: true,
      message: "FUNAAB League API and Supabase are connected",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: false,
      error: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/bets", betRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    message: "Internal server error.",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FUNAAB League API running on port ${PORT}`);
});
