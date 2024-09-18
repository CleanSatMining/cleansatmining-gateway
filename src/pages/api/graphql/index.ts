import { createGatewayRuntime } from "@graphql-hive/gateway";

const { handleRequest } = createGatewayRuntime({
  graphqlEndpoint: "/api/graphql",
  proxy: {
    endpoint: "/api/graphql",
  },
  fetchAPI: { Response },
});

// Export the handler to be used with the following HTTP methods
export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
};
