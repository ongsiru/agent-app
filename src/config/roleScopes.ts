import type { AgentRole } from "../types.js";

export const preferredRolePaths: Record<AgentRole, string[]> = {
  manager: [],
  backendCoder: [
    "server",
    "src/server",
    "src/api",
    "api",
    "backend",
    "db",
    "prisma",
    "services",
    "controllers",
    "routes"
  ],
  frontendCoder: [
    "src",
    "app",
    "pages",
    "components",
    "hooks",
    "lib",
    "features",
    "ui"
  ],
  designSystem: [
    "src/styles",
    "styles",
    "src/theme",
    "theme",
    "src/components/ui",
    "components/ui",
    "app/globals.css",
    "tailwind.config.ts",
    "tailwind.config.js"
  ],
  designUx: [
    "src/pages",
    "pages",
    "app",
    "src/components",
    "components",
    "src/features",
    "features"
  ],
  qa: [],
  reviewer: []
};
