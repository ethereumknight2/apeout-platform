// src/test/debugPrograms.ts
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import apeoutSwapIdl from '../idl/apeout_swap.json';

// Test creating a single program first
export const testSingleProgram = () => {
  try {
    const connection = new Connection(clusterApiUrl('devnet'));
    const programId = new PublicKey('GeTSVKTigSuwtBtVDPKhcxGX4TXizJQxtjwQeCYPaJ9z');
    
    console.log('IDL loaded:', apeoutSwapIdl.name);
    console.log('Program ID:', programId.toString());
    console.log('Connection:', connection.rpcEndpoint);
    
    // Create a mock wallet for testing
    const mockWallet = {
      publicKey: new PublicKey('11111111111111111111111111111112'), // System program as dummy
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    
    const provider = new AnchorProvider(connection, mockWallet, {
      commitment: 'confirmed',
    });
    
    console.log('Provider created');
    
    const program = new Program(apeoutSwapIdl as Idl, programId, provider);
    
    console.log('✅ Program created successfully!');
    console.log('Program type:', typeof program);
    console.log('Program methods:', Object.keys(program.methods || {}));
    
    return program;
    
  } catch (error) {
    console.error('❌ Error creating program:', error);
    return null;
  }
};

// Add this to any component to test
export const TestAnchorDebug: React.FC = () => {
  const handleTest = () => {
    console.log('Testing single program creation...');
    const result = testSingleProgram();
    console.log('Test result:', result);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid red', margin: '10px' }}>
      <h3>🔧 Debug Anchor Programs</h3>
      <button onClick={handleTest}>Test Single Program Creation</button>
    </div>
  );
};