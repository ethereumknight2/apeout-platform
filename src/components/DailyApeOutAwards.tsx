import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDailyGame, DailyGameInfo } from "../services/dailyGameService";

const DailyApeOutAwards: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const dailyGameService = useDailyGame();
  
  const [gameInfo, setGameInfo] = useState<DailyGameInfo[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"current" | "week" | "leaderboard">("current");

  useEffect(() => {
    if (connected) {
      loadGameData();
    }
  }, [connected]);

  const loadGameData = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🏆 Loading daily game data...");
      
      // Load last 7 days of game data
      const days = [1, 2, 3, 4, 5, 6, 7];
      const gameData = await Promise.all(
        days.map(dayId => dailyGameService.getDailyGameInfo(dayId))
      );
      
      setGameInfo(gameData);
      setSelectedDay(gameData[gameData.length - 1]?.dayId || 1); // Set to most recent day
      
      console.log("✅ Game data loaded successfully");
    } catch (err) {
      console.error("❌ Error loading game data:", err);
      setError(err instanceof Error ? err.message : "Failed to load game data");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (dayId: number, categoryId: number) => {
    const claimKey = `${dayId}-${categoryId}`;
    setProcessing(prev => new Set(prev).add(claimKey));
    setError("");
    
    try {
      console.log(`🏆 Claiming reward for day ${dayId}, category ${categoryId}...`);
      
      const result = await dailyGameService.claimCategoryReward(dayId, categoryId);
      
      if (result.success) {
        console.log("✅ Game reward claim successful:", result.signature);
        console.log(`🏆 Claimed: ${result.amountClaimed?.toFixed(4)} SOL for ${result.category}`);
        
        // Refresh data
        await loadGameData();
      } else {
        throw new Error(result.error || "Game reward claim failed");
      }
    } catch (err) {
      console.error("❌ Game reward claim failed:", err);
      setError(err instanceof Error ? err.message : "Game reward claim failed");
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimKey);
        return newSet;
      });
    }
  };

  const getCurrentDayInfo = () => {
    return gameInfo.find(day => day.dayId === selectedDay) || null;
  };

  const getTotalClaimableRewards = () => {
    return gameInfo.reduce((total, day) => {
      return total + Object.values(day.userStatus)
        .filter(status => status.canClaim)
        .reduce((dayTotal, status) => dayTotal + status.rewardAmount, 0);
    }, 0);
  };

  const getAllClaimableWins = () => {
    return gameInfo.flatMap(day => 
      Object.entries(day.userStatus)
        .filter(([_, status]) => status.canClaim)
        .map(([categoryId, status]) => ({
          dayId: day.dayId,
          categoryId: parseInt(categoryId),
          category: day.categories.find(c => c.id === parseInt(categoryId)),
          status,
          date: day.date
        }))
    );
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
      <div className="daily-awards-container loading">
        <h2>🏆 Daily ApeOut Awards</h2>
        <div className="loading-spinner"></div>
        <p>Loading competition data...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="daily-awards-container">
        <h2>🏆 Daily ApeOut Awards</h2>
        <div className="connect-prompt">
          <div className="connect-card">
            <h3>Connect Wallet Required</h3>
            <p>Please connect your Solana wallet to view and claim daily competition rewards.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentDay = getCurrentDayInfo();
  const claimableWins = getAllClaimableWins();

  return (
    <div className="daily-awards-container enhanced">
      <div className="awards-header">
        <div className="header-title">
          <h2>🏆 Daily ApeOut Awards</h2>
          <p>Compete daily across 5 categories and win SOL rewards!</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-value">{getTotalClaimableRewards().toFixed(4)} SOL</div>
            <div className="stat-label">Total Claimable</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{claimableWins.length}</div>
            <div className="stat-label">Wins to Claim</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentDay?.totalRewards.toFixed(4) || "0"} SOL</div>
            <div className="stat-label">Today's Vault</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError("")} className="error-close">✕</button>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === "current" ? "active" : ""}`}
          onClick={() => setViewMode("current")}
        >
          📅 Current Day
        </button>
        <button
          className={`toggle-btn ${viewMode === "week" ? "active" : ""}`}
          onClick={() => setViewMode("week")}
        >
          📊 Week Overview
        </button>
        <button
          className={`toggle-btn ${viewMode === "leaderboard" ? "active" : ""}`}
          onClick={() => setViewMode("leaderboard")}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* Quick Claim Section */}
      {claimableWins.length > 0 && (
        <div className="quick-claim-section">
          <h3>🎁 Ready to Claim ({claimableWins.length} wins)</h3>
          <div className="quick-claim-grid">
            {claimableWins.slice(0, 3).map(win => (
              <div key={`${win.dayId}-${win.categoryId}`} className="quick-claim-card">
                <div className="claim-header">
                  <span className="category-icon">{win.category?.icon}</span>
                  <div className="claim-info">
                    <h4>{win.category?.name}</h4>
                    <span className="claim-day">Day {win.dayId}</span>
                  </div>
                  <div className="claim-amount">
                    {win.status.rewardAmount.toFixed(4)} SOL
                  </div>
                </div>
                <button
                  onClick={() => handleClaimReward(win.dayId, win.categoryId)}
                  disabled={processing.has(`${win.dayId}-${win.categoryId}`)}
                  className="quick-claim-btn"
                >
                  {processing.has(`${win.dayId}-${win.categoryId}`) ? "..." : "Claim"}
                </button>
              </div>
            ))}
          </div>
          {claimableWins.length > 3 && (
            <div className="more-claims">
              <span>+{claimableWins.length - 3} more wins available</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {viewMode === "current" && currentDay && (
        <div className="current-day-view">
          {/* Day Selection */}
          <div className="day-selector">
            <h3>Select Day</h3>
            <div className="day-buttons">
              {gameInfo.map(day => (
                <button
                  key={day.dayId}
                  className={`day-btn ${selectedDay === day.dayId ? "active" : ""}`}
                  onClick={() => setSelectedDay(day.dayId)}
                >
                  <div className="day-number">Day {day.dayId}</div>
                  <div className="day-date">{formatDate(day.date)}</div>
                  {Object.values(day.userStatus).some(status => status.canClaim) && (
                    <div className="day-indicator">🎁</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="categories-section">
            <h3>Competition Categories - Day {currentDay.dayId}</h3>
            <div className="categories-grid">
              {currentDay.categories.map(category => {
                const userStatus = currentDay.userStatus[category.id];
                const winner = currentDay.winners[category.id];
                const isWinner = userStatus?.isWinner || false;
                
                return (
                  <div key={category.id} className={`category-card ${isWinner ? 'winner' : ''} ${userStatus?.canClaim ? 'claimable' : ''}`}>
                    <div className="category-header">
                      <span className="category-icon">{category.icon}</span>
                      <div className="category-info">
                        <h4>{category.name}</h4>
                        <p>{category.description}</p>
                      </div>
                      <div className="category-reward">
                        <span className="reward-percentage">{category.rewardPercentage}%</span>
                        <span className="reward-amount">
                          {((currentDay.totalRewards * category.rewardPercentage) / 100).toFixed(4)} SOL
                        </span>
                      </div>
                    </div>

                    <div className="category-status">
                      {winner ? (
                        <div className="winner-info">
                          <span className="winner-label">
                            {isWinner ? "🏆 You won!" : "👑 Winner:"}
                          </span>
                          <span className="winner-address">
                            {isWinner ? "Congratulations!" : `${winner.slice(0, 8)}...${winner.slice(-4)}`}
                          </span>
                        </div>
                      ) : (
                        <div className="no-winner">
                          <span className="no-winner-text">🔄 Competition ongoing</span>
                        </div>
                      )}
                    </div>

                    {userStatus?.userMetric && (
                      <div className="user-performance">
                        <div className="performance-item">
                          <span className="perf-label">Your Performance:</span>
                          <span className="perf-value">{userStatus.userMetric.toLocaleString()}</span>
                        </div>
                        {userStatus.leaderPosition && (
                          <div className="performance-item">
                            <span className="perf-label">Rank:</span>
                            <span className="perf-value">#{userStatus.leaderPosition}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {userStatus?.canClaim && (
                      <div className="claim-section">
                        <button
                          onClick={() => handleClaimReward(currentDay.dayId, category.id)}
                          disabled={processing.has(`${currentDay.dayId}-${category.id}`)}
                          className="claim-btn"
                        >
                          {processing.has(`${currentDay.dayId}-${category.id}`) ? (
                            <>
                              <div className="btn-spinner"></div>
                              Claiming...
                            </>
                          ) : (
                            <>
                              🏆 Claim {userStatus.rewardAmount.toFixed(4)} SOL
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {userStatus?.alreadyClaimed && (
                      <div className="claimed-section">
                        <span className="claimed-text">✅ Reward claimed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className="week-overview">
          <h3>📊 Weekly Performance Overview</h3>
          <div className="week-grid">
            {gameInfo.map(day => {
              const userWins = Object.values(day.userStatus).filter(status => status.isWinner).length;
              const claimableWins = Object.values(day.userStatus).filter(status => status.canClaim).length;
              const totalRewards = Object.values(day.userStatus)
                .filter(status => status.canClaim)
                .reduce((sum, status) => sum + status.rewardAmount, 0);

              return (
                <div key={day.dayId} className="week-day-card">
                  <div className="day-header">
                    <div className="day-title">
                      <h4>Day {day.dayId}</h4>
                      <span className="day-date">{formatDate(day.date)}</span>
                    </div>
                    <div className="day-vault">
                      {day.totalRewards.toFixed(4)} SOL
                    </div>
                  </div>

                  <div className="day-stats">
                    <div className="stat-item">
                      <span className="stat-label">Your Wins:</span>
                      <span className="stat-value">{userWins}/5</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Claimable:</span>
                      <span className="stat-value">{claimableWins}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Your Rewards:</span>
                      <span className="stat-value">{totalRewards.toFixed(4)} SOL</span>
                    </div>
                  </div>

                  <div className="day-categories">
                    {day.categories.map(category => {
                      const userStatus = day.userStatus[category.id];
                      return (
                        <div key={category.id} className="mini-category">
                          <span className="category-icon">{category.icon}</span>
                          <div className="category-status">
                            {userStatus?.isWinner ? (
                              <span className="status-icon winner">🏆</span>
                            ) : userStatus?.canClaim ? (
                              <span className="status-icon claimable">🎁</span>
                            ) : userStatus?.alreadyClaimed ? (
                              <span className="status-icon claimed">✅</span>
                            ) : (
                              <span className="status-icon none">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {claimableWins > 0 && (
                    <div className="day-actions">
                      <button
                        onClick={() => setSelectedDay(day.dayId)}
                        className="view-day-btn"
                      >
                        Claim {claimableWins} win{claimableWins > 1 ? 's' : ''}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "leaderboard" && (
        <div className="leaderboard-view">
          <h3>🏆 Competition Leaderboard</h3>
          <div className="leaderboard-section">
            <div className="category-selector">
              <h4>Select Category</h4>
              <div className="category-buttons">
                {currentDay?.categories.map(category => (
                  <button
                    key={category.id}
                    className="category-btn"
                    onClick={() => {
                      // TODO: Load leaderboard for this category
                      console.log(`Loading leaderboard for category ${category.id}`);
                    }}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="leaderboard-placeholder">
              <div className="placeholder-content">
                <h4>🚧 Leaderboard Coming Soon</h4>
                <p>Real-time competition rankings will be displayed here.</p>
                <div className="placeholder-features">
                  <div className="feature-item">
                    <span className="feature-icon">📊</span>
                    <span>Live performance metrics</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🏆</span>
                    <span>Top performer rankings</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📈</span>
                    <span>Historical performance data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Rules */}
      <div className="game-rules">
        <h3>📋 Competition Rules</h3>
        <div className="rules-grid">
          <div className="rule-section">
            <h4>🎯 How to Win</h4>
            <ul>
              <li>🚀 <strong>Most Traded Token:</strong> Launch the token with highest daily volume</li>
              <li>💰 <strong>LP MVP:</strong> Provide the most liquidity to any pool</li>
              <li>⚡ <strong>Early Buyer:</strong> Be first to buy a token that becomes successful</li>
              <li>🧠 <strong>Smart Money:</strong> Achieve the best trading performance ratio</li>
              <li>🏆 <strong>Profit Champion:</strong> Make the highest absolute profit</li>
            </ul>
          </div>

          <div className="rule-section">
            <h4>💰 Reward Distribution</h4>
            <div className="reward-breakdown">
              <div className="reward-item">
                <span className="reward-category">Most Traded Token</span>
                <span className="reward-percent">30%</span>
              </div>
              <div className="reward-item">
                <span className="reward-category">LP MVP</span>
                <span className="reward-percent">25%</span>
              </div>
              <div className="reward-item">
                <span className="reward-category">Early Buyer</span>
                <span className="reward-percent">20%</span>
              </div>
              <div className="reward-item">
                <span className="reward-category">Smart Money</span>
                <span className="reward-percent">15%</span>
              </div>
              <div className="reward-item">
                <span className="reward-category">Profit Champion</span>
                <span className="reward-percent">10%</span>
              </div>
            </div>
          </div>

          <div className="rule-section">
            <h4>⏰ Important Notes</h4>
            <ul>
              <li>🕐 Competition resets daily at midnight UTC</li>
              <li>🎁 Winners have 24 hours to claim rewards</li>
              <li>💱 Must have active trading to be eligible</li>
              <li>🏦 Staking multipliers don't apply to game rewards</li>
              <li>📊 Performance is measured from midnight to midnight</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Daily Vault Info */}
      <div className="vault-info">
        <h3>💰 Daily Vault Funding</h3>
        <div className="vault-breakdown">
          <div className="funding-source">
            <div className="source-header">
              <span className="source-icon">💱</span>
              <h4>Trading Fee Revenue</h4>
            </div>
            <div className="source-details">
              <p>15% of all platform trading fees go to daily game rewards</p>
              <div className="source-split">
                <div className="split-item">
                  <span className="split-label">Holder Rewards:</span>
                  <span className="split-value">75%</span>
                </div>
                <div className="split-item">
                  <span className="split-label">Game Vault:</span>
                  <span className="split-value">15%</span>
                </div>
                <div className="split-item">
                  <span className="split-label">Platform:</span>
                  <span className="split-value">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyApeOutAwards;