import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Place a bet
router.post("/", requireAuth, async (req, res) => {
  try {
    const { matchId, selection, stake } = req.body;

    if (!matchId) {
      return res.status(400).json({
        message: "Match ID is required.",
      });
    }

    if (!["home", "draw", "away"].includes(selection)) {
      return res.status(400).json({
        message: "Invalid prediction.",
      });
    }

    const numericStake = Number(stake);

    if (
      !Number.isInteger(numericStake) ||
      numericStake < 10
    ) {
      return res.status(400).json({
        message: "Minimum stake is 10 FC.",
      });
    }

    const { data, error } = await supabase.rpc("place_bet", {
      p_user_id: req.user.id,
      p_match_id: matchId,
      p_prediction: selection,
      p_stake: numericStake,
    });

    if (error) {
      console.error("Place bet RPC error:", error);

      return res.status(400).json({
        message: error.message || "Could not place bet.",
      });
    }

    return res.status(201).json({
      message: "Bet placed successfully.",
      bet: {
        _id: data.bet_id,
        odds: Number(data.odds),
        potentialWin: Number(data.potential_win),
      },
      balance: Number(data.balance),
    });
  } catch (error) {
    console.error("Place bet error:", error);

    return res.status(500).json({
      message: error.message || "Could not place bet.",
    });
  }
});

// Get current user's bets
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bets")
      .select(`
        id,
        prediction,
        stake,
        odds,
        potential_win,
        status,
        created_at,
        match_id,
        matches (
          id,
          home_team,
          away_team,
          match_date,
          home_odds,
          draw_odds,
          away_odds,
          status,
          result
        )
      `)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        message: error.message,
      });
    }

    const bets = (data || []).map((bet) => {
      const match = Array.isArray(bet.matches)
        ? bet.matches[0]
        : bet.matches;

      return {
        _id: bet.id,
        matchId: bet.match_id,
        prediction: bet.prediction,
        stake: Number(bet.stake),
        odds: Number(bet.odds),
        potentialWin: Number(bet.potential_win),
        status: bet.status,
        createdAt: bet.created_at,
        match: match
          ? {
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
            }
          : null,
      };
    });

    return res.json({
      bets,
    });
  } catch (error) {
    console.error("Get bets error:", error);

    return res.status(500).json({
      message: error.message || "Could not load bets.",
    });
  }
});

// Settle a match
router.post(
  "/settle/:matchId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { result } = req.body;

      if (!["home", "draw", "away"].includes(result)) {
        return res.status(400).json({
          message: "Result must be home, draw, or away.",
        });
      }

      const { data, error } = await supabase.rpc("settle_match", {
        p_match_id: matchId,
        p_result: result,
      });

      if (error) {
        console.error("Settlement RPC error:", error);

        return res.status(400).json({
          message: error.message || "Could not settle match.",
        });
      }

      return res.json({
        message: "Match settled successfully.",
        result: data,
      });
    } catch (error) {
      console.error("Settlement error:", error);

      return res.status(500).json({
        message: error.message || "Could not settle match.",
      });
    }
  }
);

export default router;
