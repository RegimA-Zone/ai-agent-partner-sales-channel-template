/**
 * OpenCart Platform Connector
 * Implements the BasePlatformConnector interface for OpenCart integration
 */

// =====================================================================
// Constants for OpenCart API
// =====================================================================
/** Default limit for paginated responses */
const DEFAULT_PAGINATION_LIMIT = 20;

import {
  type BasePlatformConnector,
  type ConnectionStatus,
  type PaginationParams,
  type PaginatedResponse,
  type SyncResult,
} from "./base";
import type {
  UnifiedProduct,
  UnifiedCustomer,
  UnifiedOrder,
  UnifiedAddress,
  UnifiedLineItem,
  MoneyAmount,
  SyncStatus,
} from "../models";

/**
 * OpenCart API response types
 */
interface OpenCartProduct {
  product_id: string;
  name: string;
  model: string;
  sku: string;
  price: string;
  quantity: string;
  status: string;
  image: string;
  manufacturer: string;
  description: string;
  meta_title: string;
  meta_description: string;
  date_added: string;
  date_modified: string;
}

interface OpenCartCustomer {
  customer_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone: string;
  customer_group_id: string;
  status: string;
  date_added: string;
  addresses: Array<{
    address_id: string;
    address_1: string;
    address_2: string;
    city: string;
    postcode: string;
    country_id: string;
    zone_id: string;
  }>;
}

interface OpenCartOrder {
  order_id: string;
  invoice_no: string;
  store_name: string;
  customer_id: string;
  firstname: string;
  lastname: string;
  email: string;
  telephone: string;
  total: string;
  order_status_id: string;
  order_status: string;
  currency_code: string;
  currency_value: string;
  date_added: string;
  date_modified: string;
  products: Array<{
    order_product_id: string;
    product_id: string;
    name: string;
    model: string;
    quantity: string;
    price: string;
    total: string;
  }>;
}

export interface OpenCartConfig {
  apiUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

/**
 * Helper to create a MoneyAmount
 */
function createMoneyAmount(amount: number, currency = "USD"): MoneyAmount {
  return { amount: amount.toFixed(2), currencyCode: currency };
}

/**
 * Helper to create a SyncStatus
 */
function createSyncStatus(): SyncStatus {
  return {
    lastSyncedAt: new Date(),
    platformStatus: { opencart: "synced" },
  };
}

/**
 * OpenCart Platform Connector Implementation
 */
export class OpenCartConnector implements BasePlatformConnector {
  readonly platform = "opencart" as const;

  private config: OpenCartConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private isConnected = false;

  products: BasePlatformConnector["products"];
  customers: BasePlatformConnector["customers"];
  orders: BasePlatformConnector["orders"];

  constructor(config: OpenCartConfig) {
    this.config = config;

    // Initialize product operations
    this.products = {
      list: (params) => this.listProducts(params),
      get: (id) => this.getProduct(id),
      create: (product) => this.createProduct(product),
      update: (id, product) => this.updateProduct(id, product),
      delete: (id) => this.deleteProduct(id),
      sync: (product) => this.syncProduct(product),
    };

    // Initialize customer operations
    this.customers = {
      list: (params) => this.listCustomers(params),
      get: (id) => this.getCustomer(id),
      create: (customer) => this.createCustomer(customer),
      update: (id, customer) => this.updateCustomer(id, customer),
      sync: (customer) => this.syncCustomer(customer),
    };

    // Initialize order operations
    this.orders = {
      list: (params) => this.listOrders(params),
      get: (id) => this.getOrder(id),
      sync: (order) => this.syncOrder(order),
    };
  }

  /**
   * Get authentication token for API requests
   */
  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    const response = await fetch(this.config.apiUrl + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenCart authentication failed: " + response.statusText);
    }

    const data = await response.json();
    this.token = data.api_token;
    this.tokenExpiry = Date.now() + 3600000;

    return this.token!;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown
  ): Promise<T> {
    const token = await this.getToken();
    const url = this.config.apiUrl + "/api/" + endpoint;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Oc-Restadmin-Id": token,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error("OpenCart API error: " + response.status + " - " + error);
    }

    return response.json();
  }

  // ============================================
  // Connection Operations
  // ============================================

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      await this.getToken();
      this.isConnected = true;
      return {
        connected: true,
        lastChecked: new Date(),
      };
    } catch (error) {
      this.isConnected = false;
      return {
        connected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  // ============================================
  // Product Operations
  // ============================================

  private async listProducts(
    params?: PaginationParams
  ): Promise<PaginatedResponse<UnifiedProduct>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.page) queryParams.set("start", ((params.page - 1) * (params.limit || DEFAULT_PAGINATION_LIMIT)).toString());

      const data = await this.apiRequest<{ data: OpenCartProduct[] }>(
        "products?" + queryParams.toString()
      );

      return {
        items: data.data.map((p) => this.transformProduct(p)),
        pageInfo: {
          hasNextPage: data.data.length === (params?.limit || 20),
          hasPreviousPage: (params?.page || 1) > 1,
        },
      };
    } catch {
      return { items: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
    }
  }

  private async getProduct(productId: string): Promise<UnifiedProduct | null> {
    try {
      const data = await this.apiRequest<{ data: OpenCartProduct }>(
        "products/" + productId
      );
      return this.transformProduct(data.data);
    } catch {
      return null;
    }
  }

  private async createProduct(
    product: Omit<UnifiedProduct, "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus">
  ): Promise<SyncResult<UnifiedProduct>> {
    try {
      const opencartProduct = this.toOpenCartProduct(product);
      const data = await this.apiRequest<{ data: OpenCartProduct }>(
        "products",
        "POST",
        opencartProduct
      );

      return {
        success: true,
        data: this.transformProduct(data.data),
        platformId: data.data.product_id,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private async updateProduct(
    productId: string,
    updates: Partial<UnifiedProduct>
  ): Promise<SyncResult<UnifiedProduct>> {
    try {
      const opencartUpdates = this.toOpenCartProductUpdate(updates);
      const data = await this.apiRequest<{ data: OpenCartProduct }>(
        "products/" + productId,
        "PUT",
        opencartUpdates
      );

      return {
        success: true,
        data: this.transformProduct(data.data),
        platformId: productId,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private async deleteProduct(productId: string): Promise<SyncResult<void>> {
    try {
      await this.apiRequest("products/" + productId, "DELETE");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private async syncProduct(product: UnifiedProduct): Promise<SyncResult<UnifiedProduct>> {
    const opencartId = product.platformIds?.opencart;
    if (opencartId) {
      return this.updateProduct(opencartId, product);
    }
    return this.createProduct(product);
  }

  // ============================================
  // Customer Operations
  // ============================================

  private async listCustomers(
    params?: PaginationParams
  ): Promise<PaginatedResponse<UnifiedCustomer>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set("limit", params.limit.toString());

      const data = await this.apiRequest<{ data: OpenCartCustomer[] }>(
        "customers?" + queryParams.toString()
      );

      return {
        items: data.data.map((c) => this.transformCustomer(c)),
        pageInfo: {
          hasNextPage: data.data.length === (params?.limit || 20),
          hasPreviousPage: false,
        },
      };
    } catch {
      return { items: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
    }
  }

  private async getCustomer(customerId: string): Promise<UnifiedCustomer | null> {
    try {
      const data = await this.apiRequest<{ data: OpenCartCustomer }>(
        "customers/" + customerId
      );
      return this.transformCustomer(data.data);
    } catch {
      return null;
    }
  }

  private async createCustomer(
    customer: Omit<UnifiedCustomer, "id" | "platformIds" | "createdAt" | "updatedAt" | "syncStatus">
  ): Promise<SyncResult<UnifiedCustomer>> {
    try {
      const data = await this.apiRequest<{ data: OpenCartCustomer }>(
        "customers",
        "POST",
        this.toOpenCartCustomer(customer)
      );

      return {
        success: true,
        data: this.transformCustomer(data.data),
        platformId: data.data.customer_id,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private async updateCustomer(
    customerId: string,
    updates: Partial<UnifiedCustomer>
  ): Promise<SyncResult<UnifiedCustomer>> {
    try {
      const data = await this.apiRequest<{ data: OpenCartCustomer }>(
        "customers/" + customerId,
        "PUT",
        this.toOpenCartCustomerUpdate(updates)
      );

      return {
        success: true,
        data: this.transformCustomer(data.data),
        platformId: customerId,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private async syncCustomer(customer: UnifiedCustomer): Promise<SyncResult<UnifiedCustomer>> {
    const opencartId = customer.platformIds?.opencart;
    if (opencartId) {
      return this.updateCustomer(opencartId, customer);
    }
    return this.createCustomer(customer);
  }

  // ============================================
  // Order Operations
  // ============================================

  private async listOrders(
    params?: PaginationParams
  ): Promise<PaginatedResponse<UnifiedOrder>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set("limit", params.limit.toString());

      const data = await this.apiRequest<{ data: OpenCartOrder[] }>(
        "orders?" + queryParams.toString()
      );

      return {
        items: data.data.map((o) => this.transformOrder(o)),
        pageInfo: {
          hasNextPage: data.data.length === (params?.limit || 20),
          hasPreviousPage: false,
        },
      };
    } catch {
      return { items: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
    }
  }

  private async getOrder(orderId: string): Promise<UnifiedOrder | null> {
    try {
      const data = await this.apiRequest<{ data: OpenCartOrder }>(
        "orders/" + orderId
      );
      return this.transformOrder(data.data);
    } catch {
      return null;
    }
  }

  private async syncOrder(order: UnifiedOrder): Promise<SyncResult<UnifiedOrder>> {
    // Orders are typically read-only from external platforms
    return {
      success: true,
      data: order,
      platformId: order.platformIds?.opencart,
    };
  }

  // ============================================
  // Transform Methods
  // ============================================

  private transformProduct(product: OpenCartProduct): UnifiedProduct {
    return {
      id: "opencart-" + product.product_id,
      platformIds: { opencart: product.product_id },
      title: product.name,
      handle: product.model.toLowerCase().replace(/\s+/g, "-"),
      description: product.description,
      status: product.status === "1" ? "active" : "draft",
      variants: [
        {
          id: "opencart-variant-" + product.product_id,
          platformIds: { opencart: product.product_id },
          title: "Default",
          sku: product.sku || product.model,
          price: createMoneyAmount(parseFloat(product.price)),
          inventoryQuantity: parseInt(product.quantity, 10),
          inventoryPolicy: "deny",
          options: [],
        },
      ],
      images: product.image
        ? [{ id: "img-" + product.product_id, src: product.image, alt: product.name, position: 1 }]
        : [],
      tags: [],
      categories: [],
      metadata: {
        metaTitle: product.meta_title,
        metaDescription: product.meta_description,
        manufacturer: product.manufacturer,
      },
      syncStatus: createSyncStatus(),
      createdAt: new Date(product.date_added),
      updatedAt: new Date(product.date_modified),
    };
  }

  private transformCustomer(customer: OpenCartCustomer): UnifiedCustomer {
    const addresses: UnifiedAddress[] = customer.addresses?.map((addr, index) => ({
      id: "addr-" + addr.address_id,
      address1: addr.address_1,
      address2: addr.address_2,
      city: addr.city,
      zip: addr.postcode,
      country: addr.country_id,
      countryCode: addr.country_id,
      province: addr.zone_id,
      isDefault: index === 0,
    })) || [];

    return {
      id: "opencart-" + customer.customer_id,
      platformIds: { opencart: customer.customer_id },
      email: customer.email,
      firstName: customer.firstname,
      lastName: customer.lastname,
      phone: customer.telephone,
      addresses,
      tags: [],
      syncStatus: createSyncStatus(),
      createdAt: new Date(customer.date_added),
      updatedAt: new Date(customer.date_added),
    };
  }

  private transformOrder(order: OpenCartOrder): UnifiedOrder {
    const financialStatus: UnifiedOrder["financialStatus"] = "paid";
    const fulfillmentStatus: UnifiedOrder["fulfillmentStatus"] = 
      order.order_status_id === "5" ? "fulfilled" : "unfulfilled";

    const lineItems: UnifiedLineItem[] = order.products.map((p) => ({
      id: p.order_product_id,
      productId: "opencart-" + p.product_id,
      variantId: p.product_id,
      title: p.name,
      quantity: parseInt(p.quantity, 10),
      price: createMoneyAmount(parseFloat(p.price), order.currency_code),
      totalDiscount: createMoneyAmount(0, order.currency_code),
      fulfillableQuantity: parseInt(p.quantity, 10),
    }));

    const subtotal = order.products.reduce((sum, p) => sum + parseFloat(p.total), 0);

    const shippingAddress: UnifiedAddress = {
      id: "shipping-" + order.order_id,
      firstName: order.firstname,
      lastName: order.lastname,
      address1: "",
      city: "",
      zip: "",
      country: "",
      countryCode: "",
      isDefault: false,
    };

    return {
      id: "opencart-" + order.order_id,
      platformIds: { opencart: order.order_id },
      orderNumber: order.invoice_no || order.order_id,
      customerId: order.customer_id ? "opencart-" + order.customer_id : undefined,
      email: order.email,
      financialStatus,
      fulfillmentStatus,
      lineItems,
      subtotalPrice: createMoneyAmount(subtotal, order.currency_code),
      totalTax: createMoneyAmount(0, order.currency_code),
      totalPrice: createMoneyAmount(parseFloat(order.total), order.currency_code),
      shippingAddress,
      tags: [],
      syncStatus: createSyncStatus(),
      createdAt: new Date(order.date_added),
      updatedAt: new Date(order.date_modified),
    };
  }

  private toOpenCartProduct(
    product: Partial<UnifiedProduct>
  ): Partial<OpenCartProduct> {
    return {
      name: product.title,
      model: product.handle || product.title || "",
      sku: product.variants?.[0]?.sku || "",
      price: product.variants?.[0]?.price?.amount || "0",
      quantity: product.variants?.[0]?.inventoryQuantity?.toString() || "0",
      status: product.status === "active" ? "1" : "0",
      description: product.description || "",
      manufacturer: (product.metadata?.manufacturer as string) || "",
      meta_title: (product.metadata?.metaTitle as string) || product.title || "",
      meta_description: (product.metadata?.metaDescription as string) || "",
    };
  }

  private toOpenCartProductUpdate(
    updates: Partial<UnifiedProduct>
  ): Partial<OpenCartProduct> {
    const result: Partial<OpenCartProduct> = {};

    if (updates.title) result.name = updates.title;
    if (updates.handle) result.model = updates.handle;
    if (updates.description) result.description = updates.description;
    if (updates.status) result.status = updates.status === "active" ? "1" : "0";

    if (updates.variants?.[0]) {
      const variant = updates.variants[0];
      if (variant.sku) result.sku = variant.sku;
      if (variant.price) result.price = variant.price.amount;
      if (variant.inventoryQuantity !== undefined) {
        result.quantity = variant.inventoryQuantity.toString();
      }
    }

    if (updates.metadata) {
      if (updates.metadata.manufacturer) result.manufacturer = updates.metadata.manufacturer as string;
      if (updates.metadata.metaTitle) result.meta_title = updates.metadata.metaTitle as string;
      if (updates.metadata.metaDescription) result.meta_description = updates.metadata.metaDescription as string;
    }

    return result;
  }

  private toOpenCartCustomer(
    customer: Partial<UnifiedCustomer>
  ): Record<string, unknown> {
    return {
      firstname: customer.firstName,
      lastname: customer.lastName,
      email: customer.email,
      telephone: customer.phone || "",
      status: "1",
    };
  }

  private toOpenCartCustomerUpdate(
    updates: Partial<UnifiedCustomer>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (updates.firstName) result.firstname = updates.firstName;
    if (updates.lastName) result.lastname = updates.lastName;
    if (updates.email) result.email = updates.email;
    if (updates.phone) result.telephone = updates.phone;

    return result;
  }
}

/**
 * Factory function to create OpenCart connector
 */
export function createOpenCartConnector(config: OpenCartConfig): OpenCartConnector {
  return new OpenCartConnector(config);
}
