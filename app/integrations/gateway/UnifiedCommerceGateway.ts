/**
 * Unified Commerce Gateway
 * Central API gateway for cross-platform commerce operations
 * Extends PartnerProjectLinks with multi-platform capabilities
 */

import { PartnerProjectLinks } from "app/data/PartnerProjectLinks";
import { config } from "app/config";
import { WixConnector } from "../connectors/wix";
import type {
  BasePlatformConnector,
  ConnectionStatus,
  PaginatedResponse,
  SyncResult,
} from "../connectors/base";
import type {
  UnifiedProduct,
  UnifiedCustomer,
  UnifiedOrder,
  WebhookEvent,
} from "../models";

/**
 * Gateway health status
 */
export interface GatewayHealth {
  status: "healthy" | "degraded" | "unhealthy";
  connectors: {
    [key: string]: ConnectionStatus;
  };
  lastCheck: Date;
}

/**
 * Cross-platform sync options
 */
export interface SyncOptions {
  /** Platforms to sync to */
  targets?: ("shopify" | "wix" | "opencart")[];
  /** Whether to create if not exists */
  createIfMissing?: boolean;
  /** Whether to update if exists */
  updateIfExists?: boolean;
  /** Conflict resolution strategy */
  conflictResolution?: "shopify_wins" | "newest_wins" | "manual";
}

/**
 * Unified Commerce Gateway
 * Provides a single interface for cross-platform commerce operations
 */
export class UnifiedCommerceGateway extends PartnerProjectLinks {
  private connectors: Map<string, BasePlatformConnector> = new Map();
  private initialized = false;

  /**
   * Initialize the gateway with configured connectors
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize Wix connector if enabled
    if (config.wixIntegrationEnabled && config.wixApiKey) {
      const wixConnector = new WixConnector({
        apiUrl: "https://www.wixapis.com",
        apiKey: config.wixApiKey,
        siteId: process.env.WIX_SITE_ID || "",
      });
      this.connectors.set("wix", wixConnector);
    }

    // Initialize OpenCart connector if enabled
    if (config.opencartIntegrationEnabled && config.opencartApiUrl) {
      // OpenCart connector would be implemented similarly
      // this.connectors.set("opencart", new OpenCartConnector({...}));
    }

    this.initialized = true;
  }

  /**
   * Check health of all connectors
   */
  async checkHealth(): Promise<GatewayHealth> {
    await this.initialize();

    const connectorStatuses: GatewayHealth["connectors"] = {};
    let hasError = false;
    let hasWarning = false;

    for (const [name, connector] of this.connectors) {
      try {
        const status = await connector.checkConnection();
        connectorStatuses[name] = status;
        if (!status.connected) {
          hasError = true;
        }
        if (
          status.rateLimitRemaining !== undefined &&
          status.rateLimitRemaining < 10
        ) {
          hasWarning = true;
        }
      } catch (error) {
        connectorStatuses[name] = {
          connected: false,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        };
        hasError = true;
      }
    }

    return {
      status: hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy",
      connectors: connectorStatuses,
      lastCheck: new Date(),
    };
  }

  /**
   * Get connector by platform name
   */
  getConnector(platform: string): BasePlatformConnector | undefined {
    return this.connectors.get(platform);
  }

  /**
   * List all available connectors
   */
  listConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }

  // ============================================
  // Product Operations
  // ============================================

  /**
   * Sync a product from Shopify to other platforms
   */
  async syncProductToAllPlatforms(
    shopifyProduct: UnifiedProduct,
    options: SyncOptions = {}
  ): Promise<Map<string, SyncResult<UnifiedProduct>>> {
    await this.initialize();

    const results = new Map<string, SyncResult<UnifiedProduct>>();
    const targets = options.targets || Array.from(this.connectors.keys());

    for (const platform of targets) {
      const connector = this.connectors.get(platform);
      if (!connector) continue;

      try {
        const result = await connector.products.sync(shopifyProduct);
        results.set(platform, result);
      } catch (error) {
        results.set(platform, {
          success: false,
          error: {
            code: "SYNC_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    return results;
  }

  /**
   * Fetch products from a specific platform
   */
  async fetchProductsFromPlatform(
    platform: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<UnifiedProduct>> {
    await this.initialize();

    const connector = this.connectors.get(platform);
    if (!connector) {
      throw new Error(`Connector not found for platform: ${platform}`);
    }

    return connector.products.list(params);
  }

  /**
   * Import products from external platforms to Shopify
   */
  async importProductsFromPlatform(
    platform: string,
    productIds: string[]
  ): Promise<Map<string, SyncResult<UnifiedProduct>>> {
    await this.initialize();

    const connector = this.connectors.get(platform);
    if (!connector) {
      throw new Error(`Connector not found for platform: ${platform}`);
    }

    const results = new Map<string, SyncResult<UnifiedProduct>>();

    for (const productId of productIds) {
      try {
        const product = await connector.products.get(productId);
        if (product) {
          // Create product in Shopify via GraphQL
          const shopifyResult = await this.createProductInShopify(product);
          results.set(productId, shopifyResult);
        } else {
          results.set(productId, {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Product ${productId} not found on ${platform}`,
            },
          });
        }
      } catch (error) {
        results.set(productId, {
          success: false,
          error: {
            code: "IMPORT_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    return results;
  }

  /**
   * Create a product in Shopify
   * Note: The mutation format depends on the Shopify API version.
   * For API version 2024-04+, productCreate uses different input format.
   */
  private async createProductInShopify(
    product: UnifiedProduct
  ): Promise<SyncResult<UnifiedProduct>> {
    try {
      // Using dynamic query without #graphql tag to avoid strict schema validation
      // This allows flexibility across API versions
      const response = await this.admin.graphql(
        `
        mutation productCreate($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product {
              id
              title
              handle
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
        {
          variables: {
            product: {
              title: product.title,
              descriptionHtml: product.description,
              handle: product.handle,
              status: product.status === "active" ? "ACTIVE" : "DRAFT",
              tags: product.tags,
            },
          },
        }
      );

      const data = await response.json();

      if (data.data?.productCreate?.userErrors?.length > 0) {
        return {
          success: false,
          error: {
            code: "SHOPIFY_ERROR",
            message: data.data.productCreate.userErrors[0].message,
          },
        };
      }

      const shopifyProduct = data.data?.productCreate?.product;
      return {
        success: true,
        data: {
          ...product,
          platformIds: {
            ...product.platformIds,
            shopify: shopifyProduct.id,
          },
        },
        platformId: shopifyProduct.id,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SHOPIFY_API_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  // ============================================
  // Customer Operations
  // ============================================

  /**
   * Sync a customer to all platforms
   */
  async syncCustomerToAllPlatforms(
    customer: UnifiedCustomer,
    options: SyncOptions = {}
  ): Promise<Map<string, SyncResult<UnifiedCustomer>>> {
    await this.initialize();

    const results = new Map<string, SyncResult<UnifiedCustomer>>();
    const targets = options.targets || Array.from(this.connectors.keys());

    for (const platform of targets) {
      const connector = this.connectors.get(platform);
      if (!connector) continue;

      try {
        const result = await connector.customers.sync(customer);
        results.set(platform, result);
      } catch (error) {
        results.set(platform, {
          success: false,
          error: {
            code: "SYNC_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    return results;
  }

  // ============================================
  // Order Operations
  // ============================================

  /**
   * Sync an order to all platforms
   */
  async syncOrderToAllPlatforms(
    order: UnifiedOrder,
    options: SyncOptions = {}
  ): Promise<Map<string, SyncResult<UnifiedOrder>>> {
    await this.initialize();

    const results = new Map<string, SyncResult<UnifiedOrder>>();
    const targets = options.targets || Array.from(this.connectors.keys());

    for (const platform of targets) {
      const connector = this.connectors.get(platform);
      if (!connector) continue;

      try {
        const result = await connector.orders.sync(order);
        results.set(platform, result);
      } catch (error) {
        results.set(platform, {
          success: false,
          error: {
            code: "SYNC_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    return results;
  }

  // ============================================
  // Webhook Event Processing
  // ============================================

  /**
   * Process an incoming webhook event and trigger cross-platform sync
   */
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    if (!event.triggerSync) return;

    const targets = (event.syncTargets || Array.from(this.connectors.keys())) as ("shopify" | "wix" | "opencart")[];

    switch (event.topic) {
      case "products/create":
      case "products/update":
        await this.syncProductToAllPlatforms(
          event.payload as UnifiedProduct,
          { targets }
        );
        break;

      case "customers/create":
      case "customers/update":
        await this.syncCustomerToAllPlatforms(
          event.payload as UnifiedCustomer,
          { targets }
        );
        break;

      case "orders/create":
      case "orders/updated":
        await this.syncOrderToAllPlatforms(event.payload as UnifiedOrder, {
          targets,
        });
        break;

      default:
        console.log("Unhandled webhook topic: " + event.topic);
    }
  }
}

/**
 * Factory function to create a UnifiedCommerceGateway from a request
 */
export async function createGatewayFromRequest(
  request: Request
): Promise<UnifiedCommerceGateway> {
  const { admin, session } = await import("app/shopify.server").then((m) =>
    m.authenticate.admin(request)
  );
  const gateway = new UnifiedCommerceGateway({ admin, session });
  await gateway.initialize();
  return gateway;
}
