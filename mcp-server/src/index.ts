// Compass MCP server — the same scoring core the browser uses (src/core), reached with the
// same anon-level trust boundary an anonymous visitor has. PLAN.md §4.1, PERIMETRE.md §8.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import pkg from "../package.json" with { type: "json" }

import { registerCompareLocations } from "./tools/compareLocations"
import { registerExplainScore } from "./tools/explainScore"
import { registerFindPremises } from "./tools/findPremises"
import { registerListSources } from "./tools/listSources"
import { registerScoreLocation } from "./tools/scoreLocation"
import { registerTracePremise } from "./tools/tracePremise"

// La version vient de `package.json`, jamais recopiée : un agent lit celle-ci à `initialize`, et
// deux endroits à tenir en phase dérivent toujours — mesuré le 3 septembre 2026, où le paquet
// était passé en 0.1.1 pendant que le serveur annonçait encore 0.1.0.
const server = new McpServer({ name: "paris-compass", version: pkg.version })

registerListSources(server)
registerScoreLocation(server)
registerCompareLocations(server)
registerExplainScore(server)
// Registered as a pair: trace_premise takes a location_id that only find_premises hands out.
registerFindPremises(server)
registerTracePremise(server)

await server.connect(new StdioServerTransport())
