// Compass MCP server — the same scoring core the browser uses (src/core), reached with the
// same anon-level trust boundary an anonymous visitor has. PLAN.md §4.1, PERIMETRE.md §8.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { registerCompareLocations } from "./tools/compareLocations"
import { registerExplainScore } from "./tools/explainScore"
import { registerFindPremises } from "./tools/findPremises"
import { registerListSources } from "./tools/listSources"
import { registerScoreLocation } from "./tools/scoreLocation"
import { registerTracePremise } from "./tools/tracePremise"

const server = new McpServer({ name: "paris-compass", version: "0.1.0" })

registerListSources(server)
registerScoreLocation(server)
registerCompareLocations(server)
registerExplainScore(server)
// Registered as a pair: trace_premise takes a location_id that only find_premises hands out.
registerFindPremises(server)
registerTracePremise(server)

await server.connect(new StdioServerTransport())
