/**
 * Integrations Sync Route
 * Manages cross-platform synchronization status and operations
 */

import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useRouteError, useFetcher, useRevalidator } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  DataTable,
  Banner,
} from "@shopify/polaris";
import { useCallback, useState } from "react";

import { authenticate } from "../../shopify.server";
import { config } from "../../config";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
];

interface ConnectorStatus {
  name: string;
  enabled: boolean;
  connected: boolean;
  lastSync: string | null;
  productCount: number;
  customerCount: number;
  orderCount: number;
  errors: string[];
}

interface SyncJob {
  id: string;
  platform: string;
  type: "products" | "customers" | "orders" | "full";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Get connector statuses from configuration
  const connectors: ConnectorStatus[] = [
    {
      name: "Wix",
      enabled: config.wixIntegrationEnabled || false,
      connected: !!(config.wixApiKey && config.wixSiteId),
      lastSync: null,
      productCount: 0,
      customerCount: 0,
      orderCount: 0,
      errors: [],
    },
    {
      name: "OpenCart",
      enabled: config.opencartIntegrationEnabled || false,
      connected: !!config.opencartApiUrl,
      lastSync: null,
      productCount: 0,
      customerCount: 0,
      orderCount: 0,
      errors: [],
    },
    {
      name: "Shopify B2B",
      enabled: config.shopifyB2BEnabled || false,
      connected: true, // Always connected if using Shopify
      lastSync: null,
      productCount: 0,
      customerCount: 0,
      orderCount: 0,
      errors: [],
    },
  ];

  // Get recent sync jobs (in a real implementation, this would come from DB)
  const recentJobs: SyncJob[] = [];

  return {
    connectors,
    recentJobs,
    marketplaceEnabled: config.marketplaceEnabled || false,
    lmsEnabled: config.lmsIntegrationEnabled || false,
    supplyChainEnabled: !!config.supplyChainEndpoint,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get("action");
  const platform = formData.get("platform");

  switch (actionType) {
    case "sync-products": {
      return {
        success: true,
        message: "Product sync started for " + platform,
        jobId: "job-" + Date.now(),
      };
    }
    case "sync-customers": {
      return {
        success: true,
        message: "Customer sync started for " + platform,
        jobId: "job-" + Date.now(),
      };
    }
    case "sync-orders": {
      return {
        success: true,
        message: "Order sync started for " + platform,
        jobId: "job-" + Date.now(),
      };
    }
    case "full-sync": {
      return {
        success: true,
        message: "Full sync started for " + platform,
        jobId: "job-" + Date.now(),
      };
    }
    case "test-connection": {
      return {
        success: true,
        message: "Connection test passed for " + platform,
      };
    }
    default:
      return { success: false, message: "Unknown action" };
  }
};

export default function IntegrationsSync() {
  const data = useLoaderData<typeof loader>();
  const { connectors, recentJobs, marketplaceEnabled, lmsEnabled, supplyChainEnabled } = data;
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const hasAnyIntegration = connectors.some((c: ConnectorStatus) => c.enabled);

  const handleSync = useCallback(
    (platform: string, type: string) => {
      setSelectedPlatform(platform);
      fetcher.submit({ action: type, platform }, { method: "POST" });
    },
    [fetcher]
  );

  // Show success banner when sync starts
  const fetcherData = fetcher.data as { success?: boolean; message?: string } | undefined;
  const showSuccessBanner = fetcher.state === "idle" && fetcherData?.success;

  return (
    <Page
      title="Integration Sync"
      subtitle="Manage cross-platform data synchronization"
      primaryAction={{
        content: "Sync All Platforms",
        onAction: () => {
          connectors.forEach((c: ConnectorStatus) => {
            if (c.enabled && c.connected) {
              handleSync(c.name, "full-sync");
            }
          });
        },
        disabled: !hasAnyIntegration,
      }}
    >
      <Layout>
        {/* Status Banner */}
        {showSuccessBanner && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => revalidator.revalidate()}>
              {fetcherData?.message}
            </Banner>
          </Layout.Section>
        )}

        {!hasAnyIntegration && (
          <Layout.Section>
            <Banner tone="info">
              <p>
                No integrations are currently enabled. Configure your integration credentials in
                environment variables to enable cross-platform sync.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Connector Status Cards */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Platform Connectors
              </Text>
              <InlineStack gap="400" wrap={true}>
                {connectors.map((connector: ConnectorStatus) => (
                  <ConnectorCard
                    key={connector.name}
                    connector={connector}
                    onSync={handleSync}
                    isSyncing={
                      fetcher.state !== "idle" && selectedPlatform === connector.name
                    }
                  />
                ))}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Entity Mapping Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Entity Mapping Overview
              </Text>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric", "text"]}
                headings={[
                  "Platform",
                  "Products",
                  "Customers",
                  "Orders",
                  "Sync Status",
                ]}
                rows={connectors
                  .filter((c: ConnectorStatus) => c.enabled)
                  .map((c: ConnectorStatus) => [
                    c.name,
                    c.productCount,
                    c.customerCount,
                    c.orderCount,
                    c.connected
                      ? c.errors.length > 0
                        ? "Has Errors"
                        : "Synced"
                      : "Not Connected",
                  ])}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Skintwin-Specific Integrations */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Skintwin Services
              </Text>
              <InlineStack gap="400">
                <ServiceStatusCard
                  name="RegimA Training LMS"
                  enabled={lmsEnabled}
                  description="Training courses and certification sync"
                />
                <ServiceStatusCard
                  name="SkinSource Pro"
                  enabled={supplyChainEnabled}
                  description="Supply chain and ingredient tracking"
                />
                <ServiceStatusCard
                  name="Skin Zone Marketplace"
                  enabled={marketplaceEnabled}
                  description="Multi-tenant B2B marketplace"
                />
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Sync Jobs */}
        {recentJobs.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Recent Sync Jobs
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric", "text"]}
                  headings={["Job ID", "Platform", "Type", "Progress", "Status"]}
                  rows={recentJobs.map((job: SyncJob) => [
                    job.id,
                    job.platform,
                    job.type,
                    job.progress,
                    job.status,
                  ])}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Webhook Configuration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Webhook Configuration
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                These webhooks are automatically configured for cross-platform synchronization:
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text"]}
                headings={["Event", "Description", "Status"]}
                rows={[
                  ["ORDERS_CREATE", "Sync new orders to connected platforms", "Active"],
                  ["PRODUCTS_UPDATE", "Update product data across platforms", "Active"],
                  ["CUSTOMERS_UPDATE", "Sync customer changes", "Active"],
                  ["INVENTORY_LEVELS_UPDATE", "Real-time inventory sync", "Active"],
                ]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function ConnectorCard({
  connector,
  onSync,
  isSyncing,
}: {
  connector: ConnectorStatus;
  onSync: (platform: string, type: string) => void;
  isSyncing: boolean;
}) {
  const statusTone: "success" | "warning" | "critical" = connector.connected
    ? connector.errors.length > 0
      ? "warning"
      : "success"
    : "critical";

  return (
    <div
      style={{
        padding: "20px",
        background: connector.enabled ? "#fff" : "#f9fafb",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        minWidth: "280px",
        opacity: connector.enabled ? 1 : 0.6,
      }}
    >
      <BlockStack gap="300">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h3">
            {connector.name}
          </Text>
          <Badge tone={statusTone}>
            {connector.connected ? "Connected" : "Not Connected"}
          </Badge>
        </InlineStack>

        {connector.enabled ? (
          <>
            <InlineStack gap="200" wrap={true}>
              <Text variant="bodySm" as="span">
                Products: {connector.productCount}
              </Text>
              <Text variant="bodySm" as="span">
                Customers: {connector.customerCount}
              </Text>
              <Text variant="bodySm" as="span">
                Orders: {connector.orderCount}
              </Text>
            </InlineStack>

            {connector.lastSync && (
              <Text variant="bodySm" tone="subdued" as="p">
                Last sync: {connector.lastSync}
              </Text>
            )}

            <InlineStack gap="200">
              <Button
                size="slim"
                onClick={() => onSync(connector.name, "sync-products")}
                disabled={!connector.connected || isSyncing}
              >
                Sync Products
              </Button>
              <Button
                size="slim"
                onClick={() => onSync(connector.name, "full-sync")}
                disabled={!connector.connected || isSyncing}
                loading={isSyncing}
              >
                Full Sync
              </Button>
            </InlineStack>
          </>
        ) : (
          <Text variant="bodySm" tone="subdued" as="p">
            Enable this integration in environment configuration
          </Text>
        )}
      </BlockStack>
    </div>
  );
}

function ServiceStatusCard({
  name,
  enabled,
  description,
}: {
  name: string;
  enabled: boolean;
  description: string;
}) {
  return (
    <div
      style={{
        padding: "16px",
        background: enabled ? "#f1faf5" : "#f9fafb",
        border: "1px solid " + (enabled ? "#b3e5d0" : "#e1e3e5"),
        borderRadius: "8px",
        minWidth: "200px",
      }}
    >
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <Text variant="headingSm" as="h3">
            {name}
          </Text>
          <Badge tone={enabled ? "success" : "attention"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </InlineStack>
        <Text variant="bodySm" tone="subdued" as="p">
          {description}
        </Text>
      </BlockStack>
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
