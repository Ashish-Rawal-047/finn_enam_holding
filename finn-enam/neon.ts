import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Lakebase Postgres is always provisioned. Realtime powers the live notification centre.
  // To let browsers subscribe, list the app origins and apply with `neon deploy --update-existing`:
  //   realtime: { allowedOrigins: ['http://localhost:5173', 'http://localhost:3001'] }
  preview: {
    realtime: true,
  },
  auth: false,
  // AI Gateway requires a paid Neon plan; this project is on Free. Re-enable after upgrading:
  // aiGateway: true,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
