import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
export const client = convexUrl ? new ConvexReactClient(convexUrl) : null;
