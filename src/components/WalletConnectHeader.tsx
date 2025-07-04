
import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletConnectHeader = () => {
  return (
    <div className="wallet-header">
      <WalletMultiButton />
    </div>
  );
};

export default WalletConnectHeader;
