import React, { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import SwapInterface from "./SwapInterface";

interface TokenDetailPageProps {
  tokenId: string;
  onBack: () => void;
}

interface TokenDetail {
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
  progress: number;
  replies: number;
  website?: string;
  twitter?: string;
  telegram?: string;
}

interface Holder {
  address: string;
  balance: number;
  percentage: number;
}

interface Comment {
  id: string;
  user: string;
  message: string;
  timestamp: number;
  likes: number;
}

const TokenDetailPage: React.FC<TokenDetailPageProps> = ({
  tokenId,
  onBack,
}) => {
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"trade" | "holders" | "comments">(
    "trade"
  );
  const [holders, setHolders] = useState<Holder[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock token data - replace with real API call
    const mockToken: TokenDetail = {
      id: tokenId,
      name: "Pepe the Based",
      symbol: "BASEDPEPE",
      description:
        "The most based Pepe on Solana. Built different. 🐸\n\nThis is the ultimate meme coin for true believers. Join the based revolution!",
      image: "🐸",
      creator: "7xKXt...9mPs",
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      price: 0.000045,
      marketCap: 45000,
      volume24h: 12500,
      holders: 234,
      change24h: 156.7,
      createdAt: Date.now() - 3600000,
      lastTrade: Date.now() - 180000,
      isLive: true,
      progress: 23,
      replies: 47,
      website: "https://basedpepe.com",
      twitter: "https://twitter.com/basedpepe",
      telegram: "https://t.me/basedpepe",
    };

    const mockHolders: Holder[] = [
      { address: "7xKXt...9mPs", balance: 50000000, percentage: 21.4 },
      { address: "8yNXz...4kLm", balance: 25000000, percentage: 10.7 },
      { address: "9zMKa...7nQp", balance: 18000000, percentage: 7.7 },
      { address: "6vBKt...2mNs", balance: 15000000, percentage: 6.4 },
      { address: "5tCJr...8pLx", balance: 12000000, percentage: 5.1 },
      { address: "4sHGm...1qWv", balance: 10000000, percentage: 4.3 },
      { address: "3rFDn...6yTz", balance: 8000000, percentage: 3.4 },
      { address: "2qECl...5xSy", balance: 6000000, percentage: 2.6 },
      { address: "1pDBk...4wRx", balance: 5000000, percentage: 2.1 },
      { address: "0oBCj...3vQw", balance: 4000000, percentage: 1.7 },
    ];

    const mockComments: Comment[] = [
      {
        id: "1",
        user: "7xKXt...9mPs",
        message: "LFG! This is going to the moon! 🚀",
        timestamp: Date.now() - 300000,
        likes: 12,
      },
      {
        id: "2",
        user: "8yNXz...4kLm",
        message: "Based dev, strong community. Diamond hands! 💎",
        timestamp: Date.now() - 600000,
        likes: 8,
      },
      {
        id: "3",
        user: "9zMKa...7nQp",
        message: "Just aped in with 5 SOL. This is the one!",
        timestamp: Date.now() - 900000,
        likes: 15,
      },
    ];

    setTimeout(() => {
      setToken(mockToken);
      setHolders(mockHolders);
      setComments(mockComments);
      setLoading(false);
    }, 1000);
  }, [tokenId]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: "You",
      message: newComment,
      timestamp: Date.now(),
      likes: 0,
    };

    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  if (loading) {
    return (
      <div className="token-detail-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading token details...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="token-detail-page">
        <div className="error-state">
          <p>Token not found</p>
          <button onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="token-detail-page">
      {/* Header */}
      <div className="token-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Discovery
        </button>

        <div className="token-title-section">
          <div className="token-avatar-large">
            <span className="token-emoji-large">{token.image}</span>
          </div>

          <div className="token-main-info">
            <div className="token-name-row">
              <h1>{token.name}</h1>
              <span className="token-symbol-large">${token.symbol}</span>
              {token.isLive && <span className="live-badge">🟢 LIVE</span>}
            </div>

            <div className="token-creator-info">
              <span>Created by {token.creator}</span>
              <span className="created-time">
                {formatTimeAgo(token.createdAt)}
              </span>
            </div>

            <div className="social-links">
              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  🌐 Website
                </a>
              )}
              {token.twitter && (
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  🐦 Twitter
                </a>
              )}
              {token.telegram && (
                <a
                  href={token.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  📱 Telegram
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="token-stats-header">
          <div className="stat-large">
            <span className="stat-label">Price</span>
            <span className="stat-value">${token.price.toFixed(8)}</span>
          </div>
          <div className="stat-large">
            <span className="stat-label">24h Change</span>
            <span
              className={`stat-value ${token.change24h >= 0 ? "positive" : "negative"}`}
            >
              {token.change24h >= 0 ? "+" : ""}
              {token.change24h.toFixed(1)}%
            </span>
          </div>
          <div className="stat-large">
            <span className="stat-label">Market Cap</span>
            <span className="stat-value">${formatNumber(token.marketCap)}</span>
          </div>
          <div className="stat-large">
            <span className="stat-label">Volume 24h</span>
            <span className="stat-value">${formatNumber(token.volume24h)}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="token-description-section">
        <h3>About {token.name}</h3>
        <p>{token.description}</p>
      </div>

      {/* Progress Bar */}
      <div className="bonding-curve-section">
        <div className="progress-header">
          <h3>Bonding Curve Progress</h3>
          <span className="progress-percentage">{token.progress}%</span>
        </div>
        <div className="progress-bar-large">
          <div
            className="progress-fill-large"
            style={{ width: `${token.progress}%` }}
          />
        </div>
        <p className="progress-description">
          When the curve reaches 100%, all LP tokens will be deposited into the
          liquidity pool.
        </p>
      </div>

      {/* Main Content Tabs */}
      <div className="content-tabs">
        <div className="tab-navigation-detail">
          <button
            className={`tab-btn ${activeTab === "trade" ? "active" : ""}`}
            onClick={() => setActiveTab("trade")}
          >
            🔄 Trade
          </button>
          <button
            className={`tab-btn ${activeTab === "holders" ? "active" : ""}`}
            onClick={() => setActiveTab("holders")}
          >
            👥 Holders ({token.holders})
          </button>
          <button
            className={`tab-btn ${activeTab === "comments" ? "active" : ""}`}
            onClick={() => setActiveTab("comments")}
          >
            💬 Comments ({token.replies})
          </button>
        </div>

        <div className="tab-content-detail">
          {activeTab === "trade" && (
            <div className="trade-section">
              <SwapInterface
                tokenMint={new PublicKey(token.mint)}
                tokenSymbol={token.symbol}
                tokenName={token.name}
                tokenPrice={token.price}
                className="token-detail-swap"
              />
            </div>
          )}

          {activeTab === "holders" && (
            <div className="holders-section">
              <div className="holders-table">
                <div className="table-header">
                  <span>Rank</span>
                  <span>Address</span>
                  <span>Balance</span>
                  <span>Percentage</span>
                </div>
                {holders.map((holder, index) => (
                  <div key={holder.address} className="holder-row">
                    <span className="rank">#{index + 1}</span>
                    <span className="address">{holder.address}</span>
                    <span className="balance">
                      {formatNumber(holder.balance)}
                    </span>
                    <span className="percentage">
                      {holder.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="comments-section">
              <div className="comment-input">
                <textarea
                  placeholder="Share your thoughts about this token..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <button
                  className="comment-submit"
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                >
                  Post Comment
                </button>
              </div>

              <div className="comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-user">{comment.user}</span>
                      <span className="comment-time">
                        {formatTimeAgo(comment.timestamp)}
                      </span>
                    </div>
                    <p className="comment-message">{comment.message}</p>
                    <div className="comment-actions">
                      <button className="like-button">
                        👍 {comment.likes}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenDetailPage;
