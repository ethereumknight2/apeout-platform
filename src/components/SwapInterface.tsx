import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

interface SwapInterfaceProps {
  tokenMint?: PublicKey;
  tokenSymbol?: string;
  tokenName?: string;
  tokenPrice?: number;
  className?: string;
}

const SwapInterface: React.FC<SwapInterfaceProps> = ({
  tokenMint,
  tokenSymbol = "TOKEN",
  tokenName = "Token",
  tokenPrice = 0.00001,
  className = "",
}) => {
  const { connected, publicKey } = useWallet();
  const [swapMode, setSwapMode] = useState<"buy" | "sell">("buy");
  const [solAmount, setSolAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [customSlippage, setCustomSlippage] = useState("");
  const [showCustomSlippage, setShowCustomSlippage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [solBalance, setSolBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);

  // Mock balances - replace with real blockchain queries
  useEffect(() => {
    if (connected) {
      setSolBalance(1.5); // Mock SOL balance
      setTokenBalance(0); // Mock token balance
    }
  }, [connected]);

  // Calculate token amount based on SOL input
  useEffect(() => {
    if (solAmount && tokenPrice) {
      const tokens = parseFloat(solAmount) / tokenPrice;
      setTokenAmount(tokens.toFixed(0));
    } else {
      setTokenAmount("");
    }
  }, [solAmount, tokenPrice]);

  // Calculate SOL amount based on token input
  useEffect(() => {
    if (tokenAmount && tokenPrice && swapMode === "sell") {
      const sol = parseFloat(tokenAmount) * tokenPrice;
      setSolAmount(sol.toFixed(6));
    }
  }, [tokenAmount, tokenPrice, swapMode]);

  const calculateFees = () => {
    const inputAmount = parseFloat(solAmount) || 0;
    const platformFee = inputAmount * 0.005; // 0.5% platform fee
    const slippageFee = inputAmount * (slippage / 100);
    return {
      platformFee,
      slippageFee,
      total: platformFee + slippageFee,
    };
  };

  const handleSwap = async () => {
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!solAmount || parseFloat(solAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual swap logic
      console.log("Executing swap:", {
        mode: swapMode,
        solAmount,
        tokenAmount,
        tokenMint: tokenMint?.toString(),
        slippage,
      });

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (swapMode === "buy") {
        setSolBalance((prev) => prev - parseFloat(solAmount));
        setTokenBalance((prev) => prev + parseFloat(tokenAmount));
        alert(
          `Successfully bought ${tokenAmount} ${tokenSymbol} for ${solAmount} SOL!`
        );
      } else {
        setTokenBalance((prev) => prev - parseFloat(tokenAmount));
        setSolBalance((prev) => prev + parseFloat(solAmount));
        alert(
          `Successfully sold ${tokenAmount} ${tokenSymbol} for ${solAmount} SOL!`
        );
      }

      setSolAmount("");
      setTokenAmount("");
    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMaxClick = () => {
    if (swapMode === "buy") {
      const maxSol = Math.max(0, solBalance - 0.01); // Leave 0.01 SOL for fees
      setSolAmount(maxSol.toString());
    } else {
      setTokenAmount(tokenBalance.toString());
    }
  };

  const fees = calculateFees();

  return (
    <div className={`swap-interface-modern ${className}`}>
      {/* Header with Mode Toggle and Settings */}
      <div className="swap-header-modern">
        <div className="swap-title">
          <h3>💱 Swap Tokens</h3>
        </div>

        <div className="header-controls">
          <div className="mode-toggle">
            <button
              className={`mode-btn ${swapMode === "buy" ? "active" : ""}`}
              onClick={() => setSwapMode("buy")}
            >
              <span className="mode-icon">📈</span>
              Buy
            </button>
            <button
              className={`mode-btn ${swapMode === "sell" ? "active" : ""}`}
              onClick={() => setSwapMode("sell")}
            >
              <span className="mode-icon">📉</span>
              Sell
            </button>
          </div>

          <div className="slippage-control">
            <label>⚙️ Slippage</label>
            {!showCustomSlippage ? (
              <select
                value={slippage}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "custom") {
                    setShowCustomSlippage(true);
                    setCustomSlippage("");
                  } else {
                    setSlippage(parseFloat(value));
                  }
                }}
                className="slippage-select"
              >
                <option value={0.5}>0.5%</option>
                <option value={1}>1%</option>
                <option value={2.5}>2.5%</option>
                <option value={5}>5%</option>
                <option value="custom">Custom</option>
              </select>
            ) : (
              <div className="custom-slippage">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  onBlur={() => {
                    const value = parseFloat(customSlippage);
                    if (!isNaN(value) && value >= 0 && value <= 50) {
                      setSlippage(value);
                    }
                  }}
                  placeholder="0.0"
                  className="custom-slippage-input"
                  min="0"
                  max="50"
                  step="0.1"
                />
                <span className="slippage-percent">%</span>
                <button
                  onClick={() => {
                    setShowCustomSlippage(false);
                    setSlippage(1); // Reset to default
                  }}
                  className="slippage-cancel"
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swap Input/Output Cards */}
      <div className="swap-container">
        {swapMode === "buy" ? (
          <>
            {/* Input: SOL */}
            <div className="swap-card input-card">
              <div className="card-header">
                <div className="card-label">
                  <span className="label-text">You Pay</span>
                  <span className="label-icon">💰</span>
                </div>
                <div className="balance-info">
                  <span className="balance-label">Balance:</span>
                  <span className="balance-value">
                    {solBalance.toFixed(4)} SOL
                  </span>
                </div>
              </div>

              <div className="input-row">
                <div className="amount-section">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={solAmount}
                    onChange={(e) => setSolAmount(e.target.value)}
                    className="amount-input-modern"
                  />
                  <span className="currency-symbol">SOL</span>
                </div>

                <div className="token-display">
                  <div className="token-avatar">
                    <img
                      src="https://cryptologos.cc/logos/solana-sol-logo.png"
                      alt="SOL"
                      className="token-image"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          target.style.display = "none";
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                    <div className="token-fallback" style={{ display: "none" }}>
                      ☀️
                    </div>
                  </div>
                  <div className="token-details">
                    <span className="token-name">Solana</span>
                    <span className="token-symbol">SOL</span>
                  </div>
                </div>
              </div>

              <div className="max-button-row">
                <button
                  className="max-btn-modern"
                  onClick={handleMaxClick}
                  type="button"
                >
                  💰 Use Max Balance
                </button>
              </div>
            </div>

            {/* Swap Direction Arrow */}
            <div className="swap-direction">
              <div className="arrow-container">
                <div className="arrow-circle">
                  <span className="arrow-icon">↓</span>
                </div>
              </div>
            </div>

            {/* Output: Token */}
            <div className="swap-card output-card">
              <div className="card-header">
                <div className="card-label">
                  <span className="label-text">You Receive</span>
                  <span className="label-icon">🎯</span>
                </div>
                <div className="balance-info">
                  <span className="balance-label">Balance:</span>
                  <span className="balance-value">
                    {tokenBalance.toLocaleString()} {tokenSymbol}
                  </span>
                </div>
              </div>

              <div className="input-row">
                <div className="amount-section">
                  <input
                    type="number"
                    placeholder="0"
                    value={tokenAmount}
                    readOnly
                    className="amount-input-modern readonly"
                  />
                  <span className="currency-symbol">{tokenSymbol}</span>
                </div>

                <div className="token-display">
                  <div className="token-avatar">
                    <div className="token-fallback">🦍</div>
                  </div>
                  <div className="token-details">
                    <span className="token-name">{tokenName}</span>
                    <span className="token-symbol">{tokenSymbol}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Input: Token */}
            <div className="swap-card input-card">
              <div className="card-header">
                <div className="card-label">
                  <span className="label-text">You Pay</span>
                  <span className="label-icon">💰</span>
                </div>
                <div className="balance-info">
                  <span className="balance-label">Balance:</span>
                  <span className="balance-value">
                    {tokenBalance.toLocaleString()} {tokenSymbol}
                  </span>
                </div>
              </div>

              <div className="input-row">
                <div className="amount-section">
                  <input
                    type="number"
                    placeholder="0"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    className="amount-input-modern"
                  />
                  <span className="currency-symbol">{tokenSymbol}</span>
                </div>

                <div className="token-display">
                  <div className="token-avatar">
                    <div className="token-fallback">🦍</div>
                  </div>
                  <div className="token-details">
                    <span className="token-name">{tokenName}</span>
                    <span className="token-symbol">{tokenSymbol}</span>
                  </div>
                </div>
              </div>

              <div className="max-button-row">
                <button
                  className="max-btn-modern"
                  onClick={handleMaxClick}
                  type="button"
                >
                  💰 Use Max Balance
                </button>
              </div>
            </div>

            {/* Swap Direction Arrow */}
            <div className="swap-direction">
              <div className="arrow-container">
                <div className="arrow-circle">
                  <span className="arrow-icon">↓</span>
                </div>
              </div>
            </div>

            {/* Output: SOL */}
            <div className="swap-card output-card">
              <div className="card-header">
                <div className="card-label">
                  <span className="label-text">You Receive</span>
                  <span className="label-icon">🎯</span>
                </div>
                <div className="balance-info">
                  <span className="balance-label">Balance:</span>
                  <span className="balance-value">
                    {solBalance.toFixed(4)} SOL
                  </span>
                </div>
              </div>

              <div className="input-row">
                <div className="amount-section">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={solAmount}
                    readOnly
                    className="amount-input-modern readonly"
                  />
                  <span className="currency-symbol">SOL</span>
                </div>

                <div className="token-display">
                  <div className="token-avatar">
                    <img
                      src="https://cryptologos.cc/logos/solana-sol-logo.png"
                      alt="SOL"
                      className="token-image"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          target.style.display = "none";
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                    <div className="token-fallback" style={{ display: "none" }}>
                      ☀️
                    </div>
                  </div>
                  <div className="token-details">
                    <span className="token-name">Solana</span>
                    <span className="token-symbol">SOL</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transaction Details */}
      {solAmount && parseFloat(solAmount) > 0 && (
        <div className="transaction-summary">
          <div className="summary-header">
            <span className="summary-title">📋 Transaction Summary</span>
          </div>
          <div className="summary-content">
            <div className="summary-row">
              <span className="summary-label">Price per {tokenSymbol}</span>
              <span className="summary-value">{tokenPrice.toFixed(8)} SOL</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Platform Fee (0.5%)</span>
              <span className="summary-value">
                {fees.platformFee.toFixed(6)} SOL
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Slippage ({slippage}%)</span>
              <span className="summary-value">
                {fees.slippageFee.toFixed(6)} SOL
              </span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total-row">
              <span className="summary-label">Total Fees</span>
              <span className="summary-value total-value">
                {fees.total.toFixed(6)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        className="swap-btn-modern"
        onClick={handleSwap}
        disabled={
          loading || !connected || !solAmount || parseFloat(solAmount) <= 0
        }
      >
        {loading ? (
          <div className="btn-loading">
            <div className="btn-spinner"></div>
            <span>{swapMode === "buy" ? "Buying..." : "Selling..."}</span>
          </div>
        ) : connected ? (
          <div className="btn-content">
            <span className="btn-icon">{swapMode === "buy" ? "🚀" : "💸"}</span>
            <span>
              {swapMode === "buy"
                ? `Buy ${tokenSymbol}`
                : `Sell ${tokenSymbol}`}
            </span>
          </div>
        ) : (
          <div className="btn-content">
            <span className="btn-icon">🔗</span>
            <span>Connect Wallet</span>
          </div>
        )}
      </button>

      {/* Market Info */}
      <div className="market-stats">
        <div className="stats-header">
          <span className="stats-title">📊 Market Stats</span>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">24h Volume</div>
            <div className="stat-value">1,234 SOL</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Market Cap</div>
            <div className="stat-value">$45.6K</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Holders</div>
            <div className="stat-value">156</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;