import React, { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";

interface Token {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator: string;
  mint: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  change24h: number;
  createdAt: number;
  lastTrade: number;
  isLive: boolean;
  progress: number; // 0-100 for bonding curve progress
  replies: number;
}

interface TokenDiscoveryProps {
  onTokenClick: (tokenId: string) => void;
}

type TabType = "new" | "trending" | "graduated";
type SortType = "created" | "marketcap" | "volume" | "lasttrade";

const TokenDiscovery: React.FC<TokenDiscoveryProps> = ({ onTokenClick }) => {
  const [activeTab, setActiveTab] = useState<TabType>("new");
  const [sortBy, setSortBy] = useState<SortType>("created");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockTokens: Token[] = [
      {
        id: "1",
        name: "Pepe the Based",
        symbol: "BASEDPEPE",
        description: "The most based Pepe on Solana. Built different. 🐸",
        image: "🐸",
        creator: "7xKXt...9mPs",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        price: 0.000045,
        marketCap: 45000,
        volume24h: 12500,
        holders: 234,
        change24h: 156.7,
        createdAt: Date.now() - 3600000, // 1 hour ago
        lastTrade: Date.now() - 180000, // 3 mins ago
        isLive: true,
        progress: 23,
        replies: 47,
      },
      {
        id: "2",
        name: "Solana Doge",
        symbol: "SOLDOGE",
        description:
          "Much wow, very Solana. The goodest boy on the blockchain.",
        image: "🐕",
        creator: "8yNXz...4kLm",
        mint: "So11111111111111111111111111111111111112",
        price: 0.000089,
        marketCap: 89000,
        volume24h: 8900,
        holders: 156,
        change24h: 78.3,
        createdAt: Date.now() - 7200000, // 2 hours ago
        lastTrade: Date.now() - 600000, // 10 mins ago
        isLive: true,
        progress: 67,
        replies: 89,
      },
      {
        id: "3",
        name: "Based Chad",
        symbol: "CHAD",
        description:
          "For the absolute chads of Solana. Only diamond hands allowed.",
        image: "💪",
        creator: "9zMKa...7nQp",
        mint: "11111111111111111111111111111112",
        price: 0.000234,
        marketCap: 234000,
        volume24h: 45600,
        holders: 567,
        change24h: 234.5,
        createdAt: Date.now() - 1800000, // 30 mins ago
        lastTrade: Date.now() - 120000, // 2 mins ago
        isLive: true,
        progress: 89,
        replies: 123,
      },
      {
        id: "4",
        name: "Ape Terminal",
        symbol: "APE",
        description: "Where apes come to trade. Built by apes, for apes.",
        image: "🦍",
        creator: "6vBKt...2mNs",
        mint: "11111111111111111111111111111112",
        price: 0.00156,
        marketCap: 1560000,
        volume24h: 234000,
        holders: 1234,
        change24h: 45.2,
        createdAt: Date.now() - 5400000, // 1.5 hours ago
        lastTrade: Date.now() - 60000, // 1 min ago
        isLive: true,
        progress: 100,
        replies: 267,
      },
      {
        id: "5",
        name: "Moon Mission",
        symbol: "MOON",
        description: "Next stop: the moon! 🚀 Buckle up, anons.",
        image: "🚀",
        creator: "5aLKj...8pMn",
        mint: "22222222222222222222222222222222",
        price: 0.000123,
        marketCap: 123000,
        volume24h: 67800,
        holders: 345,
        change24h: -12.4,
        createdAt: Date.now() - 900000, // 15 mins ago
        lastTrade: Date.now() - 300000, // 5 mins ago
        isLive: true,
        progress: 45,
        replies: 78,
      },
      {
        id: "6",
        name: "Laser Eyes",
        symbol: "LASER",
        description: "Laser eyes activated. Bitcoin maxis on Solana.",
        image: "👁️",
        creator: "4mNpQ...6kRt",
        mint: "33333333333333333333333333333333",
        price: 0.000067,
        marketCap: 67000,
        volume24h: 23400,
        holders: 189,
        change24h: 89.1,
        createdAt: Date.now() - 2700000, // 45 mins ago
        lastTrade: Date.now() - 240000, // 4 mins ago
        isLive: true,
        progress: 34,
        replies: 56,
      },
    ];

    setTimeout(() => {
      setTokens(mockTokens);
      setLoading(false);
    }, 1000);
  }, [activeTab]);

  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    switch (sortBy) {
      case "created":
        return Number(b.createdAt) - Number(a.createdAt); // Newest first
      case "marketcap":
        return Number(b.marketCap) - Number(a.marketCap); // Highest first
      case "volume":
        return Number(b.volume24h) - Number(a.volume24h); // Highest first
      case "lasttrade":
        return Number(b.lastTrade) - Number(a.lastTrade); // Most recent first
      default:
        return 0;
    }
  });

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const TabButton = ({
    tab,
    label,
    count,
  }: {
    tab: TabType;
    label: string;
    count?: number;
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`tab-button ${activeTab === tab ? "active" : ""}`}
    >
      {label}
      {count && <span className="tab-count">{count}</span>}
    </button>
  );

  const SortButton = ({ sort, label }: { sort: SortType; label: string }) => (
    <button
      onClick={() => setSortBy(sort)}
      className={`sort-button ${sortBy === sort ? "active" : ""}`}
    >
      {label}
      {sortBy === sort && <span className="sort-indicator">↓</span>}
    </button>
  );

  const TokenCard = ({ token }: { token: Token }) => (
    <div
      className="token-card"
      onClick={() => onTokenClick(token.id)}
      style={{ cursor: "pointer" }}
    >
      <div className="token-header">
        <div className="token-avatar">
          <span className="token-emoji">{token.image}</span>
        </div>
        <div className="token-info">
          <div className="token-title">
            <h3>{token.name}</h3>
            <span className="token-symbol">${token.symbol}</span>
          </div>
          <div className="token-meta">
            <span className="creator">by {token.creator}</span>
            <span className="created-time">
              {formatTimeAgo(token.createdAt)}
            </span>
          </div>
        </div>
        <div className="token-status">
          {token.isLive && <span className="live-indicator">🟢 LIVE</span>}
        </div>
      </div>

      <div className="token-description">{token.description}</div>

      <div className="token-progress">
        <div className="progress-info">
          <span>bonding curve progress: {token.progress}%</span>
          <span>{formatNumber(token.holders)} holders</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${token.progress}%` }}
          />
        </div>
      </div>

      <div className="token-stats">
        <div className="stat">
          <span className="stat-label">Market Cap</span>
          <span className="stat-value">${formatNumber(token.marketCap)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">24h Volume</span>
          <span className="stat-value">${formatNumber(token.volume24h)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Price</span>
          <span className="stat-value">{formatPrice(token.price)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">24h Change</span>
          <span
            className={`stat-value ${token.change24h >= 0 ? "positive" : "negative"}`}
          >
            {token.change24h >= 0 ? "+" : ""}
            {token.change24h.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="token-actions">
        <button
          className="buy-button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement buy functionality
            alert(
              `Buy ${token.symbol}\n\nThis would open the trading interface for ${token.name}.`
            );
          }}
        >
          Buy ${token.symbol}
        </button>
        <button
          className="chart-button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement chart functionality
            alert(
              `Chart for ${token.symbol}\n\nThis would open a price chart showing trading history.`
            );
          }}
        >
          📊 Chart
        </button>
        <button
          className="reply-button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement reply functionality
            alert(
              `Comments for ${token.symbol}\n\nThis would open the community discussion thread.`
            );
          }}
        >
          💬 {token.replies}
        </button>
      </div>

      <div className="last-trade">
        Last trade: {formatTimeAgo(token.lastTrade)}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="token-discovery">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="token-discovery">
      <div className="discovery-header">
        <h2>🚀 Discover Tokens</h2>
        <p>Find the next big thing on Solana</p>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search tokens by name, symbol, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="controls-row">
          <div className="tab-navigation">
            <TabButton tab="new" label="🆕 New" count={tokens.length} />
            <TabButton tab="trending" label="🔥 Trending" count={12} />
            <TabButton tab="graduated" label="🎓 Graduated" count={4} />
          </div>

          <div className="sort-controls">
            <span className="sort-label">Sort by:</span>
            <div className="sort-buttons">
              <SortButton sort="created" label="Creation time" />
              <SortButton sort="marketcap" label="Market cap" />
              <SortButton sort="volume" label="Volume" />
              <SortButton sort="lasttrade" label="Last trade" />
            </div>
          </div>
        </div>
      </div>

      {sortedTokens.length > 0 ? (
        <div className="tokens-grid">
          {sortedTokens.map((token) => (
            <TokenCard key={token.id} token={token} />
          ))}
        </div>
      ) : (
        <div className="no-results">
          {searchQuery ? (
            <>
              <p>No tokens found matching "{searchQuery}"</p>
              <p>
                Try searching for something else or check out the trending
                tokens!
              </p>
            </>
          ) : (
            <>
              <p>No tokens available in this category yet</p>
              <p>Check back soon for new launches!</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenDiscovery;
