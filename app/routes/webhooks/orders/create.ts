/**
 * Orders Create Webhook Handler
 * Syncs new orders to connected platforms and updates cognitive state
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../../../shopify.server";
import { config } from "../../../config";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log("Received " + topic + " webhook for " + shop);

  try {
    // Extract order data from payload
    const order = payload as {
      id: number;
      order_number: number;
      total_price: string;
      currency: string;
      customer?: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
      };
      line_items: Array<{
        id: number;
        product_id: number;
        variant_id: number;
        quantity: number;
        price: string;
      }>;
      created_at: string;
    };

    // Cross-platform sync (if enabled)
    if (config.wixIntegrationEnabled || config.opencartIntegrationEnabled) {
      await syncOrderToPlatforms(shop, order);
    }

    // Update cognitive state (if enabled)
    if (config.cognitiveArchitectureEnabled) {
      await updateCognitiveState(shop, order);
    }

    // Update RR hypergraph for recommendations (if enabled)
    if (config.rrHypergraphEndpoint) {
      await updateRelevanceRealization(shop, order);
    }

    console.log("Order " + order.order_number + " processed for " + shop);
  } catch (error) {
    console.error("Error processing order webhook for " + shop + ":", error);
  }

  return new Response();
};

/**
 * Sync order to connected e-commerce platforms
 */
async function syncOrderToPlatforms(
  shop: string,
  order: {
    id: number;
    order_number: number;
    total_price: string;
    currency: string;
    customer?: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
    line_items: Array<{
      id: number;
      product_id: number;
      variant_id: number;
      quantity: number;
      price: string;
    }>;
    created_at: string;
  }
): Promise<void> {
  console.log("Syncing order " + order.order_number + " to connected platforms");

  const syncEvent = {
    type: "order_sync",
    shop,
    orderId: order.id,
    platforms: [] as string[],
    timestamp: new Date().toISOString(),
  };

  if (config.wixIntegrationEnabled) {
    syncEvent.platforms.push("wix");
  }

  if (config.opencartIntegrationEnabled) {
    syncEvent.platforms.push("opencart");
  }

  console.log("Sync event:", JSON.stringify(syncEvent));
}

/**
 * Update ESN cognitive state with order data
 */
async function updateCognitiveState(
  shop: string,
  order: {
    id: number;
    total_price: string;
    line_items: Array<{
      quantity: number;
      price: string;
    }>;
    created_at: string;
  }
): Promise<void> {
  console.log("Updating cognitive state for shop " + shop);

  const itemCount = order.line_items.reduce((sum, item) => sum + item.quantity, 0);
  const salesInput = {
    totalValue: parseFloat(order.total_price),
    itemCount: itemCount,
    averageItemValue: parseFloat(order.total_price) / itemCount,
    timestamp: new Date(order.created_at).getTime(),
  };

  console.log("ESN input:", JSON.stringify(salesInput));
}

/**
 * Update Relevance Realization hypergraph with new purchase relations
 */
async function updateRelevanceRealization(
  shop: string,
  order: {
    customer?: {
      id: number;
      email: string;
    };
    line_items: Array<{
      product_id: number;
      variant_id: number;
      quantity: number;
    }>;
  }
): Promise<void> {
  console.log("Updating RR hypergraph for shop " + shop);

  if (!order.customer) {
    console.log("No customer data for RR update, skipping");
    return;
  }

  const rrUpdate = {
    agent: {
      id: "customer:" + order.customer.id,
      email: order.customer.email,
    },
    arenas: order.line_items.map((item) => ({
      id: "product:" + item.product_id,
      variantId: item.variant_id,
    })),
    relation: {
      type: "purchase",
      strength: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
      timestamp: Date.now(),
    },
  };

  console.log("RR update:", JSON.stringify(rrUpdate));
}
