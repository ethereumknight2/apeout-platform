import React, { useState, useEffect } from "react";

interface TrendingToken {
  rank: number;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  emoji: string;
}

const TrendingTicker: React.FC = () => {
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock trending tokens data
    const mockTrending: TrendingToken[] = [
      {
        rank: 1,
        name: "PEPE KING",
        symbol: "PEPEK",
        price: 0.000234,
        change24h: 156.7,
        volume24h: 234000,
        marketCap: 2340000,
        emoji: "👑",
      },
      {
        rank: 2,
        name: "DOGE BOSS",
        symbol: "DOGEBOSS",
        price: 0.000089,
        change24h: 89.3,
        volume24h: 156000,
        marketCap: 1560000,
        emoji: "🐕",
      },
      {
        rank: 3,
        name: "MOON APE",
        symbol: "MOONAPE",
        price: 0.000145,
        change24h: 67.8,
        volume24h: 145000,
        marketCap: 1450000,
        emoji: "🌙",
      },
      {
        rank: 4,
        name: "CHAD COIN",
        symbol: "CHAD",
        price: 0.000067,
        change24h: 45.2,
        volume24h: 89000,
        marketCap: 890000,
        emoji: "💪",
      },
      {
        rank: 5,
        name: "ROCKET DOG",
        symbol: "RDOG",
        price: 0.000123,
        change24h: 34.5,
        volume24h: 67000,
        marketCap: 670000,
        emoji: "🚀",
      },
      {
        rank: 6,
        name: "FIRE CAT",
        symbol: "FCAT",
        price: 0.000045,
        change24h: 28.9,
        volume24h: 45000,
        marketCap: 450000,
        emoji: "🔥",
      },
      {
        rank: 7,
        name: "SPACE FROG",
        symbol: "SFROG",
        price: 0.000078,
        change24h: 23.4,
        volume24h: 34000,
        marketCap: 340000,
        emoji: "🐸",
      },
      {
        rank: 8,
        name: "DIAMOND HANDS",
        symbol: "DIAMOND",
        price: 0.000056,
        change24h: 19.7,
        volume24h: 28000,
        marketCap: 280000,
        emoji: "💎",
      },
      {
        rank: 9,
        name: "BULL RUN",
        symbol: "BULL",
        price: 0.000034,
        change24h: 15.6,
        volume24h: 23000,
        marketCap: 230000,
        emoji: "🐂",
      },
      {
        rank: 10,
        name: "LAMBO COIN",
        symbol: "LAMBO",
        price: 0.000029,
        change24h: 12.3,
        volume24h: 19000,
        marketCap: 190000,
        emoji: "🏎️",
      },
    ];

    setTimeout(() => {
      setTrendingTokens(mockTrending);
      setLoading(false);
    }, 500);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num.toFixed(0)}`;
  };

  const formatPrice = (price: number): string => {
    return `${price.toFixed(6)}`;
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const handleTokenClick = (token: TrendingToken) => {
    // TODO: Navigate to token page or open chart
    console.log(`Clicked on ${token.symbol}`);
    alert(
      `You clicked on ${token.name} (${token.symbol})\n\nThis would normally open the token chart or details page.`
    );
  };

  if (loading) {
    return (
      <div className="trending-ticker loading">
        <div className="ticker-loading">
          <div className="loading-spinner"></div>
          <span>Loading trending tokens...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="trending-ticker">
      <div className="ticker-label">
        <span className="ticker-icon">🔥</span>
        <span>TRENDING</span>
      </div>

      <div className="ticker-container">
        <div className="ticker-track">
          {/* Duplicate tokens for seamless loop */}
          {[...trendingTokens, ...trendingTokens].map((token, index) => (
            <div
              key={`${token.rank}-${index}`}
              className="ticker-item"
              onClick={() => handleTokenClick(token)}
            >
              <div className="ticker-rank">#{token.rank}</div>

              <div className="ticker-token">
                <span className="ticker-emoji">{token.emoji}</span>
                <div className="ticker-info">
                  <span className="ticker-symbol">${token.symbol}</span>
                  <span className="ticker-name">{token.name}</span>
                </div>
              </div>

              <div className="ticker-stats">
                <span className="ticker-price">{formatPrice(token.price)}</span>
                <span
                  className={`ticker-change ${token.change24h >= 0 ? "positive" : "negative"}`}
                >
                  {formatChange(token.change24h)}
                </span>
              </div>

              <div className="ticker-volume">
                <span className="ticker-volume-label">Vol:</span>
                <span className="ticker-volume-value">
                  {formatNumber(token.volume24h)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingTicker;
