import path from 'node:path';
import { existsSync, realpathSync, statSync } from 'node:fs';
export function sourceLinks({
  root,
  doc,
  mapping,
  legacyRoutes,
  revision,
  retiredLink,
}) {
  return function target(url) {
    if (/^(https?:|mailto:|#)/.test(url)) return url;
    if (/^[a-z]+:/i.test(url)) return null;
    if (/^\/(private\/tmp|tmp|Users)\//.test(url)) return null;
    const parsed = new URL(url, 'https://source/' + doc.source);
    const normalized = decodeURIComponent(parsed.pathname.slice(1));
    const fragment = parsed.hash,
      query = parsed.search;
    if (normalized.startsWith('references/')) return null;
    if (legacyRoutes['/' + normalized]) {
      const entry = legacyRoutes['/' + normalized];
      return (
        entry.hashes[decodeURIComponent(fragment.slice(1))] || entry.default
      );
    }
    if (mapping.has(normalized))
      return mapping.get(normalized) + query + fragment;
    const local = path.resolve(root, normalized);
    if (!local.startsWith(root + path.sep))
      throw Error('Escaped link ' + doc.source + ' -> ' + url);
    if (!existsSync(local)) {
      const historical =
        doc.group === '历史记录' &&
        /^(apps|packages|scripts)\//.test(normalized)
          ? retiredLink(normalized)
          : null;
      if (historical) return historical + fragment;
      throw Error(
        'Missing source link ' +
          doc.source +
          ' -> ' +
          url +
          ' (' +
          normalized +
          ')',
      );
    }
    if (!realpathSync(local).startsWith(root + path.sep))
      throw Error('Symlink escape ' + url);
    if (/^(apps|packages|scripts)\//.test(normalized))
      return (
        `https://github.com/linshuohao/agent-ready-store/${statSync(local).isDirectory() ? 'tree' : 'blob'}/${revision}/${normalized}` +
        fragment
      );
    return null;
  };
}
