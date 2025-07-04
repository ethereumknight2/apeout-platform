import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ApeOutClient } from '../lib/anchor/client';

export const useApeOutClient = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const client = useMemo(() => {
    if (!wallet.publicKey) return null;

    return new ApeOutClient(connection, wallet, {
      feeRewards: import.meta.env.VITE_FEE_REWARDS_PROGRAM_ID,
      holderDistribution: import.meta.env.VITE_HOLDER_DISTRIBUTION_PROGRAM_ID,
      lpCustody: import.meta.env.VITE_LP_CUSTODY_PROGRAM_ID,
      projectStatusTracker: import.meta.env.VITE_PROJECT_STATUS_TRACKER_PROGRAM_ID,
    });
  }, [connection, wallet.publicKey]);

  return client;
};
