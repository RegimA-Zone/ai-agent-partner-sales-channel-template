/**
 * Wix Connector Implementation
 * Connects to Wix Bookings and Wix Stores APIs
 * Based on patterns from skintwin-integrations
 */

import {
  AbstractPlatformConnector,
  ConnectorError,
  type ConnectionStatus,
  type PaginatedResponse,
  type PaginationParams,
  type SyncResult,
} from "./base";
import type {
  UnifiedProduct,
  UnifiedCustomer,
  UnifiedOrder,
} from "../models";

/**
 * Wix-specific configuration
 */
export interface WixConnectorConfig {
  apiUrl: string;
  apiKey: string;
  siteId: string;
  accountId?: string;
}

/**
 * Wix Platform Connector
 */
export class WixConnector extends AbstractPlatformConnector {
  readonly platform = "wix" as const;
  private siteId: string;
  private accountId?: string;

  constructor(config: WixConnectorConfig) {
    super({ apiUrl: config.apiUrl, apiKey: config.apiKey });
    this.siteId = config.siteId;
    this.accountId = config.accountId;
  }

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      // Wix API health check endpoint
      await this.makeRequest("/v1/health");
      this.connectionStatus = {
        connected: true,
        lastChecked: new Date(),
      };
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
    return this.connectionStatus;
  }

  products = {
    list: async (
      params?: PaginationParams
    ): Promise<PaginatedResponse<UnifiedProduct>> => {
      try {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.cursor) queryParams.set("cursor", params.cursor);

        const response = await this.makeRequest<{
          products: WixProduct[];
          pagingMetadata?: { cursors?: { next?: string } };
        }>(`/v1/products?${queryParams}`);

        return {
          items: response.products.map(this.mapWixProductToUnified),
          pageInfo: {
            hasNextPage: !!response.pagingMetadata?.cursors?.next,
            hasPreviousPage: false,
            endCursor: response.pagingMetadata?.cursors?.next,
          },
        };
      } catch (error) {
        throw new ConnectorError(
          "wix",
          "LIST_PRODUCTS_FAILED",
          error instanceof Error ? error.message : "Failed to list products"
        );
      }
    },

    get: async (id: string): Promise<UnifiedProduct | null> => {
      try {
        const response = await this.makeRequest<{ product: WixProduct }>(
          `/v1/products/${id}`
        );
        return this.mapWixProductToUnified(response.product);
      } catch {
        return null;
      }
    },

    create: async (
      product: Omit<
        UnifiedProduct,
        "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus"
      >
    ): Promise<SyncResult<UnifiedProduct>> => {
      try {
        const wixProduct = this.mapUnifiedToWixProduct(product);
        const response = await this.makeRequest<{ product: WixProduct }>(
          "/v1/products",
          {
            method: "POST",
            body: JSON.stringify({ product: wixProduct }),
          }
        );

        return {
          success: true,
          data: this.mapWixProductToUnified(response.product),
          platformId: response.product.id,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "CREATE_FAILED",
            message:
              error instanceof Error ? error.message : "Failed to create product",
          },
        };
      }
    },

    update: async (
      id: string,
      product: Partial<UnifiedProduct>
    ): Promise<SyncResult<UnifiedProduct>> => {
      try {
        const wixProduct = this.mapUnifiedToWixProduct(product as UnifiedProduct);
        const response = await this.makeRequest<{ product: WixProduct }>(
          `/v1/products/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ product: wixProduct }),
          }
        );

        return {
          success: true,
          data: this.mapWixProductToUnified(response.product),
          platformId: response.product.id,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message:
              error instanceof Error ? error.message : "Failed to update product",
          },
        };
      }
    },

    delete: async (id: string): Promise<SyncResult<void>> => {
      try {
        await this.makeRequest(`/v1/products/${id}`, { method: "DELETE" });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DELETE_FAILED",
            message:
              error instanceof Error ? error.message : "Failed to delete product",
          },
        };
      }
    },

    sync: async (product: UnifiedProduct): Promise<SyncResult<UnifiedProduct>> => {
      const wixId = product.platformIds.wix;
      if (wixId) {
        return this.products.update(wixId, product);
      } else {
        return this.products.create(product);
      }
    },
  };

  customers = {
    list: async (
      params?: PaginationParams
    ): Promise<PaginatedResponse<UnifiedCustomer>> => {
      try {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.cursor) queryParams.set("cursor", params.cursor);

        const response = await this.makeRequest<{
          contacts: WixContact[];
          pagingMetadata?: { cursors?: { next?: string } };
        }>(`/v1/contacts?${queryParams}`);

        return {
          items: response.contacts.map(this.mapWixContactToUnified),
          pageInfo: {
            hasNextPage: !!response.pagingMetadata?.cursors?.next,
            hasPreviousPage: false,
            endCursor: response.pagingMetadata?.cursors?.next,
          },
        };
      } catch (error) {
        throw new ConnectorError(
          "wix",
          "LIST_CUSTOMERS_FAILED",
          error instanceof Error ? error.message : "Failed to list customers"
        );
      }
    },

    get: async (id: string): Promise<UnifiedCustomer | null> => {
      try {
        const response = await this.makeRequest<{ contact: WixContact }>(
          `/v1/contacts/${id}`
        );
        return this.mapWixContactToUnified(response.contact);
      } catch {
        return null;
      }
    },

    create: async (
      customer: Omit<
        UnifiedCustomer,
        "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus"
      >
    ): Promise<SyncResult<UnifiedCustomer>> => {
      try {
        const wixContact = this.mapUnifiedToWixContact(customer);
        const response = await this.makeRequest<{ contact: WixContact }>(
          "/v1/contacts",
          {
            method: "POST",
            body: JSON.stringify({ contact: wixContact }),
          }
        );

        return {
          success: true,
          data: this.mapWixContactToUnified(response.contact),
          platformId: response.contact.id,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "CREATE_FAILED",
            message:
              error instanceof Error ? error.message : "Failed to create customer",
          },
        };
      }
    },

    update: async (
      id: string,
      customer: Partial<UnifiedCustomer>
    ): Promise<SyncResult<UnifiedCustomer>> => {
      try {
        const wixContact = this.mapUnifiedToWixContact(
          customer as UnifiedCustomer
        );
        const response = await this.makeRequest<{ contact: WixContact }>(
          `/v1/contacts/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ contact: wixContact }),
          }
        );

        return {
          success: true,
          data: this.mapWixContactToUnified(response.contact),
          platformId: response.contact.id,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message:
              error instanceof Error ? error.message : "Failed to update customer",
          },
        };
      }
    },

    sync: async (
      customer: UnifiedCustomer
    ): Promise<SyncResult<UnifiedCustomer>> => {
      const wixId = customer.platformIds.wix;
      if (wixId) {
        return this.customers.update(wixId, customer);
      } else {
        return this.customers.create(customer);
      }
    },
  };

  orders = {
    list: async (
      params?: PaginationParams
    ): Promise<PaginatedResponse<UnifiedOrder>> => {
      try {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.cursor) queryParams.set("cursor", params.cursor);

        const response = await this.makeRequest<{
          orders: WixOrder[];
          pagingMetadata?: { cursors?: { next?: string } };
        }>(`/v1/orders?${queryParams}`);

        return {
          items: response.orders.map(this.mapWixOrderToUnified),
          pageInfo: {
            hasNextPage: !!response.pagingMetadata?.cursors?.next,
            hasPreviousPage: false,
            endCursor: response.pagingMetadata?.cursors?.next,
          },
        };
      } catch (error) {
        throw new ConnectorError(
          "wix",
          "LIST_ORDERS_FAILED",
          error instanceof Error ? error.message : "Failed to list orders"
        );
      }
    },

    get: async (id: string): Promise<UnifiedOrder | null> => {
      try {
        const response = await this.makeRequest<{ order: WixOrder }>(
          `/v1/orders/${id}`
        );
        return this.mapWixOrderToUnified(response.order);
      } catch {
        return null;
      }
    },

    sync: async (order: UnifiedOrder): Promise<SyncResult<UnifiedOrder>> => {
      // Orders are typically read-only from external platforms
      // This would be used for order status sync
      return {
        success: true,
        data: order,
        platformId: order.platformIds.wix,
      };
    },
  };

  // Mapping functions
  private mapWixProductToUnified(wixProduct: WixProduct): UnifiedProduct {
    return {
      id: `wix_${wixProduct.id}`,
      platformIds: { wix: wixProduct.id },
      title: wixProduct.name || "",
      description: wixProduct.description || "",
      handle: wixProduct.slug || "",
      status: wixProduct.visible ? "active" : "draft",
      variants: (wixProduct.variants || []).map((v) => ({
        id: `wix_${v.id}`,
        platformIds: { wix: v.id },
        title: v.variantName || "",
        sku: v.sku || "",
        price: {
          amount: v.price?.amount?.toString() || "0",
          currencyCode: v.price?.currency || "USD",
        },
        inventoryQuantity: v.stock?.quantity || 0,
        inventoryPolicy: "deny" as const,
        options: [],
      })),
      images: (wixProduct.media?.items || []).map((m, i) => ({
        id: `wix_${m.id || i}`,
        src: m.image?.url || "",
        alt: m.image?.altText || "",
        position: i,
      })),
      tags: wixProduct.productType ? [wixProduct.productType] : [],
      categories: [],
      metadata: {},
      createdAt: new Date(wixProduct.createdDate || Date.now()),
      updatedAt: new Date(wixProduct.lastUpdated || Date.now()),
      syncStatus: {
        lastSyncedAt: new Date(),
        platformStatus: { wix: "synced" },
      },
    };
  }

  private mapUnifiedToWixProduct(
    product: UnifiedProduct | Partial<UnifiedProduct>
  ): Partial<WixProduct> {
    return {
      name: product.title,
      description: product.description,
      slug: product.handle,
      visible: product.status === "active",
      productType: product.tags?.[0],
    };
  }

  private mapWixContactToUnified(contact: WixContact): UnifiedCustomer {
    return {
      id: `wix_${contact.id}`,
      platformIds: { wix: contact.id },
      email: contact.primaryInfo?.email || "",
      firstName: contact.info?.name?.first || "",
      lastName: contact.info?.name?.last || "",
      phone: contact.primaryInfo?.phone || "",
      addresses: (contact.info?.addresses || []).map((a, i) => ({
        id: `wix_addr_${i}`,
        address1: a.address?.streetAddress?.name || "",
        city: a.address?.city || "",
        country: a.address?.country || "",
        countryCode: a.address?.country || "",
        zip: a.address?.postalCode || "",
        isDefault: i === 0,
      })),
      tags: contact.info?.labelKeys || [],
      createdAt: new Date(contact.createdDate || Date.now()),
      updatedAt: new Date(contact.updatedDate || Date.now()),
      syncStatus: {
        lastSyncedAt: new Date(),
        platformStatus: { wix: "synced" },
      },
    };
  }

  private mapUnifiedToWixContact(
    customer: UnifiedCustomer | Partial<UnifiedCustomer>
  ): Partial<WixContact> {
    return {
      primaryInfo: {
        email: customer.email,
        phone: customer.phone,
      },
      info: {
        name: {
          first: customer.firstName,
          last: customer.lastName,
        },
      },
    };
  }

  private mapWixOrderToUnified(order: WixOrder): UnifiedOrder {
    return {
      id: `wix_${order.id}`,
      platformIds: { wix: order.id },
      orderNumber: order.number?.toString() || "",
      email: order.buyerInfo?.email || "",
      financialStatus: this.mapWixPaymentStatus(order.paymentStatus),
      fulfillmentStatus: this.mapWixFulfillmentStatus(order.fulfillmentStatus),
      lineItems: (order.lineItems || []).map((item) => ({
        id: `wix_${item.id}`,
        productId: item.productId || "",
        variantId: item.variantId || "",
        title: item.name || "",
        quantity: item.quantity || 1,
        price: {
          amount: item.price?.toString() || "0",
          currencyCode: order.currency || "USD",
        },
        totalDiscount: { amount: "0", currencyCode: order.currency || "USD" },
        fulfillableQuantity: item.quantity || 1,
      })),
      subtotalPrice: {
        amount: order.priceSummary?.subtotal?.toString() || "0",
        currencyCode: order.currency || "USD",
      },
      totalTax: {
        amount: order.priceSummary?.tax?.toString() || "0",
        currencyCode: order.currency || "USD",
      },
      totalPrice: {
        amount: order.priceSummary?.total?.toString() || "0",
        currencyCode: order.currency || "USD",
      },
      tags: [],
      createdAt: new Date(order.createdDate || Date.now()),
      updatedAt: new Date(order.updatedDate || Date.now()),
      syncStatus: {
        lastSyncedAt: new Date(),
        platformStatus: { wix: "synced" },
      },
    };
  }

  private mapWixPaymentStatus(
    status?: string
  ): UnifiedOrder["financialStatus"] {
    switch (status) {
      case "PAID":
        return "paid";
      case "PARTIALLY_PAID":
        return "partially_paid";
      case "REFUNDED":
        return "refunded";
      default:
        return "pending";
    }
  }

  private mapWixFulfillmentStatus(
    status?: string
  ): UnifiedOrder["fulfillmentStatus"] {
    switch (status) {
      case "FULFILLED":
        return "fulfilled";
      case "PARTIALLY_FULFILLED":
        return "partial";
      default:
        return "unfulfilled";
    }
  }
}

// Wix API types (partial definitions)
interface WixProduct {
  id: string;
  name?: string;
  description?: string;
  slug?: string;
  visible?: boolean;
  productType?: string;
  variants?: WixVariant[];
  media?: { items?: WixMedia[] };
  createdDate?: string;
  lastUpdated?: string;
}

interface WixVariant {
  id: string;
  variantName?: string;
  sku?: string;
  price?: { amount?: number; currency?: string };
  stock?: { quantity?: number };
}

interface WixMedia {
  id?: string;
  image?: { url?: string; altText?: string };
}

interface WixContact {
  id: string;
  primaryInfo?: { email?: string; phone?: string };
  info?: {
    name?: { first?: string; last?: string };
    addresses?: Array<{
      address?: {
        streetAddress?: { name?: string };
        city?: string;
        country?: string;
        postalCode?: string;
      };
    }>;
    labelKeys?: string[];
  };
  createdDate?: string;
  updatedDate?: string;
}

interface WixOrder {
  id: string;
  number?: number;
  buyerInfo?: { email?: string };
  paymentStatus?: string;
  fulfillmentStatus?: string;
  currency?: string;
  lineItems?: Array<{
    id?: string;
    productId?: string;
    variantId?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
  priceSummary?: {
    subtotal?: number;
    tax?: number;
    total?: number;
  };
  createdDate?: string;
  updatedDate?: string;
}
