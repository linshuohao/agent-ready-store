import { describe, expect, it } from 'vitest';
import { readMcpConfig } from '../../src/mcp/config.js';

const local = {
  WEB_ORIGIN: 'http://localhost:3000',
  MCP_ALLOWED_HOSTS: 'localhost:3002,127.0.0.1:3002,[::1]:3002',
};
describe('MCP access mode', () => {
  it.each([undefined, 'demo'])(
    'uses demo for %s even if a token is present',
    (mode) => {
      expect(
        readMcpConfig({
          ...local,
          MCP_AUTH_MODE: mode,
          MCP_SERVICE_TOKEN: 'existing-token-does-not-select-mode',
        }).mode,
      ).toBe('demo');
      expect(readMcpConfig({ ...local, MCP_AUTH_MODE: mode }).mode).toBe(
        'demo',
      );
    },
  );
  it.each(['', 'DEMO', 'unknown'])('rejects invalid mode %s', (mode) => {
    expect(() => readMcpConfig({ ...local, MCP_AUTH_MODE: mode })).toThrow(
      'MCP_AUTH_MODE',
    );
  });
  it.each([undefined, '', 'short'])(
    'does not fall back when token %s is invalid',
    (token) => {
      expect(() =>
        readMcpConfig({
          ...local,
          MCP_AUTH_MODE: 'token',
          MCP_SERVICE_TOKEN: token,
        }),
      ).toThrow('24+');
    },
  );
  it.each([undefined, 'demo'])(
    'allows hosted demo without a token for %s',
    (mode) => {
      expect(
        readMcpConfig({
          MCP_AUTH_MODE: mode,
          VERCEL: '1',
          WEB_ORIGIN: 'https://store.example',
          MCP_ALLOWED_HOSTS: 'api.store.example',
        }).mode,
      ).toBe('demo');
    },
  );
  it('allows authenticated hosted mode', () => {
    expect(
      readMcpConfig({
        MCP_AUTH_MODE: 'token',
        MCP_SERVICE_TOKEN: 'long-enough-hosted-service-token',
        MCP_ALLOWED_HOSTS: 'store.example',
        WEB_ORIGIN: 'https://store.example',
        VERCEL: '1',
      }).mode,
    ).toBe('token');
  });
  it.each([
    { WEB_ORIGIN: 'http://localhost:3000/path' },
    { WEB_ORIGIN: 'ftp://store.example' },
    { WEB_ORIGIN: 'not-a-url' },
    { MCP_ALLOWED_HOSTS: 'localhost:3002/path' },
    { MCP_ALLOWED_HOSTS: 'user@localhost:3002' },
  ])('rejects malformed configuration %j', (override) => {
    expect(() => readMcpConfig({ ...local, ...override })).toThrow();
  });
});
