/**
 * Base Connector Interface
 * Defines the contract for all platform connectors (Wix, OpenCart, Shopify B2B)
 * Following patterns from skintwin-integrations
 */

import type {
  UnifiedProduct,
  UnifiedCustomer,
  UnifiedOrder,
  UnifiedCompany,
} from "../models";

/**
 * Connection status for a platform connector
 */
export interface ConnectionStatus {
  connected: boolean;
  lastChecked: Date;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
}

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
  page?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount?: number;
  };
}

/**
 * Sync operation result
 */
export interface SyncResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** ID on the target platform after sync */
  platformId?: string;
}

/**
 * Base Platform Connector Interface
 * All platform connectors must implement this interface
 */
export interface BasePlatformConnector {
  /** Platform identifier */
  readonly platform: "wix" | "opencart" | "shopify_b2b";

  /** Check connection status */
  checkConnection(): Promise<ConnectionStatus>;

  /** Product Operations */
  products: {
    list(params?: PaginationParams): Promise<PaginatedResponse<UnifiedProduct>>;
    get(id: string): Promise<UnifiedProduct | null>;
    create(product: Omit<UnifiedProduct, "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus">): Promise<SyncResult<UnifiedProduct>>;
    update(id: string, product: Partial<UnifiedProduct>): Promise<SyncResult<UnifiedProduct>>;
    delete(id: string): Promise<SyncResult<void>>;
    sync(product: UnifiedProduct): Promise<SyncResult<UnifiedProduct>>;
  };

  /** Customer Operations */
  customers: {
    list(params?: PaginationParams): Promise<PaginatedResponse<UnifiedCustomer>>;
    get(id: string): Promise<UnifiedCustomer | null>;
    create(customer: Omit<UnifiedCustomer, "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus">): Promise<SyncResult<UnifiedCustomer>>;
    update(id: string, customer: Partial<UnifiedCustomer>): Promise<SyncResult<UnifiedCustomer>>;
    sync(customer: UnifiedCustomer): Promise<SyncResult<UnifiedCustomer>>;
  };

  /** Order Operations */
  orders: {
    list(params?: PaginationParams): Promise<PaginatedResponse<UnifiedOrder>>;
    get(id: string): Promise<UnifiedOrder | null>;
    sync(order: UnifiedOrder): Promise<SyncResult<UnifiedOrder>>;
  };

  /** B2B Company Operations (optional - not all platforms support B2B) */
  companies?: {
    list(params?: PaginationParams): Promise<PaginatedResponse<UnifiedCompany>>;
    get(id: string): Promise<UnifiedCompany | null>;
    create(company: Omit<UnifiedCompany, "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus">): Promise<SyncResult<UnifiedCompany>>;
    update(id: string, company: Partial<UnifiedCompany>): Promise<SyncResult<UnifiedCompany>>;
    sync(company: UnifiedCompany): Promise<SyncResult<UnifiedCompany>>;
  };
}

/**
 * Helper to create authorization header value
 * The actual token format is handled at runtime
 */
function getAuthHeaderValue(apiKey: string): string {
  // Token-based auth header
  return ["Bearer", apiKey].join(" ");
}

/**
 * Abstract Base Connector with common functionality
 */
export abstract class AbstractPlatformConnector implements BasePlatformConnector {
  abstract readonly platform: "wix" | "opencart" | "shopify_b2b";

  protected apiUrl: string;
  protected apiKey: string;
  protected connectionStatus: ConnectionStatus = {
    connected: false,
    lastChecked: new Date(),
  };

  constructor(config: { apiUrl: string; apiKey: string }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  abstract checkConnection(): Promise<ConnectionStatus>;

  abstract products: BasePlatformConnector["products"];
  abstract customers: BasePlatformConnector["customers"];
  abstract orders: BasePlatformConnector["orders"];
  companies?: BasePlatformConnector["companies"];

  /**
   * Helper to make authenticated API requests
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.apiUrl + endpoint;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: getAuthHeaderValue(this.apiKey),
    };

    // Merge with any additional headers
    if (options.headers) {
      const additionalHeaders = options.headers as Record<string, string>;
      Object.assign(headers, additionalHeaders);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ConnectorError(
        this.platform,
        response.status.toString(),
        error.message || response.statusText,
        error
      );
    }

    return response.json();
  }

  /**
   * Helper to handle rate limiting
   */
  protected updateRateLimitStatus(headers: Headers): void {
    const remaining = headers.get("X-RateLimit-Remaining");
    const resetAt = headers.get("X-RateLimit-Reset");

    if (remaining) {
      this.connectionStatus.rateLimitRemaining = parseInt(remaining, 10);
    }
    if (resetAt) {
      this.connectionStatus.rateLimitResetAt = new Date(parseInt(resetAt, 10) * 1000);
    }
  }
}

/**
 * Custom error class for connector errors
 */
export class ConnectorError extends Error {
  constructor(
    public platform: string,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super("[" + platform + "] " + code + ": " + message);
    this.name = "ConnectorError";
  }
}
