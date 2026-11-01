/** Static Apps entry points; old Host caches resolve only these known versions. */
export const mcpAppTools = ['search_products', 'create_order'] as const;
export const mcpAppVersion = 'v8';
export const mcpCachedAppVersions = ['v4', 'v5', 'v6', 'v7'] as const;
