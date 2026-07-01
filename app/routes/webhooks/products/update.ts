/**
 * Products Update Webhook Handler
 * Syncs product changes to connected platforms and updates cognitive namespaces
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../../../shopify.server";
import { config } from "../../../config";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log("Received " + topic + " webhook for " + shop);

  try {
    // Extract product data from payload
    const product = payload as {
      id: number;
      title: string;
      handle: string;
      vendor: string;
      product_type: string;
      tags: string;
      status: string;
      variants: Array<{
        id: number;
        title: string;
        price: string;
        sku: string;
        inventory_quantity: number;
      }>;
      images: Array<{
        id: number;
        src: string;
        alt: string | null;
      }>;
      updated_at: string;
    };

    // Cross-platform sync (if enabled)
    if (config.wixIntegrationEnabled || config.opencartIntegrationEnabled) {
      await syncProductToPlatforms(shop, product);
    }

    // Update cognitive namespace (if enabled)
    if (config.cognitiveArchitectureEnabled) {
      await updateCognitiveNamespace(shop, product);
    }

    // Update supply chain data (if enabled)
    if (config.supplyChainEndpoint) {
      await checkSupplyChainImpact(shop, product);
    }

    console.log("Product " + product.handle + " update processed for " + shop);
  } catch (error) {
    console.error("Error processing product webhook for " + shop + ":", error);
  }

  return new Response();
};

/**
 * Sync product to connected e-commerce platforms
 */
async function syncProductToPlatforms(
  shop: string,
  product: {
    id: number;
    title: string;
    handle: string;
    vendor: string;
    product_type: string;
    tags: string;
    status: string;
    variants: Array<{
      id: number;
      title: string;
      price: string;
      sku: string;
      inventory_quantity: number;
    }>;
    images: Array<{
      id: number;
      src: string;
      alt: string | null;
    }>;
  }
): Promise<void> {
  console.log("Syncing product " + product.handle + " to connected platforms");

  // Convert to canonical product format
  const canonicalProduct = {
    externalId: product.id.toString(),
    platform: "shopify" as const,
    title: product.title,
    handle: product.handle,
    vendor: product.vendor,
    productType: product.product_type,
    tags: product.tags.split(", ").filter(Boolean),
    status: product.status === "active" ? ("active" as const) : ("draft" as const),
    variants: product.variants.map((v) => ({
      externalId: v.id.toString(),
      title: v.title,
      price: parseFloat(v.price),
      sku: v.sku,
      inventoryQuantity: v.inventory_quantity,
    })),
    images: product.images.map((img) => ({
      src: img.src,
      alt: img.alt || undefined,
    })),
  };

  console.log("Canonical product: " + canonicalProduct.title);

  const syncTargets: string[] = [];
  if (config.wixIntegrationEnabled) syncTargets.push("wix");
  if (config.opencartIntegrationEnabled) syncTargets.push("opencart");

  console.log("Sync targets: " + syncTargets.join(", "));
}

/**
 * Update cognitive namespace with product data
 */
async function updateCognitiveNamespace(
  shop: string,
  product: {
    id: number;
    title: string;
    handle: string;
    product_type: string;
    variants: Array<{
      id: number;
      inventory_quantity: number;
    }>;
  }
): Promise<void> {
  console.log("Updating cognitive namespace for product " + product.handle);

  const namespacePath = "/cognitive-commerce/domains/catalog/products/" + product.handle;

  const namespaceMessage = {
    type: "product_update",
    path: namespacePath,
    payload: {
      productId: product.id,
      title: product.title,
      productType: product.product_type,
      totalInventory: product.variants.reduce(
        (sum, v) => sum + v.inventory_quantity,
        0
      ),
      variantCount: product.variants.length,
    },
    timestamp: Date.now(),
  };

  console.log("Namespace update: " + JSON.stringify(namespaceMessage));

  const triadUpdate = {
    triadId: "τ2",
    metricType: "product_update_frequency",
    value: 1,
    context: {
      shop,
      productId: product.id,
      productType: product.product_type,
    },
  };

  console.log("Triad metric: " + JSON.stringify(triadUpdate));
}

/**
 * Check if product update affects supply chain
 */
async function checkSupplyChainImpact(
  shop: string,
  product: {
    id: number;
    title: string;
    handle: string;
    tags: string;
    variants: Array<{
      sku: string;
      inventory_quantity: number;
    }>;
  }
): Promise<void> {
  console.log("Checking supply chain impact for product " + product.handle);

  const lowInventoryVariants = product.variants.filter(
    (v) => v.inventory_quantity < 10
  );

  if (lowInventoryVariants.length > 0) {
    console.log(
      "Low inventory alert for " + product.title + ": " + lowInventoryVariants.length + " variants"
    );

    const supplyChainAlert = {
      type: "low_inventory",
      shop,
      productId: product.id,
      productTitle: product.title,
      affectedSkus: lowInventoryVariants.map((v) => v.sku),
      timestamp: Date.now(),
    };

    console.log("Supply chain alert: " + JSON.stringify(supplyChainAlert));
  }

  const ingredientKeywords = ["vitamin", "retinol", "hyaluronic", "peptide", "niacinamide"];
  const ingredientTags = product.tags
    .split(", ")
    .filter((tag) =>
      ingredientKeywords.some(
        (ingredient) => tag.toLowerCase().includes(ingredient)
      )
    );

  if (ingredientTags.length > 0) {
    console.log(
      "Product " + product.title + " contains tracked ingredients: " + ingredientTags.join(", ")
    );
  }
}
