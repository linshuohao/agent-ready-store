import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

type Environment = Record<string, string | undefined>;
export type McpConfig = {
  mode: 'demo' | 'token';
  token?: string;
  hosts: string[];
  origin: string;
};
export function readMcpConfig(env: Environment): McpConfig {
  const mode = env.MCP_AUTH_MODE ?? 'demo';
  if (mode !== 'demo' && mode !== 'token')
    throw new Error('MCP_AUTH_MODE must be demo or token');
  const token = env.MCP_SERVICE_TOKEN;
  const hosts = env.MCP_ALLOWED_HOSTS?.split(',');
  const origin = env.WEB_ORIGIN;
  if (!hosts?.length || hosts.some((host) => !host) || !origin)
    throw new Error('MCP allowed hosts and WEB_ORIGIN required');
  if (mode === 'token' && (!token || token.length < 24))
    throw new Error(
      'MCP service token (24+ characters) required in token mode',
    );
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    !['http:', 'https:'].includes(url.protocol) ||
    hosts.some((host) => new URL(`http://${host}`).host !== host)
  )
    throw new Error(
      'MCP allowed hosts and WEB_ORIGIN must be valid host/origin values',
    );
  return { mode, token, hosts, origin };
}

export function mcpAccess({
  mode,
  token,
  hosts,
  origin,
}: McpConfig): RequestHandler {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (
      !hosts.includes(req.headers.host ?? '') ||
      (req.headers.origin !== undefined && req.headers.origin !== origin)
    ) {
      res.status(403).json({ error: 'ACCESS_DENIED' });
      return;
    }
    if (
      mode === 'token' &&
      !timingSafeEqual(
        digest(req.headers.authorization ?? ''),
        digest(`Bearer ${token}`),
      )
    ) {
      res.status(401).json({ error: 'ACCESS_DENIED' });
      return;
    }
    next();
  };
}
