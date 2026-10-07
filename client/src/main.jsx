import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const money = (n) => `${Number(n || 0).toLocaleString()} FC`;

async function api(path, options = {}) {
  const token = localStorage.getItem("funaab_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function Auth({ onAuth }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await api(
        register ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(form),
        }
      );

      localStorage.setItem("funaab_token", data.token);
      onAuth(data.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="brand">
        ⚽ FUNAAB <span>LEAGUE</span>
      </div>

      <p className="muted authIntro">
        Predict campus football. Climb the leaderboard.
      </p>

      <form onSubmit={submit} className="card form">
        <div>
          <h2>{register ? "Create account" : "Welcome back"}</h2>
          <p className="muted">
            {register
              ? "Start with 1,000 FUNAAB Coins."
              : "Login to continue predicting."}
          </p>
        </div>

        {register && (
          <input
            placeholder="Full name"
            required
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />
        )}

        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
        />

        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
        />

        {error && <div className="error">{error}</div>}

        <button className="primary" disabled={busy}>
          {busy
            ? "Please wait..."
            : register
            ? "Create account"
            : "Login"}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register
            ? "Already have an account? Login"
            : "New here? Create account"}
        </button>
      </form>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("home");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError("");

    try {
      const [matchesData, betsData, leadersData, meData, transactionsData] =
        await Promise.all([
          api("/matches"),
          api("/bets/mine"),
          api("/leaderboard"),
          api("/auth/me"),
          api("/transactions/mine"),
        ]);

      setMatches(matchesData.matches || []);
      setBets(betsData.bets || []);
      setLeaders(leadersData.users || []);
      setUser(meData.user);
      setTransactions(transactionsData.transactions || []);
    } catch (error) {
      setError(error.message);

      if (
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("expired") ||
        error.message.toLowerCase().includes("authentication")
      ) {
        localStorage.removeItem("funaab_token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("funaab_token")) {
      refresh();
    }
  }, []);

  if (!user) {
    return (
      <Auth
        onAuth={async (newUser) => {
          setUser(newUser);
          await refresh();
        }}
      />
    );
  }

  const logout = () => {
    localStorage.removeItem("funaab_token");
    setUser(null);
    setMatches([]);
    setBets([]);
    setTransactions([]);
  };

  return (
    <div className="app">
      <header>
        <div className="headerBrand">
          <strong>⚽ FUNAAB LEAGUE</strong>
          <small>Virtual Football Hub</small>
        </div>

        <div className="balance">
          🪙 {money(user.balance)}
        </div>
      </header>

      <main>
        {error && (
          <div className="error globalError">
            {error}
            <button
              className="dismiss"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="loadingBar">
            Updating your FUNAAB League data...
          </div>
        )}

        {tab === "home" && (
          <Home
            matches={matches}
            user={user}
            refresh={refresh}
            setTab={setTab}
          />
        )}

        {tab === "matches" && (
          <Matches
            matches={matches}
            refresh={refresh}
          />
        )}

        {tab === "bets" && (
          <Bets bets={bets} />
        )}

        {tab === "history" && (
          <Transactions transactions={transactions} />
        )}

        {tab === "leaders" && (
          <Leaderboard users={leaders} />
        )}

        {tab === "admin" && user.role === "admin" && (
          <Admin
            matches={matches}
            refresh={refresh}
          />
        )}

        {tab === "profile" && (
          <Profile
            user={user}
            transactions={transactions}
            logout={logout}
            setTab={setTab}
          />
        )}
      </main>

      <nav>
        {[
          ["home", "⌂", "Home"],
          ["matches", "⚽", "Matches"],
          ["bets", "🎟", "My Bets"],
          ["history", "↕", "History"],
          ["leaders", "🏆", "Leaders"],
          ...(user.role === "admin"
            ? [["admin", "⚙", "Admin"]]
            : []),
          ["profile", "●", "Profile"],
        ].map(([key, icon, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Home({ matches, user, refresh, setTab }) {
  const upcoming = matches
    .filter(
      (match) =>
        match.status === "upcoming" &&
        new Date(match.kickoff).getTime() > Date.now()
    )
    .slice(0, 3);

  return (
    <>
      <section className="hero">
        <div>
          <span className="pill">FUNAAB CAMPUS SPORTS</span>

          <h1>Predict the next winner.</h1>

          <p>
            Use FUNAAB Coins to make predictions and compete
            for the top spot.
          </p>

          <div className="heroActions">
            <button
              className="primary"
              onClick={() => setTab("matches")}
            >
              View matches
            </button>

            <button
              className="secondary"
              onClick={() => setTab("history")}
            >
              Transaction history
            </button>
          </div>
        </div>

        <div className="hero-ball">⚽</div>
      </section>

      <section className="statsGrid">
        <div className="statCard">
          <span>Wallet</span>
          <strong>{money(user.balance)}</strong>
        </div>

        <div className="statCard">
          <span>Total won</span>
          <strong>{money(user.totalWon)}</strong>
        </div>

        <div className="statCard">
          <span>Fixtures</span>
          <strong>{matches.length}</strong>
        </div>
      </section>

      <div className="sectionHead">
        <h2>Upcoming matches</h2>

        <button
          className="link"
          onClick={() => setTab("matches")}
        >
          See all
        </button>
      </div>

      {upcoming.length ? (
        <div className="grid">
          {upcoming.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
              refresh={refresh}
              user={user}
            />
          ))}
        </div>
      ) : (
        <div className="card empty">
          No upcoming matches yet.
          <br />
          Admin can add the next fixture.
        </div>
      )}
    </>
  );
}

function Matches({ matches, refresh }) {
  return (
    <>
      <div className="sectionHead">
        <div>
          <h2>All fixtures</h2>
          <p className="muted">
            Choose an outcome and stake your FUNAAB Coins.
          </p>
        </div>
      </div>

      {matches.length ? (
        <div className="grid">
          {matches.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
              refresh={refresh}
            />
          ))}
        </div>
      ) : (
        <div className="card empty">
          No fixtures available yet.
        </div>
      )}
    </>
  );
}

function MatchCard({ match, refresh }) {
  const [stake, setStake] = useState(100);
  const [busy, setBusy] = useState(false);

  const numericStake = Number(stake) || 0;

  const payouts = useMemo(
    () => ({
      home: Math.floor(numericStake * Number(match.odds.home)),
      draw: Math.floor(numericStake * Number(match.odds.draw)),
      away: Math.floor(numericStake * Number(match.odds.away)),
    }),
    [numericStake, match.odds]
  );

  const place = async (selection) => {
    if (numericStake < 10) {
      alert("Minimum stake is 10 FUNAAB Coins.");
      return;
    }

    setBusy(true);

    try {
      await api("/bets", {
        method: "POST",
        body: JSON.stringify({
          matchId: match._id,
          selection,
          stake: numericStake,
        }),
      });

      await refresh();

      alert(
        `Prediction placed successfully!\nPotential payout: ${money(
          payouts[selection]
        )}`
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  };

  const kickoffPassed =
    new Date(match.kickoff).getTime() <= Date.now();

  const unavailable =
    match.status !== "upcoming" || kickoffPassed;

  return (
    <div className="card match">
      <div className="matchTop">
        <span className={`status ${match.status}`}>
          {match.status}
        </span>

        <span>
          {new Date(match.kickoff).toLocaleString()}
        </span>
      </div>

      <h3>
        {match.homeTeam}
        <span>vs</span>
        {match.awayTeam}
      </h3>

      <div className="odds">
        {[
          ["home", "1", match.odds.home],
          ["draw", "X", match.odds.draw],
          ["away", "2", match.odds.away],
        ].map(([key, label, odd]) => (
          <button
            disabled={busy || unavailable}
            onClick={() => place(key)}
            key={key}
          >
            <b>{label}</b>
            <span>{Number(odd).toFixed(2)}</span>
          </button>
        ))}
      </div>

      {match.status === "upcoming" && (
        <div className="stake">
          <label htmlFor={`stake-${match._id}`}>
            Stake
          </label>

          <input
            id={`stake-${match._id}`}
            type="number"
            min="10"
            step="10"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />

          <span>FC</span>
        </div>
      )}

      {match.status === "upcoming" && (
        <div className="payoutPreview">
          <div>
            <span>1</span>
            <strong>{money(payouts.home)}</strong>
          </div>

          <div>
            <span>X</span>
            <strong>{money(payouts.draw)}</strong>
          </div>

          <div>
            <span>2</span>
            <strong>{money(payouts.away)}</strong>
          </div>
        </div>
      )}

      {match.status === "finished" && (
        <div className="finishedResult">
          Result:{" "}
          <strong>
            {match.result === "home"
              ? "Home win"
              : match.result === "draw"
              ? "Draw"
              : match.result === "away"
              ? "Away win"
              : "Settled"}
          </strong>
        </div>
      )}

      {kickoffPassed && match.status === "upcoming" && (
        <div className="muted smallText">
          This fixture has passed its kickoff time.
        </div>
      )}
    </div>
  );
}

function Bets({ bets }) {
  return (
    <>
      <div className="sectionHead">
        <div>
          <h2>My predictions</h2>
          <p className="muted">
            Track every prediction you have placed.
          </p>
        </div>
      </div>

      {bets.length ? (
        <div className="list">
          {bets.map((bet) => (
            <div className="card row betRow" key={bet._id}>
              <div>
                <b>
                  {bet.match?.homeTeam || "Unknown"}{" "}
                  vs{" "}
                  {bet.match?.awayTeam || "Unknown"}
                </b>

                <p className="muted">
                  {bet.prediction.toUpperCase()} @{" "}
                  {Number(bet.odds).toFixed(2)}
                  {" · "}
                  Stake {money(bet.stake)}
                </p>

                <p className="muted">
                  Potential payout:{" "}
                  <strong>
                    {money(bet.potentialWin)}
                  </strong>
                </p>
              </div>

              <strong className={`betStatus ${bet.status}`}>
                {bet.status}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">
          You haven't placed a prediction yet.
        </div>
      )}
    </>
  );
}

function Transactions({ transactions }) {
  return (
    <>
      <div className="sectionHead">
        <div>
          <h2>Transaction history</h2>
          <p className="muted">
            Every FUNAAB Coin movement in your account.
          </p>
        </div>
      </div>

      {transactions.length ? (
        <div className="list">
          {transactions.map((transaction) => {
            const positive = transaction.amount > 0;

            return (
              <div
                className="card transaction"
                key={transaction._id}
              >
                <div className="transactionIcon">
                  {positive ? "↗" : "↘"}
                </div>

                <div className="transactionInfo">
                  <b>{transaction.description}</b>

                  <span className="muted">
                    {new Date(
                      transaction.createdAt
                    ).toLocaleString()}
                  </span>
                </div>

                <strong
                  className={
                    positive
                      ? "amount positive"
                      : "amount negative"
                  }
                >
                  {positive ? "+" : ""}
                  {money(transaction.amount)}
                </strong>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          No transactions yet.
        </div>
      )}
    </>
  );
}

function Leaderboard({ users }) {
  return (
    <>
      <div className="sectionHead">
        <div>
          <h2>Top predictors</h2>
          <p className="muted">
            The FUNAAB League leaderboard.
          </p>
        </div>
      </div>

      {users.length ? (
        <div className="card table">
          {users.map((user, index) => (
            <div className="row leaderboardRow" key={user._id}>
              <div className="rank">
                <span>#{index + 1}</span>

                <div>
                  <b>{user.name}</b>
                  <p className="muted">
                    Won {money(user.totalWon)}
                  </p>
                </div>
              </div>

              <strong>{money(user.balance)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">
          No players on the leaderboard yet.
        </div>
      )}
    </>
  );
}

function Profile({
  user,
  transactions,
  logout,
  setTab,
}) {
  return (
    <>
      <div className="sectionHead">
        <h2>Profile</h2>
      </div>

      <div className="card profileCard">
        <div className="profileAvatar">
          {user.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <h2>{user.name}</h2>
        <p className="muted">{user.email}</p>

        <div className="profileBalance">
          <span>Available FUNAAB Coins</span>
          <strong>{money(user.balance)}</strong>
        </div>

        <div className="profileStats">
          <div>
            <span>Total won</span>
            <strong>{money(user.totalWon)}</strong>
          </div>

          <div>
            <span>Transactions</span>
            <strong>{transactions.length}</strong>
          </div>
        </div>

        <button
          className="secondary fullButton"
          onClick={() => setTab("history")}
        >
          View transaction history
        </button>

        <button
          className="danger fullButton"
          onClick={logout}
        >
          Log out
        </button>
      </div>
    </>
  );
}

function Admin({ matches, refresh }) {
  const [form, setForm] = useState({
    homeTeam: "",
    awayTeam: "",
    kickoff: "",
    home: "2.00",
    draw: "3.20",
    away: "3.00",
  });

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      await api("/matches", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: form.homeTeam.trim(),
          awayTeam: form.awayTeam.trim(),
          kickoff: new Date(form.kickoff).toISOString(),
          odds: {
            home: Number(form.home),
            draw: Number(form.draw),
            away: Number(form.away),
          },
        }),
      });

      setMessage("Fixture created successfully.");

      setForm({
        homeTeam: "",
        awayTeam: "",
        kickoff: "",
        home: "2.00",
        draw: "3.20",
        away: "3.00",
      });

      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const settle = async (match, result) => {
    const label =
      result === "home"
        ? "HOME WIN"
        : result === "draw"
        ? "DRAW"
        : "AWAY WIN";

    if (
      !confirm(
        `Settle ${match.homeTeam} vs ${match.awayTeam} as ${label}?`
      )
    ) {
      return;
    }

    try {
      await api(`/bets/settle/${match._id}`, {
        method: "POST",
        body: JSON.stringify({ result }),
      });

      await refresh();
      setMessage("Match settled successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const activeMatches = matches.filter(
    (match) => match.status !== "finished"
  );

  return (
    <>
      <div className="sectionHead">
        <div>
          <h2>Admin panel</h2>
          <p className="muted">
            Manage FUNAAB League fixtures and results.
          </p>
        </div>
      </div>

      <form
        className="card form"
        onSubmit={create}
      >
        <h3>Create fixture</h3>

        <input
          placeholder="Home team"
          required
          value={form.homeTeam}
          onChange={(e) =>
            setForm({
              ...form,
              homeTeam: e.target.value,
            })
          }
        />

        <input
          placeholder="Away team"
          required
          value={form.awayTeam}
          onChange={(e) =>
            setForm({
              ...form,
              awayTeam: e.target.value,
            })
          }
        />

        <label className="fieldLabel">
          Kickoff
        </label>

        <input
          type="datetime-local"
          required
          value={form.kickoff}
          onChange={(e) =>
            setForm({
              ...form,
              kickoff: e.target.value,
            })
          }
        />

        <label className="fieldLabel">
          Odds
        </label>

        <div className="odds adminOdds">
          <input
            type="number"
            min="1.01"
            step="0.01"
            value={form.home}
            onChange={(e) =>
              setForm({
                ...form,
                home: e.target.value,
              })
            }
          />

          <input
            type="number"
            min="1.01"
            step="0.01"
            value={form.draw}
            onChange={(e) =>
              setForm({
                ...form,
                draw: e.target.value,
              })
            }
          />

          <input
            type="number"
            min="1.01"
            step="0.01"
            value={form.away}
            onChange={(e) =>
              setForm({
                ...form,
                away: e.target.value,
              })
            }
          />
        </div>

        <div className="oddsLabels">
          <span>Home</span>
          <span>Draw</span>
          <span>Away</span>
        </div>

        <button
          className="primary"
          disabled={busy}
        >
          {busy ? "Creating..." : "Create match"}
        </button>

        {message && (
          <div className="muted adminMessage">
            {message}
          </div>
        )}
      </form>

      <div className="sectionHead">
        <div>
          <h3>Settle matches</h3>
          <p className="muted">
            Select the final result for an active fixture.
          </p>
        </div>
      </div>

      {activeMatches.length ? (
        activeMatches.map((match) => (
          <div
            className="card row adminMatch"
            key={match._id}
          >
            <div>
              <b>
                {match.homeTeam} vs {match.awayTeam}
              </b>

              <p className="muted">
                {match.status}
              </p>
            </div>

            <div className="adminButtons">
              <button
                onClick={() => settle(match, "home")}
              >
                1
              </button>

              <button
                onClick={() => settle(match, "draw")}
              >
                X
              </button>

              <button
                onClick={() => settle(match, "away")}
              >
                2
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="card empty">
          No active matches to settle.
        </div>
      )}
    </>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
