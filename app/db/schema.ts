import { sqliteTable, text, integer, blob, real } from "drizzle-orm/sqlite-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Drizzle session table compatible with Shopify's Drizzle adapter
export const sessionTable = sqliteTable("Session", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  state: text("state").notNull(),
  isOnline: integer("isOnline", { mode: "boolean" }).notNull().default(false),
  scope: text("scope"),
  expires: text("expires"),
  accessToken: text("accessToken"),
  userId: blob("userId", { mode: "bigint" }),
});

export type SessionRow = InferSelectModel<typeof sessionTable>;
export type NewSession = InferInsertModel<typeof sessionTable>;

// ============================================
// Cognitive State Tables
// ============================================

/**
 * ESN Reservoir State Storage
 * Stores Echo State Network checkpoints for commerce intelligence
 */
export const esnStateTable = sqliteTable("ESNState", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  networkType: text("networkType").notNull(), // 'sales', 'inventory', 'customer'
  /** Matula number encoding of reservoir state */
  matulaNumber: text("matulaNumber").notNull(),
  /** JSON-encoded reservoir state vector */
  reservoirState: text("reservoirState").notNull(),
  /** JSON-encoded output weights */
  outputWeights: text("outputWeights"),
  /** Prediction accuracy metric */
  accuracy: real("accuracy"),
  /** Training samples count */
  trainingSamples: integer("trainingSamples").default(0),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export type ESNStateRow = InferSelectModel<typeof esnStateTable>;
export type NewESNState = InferInsertModel<typeof esnStateTable>;

/**
 * RR Hypergraph State Storage
 * Stores Relevance Realization hypergraph for recommendations
 */
export const rrHypergraphTable = sqliteTable("RRHypergraph", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  /** JSON-encoded hypergraph nodes */
  nodes: text("nodes").notNull(),
  /** JSON-encoded hypergraph edges */
  edges: text("edges").notNull(),
  /** Global coherence score */
  coherence: real("coherence").default(0),
  /** Relevance threshold used */
  relevanceThreshold: real("relevanceThreshold").default(0.3),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export type RRHypergraphRow = InferSelectModel<typeof rrHypergraphTable>;
export type NewRRHypergraph = InferInsertModel<typeof rrHypergraphTable>;

/**
 * Cognitive Namespace Metrics
 * Tracks cognitive load and activity across namespaces
 */
export const namespaceMetricsTable = sqliteTable("NamespaceMetrics", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  namespacePath: text("namespacePath").notNull(),
  cognitiveLoad: real("cognitiveLoad").default(0),
  messageCount: integer("messageCount").default(0),
  lastActivityAt: text("lastActivityAt").notNull(),
  /** JSON-encoded metrics history */
  metricsHistory: text("metricsHistory"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export type NamespaceMetricsRow = InferSelectModel<typeof namespaceMetricsTable>;
export type NewNamespaceMetrics = InferInsertModel<typeof namespaceMetricsTable>;

// ============================================
// Cross-Platform Entity Mapping Tables
// ============================================

/**
 * Cross-platform product mapping
 * Maps product IDs across Shopify, Wix, OpenCart
 */
export const productMappingTable = sqliteTable("ProductMapping", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  shopifyProductId: text("shopifyProductId"),
  wixProductId: text("wixProductId"),
  opencartProductId: text("opencartProductId"),
  /** Canonical product data (JSON) */
  canonicalData: text("canonicalData"),
  lastSyncedAt: text("lastSyncedAt"),
  syncStatus: text("syncStatus").default("pending"), // pending, synced, error
  syncErrors: text("syncErrors"), // JSON array of errors
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export type ProductMappingRow = InferSelectModel<typeof productMappingTable>;
export type NewProductMapping = InferInsertModel<typeof productMappingTable>;

/**
 * Cross-platform customer mapping
 */
export const customerMappingTable = sqliteTable("CustomerMapping", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  shopifyCustomerId: text("shopifyCustomerId"),
  wixContactId: text("wixContactId"),
  opencartCustomerId: text("opencartCustomerId"),
  email: text("email").notNull(),
  /** Canonical customer data (JSON) */
  canonicalData: text("canonicalData"),
  lastSyncedAt: text("lastSyncedAt"),
  syncStatus: text("syncStatus").default("pending"),
  syncErrors: text("syncErrors"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export type CustomerMappingRow = InferSelectModel<typeof customerMappingTable>;
export type NewCustomerMapping = InferInsertModel<typeof customerMappingTable>;

// ============================================
// LMS-Commerce Integration Tables
// ============================================

/**
 * Customer certifications from LMS
 */
export const customerCertificationsTable = sqliteTable("CustomerCertifications", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  customerId: text("customerId").notNull(),
  certificationId: text("certificationId").notNull(),
  certificationName: text("certificationName").notNull(),
  level: text("level").notNull(), // basic, intermediate, advanced, professional
  earnedAt: text("earnedAt").notNull(),
  expiresAt: text("expiresAt"),
  /** Discount tier unlocked */
  discountTier: text("discountTier"),
  discountPercentage: real("discountPercentage"),
  courseId: text("courseId"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export type CustomerCertificationRow = InferSelectModel<typeof customerCertificationsTable>;
export type NewCustomerCertification = InferInsertModel<typeof customerCertificationsTable>;

/**
 * Product-Course associations
 */
export const productCourseAssociationsTable = sqliteTable("ProductCourseAssociations", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  productId: text("productId").notNull(),
  courseId: text("courseId").notNull(),
  associationType: text("associationType").notNull(), // 'featured_in', 'recommended_after', 'required_for'
  createdAt: text("createdAt").notNull(),
});

export type ProductCourseAssociationRow = InferSelectModel<typeof productCourseAssociationsTable>;
export type NewProductCourseAssociation = InferInsertModel<typeof productCourseAssociationsTable>;

// ============================================
// Heptavertonic Triad Metrics Tables
// ============================================

/**
 * Triad metrics storage
 */
export const triadMetricsTable = sqliteTable("TriadMetrics", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  triadId: text("triadId").notNull(), // τ1-τ7
  metricName: text("metricName").notNull(),
  value: real("value").notNull(),
  timestamp: text("timestamp").notNull(),
  /** Additional context (JSON) */
  context: text("context"),
});

export type TriadMetricRow = InferSelectModel<typeof triadMetricsTable>;
export type NewTriadMetric = InferInsertModel<typeof triadMetricsTable>;

/**
 * Flow circuit health history
 */
export const flowCircuitHealthTable = sqliteTable("FlowCircuitHealth", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  circuitName: text("circuitName").notNull(), // supplySpiral, demandVortex, innovationPulse
  healthScore: real("healthScore").notNull(),
  /** JSON array of bottleneck triad IDs */
  bottlenecks: text("bottlenecks"),
  timestamp: text("timestamp").notNull(),
});

export type FlowCircuitHealthRow = InferSelectModel<typeof flowCircuitHealthTable>;
export type NewFlowCircuitHealth = InferInsertModel<typeof flowCircuitHealthTable>;
