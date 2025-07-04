import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  image: File | null;
  telegram: string;
  twitter: string;
  website: string;
}

const TokenLaunch: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const [formData, setFormData] = useState<TokenFormData>({
    name: "",
    symbol: "",
    description: "",
    image: null,
    telegram: "",
    twitter: "",
    website: "",
  });

  const [imagePreview, setImagePreview] = useState<string>("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Image must be smaller than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please upload a valid image file");
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));

      // Create preview
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

    return true;
  };

  const handleLaunch = async (e: React.FormEvent) => {
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
      // TODO: Implement actual token creation logic
      console.log("Creating token with data:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setSuccess(
        `🎉 Successfully launched ${formData.symbol}! Your token is now live on the bonding curve.`
      );

      // Reset form
      setFormData({
        name: "",
        symbol: "",
        description: "",
        image: null,
        telegram: "",
        twitter: "",
        website: "",
      });
      setImagePreview("");
    } catch (err) {
      setError("Failed to launch token. Please try again.");
      console.error("Launch failed:", err);
    } finally {
      setLaunching(false);
    }
  };

  const launchCost = "0.02 SOL"; // Mock cost

  return (
    <div className="token-launch">
      <div className="launch-header">
        <h2>🚀 Launch Your Token</h2>
        <p>Create your own token on Solana. No coding required!</p>
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
                maxLength={50}
                required
              />
              <small>{formData.name.length}/50 characters</small>
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
                placeholder="e.g., MAT"
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
              <div className="cost-item">
                <span>Token Creation</span>
                <span>{launchCost}</span>
              </div>
              <div className="cost-item total">
                <span>Total</span>
                <span>{launchCost}</span>
              </div>
            </div>

            <div className="launch-details">
              <h4>What you get:</h4>
              <ul>
                <li>✅ Token deployed on Solana</li>
                <li>✅ Automatic bonding curve</li>
                <li>✅ Listed on ApeOut Terminal</li>
                <li>✅ Trading starts immediately</li>
                <li>✅ Community can buy/sell instantly</li>
              </ul>
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
                Launching...
              </>
            ) : (
              <>🚀 Launch Token ({launchCost})</>
            )}
          </button>

          <div className="disclaimer">
            <p>
              <strong>Disclaimer:</strong> Token creation involves risk. Please
              ensure you understand the implications before launching. ApeOut
              Terminal is not responsible for the success or failure of your
              token.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

export default TokenLaunch;
