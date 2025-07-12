import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLPClaim, LPClaimInfo } from "../services/lpClaimService";

// Remove unused props since the component now fetches its own data
const EnhancedLPClaim: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const lpClaimService = useLPClaim();
  
  const [lpClaims, setLpClaims] = useState<LPClaimInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "claimable" | "claimed">("claimable");

  useEffect(() => {
    if (connected) {
      loadLPClaims();
    }
  }, [connected]);

  const loadLPClaims = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("💰 Loading LP claim data...");
      const claims = await lpClaimService.getClaimableRewards();
      setLpClaims(claims);
      
      console.log(`✅ Found ${claims.length} LP claims`);
    } catch (err) {
      console.error("❌ Error loading LP claims:", err);
      setError(err instanceof Error ? err.message : "Failed to load LP claims");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimLP = async (claim: LPClaimInfo) => {
    if (!claim.isClaimable || claim.alreadyClaimed) return;

    setProcessing(prev => new Set(prev).add(claim.tokenMint));
    setError("");
    
    try {
      console.log(`💰 Claiming LP for ${claim.tokenSymbol}...`);
      
      const result = await lpClaimService.claimLPRewards(
        claim.tokenMint,
        claim.userTokenBalanceAtDeath,
        claim.totalSupplyAtDeath
      );
      
      if (result.success) {
        console.log("✅ LP claim successful:", result.signature);
        console.log(`💰 Claimed: ${result.solClaimed?.toFixed(4)} SOL + ${result.tokensClaimed?.toFixed(2)} tokens`);
        
        // Refresh claims data
        await loadLPClaims();
      } else {
        throw new Error(result.error || "LP claim failed");
      }
    } catch (err) {
      console.error("❌ LP claim failed:", err);
      setError(err instanceof Error ? err.message : "LP claim failed");
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(claim.tokenMint);
        return newSet;
      });
    }
  };

  const filteredClaims = lpClaims.filter(claim => {
    switch (filter) {
      case "claimable":
        return claim.isClaimable && !claim.alreadyClaimed;
      case "claimed":
        return claim.alreadyClaimed;
      default:
        return true;
    }
  });

  const totalClaimableSOL = lpClaims
    .filter(claim => claim.isClaimable && !claim.alreadyClaimed)
    .reduce((sum, claim) => sum + claim.estimatedSolReward, 0);

  const formatTimeRemaining = (timestamp: number) => {
    const now = Date.now() / 1000;
    const remaining = timestamp - now;
    
    if (remaining <= 0) return "Expired";
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <div className="lp-claim-container loading">
        <h3>💰 Claim LP Rewards</h3>
        <div className="loading-spinner"></div>
        <p>Loading LP claim data...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="lp-claim-container">
        <h3>💰 Claim LP Rewards</h3>
        <div className="connect-prompt">
          <p>Please connect your wallet to check LP claims.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-claim-container enhanced">
      <div className="claim-header">
        <h3>💰 Claim LP Rewards</h3>
        <div className="header-actions">
          <button onClick={loadLPClaims} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError("")} className="error-close">✕</button>
        </div>
      )}

      {/* Summary */}
      <div className="claim-summary">
        <div className="summary-card">
          <div className="summary-title">💀 Dead Token LP Claims</div>
          <div className="summary-value">
            {totalClaimableSOL.toFixed(4)} SOL
          </div>
          <div className="summary-subtitle">
            {lpClaims.filter(c => c.isClaimable && !c.alreadyClaimed).length} claimable
          </div>
        </div>

        <div className="summary-info">
          <h4>ℹ️ How LP Claims Work</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">💀</span>
              <div>
                <strong>Token Death</strong>
                <p>When tokens die, LP is redistributed to holders</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📊</span>
              <div>
                <strong>Proportional Share</strong>
                <p>Your share based on holdings at death</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">⏰</span>
              <div>
                <strong>7-Day Window</strong>
                <p>Claims expire after 7 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === "claimable" ? "active" : ""}`}
          onClick={() => setFilter("claimable")}
        >
          🎁 Claimable ({lpClaims.filter(c => c.isClaimable && !c.alreadyClaimed).length})
        </button>
        <button
          className={`filter-tab ${filter === "claimed" ? "active" : ""}`}
          onClick={() => setFilter("claimed")}
        >
          ✅ Claimed ({lpClaims.filter(c => c.alreadyClaimed).length})
        </button>
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          📋 All ({lpClaims.length})
        </button>
      </div>

      {/* Claims List */}
      <div className="claims-list">
        {filteredClaims.length === 0 ? (
          <div className="empty-state">
            {filter === "claimable" ? (
              <>
                <h4>No LP Claims Available</h4>
                <p>You'll see claimable LP rewards here when tokens you held become dead.</p>
              </>
            ) : filter === "claimed" ? (
              <>
                <h4>No Claims Made Yet</h4>
                <p>Your claimed LP rewards will appear here.</p>
              </>
            ) : (
              <>
                <h4>No LP Claims Found</h4>
                <p>You haven't held any tokens that have died yet.</p>
              </>
            )}
          </div>
        ) : (
          filteredClaims.map(claim => (
            <div key={claim.tokenMint} className={`claim-card ${claim.alreadyClaimed ? "claimed" : "claimable"}`}>
              <div className="claim-header">
                <div className="token-info">
                  <div className="token-avatar">
                    <span className="token-fallback">💀</span>
                  </div>
                  <div className="token-details">
                    <h4>{claim.tokenName}</h4>
                    <div className="token-symbol">{claim.tokenSymbol}</div>
                    <div className="token-mint">
                      {claim.tokenMint.slice(0, 8)}...{claim.tokenMint.slice(-8)}
                    </div>
                  </div>
                </div>

                <div className="claim-status">
                  {claim.alreadyClaimed ? (
                    <span className="status-badge claimed">✅ Claimed</span>
                  ) : claim.isClaimable ? (
                    <span className="status-badge claimable">🎁 Claimable</span>
                  ) : (
                    <span className="status-badge expired">⏰ Expired</span>
                  )}
                </div>
              </div>

              <div className="claim-details">
                <div className="detail-row">
                  <span className="detail-label">Death Date:</span>
                  <span className="detail-value">
                    {new Date(claim.deathTimestamp * 1000).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Your Balance at Death:</span>
                  <span className="detail-value">
                    {claim.userTokenBalanceAtDeath.toLocaleString()} tokens
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Total Supply at Death:</span>
                  <span className="detail-value">
                    {claim.totalSupplyAtDeath.toLocaleString()} tokens
                  </span>
                </div>

                <div className="detail-row reward-row">
                  <span className="detail-label">Estimated Rewards:</span>
                  <div className="reward-breakdown">
                    <div className="reward-item">
                      <span className="reward-amount">{claim.estimatedSolReward.toFixed(4)} SOL</span>
                    </div>
                    <div className="reward-item">
                      <span className="reward-amount">{claim.estimatedTokenReward.toFixed(2)} {claim.tokenSymbol}</span>
                    </div>
                  </div>
                </div>

                {claim.isClaimable && !claim.alreadyClaimed && (
                  <div className="detail-row">
                    <span className="detail-label">Claim Deadline:</span>
                    <span className="detail-value deadline">
                      {formatTimeRemaining(claim.claimDeadline)}
                    </span>
                  </div>
                )}
              </div>

              {claim.isClaimable && !claim.alreadyClaimed && (
                <div className="claim-actions">
                  <button
                    onClick={() => handleClaimLP(claim)}
                    disabled={processing.has(claim.tokenMint)}
                    className="claim-btn"
                  >
                    {processing.has(claim.tokenMint) ? (
                      <>
                        <div className="btn-spinner"></div>
                        Claiming...
                      </>
                    ) : (
                      <>
                        💰 Claim {claim.estimatedSolReward.toFixed(4)} SOL
                      </>
                    )}
                  </button>
                </div>
              )}

              {claim.alreadyClaimed && (
                <div className="claim-actions">
                  <div className="claimed-info">
                    <span className="claimed-text">✅ Successfully claimed rewards</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Additional Info */}
      <div className="additional-info">
        <div className="info-section">
          <h4>💡 LP Distribution Details</h4>
          <div className="distribution-breakdown">
            <div className="distribution-item">
              <span className="percentage">80%</span>
              <span className="description">Distributed to token holders (that's you!)</span>
            </div>
            <div className="distribution-item">
              <span className="percentage">20%</span>
              <span className="description">Platform treasury fee</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h4>⚠️ Important Notes</h4>
          <ul className="info-list">
            <li>Claims are based on your token balance at the time of death</li>
            <li>You have 7 days from death to claim your rewards</li>
            <li>Unclaimed rewards are forfeited after the deadline</li>
            <li>Claims include both SOL and remaining tokens from the LP</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLPClaim;