/**
 * Canonical Data Models for Cross-Platform Commerce Integration
 * Based on patterns from skintwin-integrations
 *
 * These models provide a unified representation of commerce entities
 * that can be mapped to/from Shopify, Wix, OpenCart, and other platforms.
 */

/**
 * Unified Product Model
 * Canonical representation of a product across all platforms
 */
export interface UnifiedProduct {
  /** Internal canonical ID */
  id: string;
  /** Platform-specific IDs */
  platformIds: {
    shopify?: string;
    wix?: string;
    opencart?: string;
  };
  /** Product title/name */
  title: string;
  /** Product description (HTML or plain text) */
  description: string;
  /** Product handle/slug */
  handle: string;
  /** Product status */
  status: "active" | "draft" | "archived";
  /** Product variants */
  variants: UnifiedProductVariant[];
  /** Product images */
  images: UnifiedProductImage[];
  /** Product tags */
  tags: string[];
  /** Product categories/collections */
  categories: string[];
  /** Product metadata */
  metadata: Record<string, unknown>;
  /** Skincare-specific: ingredient information */
  ingredients?: IngredientInfo[];
  /** Skincare-specific: skin type compatibility */
  skinTypes?: SkinType[];
  /** Timestamp tracking */
  createdAt: Date;
  updatedAt: Date;
  /** Sync status */
  syncStatus: SyncStatus;
}

/**
 * Unified Product Variant
 */
export interface UnifiedProductVariant {
  id: string;
  platformIds: {
    shopify?: string;
    wix?: string;
    opencart?: string;
  };
  title: string;
  sku: string;
  barcode?: string;
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount;
  inventoryQuantity: number;
  inventoryPolicy: "deny" | "continue";
  weight?: number;
  weightUnit?: "kg" | "g" | "lb" | "oz";
  options: VariantOption[];
}

/**
 * Unified Product Image
 */
export interface UnifiedProductImage {
  id: string;
  src: string;
  alt?: string;
  position: number;
  variantIds?: string[];
}

/**
 * Variant Option (e.g., Size: Large, Color: Red)
 */
export interface VariantOption {
  name: string;
  value: string;
}

/**
 * Money Amount with currency
 */
export interface MoneyAmount {
  amount: string;
  currencyCode: string;
}

/**
 * Skincare Ingredient Information
 */
export interface IngredientInfo {
  name: string;
  inciName?: string;
  percentage?: number;
  function: string;
  origin?: "natural" | "synthetic" | "biotechnology";
  supplierIds?: string[];
}

/**
 * Skin Type Compatibility
 */
export type SkinType =
  | "normal"
  | "dry"
  | "oily"
  | "combination"
  | "sensitive"
  | "mature"
  | "acne-prone";

/**
 * Sync Status for cross-platform tracking
 */
export interface SyncStatus {
  lastSyncedAt?: Date;
  syncErrors?: SyncError[];
  platformStatus: {
    shopify?: "synced" | "pending" | "error";
    wix?: "synced" | "pending" | "error";
    opencart?: "synced" | "pending" | "error";
  };
}

/**
 * Sync Error Details
 */
export interface SyncError {
  platform: "shopify" | "wix" | "opencart";
  code: string;
  message: string;
  timestamp: Date;
}

/**
 * Unified Customer Model
 */
export interface UnifiedCustomer {
  id: string;
  platformIds: {
    shopify?: string;
    wix?: string;
    opencart?: string;
  };
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  addresses: UnifiedAddress[];
  tags: string[];
  /** Skincare-specific: customer skin profile */
  skinProfile?: SkinProfile;
  /** LMS integration: training certifications */
  certifications?: Certification[];
  /** B2B: company association */
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

/**
 * Unified Address
 */
export interface UnifiedAddress {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  country: string;
  countryCode: string;
  zip: string;
  phone?: string;
  isDefault: boolean;
}

/**
 * Skincare Skin Profile
 */
export interface SkinProfile {
  skinType: SkinType;
  concerns: string[];
  allergies: string[];
  preferences: {
    fragranceFree?: boolean;
    veganOnly?: boolean;
    organicPreferred?: boolean;
  };
  lastUpdated: Date;
}

/**
 * LMS Certification
 */
export interface Certification {
  id: string;
  name: string;
  issueDate: Date;
  expiryDate?: Date;
  level: "basic" | "intermediate" | "advanced" | "professional";
  courseId: string;
  /** Discount tier unlocked by this certification */
  discountTier?: string;
}

/**
 * Unified Order Model
 */
export interface UnifiedOrder {
  id: string;
  platformIds: {
    shopify?: string;
    wix?: string;
    opencart?: string;
  };
  orderNumber: string;
  customerId?: string;
  email: string;
  financialStatus: "pending" | "paid" | "partially_paid" | "refunded" | "voided";
  fulfillmentStatus: "unfulfilled" | "partial" | "fulfilled";
  lineItems: UnifiedLineItem[];
  subtotalPrice: MoneyAmount;
  totalTax: MoneyAmount;
  totalPrice: MoneyAmount;
  shippingAddress?: UnifiedAddress;
  billingAddress?: UnifiedAddress;
  note?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

/**
 * Unified Line Item
 */
export interface UnifiedLineItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  price: MoneyAmount;
  totalDiscount: MoneyAmount;
  fulfillableQuantity: number;
}

/**
 * B2B Company Model
 */
export interface UnifiedCompany {
  id: string;
  platformIds: {
    shopify?: string;
    wix?: string;
    opencart?: string;
  };
  name: string;
  contactEmail: string;
  phone?: string;
  addresses: UnifiedAddress[];
  /** Associated customer IDs */
  customerIds: string[];
  /** Assigned catalog IDs */
  catalogIds: string[];
  /** Payment terms */
  paymentTerms?: {
    type: "net" | "due_on_receipt";
    dueInDays?: number;
  };
  /** Tax exemptions */
  taxExempt: boolean;
  taxExemptions?: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

/**
 * Webhook Event Envelope
 * Unified format for cross-platform webhook events
 */
export interface WebhookEvent<T = unknown> {
  id: string;
  source: "shopify" | "wix" | "opencart" | "internal";
  topic: string;
  shopDomain?: string;
  payload: T;
  timestamp: Date;
  /** Whether this event should trigger cross-platform sync */
  triggerSync: boolean;
  /** Target platforms for sync */
  syncTargets?: ("shopify" | "wix" | "opencart")[];
}
