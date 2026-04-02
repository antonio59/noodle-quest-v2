import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://incredible-lobster-12.eu-west-1.convex.cloud";
const client = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  if (!client) return <>{children}</>;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

export { client };
