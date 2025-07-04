import React, { useEffect, useState } from "react";

interface TokenData {
  name: string;
  symbol: string;
  volume: number;
  holders: number;
  price?: number;
  change24h?: number;
  marketCap?: number;
}

const TrendingTokenLeaderboard: React.FC = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call with more realistic data
    const fetchTrendingTokens = async () => {
      setLoading(true);

      // Mock data - in production, this would come from your API
      const mockTokens: TokenData[] = [
        {
          name: "APEOUT",
          symbol: "APEOUT",
          volume: 3400,
          holders: 780,
          price: 0.045,
          change24h: 15.7,
          marketCap: 450000,
        },
        {
          name: "FROGAPE",
          symbol: "FROG",
          volume: 2100,
          holders: 642,
          price: 0.023,
          change24h: -3.2,
          marketCap: 230000,
        },
        {
          name: "MOONZ",
          symbol: "MOONZ",
          volume: 1980,
          holders: 705,
          price: 0.078,
          change24h: 8.9,
          marketCap: 780000,
        },
        {
          name: "CHAOS",
          symbol: "CHAOS",
          volume: 1450,
          holders: 503,
          price: 0.012,
          change24h: -1.5,
          marketCap: 120000,
        },
        {
          name: "XKONG",
          symbol: "XKONG",
          volume: 1230,
          holders: 499,
          price: 0.034,
          change24h: 22.4,
          marketCap: 340000,
        },
      ];

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setTokens(mockTokens);
      setLoading(false);
    };

    fetchTrendingTokens();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPrice = (price: number): string => {
    return price < 0.01 ? price.toFixed(6) : price.toFixed(4);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeColor = (change: number): string => {
    return change >= 0 ? "#10b981" : "#ef4444";
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "🏅";
    }
  };

  if (loading) {
    return (
      <div className="leaderboard">
        <div className="loading-state">
          <p>Loading trending tokens...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <p className="update-time">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      <div className="table-container">
        <table className="tokens-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Token</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Volume (SOL)</th>
              <th>Holders</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, i) => (
              <tr key={token.symbol} className="token-row">
                <td className="rank-cell">
                  <span className="rank-icon">{getRankIcon(i + 1)}</span>
                  <span className="rank-number">#{i + 1}</span>
                </td>

                <td className="token-cell">
                  <div className="token-info">
                    <strong className="token-name">{token.name}</strong>
                    <span className="token-symbol">{token.symbol}</span>
                  </div>
                </td>

                <td className="price-cell">
                  {token.price ? `$${formatPrice(token.price)}` : "N/A"}
                </td>

                <td className="change-cell">
                  {token.change24h ? (
                    <span
                      className="change-value"
                      style={{ color: getChangeColor(token.change24h) }}
                    >
                      {formatChange(token.change24h)}
                    </span>
                  ) : (
                    "N/A"
                  )}
                </td>

                <td className="volume-cell">◎{formatNumber(token.volume)}</td>

                <td className="holders-cell">{formatNumber(token.holders)}</td>

                <td className="marketcap-cell">
                  {token.marketCap
                    ? `$${formatNumber(token.marketCap)}`
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="leaderboard-footer">
        <p className="disclaimer">
          * Volume and price data refreshed every 5 minutes
        </p>
        <div className="trending-stats">
          <span className="stat">
            Total Volume: ◎
            {formatNumber(tokens.reduce((sum, token) => sum + token.volume, 0))}
          </span>
          <span className="stat">Active Tokens: {tokens.length}</span>
        </div>
      </div>
    </div>
  );
};

export default TrendingTokenLeaderboard;
