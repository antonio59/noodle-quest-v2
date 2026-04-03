import { ConvexProvider } from "convex/react";
import { client } from "./convex-client";

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  if (!client) return <>{children}</>;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
