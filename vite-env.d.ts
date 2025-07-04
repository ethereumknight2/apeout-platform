/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: string;
  readonly VITE_RPC_ENDPOINT: string;
  readonly VITE_FEE_REWARDS_PROGRAM_ID: string;
  readonly VITE_HOLDER_DISTRIBUTION_PROGRAM_ID: string;
  readonly VITE_LP_CUSTODY_PROGRAM_ID: string;
  readonly VITE_STATUS_TRACKER_PROGRAM_ID: string;
  readonly VITE_APEOUT_TOKEN_MINT: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WEBSOCKET_URL: string;
  readonly VITE_ANALYTICS_ID: string;
  readonly VITE_ENABLE_STAKING: string;
  readonly VITE_ENABLE_REWARDS: string;
  readonly VITE_ENABLE_LP_CLAIMS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
