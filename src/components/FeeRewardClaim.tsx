import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAppContext } from "../context/AppContext";

interface FeeRewardClaimProps {
  dayId: number;
}

const FeeRewardClaim: React.FC<FeeRewardClaimProps> = ({ dayId }) => {
  const { publicKey, connected } = useWallet();
  const { state, claimFeeRewards, setError } = useAppContext();

  const [isEligible, setIsEligible] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState(0);
  const [totalSupply, setTotalSupply] = useState(1000000000);

  const claimKey = `FEE_${dayId}`;
  const claimed = state.claimedRewards.has(claimKey);

  useEffect(() => {
    if (connected) {
      fetchRewardEstimate();
    }
  }, [connected, state.stakingMultiplier, dayId]);

  const fetchRewardEstimate = async () => {
    try {
      // TODO: Replace with actual backend query for user eligibility and trading activity
      // This would check if user made trades on the specified day
      const fakeEligible = Math.random() > 0.3; // 70% chance of eligibility for demo
      const fakeUserBalance = Math.floor(Math.random() * 100000) + 10000; // Random balance

      setIsEligible(fakeEligible);
      setUserTokenBalance(fakeUserBalance);

      if (fakeEligible) {
        // Base reward calculation: user's share of daily fees * staking multiplier
        const baseReward = 0.025; // Base 0.025 SOL for demo
        const userShare = fakeUserBalance / totalSupply;
        const scaledReward = baseReward * userShare * 1000; // Scale up for visibility
        const boostedReward = scaledReward * state.stakingMultiplier;
        setRewardAmount(boostedReward);
      } else {
        setRewardAmount(0);
      }
    } catch (error) {
      console.error("Failed to fetch reward estimate:", error);
      setError("Failed to calculate rewards");
    }
  };

  const handleClaimReward = async () => {
    if (!isEligible || claimed) return;

    setLoading(true);
    try {
      const hash = await claimFeeRewards(dayId, userTokenBalance, totalSupply);
      setTxHash(hash);
      setError(null);
    } catch (e) {
      console.error("Claim failed", e);
      setError("Failed to claim reward. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dayId: number) => {
    const date = new Date();
    date.setDate(date.getDate() - (7 - dayId)); // Assume day 1 is a week ago
    return date.toLocaleDateString();
  };

  return (
    <div className="fee-reward-claim">
      <h3>Claim Daily Trading Fee Rewards</h3>

      <div className="day-info">
        <div className="info-item">
          <label>Reward Day:</label>
          <span>
            Day {dayId} ({formatDate(dayId)})
          </span>
        </div>
      </div>

      {connected ? (
        <div className="reward-content">
          {state.error && <div className="error-message">⚠️ {state.error}</div>}

          {isEligible ? (
            claimed ? (
              <div className="success-message">
                <p>✅ Reward claimed for Day {dayId}</p>
                <p className="reward-amount">
                  Amount: ◎{rewardAmount.toFixed(4)} SOL
                </p>
                {txHash && (
                  <p>
                    Transaction:
                    <a
                      href={`https://solscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      {txHash.slice(0, 8)}...{txHash.slice(-8)}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="claim-section">
                <div className="reward-calculation">
                  <div className="calc-item">
                    <label>Your Token Balance:</label>
                    <span>{userTokenBalance.toLocaleString()} tokens</span>
                  </div>

                  <div className="calc-item">
                    <label>Staking Multiplier:</label>
                    <span className="multiplier">
                      {state.stakingMultiplier}x
                    </span>
                    <small>({state.userStakingTier} tier)</small>
                  </div>

                  <div className="calc-item total">
                    <label>Total Reward:</label>
                    <span className="reward-amount">
                      ◎{rewardAmount.toFixed(4)} SOL
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleClaimReward}
                  disabled={loading}
                  className="claim-btn"
                >
                  {loading
                    ? "Claiming..."
                    : `Claim ◎${rewardAmount.toFixed(4)} SOL`}
                </button>

                <div className="claim-info">
                  <h4>How rewards are calculated:</h4>
                  <ul>
                    <li>Based on your trading activity on Day {dayId}</li>
                    <li>Your share of the total daily fee pool</li>
                    <li>Boosted by your $APEOUT staking tier</li>
                    <li>Higher staking = higher multiplier</li>
                  </ul>
                </div>
              </div>
            )
          ) : (
            <div className="not-eligible">
              <p>❌ Not eligible for Day {dayId} rewards</p>
              <div className="eligibility-info">
                <h4>To be eligible for trading fee rewards:</h4>
                <ul>
                  <li>✅ Hold tokens on the reward day</li>
                  <li>❌ Complete at least one trade on the day</li>
                  <li>✅ Have a connected wallet</li>
                  <li>✅ Stake $APEOUT for bonus multipliers</li>
                </ul>
                <p>
                  <small>It looks like you didn't trade on Day {dayId}.</small>
                </p>
              </div>
            </div>
          )}

          <div className="staking-promotion">
            <h4>💡 Boost Your Rewards</h4>
            <p>Stake more $APEOUT to increase your reward multiplier:</p>
            <div className="tier-benefits">
              <span className="tier bronze">Bronze (1.0x)</span>
              <span className="tier silver">Silver (1.1x)</span>
              <span className="tier gold">Gold (1.5x)</span>
              <span className="tier diamond">Diamond (2.0x)</span>
            </div>
            <p>
              <small>
                Current tier: <strong>{state.userStakingTier}</strong> (
                {state.stakingMultiplier}x multiplier)
              </small>
            </p>
          </div>
        </div>
      ) : (
        <div className="connect-prompt">
          <p>
            Please connect your wallet to check and claim trading fee rewards.
          </p>
        </div>
      )}
    </div>
  );
};

export default FeeRewardClaim;
