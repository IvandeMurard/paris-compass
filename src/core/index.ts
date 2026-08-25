/**
 * Compass scoring core.
 *
 * Pure, dependency-free, and deliberately unaware of how it is called. The browser, the
 * test runner and the MCP server all consume this same module.
 */

export * from './geo';
export * from './observational';
export * from './provenance';
export * from './scoring';
