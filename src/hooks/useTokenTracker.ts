import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useApeOutClient } from './useApeOutClient';

export const useTokenTracker = (tokenMint: PublicKey | null) => {
  const [tracker, setTracker] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useApeOutClient();

  const fetchTracker = async () => {
    if (!client || !tokenMint) return;

    setLoading(true);
    setError(null);

    try {
      const tokenInfo = await client.getTokenInfo(tokenMint);
      setTracker(tokenInfo.tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracker();
  }, [client, tokenMint]);

  return {
    tracker,
    loading,
    error,
    refetch: fetchTracker
  };
};
