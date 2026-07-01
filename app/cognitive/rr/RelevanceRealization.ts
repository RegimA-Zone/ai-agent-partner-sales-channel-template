/**
 * Relevance Realization (RR) Module
 * Inspired by cogcities/rrp9-civic-angel
 *
 * Implements RR dynamics for intelligent product recommendations
 * using the agent-arena-relation triadic model.
 */

// =====================================================================
// Constants for product similarity calculation
// =====================================================================
/** Weight for category overlap in similarity calculation */
const CATEGORY_WEIGHT = 0.3;
/** Weight for skin type overlap in similarity calculation */
const SKIN_TYPE_WEIGHT = 0.3;
/** Weight for price similarity in similarity calculation */
const PRICE_WEIGHT = 0.2;
/** Weight for ingredient overlap in similarity calculation */
const INGREDIENT_WEIGHT = 0.2;

/**
 * RR Node Types
 */
export type RRNodeType = "agent" | "arena" | "relation";

/**
 * RR Node in the hypergraph
 */
export interface RRNode {
  /** Unique identifier */
  id: string;
  /** Node type */
  type: RRNodeType;
  /** Human-readable name */
  name: string;
  /** Salience score (0-1) indicating relevance */
  salience: number;
  /** Context tags */
  context: string[];
  /** Additional properties */
  properties: Record<string, unknown>;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * RR Edge connecting nodes
 */
export interface RREdge {
  /** Edge ID */
  id: string;
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Coupling strength (0-1) */
  coupling: number;
  /** Edge polarity */
  polarity: "excitatory" | "inhibitory";
  /** Edge type */
  type: "agent-arena" | "agent-relation" | "arena-relation" | "bidirectional";
  /** Temporal weight decay factor */
  decayFactor: number;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * RR Hypergraph representing the full cognitive state
 */
export interface RRHypergraph {
  nodes: Map<string, RRNode>;
  edges: Map<string, RREdge>;
  /** Global coherence score */
  coherence: number;
  /** Last computation timestamp */
  lastComputed: Date;
}

/**
 * Trialectic dynamics parameters
 */
export interface TrialecticParams {
  /** Learning rate for salience updates */
  learningRate: number;
  /** Decay rate for temporal effects */
  decayRate: number;
  /** Threshold for relevance */
  relevanceThreshold: number;
  /** Maximum iterations for convergence */
  maxIterations: number;
  /** Convergence tolerance */
  tolerance: number;
}

/**
 * Relevance Realization Engine
 * Implements the trialectic co-constitution dynamics
 */
export class RelevanceRealizationEngine {
  private hypergraph: RRHypergraph;
  private params: TrialecticParams;

  constructor(params: Partial<TrialecticParams> = {}) {
    this.params = {
      learningRate: params.learningRate || 0.1,
      decayRate: params.decayRate || 0.05,
      relevanceThreshold: params.relevanceThreshold || 0.3,
      maxIterations: params.maxIterations || 100,
      tolerance: params.tolerance || 0.001,
    };

    this.hypergraph = {
      nodes: new Map(),
      edges: new Map(),
      coherence: 0,
      lastComputed: new Date(),
    };
  }

  /**
   * Add a node to the hypergraph
   */
  addNode(node: Omit<RRNode, "updatedAt">): RRNode {
    const fullNode: RRNode = {
      ...node,
      updatedAt: new Date(),
    };
    this.hypergraph.nodes.set(node.id, fullNode);
    return fullNode;
  }

  /**
   * Add an edge to the hypergraph
   */
  addEdge(edge: Omit<RREdge, "id" | "createdAt">): RREdge {
    const fullEdge: RREdge = {
      ...edge,
      id: `edge_${edge.from}_${edge.to}_${Date.now()}`,
      createdAt: new Date(),
    };
    this.hypergraph.edges.set(fullEdge.id, fullEdge);
    return fullEdge;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): RRNode | undefined {
    return this.hypergraph.nodes.get(id);
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: RRNodeType): RRNode[] {
    return Array.from(this.hypergraph.nodes.values()).filter(
      (node) => node.type === type
    );
  }

  /**
   * Get edges connected to a node
   */
  getEdgesForNode(nodeId: string): RREdge[] {
    return Array.from(this.hypergraph.edges.values()).filter(
      (edge) => edge.from === nodeId || edge.to === nodeId
    );
  }

  /**
   * Update salience through trialectic dynamics
   * Implements the agent-arena-relation co-constitution
   */
  updateSalience(): void {
    const { learningRate, decayRate, maxIterations, tolerance } = this.params;
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < maxIterations) {
      let maxChange = 0;

      for (const node of this.hypergraph.nodes.values()) {
        const edges = this.getEdgesForNode(node.id);
        let salienceUpdate = 0;

        for (const edge of edges) {
          const otherNodeId = edge.from === node.id ? edge.to : edge.from;
          const otherNode = this.hypergraph.nodes.get(otherNodeId);

          if (otherNode) {
            // Compute influence based on coupling and polarity
            const influence =
              edge.polarity === "excitatory"
                ? edge.coupling * otherNode.salience
                : -edge.coupling * otherNode.salience;

            salienceUpdate += influence * edge.decayFactor;
          }
        }

        // Apply update with learning rate and decay
        const newSalience = Math.max(
          0,
          Math.min(1, node.salience + learningRate * salienceUpdate - decayRate)
        );

        const change = Math.abs(newSalience - node.salience);
        maxChange = Math.max(maxChange, change);

        node.salience = newSalience;
        node.updatedAt = new Date();
      }

      converged = maxChange < tolerance;
      iteration++;
    }

    // Compute global coherence
    this.computeCoherence();
  }

  /**
   * Compute global coherence of the hypergraph
   */
  private computeCoherence(): void {
    let totalCoupling = 0;
    let weightedAgreement = 0;

    for (const edge of this.hypergraph.edges.values()) {
      const fromNode = this.hypergraph.nodes.get(edge.from);
      const toNode = this.hypergraph.nodes.get(edge.to);

      if (fromNode && toNode) {
        // Coherence is higher when connected nodes have similar salience
        // (for excitatory) or opposite salience (for inhibitory)
        const salienceDiff = Math.abs(fromNode.salience - toNode.salience);
        const agreement =
          edge.polarity === "excitatory" ? 1 - salienceDiff : salienceDiff;

        weightedAgreement += agreement * edge.coupling;
        totalCoupling += edge.coupling;
      }
    }

    this.hypergraph.coherence =
      totalCoupling > 0 ? weightedAgreement / totalCoupling : 0;
    this.hypergraph.lastComputed = new Date();
  }

  /**
   * Get nodes above relevance threshold, sorted by salience
   */
  getRelevantNodes(): RRNode[] {
    return Array.from(this.hypergraph.nodes.values())
      .filter((node) => node.salience >= this.params.relevanceThreshold)
      .sort((a, b) => b.salience - a.salience);
  }

  /**
   * Apply temporal decay to all edges
   */
  applyTemporalDecay(): void {
    const now = new Date();

    for (const edge of this.hypergraph.edges.values()) {
      const ageMs = now.getTime() - edge.createdAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      // Exponential decay
      edge.decayFactor = Math.exp(-this.params.decayRate * ageHours);
    }
  }

  /**
   * Get hypergraph metrics
   */
  getMetrics(): RRMetrics {
    const nodes = Array.from(this.hypergraph.nodes.values());
    const edges = Array.from(this.hypergraph.edges.values());

    const agents = nodes.filter((n) => n.type === "agent");
    const arenas = nodes.filter((n) => n.type === "arena");
    const relations = nodes.filter((n) => n.type === "relation");

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      agentCount: agents.length,
      arenaCount: arenas.length,
      relationCount: relations.length,
      averageSalience:
        nodes.reduce((sum, n) => sum + n.salience, 0) / nodes.length || 0,
      averageCoupling:
        edges.reduce((sum, e) => sum + e.coupling, 0) / edges.length || 0,
      coherence: this.hypergraph.coherence,
      relevantNodeCount: this.getRelevantNodes().length,
    };
  }

  /**
   * Export hypergraph for persistence
   */
  export(): RRHypergraphExport {
    return {
      nodes: Array.from(this.hypergraph.nodes.values()),
      edges: Array.from(this.hypergraph.edges.values()),
      coherence: this.hypergraph.coherence,
      lastComputed: this.hypergraph.lastComputed,
      params: this.params,
    };
  }

  /**
   * Import hypergraph from persistence
   */
  static import(data: RRHypergraphExport): RelevanceRealizationEngine {
    const engine = new RelevanceRealizationEngine(data.params);

    for (const node of data.nodes) {
      engine.hypergraph.nodes.set(node.id, node);
    }

    for (const edge of data.edges) {
      engine.hypergraph.edges.set(edge.id, edge);
    }

    engine.hypergraph.coherence = data.coherence;
    engine.hypergraph.lastComputed = new Date(data.lastComputed);

    return engine;
  }
}

/**
 * RR Metrics
 */
export interface RRMetrics {
  totalNodes: number;
  totalEdges: number;
  agentCount: number;
  arenaCount: number;
  relationCount: number;
  averageSalience: number;
  averageCoupling: number;
  coherence: number;
  relevantNodeCount: number;
}

/**
 * RR Hypergraph export format
 */
export interface RRHypergraphExport {
  nodes: RRNode[];
  edges: RREdge[];
  coherence: number;
  lastComputed: Date;
  params: TrialecticParams;
}

/**
 * Commerce-specific RR for Product Recommendations
 */
export class ProductRecommendationRR {
  private engine: RelevanceRealizationEngine;

  constructor() {
    this.engine = new RelevanceRealizationEngine({
      learningRate: 0.15,
      decayRate: 0.02,
      relevanceThreshold: 0.4,
    });
  }

  /**
   * Initialize with products and customers
   */
  initialize(
    products: ProductInfo[],
    customers: CustomerInfo[],
    interactions: InteractionInfo[]
  ): void {
    // Add products as arenas
    for (const product of products) {
      this.engine.addNode({
        id: `product_${product.id}`,
        type: "arena",
        name: product.title,
        salience: 0.5,
        context: product.categories,
        properties: {
          price: product.price,
          ingredients: product.ingredients,
          skinTypes: product.skinTypes,
        },
      });
    }

    // Add customers as agents
    for (const customer of customers) {
      this.engine.addNode({
        id: `customer_${customer.id}`,
        type: "agent",
        name: customer.name,
        salience: 0.5,
        context: customer.preferences,
        properties: {
          skinType: customer.skinType,
          certifications: customer.certifications,
          lifetimeValue: customer.lifetimeValue,
        },
      });
    }

    // Add interactions as relations
    for (const interaction of interactions) {
      // Create relation node
      const relationNode = this.engine.addNode({
        id: `interaction_${interaction.customerId}_${interaction.productId}`,
        type: "relation",
        name: `${interaction.type}`,
        salience: this.interactionToSalience(interaction.type),
        context: [interaction.type],
        properties: {
          timestamp: interaction.timestamp,
          value: interaction.value,
        },
      });

      // Connect customer to relation
      this.engine.addEdge({
        from: `customer_${interaction.customerId}`,
        to: relationNode.id,
        coupling: 0.8,
        polarity: "excitatory",
        type: "agent-relation",
        decayFactor: 1.0,
      });

      // Connect relation to product
      this.engine.addEdge({
        from: relationNode.id,
        to: `product_${interaction.productId}`,
        coupling: this.interactionToCoupling(interaction.type),
        polarity: "excitatory",
        type: "arena-relation",
        decayFactor: 1.0,
      });
    }

    // Add product-product edges based on similarity
    this.addProductSimilarityEdges(products);
  }

  /**
   * Add edges between similar products
   */
  private addProductSimilarityEdges(products: ProductInfo[]): void {
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const similarity = this.computeProductSimilarity(
          products[i],
          products[j]
        );

        if (similarity > 0.3) {
          this.engine.addEdge({
            from: `product_${products[i].id}`,
            to: `product_${products[j].id}`,
            coupling: similarity,
            polarity: "excitatory",
            type: "bidirectional",
            decayFactor: 1.0,
          });
        }
      }
    }
  }

  /**
   * Compute similarity between products
   */
  private computeProductSimilarity(p1: ProductInfo, p2: ProductInfo): number {
    let similarity = 0;

    // Category overlap
    const categoryOverlap = p1.categories.filter((c) =>
      p2.categories.includes(c)
    ).length;
    similarity += categoryOverlap / Math.max(p1.categories.length, p2.categories.length, 1) * CATEGORY_WEIGHT;

    // Skin type overlap
    const skinTypeOverlap = (p1.skinTypes || []).filter((s) =>
      (p2.skinTypes || []).includes(s)
    ).length;
    similarity += skinTypeOverlap / Math.max((p1.skinTypes?.length || 0), (p2.skinTypes?.length || 0), 1) * SKIN_TYPE_WEIGHT;

    // Price similarity
    const priceDiff = Math.abs(p1.price - p2.price);
    const avgPrice = (p1.price + p2.price) / 2;
    similarity += Math.max(0, 1 - priceDiff / avgPrice) * PRICE_WEIGHT;

    // Ingredient overlap
    const ingredientOverlap = (p1.ingredients || []).filter((i) =>
      (p2.ingredients || []).includes(i)
    ).length;
    similarity += ingredientOverlap / Math.max((p1.ingredients?.length || 0), (p2.ingredients?.length || 0), 1) * INGREDIENT_WEIGHT;

    return similarity;
  }

  /**
   * Convert interaction type to salience
   */
  private interactionToSalience(type: InteractionType): number {
    switch (type) {
      case "purchase":
        return 0.9;
      case "add_to_cart":
        return 0.7;
      case "wishlist":
        return 0.6;
      case "view":
        return 0.4;
      case "return":
        return 0.2;
      default:
        return 0.5;
    }
  }

  /**
   * Convert interaction type to coupling strength
   */
  private interactionToCoupling(type: InteractionType): number {
    switch (type) {
      case "purchase":
        return 0.95;
      case "add_to_cart":
        return 0.75;
      case "wishlist":
        return 0.65;
      case "view":
        return 0.45;
      case "return":
        return 0.3;
      default:
        return 0.5;
    }
  }

  /**
   * Get recommendations for a customer
   */
  getRecommendations(customerId: string, limit: number = 10): ProductRecommendation[] {
    // Update salience dynamics
    this.engine.applyTemporalDecay();
    this.engine.updateSalience();

    const customerNode = this.engine.getNode(`customer_${customerId}`);
    if (!customerNode) {
      return [];
    }

    // Get all products sorted by relevance to this customer
    const products = this.engine.getNodesByType("arena");
    const recommendations: ProductRecommendation[] = [];

    for (const product of products) {
      // Find edges connecting customer to this product (through relations)
      const customerEdges = this.engine.getEdgesForNode(customerNode.id);
      const productEdges = this.engine.getEdgesForNode(product.id);

      // Compute connection strength
      let connectionStrength = 0;
      for (const ce of customerEdges) {
        for (const pe of productEdges) {
          if (ce.to === pe.from || ce.from === pe.to) {
            connectionStrength += ce.coupling * pe.coupling;
          }
        }
      }

      // Compute relevance score
      const relevanceScore =
        product.salience * 0.4 +
        connectionStrength * 0.4 +
        this.computeContextMatch(customerNode, product) * 0.2;

      recommendations.push({
        productId: product.id.replace("product_", ""),
        productName: product.name,
        relevanceScore,
        reasons: this.generateReasons(customerNode, product),
      });
    }

    // Sort by relevance and return top N
    return recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Compute context match between customer and product
   */
  private computeContextMatch(customer: RRNode, product: RRNode): number {
    const customerPrefs = customer.context;
    const productCategories = product.context;

    const overlap = customerPrefs.filter((p) =>
      productCategories.includes(p)
    ).length;

    return overlap / Math.max(customerPrefs.length, productCategories.length, 1);
  }

  /**
   * Generate recommendation reasons
   */
  private generateReasons(customer: RRNode, product: RRNode): string[] {
    const reasons: string[] = [];

    // Check skin type match
    const customerSkinType = customer.properties.skinType as string;
    const productSkinTypes = product.properties.skinTypes as string[] || [];
    if (productSkinTypes.includes(customerSkinType)) {
      reasons.push(`Suitable for your ${customerSkinType} skin type`);
    }

    // Check certification benefits
    const certifications = customer.properties.certifications as string[] || [];
    if (certifications.length > 0) {
      reasons.push("Professional discount available");
    }

    // Check category match
    const overlap = customer.context.filter((c) =>
      product.context.includes(c)
    );
    if (overlap.length > 0) {
      reasons.push(`Matches your interest in ${overlap[0]}`);
    }

    // High salience
    if (product.salience > 0.7) {
      reasons.push("Popular among similar customers");
    }

    return reasons;
  }

  /**
   * Record a new interaction
   */
  recordInteraction(interaction: InteractionInfo): void {
    const relationNode = this.engine.addNode({
      id: `interaction_${interaction.customerId}_${interaction.productId}_${Date.now()}`,
      type: "relation",
      name: interaction.type,
      salience: this.interactionToSalience(interaction.type),
      context: [interaction.type],
      properties: {
        timestamp: interaction.timestamp,
        value: interaction.value,
      },
    });

    this.engine.addEdge({
      from: `customer_${interaction.customerId}`,
      to: relationNode.id,
      coupling: 0.8,
      polarity: "excitatory",
      type: "agent-relation",
      decayFactor: 1.0,
    });

    this.engine.addEdge({
      from: relationNode.id,
      to: `product_${interaction.productId}`,
      coupling: this.interactionToCoupling(interaction.type),
      polarity: "excitatory",
      type: "arena-relation",
      decayFactor: 1.0,
    });
  }

  /**
   * Get engine metrics
   */
  getMetrics(): RRMetrics {
    return this.engine.getMetrics();
  }

  /**
   * Export for persistence
   */
  export(): RRHypergraphExport {
    return this.engine.export();
  }
}

// Type definitions
export interface ProductInfo {
  id: string;
  title: string;
  price: number;
  categories: string[];
  ingredients?: string[];
  skinTypes?: string[];
}

export interface CustomerInfo {
  id: string;
  name: string;
  preferences: string[];
  skinType?: string;
  certifications?: string[];
  lifetimeValue: number;
}

export interface InteractionInfo {
  customerId: string;
  productId: string;
  type: InteractionType;
  timestamp: Date;
  value?: number;
}

export type InteractionType =
  | "view"
  | "add_to_cart"
  | "wishlist"
  | "purchase"
  | "return";

export interface ProductRecommendation {
  productId: string;
  productName: string;
  relevanceScore: number;
  reasons: string[];
}
