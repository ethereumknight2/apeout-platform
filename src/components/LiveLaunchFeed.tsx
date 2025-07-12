import React, { useEffect, useState } from "react";

interface LaunchToken {
  emoji: string;
  name: string;
  time: string;
  status?: "hot" | "new" | "trending";
}

const LiveLaunchFeed: React.FC = () => {
  const [tokens, setTokens] = useState<LaunchToken[]>([
    { emoji: "🐸", name: "$ZOG", time: "1m ago", status: "hot" },
    { emoji: "🍌", name: "$NANA", time: "3m ago", status: "trending" },
    { emoji: "💀", name: "$GRIM", time: "6m ago", status: "new" },
    { emoji: "🚀", name: "$MOON", time: "8m ago", status: "hot" },
    { emoji: "🔥", name: "$FIRE", time: "12m ago", status: "trending" },
    { emoji: "⚡", name: "$BOLT", time: "15m ago", status: "new" },
    { emoji: "🎯", name: "$BULL", time: "18m ago", status: "hot" },
    { emoji: "🦄", name: "$CORN", time: "21m ago", status: "trending" },
  ]);

  const [isScrolling, setIsScrolling] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isScrolling) {
        const emojis = [
          "🔥",
          "⚡",
          "🚀",
          "🎯",
          "🦄",
          "🌟",
          "💎",
          "🌙",
          "🐸",
          "🍌",
          "🎰",
          "🎪",
          "🎨",
          "🎭",
        ];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const randomName = `$${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const status =
          Math.random() > 0.7
            ? "hot"
            : Math.random() > 0.4
              ? "trending"
              : "new";

        setTokens((prev) =>
          [
            {
              emoji: randomEmoji,
              name: randomName,
              time: "just now",
              status: status as "hot" | "new" | "trending",
            },
            ...prev,
          ].slice(0, 12)
        ); // Keep only latest 12 tokens
      }
    }, 8000); // New token every 8 seconds

    return () => clearInterval(interval);
  }, [isScrolling]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "hot":
        return "text-red-400";
      case "trending":
        return "text-yellow-400";
      case "new":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "hot":
        return "🔥";
      case "trending":
        return "📈";
      case "new":
        return "✨";
      default:
        return "•";
    }
  };

  return (
    <div
      className="live-launch-feed"
      onMouseEnter={() => setIsScrolling(false)}
      onMouseLeave={() => setIsScrolling(true)}
    >
      <div className="feed-header">
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span className="live-text">LIVE LAUNCHES</span>
        </div>
        <div className="feed-controls">
          <button
            className={`pause-btn ${!isScrolling ? "active" : ""}`}
            onClick={() => setIsScrolling(!isScrolling)}
          >
            {isScrolling ? "⏸️" : "▶️"}
          </button>
        </div>
      </div>

      <div className="feed-content">
        <div
          className={`token-scroll ${isScrolling ? "animate-scroll" : "paused"}`}
        >
          {tokens.map((token, i) => (
            <div key={`${token.name}-${i}`} className="token-item">
              <span className="token-emoji">{token.emoji}</span>
              <span className="token-name">{token.name}</span>
              <span className="token-time">{token.time}</span>
              <span className={`token-status ${getStatusColor(token.status)}`}>
                {getStatusIcon(token.status)}
              </span>
            </div>
          ))}

          {/* Duplicate for seamless scroll */}
          {tokens.map((token, i) => (
            <div key={`${token.name}-${i}-dup`} className="token-item">
              <span className="token-emoji">{token.emoji}</span>
              <span className="token-name">{token.name}</span>
              <span className="token-time">{token.time}</span>
              <span className={`token-status ${getStatusColor(token.status)}`}>
                {getStatusIcon(token.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="feed-footer">
        <span className="launch-cta">🚀 LAUNCH YOUR TOKEN NOW</span>
      </div>
    </div>
  );
};

export default LiveLaunchFeed;
