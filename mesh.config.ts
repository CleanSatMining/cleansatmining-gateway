import { defineConfig } from "@graphql-mesh/compose-cli";
import { loadOpenAPISubgraph } from "@omnigraph/openapi";

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph("CSM", {
        endpoint: "https://zlczywhctfaosxqtjwee.supabase.co/rest/v1",
        source: "./openapi.json",
        operationHeaders: {
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsY3p5d2hjdGZhb3N4cXRqd2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ2NTg2MTQsImV4cCI6MjA0MDIzNDYxNH0.aJeUHh1j4ZT8mUVwUhuvx2P4gMmrZDDyM920XhD0p-c",
        },
      }),
    },
  ],
});
