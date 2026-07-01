export interface PartnerConfig {
  name: string;
  logo: string;
  supportUrl: string;
  docsUrl: string;
  termsOfServiceUrl: string;
  publicApiKey: string;
  afterAuthRedirectUrl: string;
  isStagingEnv?: boolean;
  // Skintwin-AI Cognitive Architecture Configuration
  cognitiveArchitectureEnabled?: boolean;
  neuralTransportEndpoint?: string;
  rrHypergraphEndpoint?: string;
  // Skintwin Platform Integrations
  lmsIntegrationEnabled?: boolean;
  lmsEndpoint?: string;
  supplyChainEndpoint?: string;
  marketplaceEnabled?: boolean;
  // Multi-Platform Commerce Integration
  wixIntegrationEnabled?: boolean;
  wixApiKey?: string;
  wixSiteId?: string;
  opencartIntegrationEnabled?: boolean;
  opencartApiUrl?: string;
  shopifyB2BEnabled?: boolean;
}

export type PartnerConfigSerializable = Omit<
  PartnerConfig,
  | "afterAuthRedirectUrl"
  | "isStagingEnv"
  | "wixApiKey"
  | "wixSiteId"
  | "opencartApiUrl"
  | "neuralTransportEndpoint"
  | "rrHypergraphEndpoint"
  | "lmsEndpoint"
  | "supplyChainEndpoint"
>;

/**
 *
 * Strips out server only properties on the partner config
 */
export function getSerializableConfig({
  afterAuthRedirectUrl: _afterAuthRedirectUrl,
  isStagingEnv: _isStagingEnv,
  wixApiKey: _wixApiKey,
  wixSiteId: _wixSiteId,
  opencartApiUrl: _opencartApiUrl,
  neuralTransportEndpoint: _neuralTransportEndpoint,
  rrHypergraphEndpoint: _rrHypergraphEndpoint,
  lmsEndpoint: _lmsEndpoint,
  supplyChainEndpoint: _supplyChainEndpoint,
  ...config
}: PartnerConfig) {
  return config;
}

export const config = {
  /** Your company name as it will appear in copy around the site */
  name: "SkinTwin AI",
  logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"><rect width="200" height="200" rx="40" fill="#E91E63"/><path d="M100 30C60 30 30 60 30 100C30 140 60 170 100 170C140 170 170 140 170 100" stroke="white" stroke-width="8" stroke-linecap="round"/><circle cx="100" cy="100" r="25" fill="white"/><path d="M130 70C145 85 145 115 130 130" stroke="white" stroke-width="6" stroke-linecap="round"/><path d="M145 55C168 78 168 122 145 145" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>',
  supportUrl: "https://support.skintwin.ai",
  /** If you have specific partnership docs, enter them here. Otherwise your general documentation. */
  docsUrl: "https://docs.skintwin.ai",
  publicApiKey: process.env.SHOPIFY_API_KEY!,
  afterAuthRedirectUrl:
    process.env.SKINTWIN_CALLBACK_URL || "https://skintwin.ai/shopify/callback",
  termsOfServiceUrl: "https://skintwin.ai/terms",
  isStagingEnv: process.env.NODE_ENV !== "production",
  // Cognitive Architecture Configuration
  cognitiveArchitectureEnabled:
    process.env.COGNITIVE_ARCHITECTURE_ENABLED === "true",
  neuralTransportEndpoint: process.env.NEURAL_TRANSPORT_ENDPOINT,
  rrHypergraphEndpoint: process.env.RR_HYPERGRAPH_ENDPOINT,
  // Skintwin Platform Integrations
  lmsIntegrationEnabled: process.env.LMS_INTEGRATION_ENABLED === "true",
  lmsEndpoint: process.env.LMS_ENDPOINT,
  supplyChainEndpoint: process.env.SUPPLY_CHAIN_ENDPOINT,
  marketplaceEnabled: process.env.MARKETPLACE_ENABLED === "true",
  // Multi-Platform Commerce Integration
  wixIntegrationEnabled: process.env.WIX_INTEGRATION_ENABLED === "true",
  wixApiKey: process.env.WIX_API_KEY,
  wixSiteId: process.env.WIX_SITE_ID,
  opencartIntegrationEnabled:
    process.env.OPENCART_INTEGRATION_ENABLED === "true",
  opencartApiUrl: process.env.OPENCART_API_URL,
  shopifyB2BEnabled: process.env.SHOPIFY_B2B_ENABLED === "true",
} satisfies PartnerConfig;
