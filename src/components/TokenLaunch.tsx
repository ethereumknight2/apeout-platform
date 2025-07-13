import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTokenLauncher, TokenLaunchData } from "../services/tokenLauncherService";

interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  image: File | null;
  telegram: string;
  twitter: string;
  website: string;
  initialSupply: number;
  lpSolAmount: number;
  lpTokenPercentage: number;
}

interface LaunchCostBreakdown {
  accountCreation: number;
  minimumLP: number;
  platformFee: number;
  total: number;
}

interface LaunchCost {
  solCost: number;
  breakdown: LaunchCostBreakdown;
}

const TokenLaunch: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const tokenLauncher = useTokenLauncher();
  
  const [formData, setFormData] = useState<TokenFormData>({
    name: "",
    symbol: "",
    description: "",
    image: null,
    telegram: "",
    twitter: "",
    website: "",
    initialSupply: 1000000, // Default 1M tokens
    lpSolAmount: 0.05, // Default 0.05 SOL for LP
    lpTokenPercentage: 80, // Default 80% of tokens for LP
  });

  const [imagePreview, setImagePreview] = useState<string>("");
  const [launching, setLaunching] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [launchCost, setLaunchCost] = useState<LaunchCost | null>(null);

  // Load launch cost on mount
  useEffect(() => {
    const cost = tokenLauncher.getLaunchCost();
    setLaunchCost(cost);
  }, [tokenLauncher]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    setError("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be smaller than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please upload a valid image file");
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));

      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Token name is required");
      return false;
    }

    if (formData.name.length > 32) {
      setError("Token name must be 32 characters or less");
      return false;
    }

    if (!formData.symbol.trim()) {
      setError("Token symbol is required");
      return false;
    }

    if (formData.symbol.length > 10) {
      setError("Symbol must be 10 characters or less");
      return false;
    }

    if (!formData.description.trim()) {
      setError("Description is required");
      return false;
    }

    if (formData.description.length > 500) {
      setError("Description must be 500 characters or less");
      return false;
    }

    if (formData.initialSupply < 1000) {
      setError("Initial supply must be at least 1,000 tokens");
      return false;
    }

    if (formData.initialSupply > 1000000000) {
      setError("Initial supply cannot exceed 1 billion tokens");
      return false;
    }

    if (formData.lpSolAmount < 0.02) {
      setError("LP SOL amount must be at least 0.02 SOL");
      return false;
    }

    if (formData.lpSolAmount > 10) {
      setError("LP SOL amount cannot exceed 10 SOL");
      return false;
    }

    if (formData.lpTokenPercentage < 50 || formData.lpTokenPercentage > 95) {
      setError("LP token percentage must be between 50% and 95%");
      return false;
    }

    return true;
  };

  const handleLaunch = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!connected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLaunching(true);
    setError("");

    try {
      console.log("🚀 Launching token with data:", formData);

      const launchData: TokenLaunchData = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        imageFile: formData.image || undefined,
        socialLinks: {
          telegram: formData.telegram || undefined,
          twitter: formData.twitter || undefined,
          website: formData.website || undefined,
        },
        initialSupply: formData.initialSupply,
        lpSolAmount: formData.lpSolAmount,
        lpTokenPercentage: formData.lpTokenPercentage,
      };

      const result = await tokenLauncher.launchToken(launchData);

      if (result.success) {
        setSuccess(
          `🎉 Successfully launched ${formData.symbol}! Your token is now live on ApeOut Terminal with trading enabled immediately.`
        );

        if (result.tokenMint) {
          console.log("🪙 Token Mint:", result.tokenMint.toString());
        }

        if (result.signature) {
          console.log("📄 Transaction:", result.signature);
        }

        // Reset form
        setFormData({
          name: "",
          symbol: "",
          description: "",
          image: null,
          telegram: "",
          twitter: "",
          website: "",
          initialSupply: 1000000,
          lpSolAmount: 0.05,
          lpTokenPercentage: 80,
        });
        setImagePreview("");
      } else {
        throw new Error(result.error || "Token launch failed");
      }
    } catch (err) {
      console.error("Launch failed:", err);
      setError(`Failed to launch token: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setLaunching(false);
    }
  };

  const calculateTokensForLP = (): number => {
    return Math.floor(formData.initialSupply * (formData.lpTokenPercentage / 100));
  };

  const calculateCreatorTokens = (): number => {
    return formData.initialSupply - calculateTokensForLP();
  };

  const getTotalCost = (): number => {
    if (!launchCost) return 0.1; // fallback
    return launchCost.breakdown.accountCreation + formData.lpSolAmount + launchCost.breakdown.platformFee;
  };

  return (
    <div className="token-launch">
      <div className="launch-header">
        <h2>🚀 Launch Your Token</h2>
        <p>Create your own token ending with "ape" on Solana. Automatic LP creation and trading!</p>
      </div>

      {!connected ? (
        <div className="connect-required">
          <div className="connect-card">
            <h3>Connect Wallet Required</h3>
            <p>Please connect your Solana wallet to launch a token.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLaunch} className="launch-form">
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="name">Token Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., My Awesome Token"
                maxLength={32}
                required
              />
              <small>{formData.name.length}/32 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="symbol">Token Symbol *</label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol.toUpperCase()}
                onChange={(e) =>
                  handleInputChange({
                    ...e,
                    target: {
                      ...e.target,
                      value: e.target.value.toUpperCase(),
                    },
                  })
                }
                placeholder="e.g., MYTOKEN"
                maxLength={10}
                required
              />
              <small>{formData.symbol.length}/10 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell the world about your token. What makes it special?"
                maxLength={500}
                rows={4}
                required
              />
              <small>{formData.description.length}/500 characters</small>
            </div>
          </div>

          <div className="form-section">
            <h3>Token Economics</h3>

            <div className="form-group">
              <label htmlFor="initialSupply">Initial Supply *</label>
              <input
                type="number"
                id="initialSupply"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleInputChange}
                placeholder="1000000"
                min="1000"
                max="1000000000"
                required
              />
              <small>Total tokens to create (1,000 - 1,000,000,000)</small>
            </div>

            <div className="form-group">
              <label htmlFor="lpTokenPercentage">LP Token Percentage *</label>
              <input
                type="number"
                id="lpTokenPercentage"
                name="lpTokenPercentage"
                value={formData.lpTokenPercentage}
                onChange={handleInputChange}
                placeholder="80"
                min="50"
                max="95"
                step="5"
                required
              />
              <small>Percentage of tokens for liquidity pool (50% - 95%)</small>
            </div>

            <div className="form-group">
              <label htmlFor="lpSolAmount">LP SOL Amount *</label>
              <input
                type="number"
                id="lpSolAmount"
                name="lpSolAmount"
                value={formData.lpSolAmount}
                onChange={handleInputChange}
                placeholder="0.05"
                min="0.02"
                max="10"
                step="0.01"
                required
              />
              <small>SOL to add to liquidity pool (0.02 - 10 SOL)</small>
            </div>

            <div className="token-distribution">
              <h4>Token Distribution</h4>
              <div className="distribution-item">
                <span>Liquidity Pool:</span>
                <span>{calculateTokensForLP().toLocaleString()} tokens ({formData.lpTokenPercentage}%)</span>
              </div>
              <div className="distribution-item">
                <span>Creator (You):</span>
                <span>{calculateCreatorTokens().toLocaleString()} tokens ({100 - formData.lpTokenPercentage}%)</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Token Image</h3>

            <div className="image-upload">
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              <label htmlFor="image" className="file-label">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Token preview" />
                    <div className="image-overlay">
                      <span>Click to change</span>
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <span className="upload-icon">📸</span>
                    <span>Upload token image</span>
                    <small>PNG, JPG, GIF up to 5MB</small>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Social Links (Optional)</h3>

            <div className="form-group">
              <label htmlFor="telegram">Telegram</label>
              <input
                type="url"
                id="telegram"
                name="telegram"
                value={formData.telegram}
                onChange={handleInputChange}
                placeholder="https://t.me/yourtelegram"
              />
            </div>

            <div className="form-group">
              <label htmlFor="twitter">Twitter</label>
              <input
                type="url"
                id="twitter"
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                placeholder="https://twitter.com/yourtwitter"
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          {success && <div className="success-message">{success}</div>}

          <div className="launch-summary">
            <div className="cost-breakdown">
              <h3>Launch Cost</h3>
              {launchCost && (
                <>
                  <div className="cost-item">
                    <span>Account Creation</span>
                    <span>{launchCost.breakdown.accountCreation} SOL</span>
                  </div>
                  <div className="cost-item">
                    <span>LP Creation</span>
                    <span>{formData.lpSolAmount} SOL</span>
                  </div>
                  <div className="cost-item">
                    <span>Platform Fee</span>
                    <span>{launchCost.breakdown.platformFee} SOL</span>
                  </div>
                  <div className="cost-item total">
                    <span>Total</span>
                    <span>{getTotalCost().toFixed(3)} SOL</span>
                  </div>
                </>
              )}
            </div>

            <div className="launch-details">
              <h4>What you get:</h4>
              <ul>
                <li>✅ Token deployed on Solana with "ape" ending</li>
                <li>✅ Automatic liquidity pool creation</li>
                <li>✅ Listed on ApeOut Terminal immediately</li>
                <li>✅ Trading starts instantly</li>
                <li>✅ LP tokens locked in custody for safety</li>
                <li>✅ Integrated with project status tracker</li>
                <li>✅ Community can buy/sell immediately</li>
              </ul>
            </div>

            <div className="ape-feature">
              <h4>🦍 Special ApeOut Feature</h4>
              <p>
                <strong>All tokens end with "ape"!</strong> Your token's contract address 
                will be generated to end with "ape" for the authentic ApeOut experience.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="launch-button"
            disabled={launching || !connected}
          >
            {launching ? (
              <>
                <div className="button-spinner"></div>
                Launching & Creating LP...
              </>
            ) : (
              <>🚀 Launch Token ({getTotalCost().toFixed(3)} SOL)</>
            )}
          </button>

          <div className="disclaimer">
            <p>
              <strong>Disclaimer:</strong> Token creation involves risk. LP tokens will be locked
              in custody and distributed to holders if the token dies. Please ensure you understand 
              the tokenomics before launching. ApeOut Terminal is not responsible for the success 
              or failure of your token.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

export default TokenLaunch;