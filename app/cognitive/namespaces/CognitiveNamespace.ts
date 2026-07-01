/**
 * Cognitive Namespace System
 * Inspired by Plan 9's namespace model from cogcities/plan9-cogcities-kernel
 *
 * Provides a hierarchical namespace for organizing commerce data
 * with cognitive domain mappings and neural transport channels.
 */

// =====================================================================
// Constants for namespace management
// =====================================================================
/** Cognitive load increment per message processed */
const COGNITIVE_LOAD_INCREMENT = 0.01;
/** Maximum messages to keep in channel history (for future use) */
const _MAX_CHANNEL_MESSAGE_HISTORY = 100;

/**
 * Namespace node representing a cognitive domain or resource
 */
export interface NamespaceNode {
  /** Unique path identifier */
  path: string;
  /** Node type */
  type: "domain" | "resource" | "channel" | "swarm";
  /** Human-readable name */
  name: string;
  /** Description of the namespace */
  description?: string;
  /** Parent path (null for root) */
  parent: string | null;
  /** Child paths */
  children: string[];
  /** Mount point bindings */
  mounts: MountPoint[];
  /** Metadata */
  metadata: Record<string, unknown>;
  /** Cognitive load metric (0-1) */
  cognitiveLoad: number;
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Mount point for binding services to namespaces
 */
export interface MountPoint {
  /** Source path */
  source: string;
  /** Target path */
  target: string;
  /** Mount options */
  options: {
    /** Read-only mount */
    readonly?: boolean;
    /** Sync mode */
    sync?: "realtime" | "batch" | "manual";
    /** Priority (higher = more important) */
    priority?: number;
  };
}

/**
 * Message for neural transport between namespaces
 */
export interface NeuralMessage {
  /** Unique message ID */
  id: string;
  /** Source namespace path */
  from: string;
  /** Target namespace path */
  to: string;
  /** Message topic */
  topic: string;
  /** Message payload */
  payload: unknown;
  /** Priority (0-10) */
  priority: number;
  /** Creation timestamp */
  timestamp: Date;
  /** Time-to-live in seconds */
  ttl?: number;
  /** Routing hints */
  routingHints?: string[];
}

/**
 * Cognitive Commerce Namespace Structure
 * Maps commerce domains to cognitive functions
 */
export const COGNITIVE_COMMERCE_NAMESPACE = {
  root: "/cognitive-commerce",
  domains: {
    catalog: {
      path: "/cognitive-commerce/domains/catalog",
      children: ["products", "variants", "collections", "ingredients"],
    },
    orders: {
      path: "/cognitive-commerce/domains/orders",
      children: ["transactions", "fulfillments", "refunds"],
    },
    customers: {
      path: "/cognitive-commerce/domains/customers",
      children: ["profiles", "segments", "preferences", "skinProfiles"],
    },
    analytics: {
      path: "/cognitive-commerce/domains/analytics",
      children: ["sales", "inventory", "trends", "predictions"],
    },
    training: {
      path: "/cognitive-commerce/domains/training",
      children: ["courses", "certifications", "progress"],
    },
    supplyChain: {
      path: "/cognitive-commerce/domains/supply-chain",
      children: ["suppliers", "ingredients", "inventory", "logistics"],
    },
  },
  neuralTransport: {
    path: "/cognitive-commerce/neural-transport",
    children: ["channels", "protocols", "bandwidth"],
  },
  cognitiveSwarms: {
    path: "/cognitive-commerce/cognitive-swarms",
    children: ["inventory-swarm", "pricing-swarm", "recommendation-swarm"],
  },
} as const;

/**
 * Cognitive Namespace Manager
 * Manages the namespace hierarchy and message routing
 */
export class CognitiveNamespaceManager {
  private namespaces: Map<string, NamespaceNode> = new Map();
  private messageQueue: NeuralMessage[] = [];
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();

  constructor() {
    this.initializeDefaultNamespaces();
  }

  /**
   * Initialize default namespace structure
   */
  private initializeDefaultNamespaces(): void {
    // Create root namespace
    this.createNamespace({
      path: COGNITIVE_COMMERCE_NAMESPACE.root,
      type: "domain",
      name: "Cognitive Commerce",
      description: "Root namespace for cognitive commerce operations",
      parent: null,
      children: [],
      mounts: [],
      metadata: {},
      cognitiveLoad: 0,
      lastActivity: new Date(),
    });

    // Create domain namespaces
    for (const [name, domain] of Object.entries(
      COGNITIVE_COMMERCE_NAMESPACE.domains
    )) {
      this.createNamespace({
        path: domain.path,
        type: "domain",
        name: this.formatName(name),
        parent: COGNITIVE_COMMERCE_NAMESPACE.root,
        children: domain.children.map((c) => `${domain.path}/${c}`),
        mounts: [],
        metadata: {},
        cognitiveLoad: 0,
        lastActivity: new Date(),
      });

      // Create child namespaces
      for (const child of domain.children) {
        this.createNamespace({
          path: `${domain.path}/${child}`,
          type: "resource",
          name: this.formatName(child),
          parent: domain.path,
          children: [],
          mounts: [],
          metadata: {},
          cognitiveLoad: 0,
          lastActivity: new Date(),
        });
      }
    }

    // Create neural transport namespaces
    this.createNamespace({
      path: COGNITIVE_COMMERCE_NAMESPACE.neuralTransport.path,
      type: "channel",
      name: "Neural Transport",
      parent: COGNITIVE_COMMERCE_NAMESPACE.root,
      children: COGNITIVE_COMMERCE_NAMESPACE.neuralTransport.children.map(
        (c) => `${COGNITIVE_COMMERCE_NAMESPACE.neuralTransport.path}/${c}`
      ),
      mounts: [],
      metadata: {},
      cognitiveLoad: 0,
      lastActivity: new Date(),
    });

    // Create cognitive swarm namespaces
    this.createNamespace({
      path: COGNITIVE_COMMERCE_NAMESPACE.cognitiveSwarms.path,
      type: "swarm",
      name: "Cognitive Swarms",
      parent: COGNITIVE_COMMERCE_NAMESPACE.root,
      children: COGNITIVE_COMMERCE_NAMESPACE.cognitiveSwarms.children.map(
        (c) => `${COGNITIVE_COMMERCE_NAMESPACE.cognitiveSwarms.path}/${c}`
      ),
      mounts: [],
      metadata: {},
      cognitiveLoad: 0,
      lastActivity: new Date(),
    });
  }

  /**
   * Create a new namespace node
   */
  createNamespace(node: NamespaceNode): void {
    this.namespaces.set(node.path, node);

    // Update parent's children if parent exists
    if (node.parent) {
      const parent = this.namespaces.get(node.parent);
      if (parent && !parent.children.includes(node.path)) {
        parent.children.push(node.path);
      }
    }
  }

  /**
   * Get a namespace node by path
   */
  getNamespace(path: string): NamespaceNode | undefined {
    return this.namespaces.get(path);
  }

  /**
   * List all namespaces under a given path
   */
  listNamespaces(parentPath?: string): NamespaceNode[] {
    if (!parentPath) {
      return Array.from(this.namespaces.values());
    }

    const parent = this.namespaces.get(parentPath);
    if (!parent) return [];

    return parent.children
      .map((path) => this.namespaces.get(path))
      .filter((ns): ns is NamespaceNode => ns !== undefined);
  }

  /**
   * Mount a service to a namespace
   */
  mount(mount: MountPoint): void {
    const targetNs = this.namespaces.get(mount.target);
    if (!targetNs) {
      throw new Error(`Target namespace not found: ${mount.target}`);
    }

    targetNs.mounts.push(mount);
  }

  /**
   * Send a message through the neural transport
   */
  async sendMessage(message: Omit<NeuralMessage, "id" | "timestamp">): Promise<string> {
    const fullMessage: NeuralMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
    };

    // Update cognitive load on source namespace
    const sourceNs = this.namespaces.get(message.from);
    if (sourceNs) {
      sourceNs.cognitiveLoad = Math.min(1, sourceNs.cognitiveLoad + COGNITIVE_LOAD_INCREMENT);
      sourceNs.lastActivity = new Date();
    }

    // Route message
    await this.routeMessage(fullMessage);

    return fullMessage.id;
  }

  /**
   * Subscribe to messages on a topic
   */
  subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, new Set());
    }
    this.messageHandlers.get(topic)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(topic)?.delete(handler);
    };
  }

  /**
   * Route a message to handlers
   */
  private async routeMessage(message: NeuralMessage): Promise<void> {
    const handlers = this.messageHandlers.get(message.topic);
    if (!handlers) {
      // Queue message if no handlers
      this.messageQueue.push(message);
      return;
    }

    // Execute handlers in priority order
    const sortedHandlers = Array.from(handlers).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const handler of sortedHandlers) {
      try {
        await handler.handle(message);
      } catch (error) {
        console.error(`Error in message handler for topic ${message.topic}:`, error);
      }
    }
  }

  /**
   * Get namespace metrics
   */
  getMetrics(): NamespaceMetrics {
    let totalLoad = 0;
    let activeCount = 0;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const ns of this.namespaces.values()) {
      totalLoad += ns.cognitiveLoad;
      if (ns.lastActivity > fiveMinutesAgo) {
        activeCount++;
      }
    }

    return {
      totalNamespaces: this.namespaces.size,
      activeNamespaces: activeCount,
      averageCognitiveLoad: totalLoad / this.namespaces.size,
      queuedMessages: this.messageQueue.length,
      timestamp: now,
    };
  }

  /**
   * Decay cognitive load over time
   */
  decayCognitiveLoad(decayRate: number = 0.1): void {
    for (const ns of this.namespaces.values()) {
      ns.cognitiveLoad = Math.max(0, ns.cognitiveLoad - decayRate);
    }
  }

  private formatName(str: string): string {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Message handler interface
 */
export interface MessageHandler {
  priority?: number;
  handle(message: NeuralMessage): Promise<void>;
}

/**
 * Namespace metrics
 */
export interface NamespaceMetrics {
  totalNamespaces: number;
  activeNamespaces: number;
  averageCognitiveLoad: number;
  queuedMessages: number;
  timestamp: Date;
}

// Export singleton instance
export const cognitiveNamespace = new CognitiveNamespaceManager();
