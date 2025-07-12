import React, { useState, useEffect } from "react";

interface DyingToken {
  name: string;
  timeLeft: string;
  emoji: string;
  status: "warning" | "critical" | "dead";
  volume: number;
  lpAmount: number;
  holders: number;
}

const DoomCountdown: React.FC = () => {
  const [tokens, setTokens] = useState<DyingToken[]>([
    {
      name: "$GRIM",
      timeLeft: "4h 12m",
      emoji: "💀",
      status: "critical",
      volume: 2.3,
      lpAmount: 45.6,
      holders: 23,
    },
    {
      name: "$COFFIN",
      timeLeft: "6h 55m",
      emoji: "🪦",
      status: "warning",
      volume: 8.7,
      lpAmount: 12.4,
      holders: 67,
    },
    {
      name: "$GHOST",
      timeLeft: "12h 33m",
      emoji: "👻",
      status: "warning",
      volume: 11.2,
      lpAmount: 89.1,
      holders: 156,
    },
    {
      name: "$SKULL",
      timeLeft: "DEAD",
      emoji: "💀",
      status: "dead",
      volume: 1.1,
      lpAmount: 234.7,
      holders: 89,
    },
  ]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());

      // Update countdown timers
      setTokens((prev) =>
        prev.map((token) => {
          if (token.status === "dead") return token;

          // Simulate countdown by reducing time randomly
          const timeMatch = token.timeLeft.match(/(\d+)h (\d+)m/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const totalMinutes = hours * 60 + minutes;

            if (totalMinutes <= 1) {
              return { ...token, timeLeft: "DEAD", status: "dead" as const };
            }

            const newTotal = totalMinutes - 1;
            const newHours = Math.floor(newTotal / 60);
            const newMinutes = newTotal % 60;

            return {
              ...token,
              timeLeft: `${newHours}h ${newMinutes}m`,
              status: newTotal < 120 ? "critical" : token.status,
            };
          }
          return token;
        })
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "warning":
        return "border-yellow-500/50 bg-yellow-900/20";
      case "critical":
        return "border-red-500/70 bg-red-900/30";
      case "dead":
        return "border-gray-500/50 bg-gray-900/40";
      default:
        return "border-gray-500/30 bg-gray-900/20";
    }
  };

  const getTimeColor = (status: string) => {
    switch (status) {
      case "warning":
        return "text-yellow-400";
      case "critical":
        return "text-red-400 animate-pulse";
      case "dead":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  const getActionButton = (token: DyingToken) => {
    if (token.status === "dead") {
      return (
        <button className="action-btn dead-btn">
          💰 Claim LP ({token.lpAmount} SOL)
        </button>
      );
    }
    return <button className="action-btn warning-btn">🔥 Save Token</button>;
  };

  const liveTokens = tokens.filter((t) => t.status !== "dead");
  const deadTokens = tokens.filter((t) => t.status === "dead");

  return (
    <div className="doom-countdown">
      <div className="doom-header">
        <h2 className="doom-title">⚠️ Token Death Watch</h2>
        <div className="doom-stats">
          <span className="stat-item">
            <span className="stat-label">Dying:</span>
            <span className="stat-value text-red-400">{liveTokens.length}</span>
          </span>
          <span className="stat-item">
            <span className="stat-label">Dead:</span>
            <span className="stat-value text-gray-400">
              {deadTokens.length}
            </span>
          </span>
          <span className="stat-item">
            <span className="stat-label">Available LP:</span>
            <span className="stat-value text-green-400">
              {deadTokens.reduce((sum, t) => sum + t.lpAmount, 0).toFixed(1)}{" "}
              SOL
            </span>
          </span>
        </div>
      </div>

      <div className="doom-content">
        {/* Dying/Warning Tokens */}
        {liveTokens.length > 0 && (
          <div className="dying-section">
            <h3 className="section-title">🔥 Dying Tokens</h3>
            <div className="token-grid">
              {liveTokens.map((token, i) => (
                <div
                  key={i}
                  className={`token-card ${getStatusColor(token.status)}`}
                >
                  <div className="token-header">
                    <span className="token-emoji">{token.emoji}</span>
                    <span className="token-name">{token.name}</span>
                    <span
                      className={`token-time ${getTimeColor(token.status)}`}
                    >
                      ⏳ {token.timeLeft}
                    </span>
                  </div>

                  <div className="token-stats">
                    <div className="stat">
                      <span className="stat-label">Volume:</span>
                      <span className="stat-value">{token.volume} SOL</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">LP Pool:</span>
                      <span className="stat-value">{token.lpAmount} SOL</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Holders:</span>
                      <span className="stat-value">{token.holders}</span>
                    </div>
                  </div>

                  <div className="token-actions">{getActionButton(token)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dead Tokens */}
        {deadTokens.length > 0 && (
          <div className="dead-section">
            <h3 className="section-title">💀 Dead Tokens - LP Available</h3>
            <div className="token-grid">
              {deadTokens.map((token, i) => (
                <div
                  key={i}
                  className={`token-card ${getStatusColor(token.status)}`}
                >
                  <div className="token-header">
                    <span className="token-emoji">{token.emoji}</span>
                    <span className="token-name">{token.name}</span>
                    <span
                      className={`token-time ${getTimeColor(token.status)}`}
                    >
                      ☠️ DEAD
                    </span>
                  </div>

                  <div className="token-stats">
                    <div className="stat">
                      <span className="stat-label">Final Volume:</span>
                      <span className="stat-value">{token.volume} SOL</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">LP to Claim:</span>
                      <span className="stat-value text-green-400">
                        {token.lpAmount} SOL
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Eligible Holders:</span>
                      <span className="stat-value">{token.holders}</span>
                    </div>
                  </div>

                  <div className="token-actions">{getActionButton(token)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoomCountdown;
