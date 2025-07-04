
import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

const ClaimLPRewards = ({ tokenMint, snapshotInfo }) => {
  const { publicKey, connected } = useWallet();
  const [userBalance, setUserBalance] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!connected) return;
    // Placeholder: replace with actual snapshot balance query
    fetchSnapshotBalance();
  }, [connected]);

  const fetchSnapshotBalance = async () => {
    // TODO: replace with actual snapshot balance fetch from backend or indexer
    const fakeBalance = 1000000000; // in lamports or token units
    setUserBalance(fakeBalance);
  };

  const claimLP = async () => {
    if (!userBalance || claimed) return;
    setLoading(true);
    try {
      // TODO: implement Anchor program call to claim_lp
      console.log("Calling claim_lp with balance:", userBalance);
      const fakeTx = '3hQXYZ123fakeTXexampleHash';
      setTxHash(fakeTx);
      setClaimed(true);
    } catch (err) {
      console.error('Claim failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="claim-container">
      <h2>Claim LP Rewards</h2>
      {connected ? (
        <>
          <p><strong>Token:</strong> {tokenMint.toString()}</p>
          <p><strong>Snapshot Time:</strong> {new Date(snapshotInfo.timestamp * 1000).toLocaleString()}</p>
          <p><strong>Your Balance at Snapshot:</strong> {userBalance ?? 'Loading...'} tokens</p>
          {claimed ? (
            <p>✅ You have claimed your rewards.</p>
          ) : (
            <button onClick={claimLP} disabled={!userBalance || loading}>
              {loading ? 'Claiming...' : 'Claim My LP'}
            </button>
          )}
          {txHash && <p>Transaction: <a href={`https://solscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a></p>}
        </>
      ) : (
        <p>Please connect your wallet to claim.</p>
      )}
    </div>
  );
};

export default ClaimLPRewards;
