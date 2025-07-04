import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

interface ProjectStatus {
  tokenMint: string;
  name: string;
  symbol: string;
  status: "Active" | "Warning" | "Dead";
  lpPool: number;
  userLPClaim: number;
  ageInDays: number;
  volume3d: number;
  lastTradeTime: number;
  athPrice: number;
  currentPrice: number;
  priceDropPercent: number;
  holders: number;
  canClaimLP: boolean;
  lpClaimDeadline?: number;
}

const ProjectStatusDashboard: React.FC = () => {
  const { publicKey, connected } = useWallet();

  const [projects, setProjects] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"All" | "Active" | "Warning" | "Dead">(
    "All"
  );
  const [claimingTokens, setClaimingTokens] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connected) {
      fetchProjectStatuses();
    }
  }, [connected]);

  const fetchProjectStatuses = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockProjects: ProjectStatus[] = [
        {
          tokenMint: "ApeOut1111111111111111111111111111111111",
          name: "ApeOut Token",
          symbol: "APEOUT",
          status: "Active",
          lpPool: 89.4,
          userLPClaim: 0,
          ageInDays: 2,
          volume3d: 156.7,
          lastTradeTime: Date.now() - 1000 * 60 * 30, // 30 minutes ago
          athPrice: 0.055,
          currentPrice: 0.045,
          priceDropPercent: 18.2,
          holders: 1247,
          canClaimLP: false,
        },
        {
          tokenMint: "DeadApe1111111111111111111111111111111111",
          name: "Dead Ape Token",
          symbol: "DAPE",
          status: "Dead",
          lpPool: 45.5,
          userLPClaim: 2.5,
          ageInDays: 8,
          volume3d: 8.2,
          lastTradeTime: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
          athPrice: 0.025,
          currentPrice: 0.002,
          priceDropPercent: 92.0,
          holders: 342,
          canClaimLP: true,
          lpClaimDeadline: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
        },
        {
          tokenMint: "WarningToken111111111111111111111111111",
          name: "Warning Token",
          symbol: "WARN",
          status: "Warning",
          lpPool: 23.8,
          userLPClaim: 0,
          ageInDays: 5,
          volume3d: 12.1,
          lastTradeTime: Date.now() - 1000 * 60 * 60 * 18, // 18 hours ago
          athPrice: 0.035,
          currentPrice: 0.008,
          priceDropPercent: 77.1,
          holders: 156,
          canClaimLP: false,
        },
      ];

      setProjects(mockProjects);
    } catch (error) {
      console.error("Failed to fetch project statuses:", error);
      setError("Failed to load project statuses");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimLP = async (project: ProjectStatus) => {
    if (!project.canClaimLP || project.userLPClaim <= 0) return;

    setClaimingTokens((prev) => new Set(prev).add(project.tokenMint));
    try {
      // Mock claim process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setError(null);
      // Refresh the data
      fetchProjectStatuses();
    } catch (error) {
      console.error("LP claim failed:", error);
      setError("Failed to claim LP rewards");
    } finally {
      setClaimingTokens((prev) => {
        const newSet = new Set(prev);
        newSet.delete(project.tokenMint);
        return newSet;
      });
    }
  };

  const filteredProjects = projects.filter(
    (project) => filter === "All" || project.status === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "#10b981";
      case "Warning":
        return "#f59e0b";
      case "Dead":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return "✅";
      case "Warning":
        return "⚠️";
      case "Dead":
        return "💀";
      default:
        return "❓";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Recently";
  };

  const formatDeadline = (timestamp: number) => {
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className="status-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading project statuses...</p>
      </div>
    );
  }

  return (
    <div className="status-dashboard">
      <div className="dashboard-header">
        <h2>🔍 Project Status Dashboard</h2>
        <p>Monitor token health and claim LP from dead projects</p>
      </div>

      <div className="filter-tabs">
        {(["All", "Active", "Warning", "Dead"] as const).map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab} (
            {projects.filter((p) => tab === "All" || p.status === tab).length})
          </button>
        ))}
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      <div className="projects-grid">
        {filteredProjects.map((project) => (
          <div
            key={project.tokenMint}
            className={`project-card ${project.status.toLowerCase()}`}
          >
            <div className="project-header">
              <div className="project-info">
                <h3>
                  {project.name} ({project.symbol})
                </h3>
                <span
                  className="status-badge"
                  style={{
                    color: getStatusColor(project.status),
                    background: `${getStatusColor(project.status)}20`,
                  }}
                >
                  {getStatusIcon(project.status)} {project.status}
                </span>
              </div>
              <div className="project-age">Age: {project.ageInDays} days</div>
            </div>

            <div className="project-stats">
              <div className="stat-row">
                <span className="stat-label">LP Pool:</span>
                <span className="stat-value">◎{project.lpPool.toFixed(2)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Volume (3d):</span>
                <span className="stat-value">
                  ◎{project.volume3d.toFixed(1)}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Last Trade:</span>
                <span className="stat-value">
                  {formatTimeAgo(project.lastTradeTime)}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Price Drop:</span>
                <span className="stat-value" style={{ color: "#ef4444" }}>
                  -{project.priceDropPercent.toFixed(1)}%
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Holders:</span>
                <span className="stat-value">{project.holders}</span>
              </div>
            </div>

            {project.status === "Dead" && (
              <div className="death-details">
                <h4>💀 Token Death Analysis</h4>
                <div className="death-reasons">
                  <div className="reason">
                    <span className="reason-icon">📉</span>
                    <span>
                      Price dropped {project.priceDropPercent}% from ATH
                    </span>
                  </div>
                  <div className="reason">
                    <span className="reason-icon">📊</span>
                    <span>Low volume: ◎{project.volume3d} (below 15 SOL)</span>
                  </div>
                  <div className="reason">
                    <span className="reason-icon">⏰</span>
                    <span>
                      No recent trades: {formatTimeAgo(project.lastTradeTime)}
                    </span>
                  </div>
                  <div className="reason">
                    <span className="reason-icon">🗓️</span>
                    <span>Age: {project.ageInDays} days (min 3 days)</span>
                  </div>
                </div>

                {project.canClaimLP && project.userLPClaim > 0 && (
                  <div className="lp-claim-section">
                    <div className="claim-info">
                      <h4>🎁 Your LP Reward</h4>
                      <div className="claim-amount">
                        <span>◎{project.userLPClaim.toFixed(4)} SOL</span>
                        <small>From your token holdings before death</small>
                      </div>
                      {project.lpClaimDeadline && (
                        <div className="claim-deadline">
                          ⏳ {formatDeadline(project.lpClaimDeadline)} to claim
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleClaimLP(project)}
                      disabled={claimingTokens.has(project.tokenMint)}
                      className="claim-lp-btn"
                    >
                      {claimingTokens.has(project.tokenMint)
                        ? "Claiming..."
                        : `Claim ◎${project.userLPClaim.toFixed(4)}`}
                    </button>
                  </div>
                )}

                {project.canClaimLP && project.userLPClaim === 0 && (
                  <div className="no-claim">
                    <p>❌ No LP to claim</p>
                    <small>
                      You didn't hold tokens before this project died
                    </small>
                  </div>
                )}
              </div>
            )}

            {project.status === "Warning" && (
              <div className="warning-details">
                <h4>⚠️ At Risk of Death</h4>
                <div className="risk-factors">
                  {project.volume3d < 15 && (
                    <div className="risk-factor">
                      📊 Low volume (below 15 SOL)
                    </div>
                  )}
                  {project.priceDropPercent > 90 && (
                    <div className="risk-factor">
                      📉 Severe price drop ({project.priceDropPercent}%)
                    </div>
                  )}
                  {Date.now() - project.lastTradeTime > 86400000 && (
                    <div className="risk-factor">⏰ No recent trades</div>
                  )}
                </div>
                <p className="warning-message">
                  This token may be marked as dead soon. Consider your position
                  carefully.
                </p>
              </div>
            )}

            {project.status === "Active" && (
              <div className="active-details">
                <h4>✅ Healthy Token</h4>
                <p>
                  This token is performing well with good volume and recent
                  activity.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="no-projects">
          <p>No projects found for the selected filter.</p>
        </div>
      )}

      <div className="dashboard-footer">
        {/* How ApeOut Works Section - Moved from swap interface */}
        <div className="how-it-works">
          <h4>ℹ️ How ApeOut Works</h4>
          <div className="info-grid">
            <div className="info-card">
              <h3>🔒 Locked Liquidity</h3>
              <p>
                All LP tokens are permanently locked. No one (including
                creators) can withdraw them.
              </p>
            </div>
            <div className="info-card">
              <h3>🔍 Death Detection</h3>
              <p>
                Tokens are automatically marked as "dead" based on volume, price
                drops, and inactivity.
              </p>
            </div>
            <div className="info-card">
              <h3>💰 Automatic Redistribution</h3>
              <p>
                When a token dies, 80% of LP goes to holders, 20% to platform
                treasury.
              </p>
            </div>
            <div className="info-card">
              <h3>⚡ Fair Distribution</h3>
              <p>
                Only wallets that held tokens before death can claim LP rewards.
              </p>
            </div>
          </div>
        </div>

        <div className="death-criteria">
          <h4>🔍 Death Detection Criteria</h4>
          <div className="criteria-grid">
            <div className="criteria-item">
              <strong>Age:</strong> Must be at least 3 days old
            </div>
            <div className="criteria-item">
              <strong>Volume:</strong> Less than 15 SOL in 3 days
            </div>
            <div className="criteria-item">
              <strong>Price:</strong> Dropped 90%+ from ATH
            </div>
            <div className="criteria-item">
              <strong>Activity:</strong> No trades for 24+ hours
            </div>
          </div>
        </div>

        <div className="lp-distribution">
          <h4>💰 LP Distribution on Death</h4>
          <div className="distribution-chart">
            <div className="distribution-item">
              <span className="percentage">80%</span>
              <span className="description">
                To token holders (proportional)
              </span>
            </div>
            <div className="distribution-item">
              <span className="percentage">20%</span>
              <span className="description">To platform treasury</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatusDashboard;
