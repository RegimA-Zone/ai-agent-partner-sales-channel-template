/**
 * Cognitive Dashboard Route
 * Displays cognitive architecture metrics and visualizations
 */

import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
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
  ProgressBar,
  DataTable,
  Banner,
} from "@shopify/polaris";

import { authenticate } from "../../shopify.server";
import { config } from "../../config";
import {
  cognitiveNamespace,
} from "../../cognitive/namespaces/CognitiveNamespace";
import {
  TRIADS,
  FLOW_CIRCUITS,
  triadMetrics,
  type TriadId,
} from "../../cognitive/triads/HeptavertonicTriads";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Check if cognitive architecture is enabled
  const cognitiveEnabled = config.cognitiveArchitectureEnabled;

  // Get namespace metrics
  const namespaceMetrics = cognitiveNamespace.getMetrics();

  // Get triad metrics
  const allTriadMetrics = triadMetrics.getAllMetrics();

  // Get flow circuit health
  const flowHealth = {
    supplySpiral: triadMetrics.getFlowHealth("supplySpiral"),
    demandVortex: triadMetrics.getFlowHealth("demandVortex"),
    innovationPulse: triadMetrics.getFlowHealth("innovationPulse"),
  };

  return {
    cognitiveEnabled,
    namespaceMetrics,
    triadMetrics: allTriadMetrics,
    flowHealth,
    triads: Object.values(TRIADS).map((t) => ({
      id: t.id,
      name: t.name,
      flowDirection: t.flowDirection,
      mappingCount: t.shopifyMappings.length,
    })),
    flowCircuits: Object.entries(FLOW_CIRCUITS).map(([key, circuit]) => ({
      key,
      name: circuit.name,
      description: circuit.description,
      path: circuit.path,
    })),
  };
};

interface TriadInfo {
  id: string;
  name: string;
  flowDirection: string;
  mappingCount: number;
}

interface FlowCircuitInfo {
  key: string;
  name: string;
  description: string;
  path: TriadId[];
}

interface FlowHealthInfo {
  health: number;
  bottlenecks: TriadId[];
}

export default function CognitiveDashboard() {
  const data = useLoaderData<typeof loader>();
  const {
    cognitiveEnabled,
    namespaceMetrics,
    flowHealth,
    triads,
    flowCircuits,
  } = data;

  if (!cognitiveEnabled) {
    return (
      <Page title="Cognitive Dashboard">
        <Banner tone="warning">
          <p>
            Cognitive Architecture is not enabled. Set{" "}
            <code>COGNITIVE_ARCHITECTURE_ENABLED=true</code> to activate.
          </p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Cognitive Dashboard"
      subtitle="Heptavertonic Architecture & Neural Transport Metrics"
    >
      <Layout>
        {/* Namespace Metrics Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Cognitive Namespace Status
              </Text>
              <InlineStack gap="400" wrap={false}>
                <MetricCard
                  label="Total Namespaces"
                  value={String(namespaceMetrics.totalNamespaces)}
                />
                <MetricCard
                  label="Active Namespaces"
                  value={String(namespaceMetrics.activeNamespaces)}
                />
                <MetricCard
                  label="Avg Cognitive Load"
                  value={(namespaceMetrics.averageCognitiveLoad * 100).toFixed(1) + "%"}
                />
                <MetricCard
                  label="Queued Messages"
                  value={String(namespaceMetrics.queuedMessages)}
                />
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Flow Circuits Health */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Flow Circuit Health
              </Text>
              {(flowCircuits as FlowCircuitInfo[]).map((circuit) => (
                <FlowCircuitCard
                  key={circuit.key}
                  name={circuit.name}
                  description={circuit.description}
                  path={circuit.path}
                  health={(flowHealth as Record<string, FlowHealthInfo>)[circuit.key]}
                />
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Heptavertonic Triads */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Heptavertonic Triads
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric"]}
                headings={["Triad", "Name", "Flow Direction", "Mappings"]}
                rows={(triads as TriadInfo[]).map((t) => [
                  t.id,
                  t.name,
                  t.flowDirection,
                  t.mappingCount,
                ])}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Architecture Diagram */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Architecture Overview
              </Text>
              <div
                style={{
                  padding: "20px",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  lineHeight: "1.6",
                }}
              >
                <pre>{getArchitectureDiagram()}</pre>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function getArchitectureDiagram(): string {
  return `
┌─────────────────────────────────────────────────────────────┐
│                  Cognitive Commerce Architecture            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐     Supply Spiral      ┌─────────┐           │
│   │   τ1    │ ──────────────────────>│   τ7    │           │
│   │Perception│                        │Interface│           │
│   └────┬────┘                         └────┬────┘           │
│        │                                   │                │
│        v                                   v                │
│   ┌─────────┐                         ┌─────────┐           │
│   │   τ2    │                         │   τ6    │           │
│   │Operations│                        │Infrastr.│           │
│   └────┬────┘                         └────┬────┘           │
│        │                                   │                │
│        │      ┌─────────┐                  │                │
│        │      │   ℳ     │<─────────────────┘                │
│        └─────>│ Core    │    Demand Vortex                  │
│               │         │                                   │
│               └────┬────┘                                   │
│                    │                                        │
│              ┌─────┴─────┐                                  │
│              v           v                                  │
│         ┌─────────┐ ┌─────────┐                             │
│         │   τ3    │ │   τ4    │  Innovation                 │
│         │Adaptive │<─>│Governance│  Pulse                   │
│         └─────────┘ └─────────┘                             │
│                                                             │
│         ┌─────────┐                                         │
│         │   τ5    │  Analytics & Homeostasis                │
│         │Analytics│                                         │
│         └─────────┘                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "16px",
        background: "#f4f6f8",
        borderRadius: "8px",
        minWidth: "120px",
        textAlign: "center",
      }}
    >
      <Text variant="headingLg" as="p">
        {value}
      </Text>
      <Text variant="bodySm" tone="subdued" as="p">
        {label}
      </Text>
    </div>
  );
}

function FlowCircuitCard({
  name,
  description,
  path,
  health,
}: {
  name: string;
  description: string;
  path: TriadId[];
  health: FlowHealthInfo;
}) {
  const healthPercent = Math.round(health.health * 100);
  const tone: "success" | "critical" = healthPercent >= 50 ? "success" : "critical";

  return (
    <div
      style={{
        padding: "16px",
        background: "#fff",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        marginBottom: "12px",
      }}
    >
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <Text variant="headingSm" as="h3">
            {name}
          </Text>
          <Badge tone={tone}>{healthPercent + "% Health"}</Badge>
        </InlineStack>
        <Text variant="bodySm" tone="subdued" as="p">
          {description}
        </Text>
        <InlineStack gap="100">
          <Text variant="bodySm" as="span">
            Path:
          </Text>
          {path.map((triadId, i) => (
            <span key={triadId}>
              <Badge>{triadId}</Badge>
              {i < path.length - 1 && " → "}
            </span>
          ))}
        </InlineStack>
        <ProgressBar progress={healthPercent} tone={tone} />
        {health.bottlenecks.length > 0 && (
          <InlineStack gap="100">
            <Text variant="bodySm" tone="caution" as="span">
              Bottlenecks:
            </Text>
            {health.bottlenecks.map((b) => (
              <Badge key={b} tone="critical">
                {b}
              </Badge>
            ))}
          </InlineStack>
        )}
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
