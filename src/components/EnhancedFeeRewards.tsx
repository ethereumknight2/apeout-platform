import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDailyRewards, DailyRewardInfo } from "../services/dailyRewardsService";

interface EnhancedFeeRewardsProps {
  dayId: number;
}

const EnhancedFeeRewards: React.FC<EnhancedFeeRewardsProps> = ({ dayId }) => {
  const { publicKey, connected } = useWallet();
  const dailyRewardsService = useDailyRewards();
  
  const [rewardInfo, setRewardInfo] = useState<DailyRewardInfo | null>(null);
  const [weekRewards, setWeekRewards] = useState<DailyRewardInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"single" | "week">("single");

  useEffect(() => {
    if (connected) {
      loadRewardData();
    }
  }, [connected, dayId]);

  const loadRewardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log(`📅 Loading reward data for day ${dayId}...`);
      
      const [singleDayInfo, weekInfo] = await Promise.all([
        dailyRewardsService.getDayRewardInfo(dayId),
        dailyRewardsService.getLastWeekRewards()
      ]);
      
      setRewardInfo(singleDayInfo);
      setWeekRewards(weekInfo);
      
      console.log("✅ Reward data loaded successfully");
    } catch (err) {
      console.error("❌ Error loading reward data:", err);
      setError(err instanceof Error ? err.message : "Failed to load reward data");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (targetDayId: number) => {
    setProcessing(prev => new Set(prev).add(targetDayId));
    setError("");
    
    try {
      console.log(`💰 Claiming reward for day ${targetDayId}...`);
      
      const result = await dailyRewardsService.claimDayReward(targetDayId);
      
      if (result.success) {
        console.log("✅ Reward claim successful:", result.signature);
        console.log(`💰 Claimed: ${result.amountClaimed?.toFixed(4)} SOL`);
        
        // Refresh data
        await loadRewardData();
      } else {
        throw new Error(result.error || "Reward claim failed");
      }
    } catch (err) {
      console.error("❌ Reward claim failed:", err);
      setError(err instanceof Error ? err.message : "Reward claim failed");
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetDayId);
        return newSet;
      });
    }
  };

  const handleBatchClaim = async () => {
    const claimableDays = weekRewards
      .filter(reward => reward.isEligible && !reward.alreadyClaimed)
      .map(reward => reward.dayId);

    if (claimableDays.length === 0) {
      setError("No claimable rewards available");
      return;
    }

    setError("");
    
    try {
      console.log(`💰 Batch claiming ${claimableDays.length} days...`);
      
      const results = await dailyRewardsService.claimMultipleDays(claimableDays);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        console.log(`✅ Successfully claimed ${successful} rewards`);
        await loadRewardData();
      }
      
      if (failed > 0) {
        console.warn(`⚠️ ${failed} claims failed`);
      }
    } catch (err) {
      console.error("❌ Batch claim failed:", err);
      setError(err instanceof Error ? err.message : "Batch claim failed");
    }
  };

  const getTotalClaimableRewards = () => {
    return weekRewards
      .filter(reward => reward.isEligible && !reward.alreadyClaimed)
      .reduce((sum, reward) => sum + reward.rewardAmount, 0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="fee-rewards-container loading">
        <h3>🔥 Enhanced Fee Rewards</h3>
        <div className="loading-spinner"></div>
        <p>Loading reward data...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="fee-rewards-container">
        <h3>🔥 Enhanced Fee Rewards</h3>
        <div className="connect-prompt">
          <p>Please connect your wallet to check and claim trading fee rewards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fee-rewards-container enhanced">
      <div className="rewards-header">
        <h3>🔥 Enhanced Fee Rewards</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === "single" ? "active" : ""}`}
            onClick={() => setViewMode("single")}
          >
            Single Day
          </button>
          <button
            className={`toggle-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Last Week
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError("")} className="error-close">✕</button>
        </div>
      )}

      {viewMode === "single" && rewardInfo && (
        <div className="single-day-view">
          <div className="day-header">
            <div className="day-info">
              <h4>Day {rewardInfo.dayId}</h4>
              <span className="day-date">{formatDate(rewardInfo.date)}</span>
            </div>
            <div className="reward-status">
              {rewardInfo.alreadyClaimed ? (
                <span className="status-badge claimed">✅ Claimed</span>
              ) : rewardInfo.isEligible ? (
                <span className="status-badge eligible">🎁 Eligible</span>
              ) : (
                <span className="status-badge ineligible">❌ Not Eligible</span>
              )}
            </div>
          </div>

          {rewardInfo.isEligible ? (
            rewardInfo.alreadyClaimed ? (
              <div className="claimed-section">
                <div className="claimed-info">
                  <h4>✅ Reward Already Claimed</h4>
                  <div className="claimed-amount">
                    <span className="amount">{rewardInfo.rewardAmount.toFixed(4)} SOL</span>
                    <span className="label">was claimed for Day {rewardInfo.dayId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="claim-section">
                <div className="reward-calculation">
                  <h4>💰 Reward Calculation</h4>
                  <div className="calc-grid">
                    <div className="calc-item">
                      <span className="calc-label">Your Trading Activity:</span>
                      <span className="calc-value">{rewardInfo.userTokenBalance.toLocaleString()} tokens</span>
                    </div>
                    <div className="calc-item">
                      <span className="calc-label">Staking Tier:</span>
                      <span className={`calc-value tier-${rewardInfo.stakingTier.toLowerCase()}`}>
                        {rewardInfo.stakingTier} ({rewardInfo.stakingMultiplier}x)
                      </span>
                    </div>
                    <div className="calc-item total">
                      <span className="calc-label">Total Reward:</span>
                      <span className="calc-value reward-amount">
                        {rewardInfo.rewardAmount.toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                </div>

                <div className="claim-actions">
                  <button
                    onClick={() => handleClaimReward(rewardInfo.dayId)}
                    disabled={processing.has(rewardInfo.dayId)}
                    className="claim-btn single"
                  >
                    {processing.has(rewardInfo.dayId) ? (
                      <>
                        <div className="btn-spinner"></div>
                        Claiming...
                      </>
                    ) : (
                      <>
                        💰 Claim {rewardInfo.rewardAmount.toFixed(4)} SOL
                      </>
                    )}
                  </button>
                </div>

                <div className="claim-deadline">
                  <span className="deadline-label">Claim Deadline:</span>
                  <span className="deadline-value">
                    {formatDate(rewardInfo.claimDeadline)}
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="not-eligible-section">
              <div className="eligibility-info">
                <h4>❌ Not Eligible for Day {rewardInfo.dayId}</h4>
                <div className="eligibility-reasons">
                  <div className="reason-item">
                    <span className="reason-icon">💱</span>
                    <span className="reason-text">No trading activity detected on this day</span>
                  </div>
                  <div className="reason-item">
                    <span className="reason-icon">🏦</span>
                    <span className="reason-text">Higher staking increases future rewards</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="how-it-works">
            <h4>ℹ️ How Daily Rewards Work</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-icon">💱</span>
                <div>
                  <strong>Trading Required</strong>
                  <p>You must trade tokens on that day to be eligible</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">🏦</span>
                <div>
                  <strong>Staking Multipliers</strong>
                  <p>Bronze: 1.0x, Silver: 1.1x, Gold: 1.5x, Diamond: 2.0x</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">⏰</span>
                <div>
                  <strong>7-Day Window</strong>
                  <p>Claims expire 7 days after the reward day</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className="week-view">
          <div className="week-summary">
            <div className="summary-card">
              <div className="summary-title">📅 Last 7 Days Summary</div>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Claimable:</span>
                  <span className="stat-value">{getTotalClaimableRewards().toFixed(4)} SOL</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Eligible Days:</span>
                  <span className="stat-value">
                    {weekRewards.filter(r => r.isEligible && !r.alreadyClaimed).length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Already Claimed:</span>
                  <span className="stat-value">
                    {weekRewards.filter(r => r.alreadyClaimed).length}
                  </span>
                </div>
              </div>
            </div>

            {weekRewards.filter(r => r.isEligible && !r.alreadyClaimed).length > 0 && (
              <div className="batch-claim-section">
                <button
                  onClick={handleBatchClaim}
                  disabled={processing.size > 0}
                  className="batch-claim-btn"
                >
                  {processing.size > 0 ? (
                    <>
                      <div className="btn-spinner"></div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      🚀 Claim All ({getTotalClaimableRewards().toFixed(4)} SOL)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="week-rewards-list">
            {weekRewards.map(reward => (
              <div key={reward.dayId} className={`reward-card ${reward.alreadyClaimed ? 'claimed' : reward.isEligible ? 'eligible' : 'ineligible'}`}>
                <div className="reward-header">
                  <div className="day-info">
                    <span className="day-number">Day {reward.dayId}</span>
                    <span className="day-date">{formatDate(reward.date)}</span>
                  </div>
                  <div className="reward-amount">
                    {reward.isEligible ? (
                      <span className="amount">{reward.rewardAmount.toFixed(4)} SOL</span>
                    ) : (
                      <span className="no-reward">No reward</span>
                    )}
                  </div>
                </div>

                <div className="reward-details">
                  <div className="detail-item">
                    <span className="detail-label">Activity:</span>
                    <span className="detail-value">
                      {reward.isEligible ? `${reward.userTokenBalance.toLocaleString()} tokens` : 'No trading'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Multiplier:</span>
                    <span className={`detail-value tier-${reward.stakingTier.toLowerCase()}`}>
                      {reward.stakingTier} ({reward.stakingMultiplier}x)
                    </span>
                  </div>
                </div>

                <div className="reward-actions">
                  {reward.alreadyClaimed ? (
                    <span className="status-text claimed">✅ Claimed</span>
                  ) : reward.isEligible ? (
                    <button
                      onClick={() => handleClaimReward(reward.dayId)}
                      disabled={processing.has(reward.dayId)}
                      className="claim-btn mini"
                    >
                      {processing.has(reward.dayId) ? "..." : "Claim"}
                    </button>
                  ) : (
                    <span className="status-text ineligible">❌ Not eligible</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFeeRewards;