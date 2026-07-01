/**
 * Skintwin Integrations Data Layer
 * Provides access to Skintwin-specific services:
 * - LMS Training System
 * - Supply Chain (SkinSource Pro)
 * - Marketplace (Skin Zone)
 */

import { config } from "app/config";

/**
 * LMS Training Course
 */
export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  level: "basic" | "intermediate" | "advanced" | "professional";
  duration: number; // minutes
  modules: CourseModule[];
  certification?: CertificationInfo;
  productAssociations: string[];
}

/**
 * Course Module
 */
export interface CourseModule {
  id: string;
  title: string;
  type: "video" | "quiz" | "interactive" | "reading";
  duration: number;
  completionCriteria: {
    type: "view" | "score" | "time";
    threshold: number;
  };
}

/**
 * Certification Information
 */
export interface CertificationInfo {
  id: string;
  name: string;
  validityPeriod: number; // days
  discountTier?: string;
  discountPercentage?: number;
  badge: {
    name: string;
    imageUrl: string;
  };
}

/**
 * Student Progress
 */
export interface StudentProgress {
  studentId: string;
  courseId: string;
  progress: number; // 0-100
  completedModules: string[];
  startedAt: Date;
  lastActivityAt: Date;
  certificationEarned?: {
    certificationId: string;
    earnedAt: Date;
    expiresAt?: Date;
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
 * LMS Integration Service
 */
export class LMSIntegration {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = config.lmsEndpoint || "";
    this.apiKey = process.env.LMS_API_KEY || "";
  }

  /**
   * Check if LMS integration is enabled
   */
  isEnabled(): boolean {
    return config.lmsIntegrationEnabled === true && !!this.apiUrl;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    return {
      Authorization: getAuthHeaderValue(this.apiKey),
      "Content-Type": "application/json",
    };
  }

  /**
   * Get courses for a customer
   */
  async getCoursesForCustomer(customerId: string): Promise<TrainingCourse[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(
        this.apiUrl + "/api/customers/" + customerId + "/courses",
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error("Failed to fetch courses");

      const data = await response.json();
      return data.courses || [];
    } catch (error) {
      console.error("LMS Integration Error:", error);
      return [];
    }
  }

  /**
   * Get student progress
   */
  async getStudentProgress(
    customerId: string,
    courseId?: string
  ): Promise<StudentProgress[]> {
    if (!this.isEnabled()) return [];

    try {
      const url = courseId
        ? this.apiUrl + "/api/progress/" + customerId + "/" + courseId
        : this.apiUrl + "/api/progress/" + customerId;

      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) throw new Error("Failed to fetch progress");

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error("LMS Integration Error:", error);
      return [];
    }
  }

  /**
   * Get certifications for a customer
   */
  async getCertifications(
    customerId: string
  ): Promise<StudentProgress["certificationEarned"][]> {
    const progress = await this.getStudentProgress(customerId);
    return progress
      .filter((p) => p.certificationEarned)
      .map((p) => p.certificationEarned!);
  }

  /**
   * Get discount tier for customer based on certifications
   */
  async getDiscountTier(
    customerId: string
  ): Promise<{ tier: string; percentage: number } | null> {
    if (!this.isEnabled()) return null;

    try {
      const response = await fetch(
        this.apiUrl + "/api/customers/" + customerId + "/discount-tier",
        { headers: this.getHeaders() }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("LMS Integration Error:", error);
      return null;
    }
  }

  /**
   * Get products related to a course
   */
  async getProductsForCourse(courseId: string): Promise<string[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(
        this.apiUrl + "/api/courses/" + courseId + "/products",
        { headers: this.getHeaders() }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.productIds || [];
    } catch (error) {
      console.error("LMS Integration Error:", error);
      return [];
    }
  }

  /**
   * Track xAPI statement
   */
  async trackStatement(statement: XAPIStatement): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const response = await fetch(this.apiUrl + "/api/xapi/statements", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(statement),
      });

      return response.ok;
    } catch (error) {
      console.error("LMS Integration Error:", error);
      return false;
    }
  }
}

/**
 * xAPI Statement for learning tracking
 */
export interface XAPIStatement {
  actor: {
    mbox: string;
    name?: string;
  };
  verb: {
    id: string;
    display: { [lang: string]: string };
  };
  object: {
    id: string;
    objectType: "Activity";
    definition?: {
      name: { [lang: string]: string };
      type: string;
    };
  };
  result?: {
    score?: { scaled: number };
    success?: boolean;
    completion?: boolean;
    duration?: string;
  };
  timestamp?: string;
}

// ============================================
// Supply Chain Integration (SkinSource Pro)
// ============================================

/**
 * Supplier information
 */
export interface Supplier {
  id: string;
  name: string;
  type: "manufacturer" | "distributor" | "raw_material";
  location: {
    country: string;
    region?: string;
  };
  certifications: string[];
  rating: number;
  leadTimeDays: number;
  minimumOrderQuantity?: number;
}

/**
 * Ingredient information
 */
export interface Ingredient {
  id: string;
  name: string;
  inciName: string;
  category: string;
  origin: "natural" | "synthetic" | "biotechnology";
  suppliers: string[];
  costPerUnit: {
    amount: number;
    currency: string;
    unit: string;
  };
  sustainabilityScore?: number;
  allergenInfo?: string[];
}

/**
 * Supply chain alert
 */
export interface SupplyChainAlert {
  id: string;
  type: "shortage" | "price_change" | "quality" | "delay" | "recall";
  severity: "low" | "medium" | "high" | "critical";
  ingredientId?: string;
  supplierId?: string;
  message: string;
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Supply Chain Integration Service
 */
export class SupplyChainIntegration {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = config.supplyChainEndpoint || "";
    this.apiKey = process.env.SUPPLY_CHAIN_API_KEY || "";
  }

  /**
   * Check if supply chain integration is enabled
   */
  isEnabled(): boolean {
    return !!this.apiUrl;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    return {
      Authorization: getAuthHeaderValue(this.apiKey),
      "Content-Type": "application/json",
    };
  }

  /**
   * Get suppliers
   */
  async getSuppliers(filters?: {
    type?: string;
    country?: string;
  }): Promise<Supplier[]> {
    if (!this.isEnabled()) return [];

    try {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.country) params.set("country", filters.country);

      const response = await fetch(
        this.apiUrl + "/api/suppliers?" + params.toString(),
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error("Failed to fetch suppliers");

      const data = await response.json();
      return data.suppliers || [];
    } catch (error) {
      console.error("Supply Chain Integration Error:", error);
      return [];
    }
  }

  /**
   * Get ingredients for a product
   */
  async getIngredientsForProduct(productId: string): Promise<Ingredient[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(
        this.apiUrl + "/api/products/" + productId + "/ingredients",
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error("Failed to fetch ingredients");

      const data = await response.json();
      return data.ingredients || [];
    } catch (error) {
      console.error("Supply Chain Integration Error:", error);
      return [];
    }
  }

  /**
   * Get ingredient traceability
   */
  async getIngredientTraceability(
    ingredientId: string
  ): Promise<IngredientTraceability | null> {
    if (!this.isEnabled()) return null;

    try {
      const response = await fetch(
        this.apiUrl + "/api/ingredients/" + ingredientId + "/traceability",
        { headers: this.getHeaders() }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Supply Chain Integration Error:", error);
      return null;
    }
  }

  /**
   * Get active supply chain alerts
   */
  async getActiveAlerts(): Promise<SupplyChainAlert[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(this.apiUrl + "/api/alerts/active", {
        headers: this.getHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch alerts");

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error("Supply Chain Integration Error:", error);
      return [];
    }
  }

  /**
   * Get cost optimization recommendations
   */
  async getCostOptimizations(
    productId: string
  ): Promise<CostOptimization[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(
        this.apiUrl + "/api/products/" + productId + "/cost-optimizations",
        { headers: this.getHeaders() }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.optimizations || [];
    } catch (error) {
      console.error("Supply Chain Integration Error:", error);
      return [];
    }
  }
}

/**
 * Ingredient traceability information
 */
export interface IngredientTraceability {
  ingredientId: string;
  batchNumber: string;
  originCountry: string;
  harvestDate?: Date;
  processingDate?: Date;
  certifications: string[];
  supplyChain: {
    stage: string;
    location: string;
    date: Date;
    handler: string;
  }[];
}

/**
 * Cost optimization recommendation
 */
export interface CostOptimization {
  type: "alternative_supplier" | "bulk_order" | "seasonal" | "substitute";
  ingredientId?: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
}

// ============================================
// Marketplace Integration (Skin Zone)
// ============================================

/**
 * Marketplace Tenant
 */
export interface MarketplaceTenant {
  id: string;
  name: string;
  type: "brand" | "retailer" | "salon" | "spa";
  tier: "basic" | "professional" | "enterprise";
  catalogIds: string[];
  settings: {
    allowB2B: boolean;
    minimumOrderValue?: number;
    shippingRegions: string[];
  };
}

/**
 * B2B Catalog
 */
export interface B2BCatalog {
  id: string;
  name: string;
  tenantId: string;
  productCount: number;
  priceList: {
    type: "percentage" | "fixed";
    value: number;
  };
  eligibleTiers: string[];
}

/**
 * Marketplace Integration Service
 */
export class MarketplaceIntegration {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.MARKETPLACE_API_URL || "";
    this.apiKey = process.env.MARKETPLACE_API_KEY || "";
  }

  /**
   * Check if marketplace integration is enabled
   */
  isEnabled(): boolean {
    return config.marketplaceEnabled === true && !!this.apiUrl;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    return {
      Authorization: getAuthHeaderValue(this.apiKey),
      "Content-Type": "application/json",
    };
  }

  /**
   * Get tenant information
   */
  async getTenant(tenantId: string): Promise<MarketplaceTenant | null> {
    if (!this.isEnabled()) return null;

    try {
      const response = await fetch(
        this.apiUrl + "/api/tenants/" + tenantId,
        { headers: this.getHeaders() }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Marketplace Integration Error:", error);
      return null;
    }
  }

  /**
   * Get B2B catalogs for a tenant
   */
  async getCatalogsForTenant(tenantId: string): Promise<B2BCatalog[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(
        this.apiUrl + "/api/tenants/" + tenantId + "/catalogs",
        { headers: this.getHeaders() }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.catalogs || [];
    } catch (error) {
      console.error("Marketplace Integration Error:", error);
      return [];
    }
  }

  /**
   * Get cross-tenant analytics
   */
  async getCrossTenantAnalytics(): Promise<CrossTenantAnalytics | null> {
    if (!this.isEnabled()) return null;

    try {
      const response = await fetch(
        this.apiUrl + "/api/analytics/cross-tenant",
        { headers: this.getHeaders() }
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Marketplace Integration Error:", error);
      return null;
    }
  }
}

/**
 * Cross-tenant analytics
 */
export interface CrossTenantAnalytics {
  totalTenants: number;
  totalProducts: number;
  totalOrders: number;
  averageOrderValue: number;
  topCategories: { category: string; count: number }[];
  growthRate: number;
}

// Export singleton instances
export const lmsIntegration = new LMSIntegration();
export const supplyChainIntegration = new SupplyChainIntegration();
export const marketplaceIntegration = new MarketplaceIntegration();
