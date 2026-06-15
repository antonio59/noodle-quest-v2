import { convexTest } from "convex-test";
import schema from "../../convex/schema";

// All convex function modules (including _generated). Tests live outside
// convex/ so the deploy bundle never sees test code.
export const modules = import.meta.glob([
  "../../convex/**/*.ts",
  "../../convex/**/*.js",
]);

export function setup() {
  return convexTest(schema, modules);
}
