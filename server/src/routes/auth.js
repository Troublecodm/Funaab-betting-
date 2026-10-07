import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const makeToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        message: existingError.message,
      });
    }

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        role: "user",
        balance: 1000,
      })
      .select("id, name, email, role, balance, created_at")
      .single();

    if (error) {
      return res.status(500).json({
        message: error.message,
      });
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "welcome",
        amount: 1000,
        description: "Welcome bonus",
      });

    if (transactionError) {
      console.error("Welcome transaction failed:", transactionError);
    }

    res.status(201).json({
      message: "Account created successfully",
      token: makeToken(user),
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Registration failed.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        message: error.message,
      });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
      created_at: user.created_at,
    };

    res.json({
      message: "Login successful",
      token: makeToken(user),
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Login failed.",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const { data: wins } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", req.user.id)
      .eq("type", "win");

    const totalWon = (wins || []).reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    res.json({
      user: {
        ...req.user,
        totalWon,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
