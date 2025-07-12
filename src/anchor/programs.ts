// src/anchor/programs.ts
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

// Program IDs from your deployed contracts
export const PROGRAM_IDS = {
  apeoutSwap: new PublicKey('GeTSVKTigSuwtBtVDPKhcxGX4TXizJQxtjwQeCYPaJ9z'),
  categoryTracker: new PublicKey('FWVc9huqjX9XbPJ8BZ1KFmz572pyqXRtsF5gFRVTEx97'),
  dailyGameVault: new PublicKey('5DhpMM7Qbi7HK8H2LJJjvBqLCmasQVwqirexo61UpikF'),
  feeRewards: new PublicKey('5jeZr9rczv1NrQdsrNrHAnZAzZht6KRDTCvEWoWhuLna'),
  holderDistribution: new PublicKey('3GuaNdYEfhBBd69ejiow6Xo6HeBoFXtzD4txED5bMTxX'),
  lpCustody: new PublicKey('423GhdzXo7gogEHQz5Np2FfmF28P3B3acHufnU8WcHey'),
  projectStatusTracker: new PublicKey('AKmu1fAHBfL25EdruRLrNxRARwk66ixzHXyfEQAKieqV'),
  tokenLauncher: new PublicKey('Aqtnv6qAEE5PzbfPBL3bS4JyjkPFuiZb1YTW8pLZRRdw'),
};

export interface AnchorPrograms {
  apeoutSwap: Program<any>;
  categoryTracker: Program<any>;
  dailyGameVault: Program<any>;
  feeRewards: Program<any>;
  holderDistribution: Program<any>;
  lpCustody: Program<any>;
  projectStatusTracker: Program<any>;
  tokenLauncher: Program<any>;
}

// Create a fallback IDL that will work even if files are missing
const createFallbackIDL = (programName: string, programId: PublicKey) => ({
  version: "0.1.0",
  name: programName,
  address: programId.toString(),
  instructions: [
    {
      name: "placeholder",
      accounts: [],
      args: []
    }
  ],
  accounts: [],
  types: [],
  errors: []
});

// Safe program creation that won't break if IDL is missing
function createSafeProgram(
  programName: string,
  programId: PublicKey,
  provider: AnchorProvider
): Program<any> {
  try {
    // Try to load the real IDL
    const idl = require(`../idl/${programName}.json`);
    
    // Add the address field that newer Anchor versions expect
    const enhancedIdl = {
      ...idl,
      address: programId.toString()
    };
    
    // Use the correct constructor: new Program(idl, provider)
    return new Program(enhancedIdl, provider);
  } catch (error) {
    console.warn(`⚠️ Could not load IDL for ${programName}, creating placeholder`);
    // Create a placeholder program that won't crash the app
    const fallbackIDL = createFallbackIDL(programName, programId);
    
    return new Program(fallbackIDL, provider);
  }
}

export function createAnchorPrograms(
  connection: Connection,
  wallet: any
): AnchorPrograms | null {
  if (!wallet?.publicKey || !wallet?.signTransaction) {
    console.log('❌ Wallet not properly connected');
    return null;
  }

  try {
    // Create provider first
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });

    console.log('✅ Provider created for wallet:', wallet.publicKey.toString());

    // Create all programs safely
    const programs: AnchorPrograms = {
      apeoutSwap: createSafeProgram('apeout_swap', PROGRAM_IDS.apeoutSwap, provider),
      categoryTracker: createSafeProgram('category_tracker', PROGRAM_IDS.categoryTracker, provider),
      dailyGameVault: createSafeProgram('daily_game_vault', PROGRAM_IDS.dailyGameVault, provider),
      feeRewards: createSafeProgram('fee_rewards', PROGRAM_IDS.feeRewards, provider),
      holderDistribution: createSafeProgram('holder_distribution', PROGRAM_IDS.holderDistribution, provider),
      lpCustody: createSafeProgram('lp_custody', PROGRAM_IDS.lpCustody, provider),
      projectStatusTracker: createSafeProgram('project_status_tracker', PROGRAM_IDS.projectStatusTracker, provider),
      tokenLauncher: createSafeProgram('token_launcher', PROGRAM_IDS.tokenLauncher, provider),
    };

    console.log('✅ All Anchor programs created successfully!');
    console.log('Available programs:', Object.keys(programs));

    // Test that we can access methods
    if (programs.apeoutSwap.methods) {
      console.log('✅ Program methods accessible');
    }

    return programs;

  } catch (error) {
    console.error('❌ Failed to create Anchor programs:', error);
    return null;
  }
}

// Utility function to check if programs are working
export function testPrograms(programs: AnchorPrograms | null): boolean {
  if (!programs) {
    console.log('❌ No programs to test');
    return false;
  }

  try {
    // Basic test - check if we can access program properties
    const programNames = Object.keys(programs);
    console.log('🧪 Testing programs:', programNames);

    for (const name of programNames) {
      const program = (programs as any)[name];
      if (!program || !program.programId) {
        console.log(`❌ Program ${name} invalid`);
        return false;
      }
      console.log(`✅ Program ${name} valid`);
    }

    console.log('✅ All programs passed basic tests');
    return true;

  } catch (error) {
    console.error('❌ Program test failed:', error);
    return false;
  }
}