/**
 * Heptavertonic Triad Mappings
 * Based on cognitive-architecture from skintwin-ai
 *
 * Maps Shopify store operations to the seven cognitive triads
 * of the Heptavertonic Organizational Model.
 */

// =====================================================================
// Constants for health calculation
// =====================================================================
/** Normalization divisor for health metric calculation */
const HEALTH_NORMALIZATION_DIVISOR = 100;
/** Threshold multiplier for bottleneck detection (70% of average health) */
const BOTTLENECK_THRESHOLD_MULTIPLIER = 0.7;

/**
 * Triad identifier
 */
export type TriadId = "τ1" | "τ2" | "τ3" | "τ4" | "τ5" | "τ6" | "τ7";

/**
 * Cognitive function categories
 */
export interface CognitiveFunction {
  name: string;
  description: string;
  accountRange: [number, number];
}

/**
 * Triad definition
 */
export interface Triad {
  id: TriadId;
  name: string;
  functions: [CognitiveFunction, CognitiveFunction, CognitiveFunction];
  shopifyMappings: ShopifyMapping[];
  flowDirection: "supply" | "demand" | "innovation";
}

/**
 * Shopify resource mapping to cognitive function
 */
export interface ShopifyMapping {
  resource: string;
  cognitiveFunction: string;
  operations: string[];
  metrics: MetricDefinition[];
}

/**
 * Metric definition
 */
export interface MetricDefinition {
  name: string;
  description: string;
  unit: string;
  aggregation: "sum" | "avg" | "count" | "max" | "min";
}

/**
 * The Seven Triads of Heptavertonic Architecture
 */
export const TRIADS: Record<TriadId, Triad> = {
  τ1: {
    id: "τ1",
    name: "Perception-Pattern-Memory",
    functions: [
      {
        name: "Perception",
        description: "Sensing and detecting stimuli from the environment",
        accountRange: [8000, 8333],
      },
      {
        name: "Pattern",
        description: "Recognition and categorization of perceived data",
        accountRange: [8334, 8666],
      },
      {
        name: "Memory",
        description: "Storage and retrieval of recognized patterns",
        accountRange: [8667, 8999],
      },
    ],
    shopifyMappings: [
      {
        resource: "customers",
        cognitiveFunction: "Perception",
        operations: ["list", "get", "search"],
        metrics: [
          {
            name: "customerVisits",
            description: "Number of customer visits",
            unit: "count",
            aggregation: "count",
          },
          {
            name: "sessionDuration",
            description: "Average session duration",
            unit: "seconds",
            aggregation: "avg",
          },
        ],
      },
      {
        resource: "analytics",
        cognitiveFunction: "Pattern",
        operations: ["reports", "insights"],
        metrics: [
          {
            name: "purchasePatterns",
            description: "Identified purchase patterns",
            unit: "patterns",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "metafields",
        cognitiveFunction: "Memory",
        operations: ["create", "update", "get"],
        metrics: [
          {
            name: "storedPreferences",
            description: "Customer preferences stored",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
    ],
    flowDirection: "supply",
  },

  τ2: {
    id: "τ2",
    name: "Operations-Innovation-Performance",
    functions: [
      {
        name: "Operations",
        description: "Day-to-day operational activities",
        accountRange: [2400, 4266],
      },
      {
        name: "Innovation",
        description: "New product and process development",
        accountRange: [4267, 6133],
      },
      {
        name: "Performance",
        description: "Measurement and optimization",
        accountRange: [6134, 7999],
      },
    ],
    shopifyMappings: [
      {
        resource: "products",
        cognitiveFunction: "Operations",
        operations: ["create", "update", "delete", "publish"],
        metrics: [
          {
            name: "productCount",
            description: "Total products",
            unit: "count",
            aggregation: "count",
          },
          {
            name: "variantCount",
            description: "Total variants",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "collections",
        cognitiveFunction: "Innovation",
        operations: ["create", "smart_collections"],
        metrics: [
          {
            name: "newCollections",
            description: "New collections created",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "inventory",
        cognitiveFunction: "Performance",
        operations: ["adjust", "set", "levels"],
        metrics: [
          {
            name: "stockTurnover",
            description: "Inventory turnover rate",
            unit: "ratio",
            aggregation: "avg",
          },
        ],
      },
    ],
    flowDirection: "supply",
  },

  τ3: {
    id: "τ3",
    name: "Directed-Adaptive-Translation",
    functions: [
      {
        name: "Directed",
        description: "Goal-oriented strategic activities",
        accountRange: [5460, 5460],
      },
      {
        name: "Adaptive",
        description: "Responsive adjustments to conditions",
        accountRange: [3751, 3751],
      },
      {
        name: "Translation",
        description: "Converting between representations",
        accountRange: [4605, 4605],
      },
    ],
    shopifyMappings: [
      {
        resource: "priceRules",
        cognitiveFunction: "Directed",
        operations: ["create", "update", "schedule"],
        metrics: [
          {
            name: "activePromotions",
            description: "Active price rules",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "discounts",
        cognitiveFunction: "Adaptive",
        operations: ["automatic", "conditional"],
        metrics: [
          {
            name: "discountUsage",
            description: "Discount redemption rate",
            unit: "percentage",
            aggregation: "avg",
          },
        ],
      },
      {
        resource: "currencies",
        cognitiveFunction: "Translation",
        operations: ["convert", "update_rates"],
        metrics: [
          {
            name: "currenciesSupported",
            description: "Active currencies",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
    ],
    flowDirection: "innovation",
  },

  τ4: {
    id: "τ4",
    name: "Autonomous-Governance-Observer",
    functions: [
      {
        name: "Autonomous",
        description: "Self-directed decision making",
        accountRange: [4000, 4333],
      },
      {
        name: "Governance",
        description: "Policy enforcement and compliance",
        accountRange: [4334, 4666],
      },
      {
        name: "Observer",
        description: "Monitoring and auditing",
        accountRange: [4667, 4999],
      },
    ],
    shopifyMappings: [
      {
        resource: "workflows",
        cognitiveFunction: "Autonomous",
        operations: ["create", "trigger", "automate"],
        metrics: [
          {
            name: "automatedActions",
            description: "Automated workflow executions",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "accessScopes",
        cognitiveFunction: "Governance",
        operations: ["check", "enforce"],
        metrics: [
          {
            name: "policyViolations",
            description: "Policy violations detected",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "webhooks",
        cognitiveFunction: "Observer",
        operations: ["subscribe", "process"],
        metrics: [
          {
            name: "eventsProcessed",
            description: "Webhook events processed",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
    ],
    flowDirection: "innovation",
  },

  τ5: {
    id: "τ5",
    name: "Resonance-Homeostasis-Analytics",
    functions: [
      {
        name: "Resonance",
        description: "Alignment and synchronization",
        accountRange: [2000, 2466],
      },
      {
        name: "Homeostasis",
        description: "Balance and equilibrium maintenance",
        accountRange: [2467, 2933],
      },
      {
        name: "Analytics",
        description: "Data analysis and insights",
        accountRange: [2934, 3400],
      },
    ],
    shopifyMappings: [
      {
        resource: "orders",
        cognitiveFunction: "Resonance",
        operations: ["create", "fulfill", "track"],
        metrics: [
          {
            name: "orderVelocity",
            description: "Orders per hour",
            unit: "orders/hour",
            aggregation: "avg",
          },
        ],
      },
      {
        resource: "fulfillment",
        cognitiveFunction: "Homeostasis",
        operations: ["balance", "allocate"],
        metrics: [
          {
            name: "fulfillmentRate",
            description: "Order fulfillment rate",
            unit: "percentage",
            aggregation: "avg",
          },
        ],
      },
      {
        resource: "reports",
        cognitiveFunction: "Analytics",
        operations: ["generate", "analyze"],
        metrics: [
          {
            name: "insightsGenerated",
            description: "Analytical insights",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
    ],
    flowDirection: "demand",
  },

  τ6: {
    id: "τ6",
    name: "Infrastructure-Wisdom-Morphogenesis",
    functions: [
      {
        name: "Infrastructure",
        description: "Underlying systems and structures",
        accountRange: [9000, 9333],
      },
      {
        name: "Wisdom",
        description: "Accumulated knowledge application",
        accountRange: [9334, 9666],
      },
      {
        name: "Morphogenesis",
        description: "Form and structure evolution",
        accountRange: [9667, 9999],
      },
    ],
    shopifyMappings: [
      {
        resource: "shop",
        cognitiveFunction: "Infrastructure",
        operations: ["configure", "settings"],
        metrics: [
          {
            name: "uptime",
            description: "Store availability",
            unit: "percentage",
            aggregation: "avg",
          },
        ],
      },
      {
        resource: "scriptTags",
        cognitiveFunction: "Wisdom",
        operations: ["inject", "manage"],
        metrics: [
          {
            name: "customizations",
            description: "Active customizations",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "themes",
        cognitiveFunction: "Morphogenesis",
        operations: ["customize", "publish"],
        metrics: [
          {
            name: "themeChanges",
            description: "Theme modifications",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
    ],
    flowDirection: "demand",
  },

  τ7: {
    id: "τ7",
    name: "Leadership-Synthesizer-Interface",
    functions: [
      {
        name: "Leadership",
        description: "Direction and coordination",
        accountRange: [3350, 3733],
      },
      {
        name: "Synthesizer",
        description: "Integration of diverse elements",
        accountRange: [3734, 4117],
      },
      {
        name: "Interface",
        description: "Connection and communication",
        accountRange: [4118, 4500],
      },
    ],
    shopifyMappings: [
      {
        resource: "appInstallation",
        cognitiveFunction: "Leadership",
        operations: ["manage", "coordinate"],
        metrics: [
          {
            name: "appHealth",
            description: "App health score",
            unit: "score",
            aggregation: "avg",
          },
        ],
      },
      {
        resource: "graphql",
        cognitiveFunction: "Synthesizer",
        operations: ["query", "mutate"],
        metrics: [
          {
            name: "apiCalls",
            description: "API calls made",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
      {
        resource: "appBridge",
        cognitiveFunction: "Interface",
        operations: ["navigate", "dispatch"],
        metrics: [
          {
            name: "userInteractions",
            description: "UI interactions",
            unit: "count",
            aggregation: "count",
          },
        ],
      },
    ],
    flowDirection: "supply",
  },
};

/**
 * Flow Circuits connecting triads
 */
export const FLOW_CIRCUITS = {
  supplySpiral: {
    name: "Supply-Side Spiral",
    path: ["τ1", "τ2", "τ7"] as TriadId[],
    description: "Information flow from perception through operations to leadership",
    direction: "clockwise",
  },
  demandVortex: {
    name: "Demand-Side Vortex",
    path: ["τ5", "τ6", "τ4"] as TriadId[],
    description: "Resource flow from analytics through infrastructure to governance",
    direction: "counterclockwise",
  },
  innovationPulse: {
    name: "Innovation Pulse",
    path: ["τ3", "τ4"] as TriadId[],
    description: "Bidirectional innovation flow between directed strategy and autonomous execution",
    direction: "bidirectional",
  },
};

/**
 * Triad Metrics Collector
 * Collects and aggregates metrics for each triad
 */
export class TriadMetricsCollector {
  private metrics: Map<TriadId, Map<string, number[]>> = new Map();

  constructor() {
    // Initialize metrics maps for each triad
    for (const triadId of Object.keys(TRIADS) as TriadId[]) {
      this.metrics.set(triadId, new Map());
    }
  }

  /**
   * Record a metric value
   */
  record(triadId: TriadId, metricName: string, value: number): void {
    const triadMetrics = this.metrics.get(triadId);
    if (!triadMetrics) return;

    const values = triadMetrics.get(metricName) || [];
    values.push(value);
    triadMetrics.set(metricName, values);
  }

  /**
   * Get aggregated metrics for a triad
   */
  getMetrics(triadId: TriadId): Record<string, number> {
    const triadMetrics = this.metrics.get(triadId);
    if (!triadMetrics) return {};

    const triad = TRIADS[triadId];
    const result: Record<string, number> = {};

    for (const mapping of triad.shopifyMappings) {
      for (const metric of mapping.metrics) {
        const values = triadMetrics.get(metric.name);
        if (!values || values.length === 0) continue;

        switch (metric.aggregation) {
          case "sum":
            result[metric.name] = values.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            result[metric.name] =
              values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "count":
            result[metric.name] = values.length;
            break;
          case "max":
            result[metric.name] = Math.max(...values);
            break;
          case "min":
            result[metric.name] = Math.min(...values);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Get all metrics across all triads
   */
  getAllMetrics(): Record<TriadId, Record<string, number>> {
    const result: Partial<Record<TriadId, Record<string, number>>> = {};

    for (const triadId of Object.keys(TRIADS) as TriadId[]) {
      result[triadId] = this.getMetrics(triadId);
    }

    return result as Record<TriadId, Record<string, number>>;
  }

  /**
   * Get flow circuit health
   */
  getFlowHealth(
    circuitName: keyof typeof FLOW_CIRCUITS
  ): { health: number; bottlenecks: TriadId[] } {
    const circuit = FLOW_CIRCUITS[circuitName];
    const triadHealths: { triad: TriadId; health: number }[] = [];

    for (const triadId of circuit.path) {
      const metrics = this.getMetrics(triadId);
      const metricValues = Object.values(metrics);

      // Simple health calculation based on metric activity
      const health =
        metricValues.length > 0
          ? metricValues.reduce((a, b) => a + Math.min(1, b / HEALTH_NORMALIZATION_DIVISOR), 0) /
            metricValues.length
          : 0;

      triadHealths.push({ triad: triadId, health });
    }

    const avgHealth =
      triadHealths.reduce((a, b) => a + b.health, 0) / triadHealths.length;

    const bottlenecks = triadHealths
      .filter((t) => t.health < avgHealth * BOTTLENECK_THRESHOLD_MULTIPLIER)
      .map((t) => t.triad);

    return { health: avgHealth, bottlenecks };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const triadId of Object.keys(TRIADS) as TriadId[]) {
      this.metrics.set(triadId, new Map());
    }
  }
}

/**
 * Get triad for a Shopify resource
 */
export function getTriadForResource(resource: string): Triad | undefined {
  for (const triad of Object.values(TRIADS)) {
    if (triad.shopifyMappings.some((m) => m.resource === resource)) {
      return triad;
    }
  }
  return undefined;
}

/**
 * Get cognitive function for a Shopify operation
 */
export function getCognitiveFunctionForOperation(
  resource: string,
  operation: string
): { triad: Triad; function: CognitiveFunction } | undefined {
  for (const triad of Object.values(TRIADS)) {
    for (const mapping of triad.shopifyMappings) {
      if (
        mapping.resource === resource &&
        mapping.operations.includes(operation)
      ) {
        const cogFunction = triad.functions.find(
          (f) => f.name === mapping.cognitiveFunction
        );
        if (cogFunction) {
          return { triad, function: cogFunction };
        }
      }
    }
  }
  return undefined;
}

// Export singleton metrics collector
export const triadMetrics = new TriadMetricsCollector();
