import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function formatMatch(match) {
  return {
    _id: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    kickoff: match.match_date,
    odds: {
      home: Number(match.home_odds),
      draw: Number(match.draw_odds),
      away: Number(match.away_odds),
    },
    status: match.status,
    result: match.result,
    createdAt: match.created_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: error.message,
      });
    }

    res.json({
      matches: data.map(formatMatch),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      homeTeam,
      awayTeam,
      kickoff,
      odds,
    } = req.body;

    if (
      !homeTeam ||
      !awayTeam ||
      !kickoff ||
      !odds ||
      !odds.home ||
      !odds.draw ||
      !odds.away
    ) {
      return res.status(400).json({
        message: "All match fields are required.",
      });
    }

    const kickoffDate = new Date(kickoff);

    if (Number.isNaN(kickoffDate.getTime())) {
      return res.status(400).json({
        message: "Invalid kickoff date.",
      });
    }

    const homeOdds = Number(odds.home);
    const drawOdds = Number(odds.draw);
    const awayOdds = Number(odds.away);

    if (
      !Number.isFinite(homeOdds) ||
      !Number.isFinite(drawOdds) ||
      !Number.isFinite(awayOdds) ||
      homeOdds < 1.01 ||
      drawOdds < 1.01 ||
      awayOdds < 1.01
    ) {
      return res.status(400).json({
        message: "Invalid odds.",
      });
    }

    const { data, error } = await supabase
      .from("matches")
      .insert({
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        match_date: kickoffDate.toISOString(),
        home_odds: homeOdds,
        draw_odds: drawOdds,
        away_odds: awayOdds,
        status: "upcoming",
      })
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(201).json({
      match: formatMatch(data),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["upcoming", "live"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status.",
      });
    }

    const { data, error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        message: "Match not found.",
      });
    }

    res.json({
      match: formatMatch(data),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
