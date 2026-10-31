import { createHash } from 'node:crypto';
import { Converter } from 'opencc-js/t2cn';
const convert = Converter({ from: 't', to: 'cn' });
export const normalizeSearch = (text: string) =>
  convert(text.normalize('NFKC').toLowerCase());
const aliases = [
  ['蓝牙', 'bluetooth'],
  ['水瓶', 'water bottle'],
  ['移动电源', '行动电源', 'power bank'],
];
const terms = aliases.flat().sort((a, b) => b.length - a.length);
export const searchRevision = createHash('sha256')
  .update(
    JSON.stringify({ version: 1, converter: 'opencc-js@1.4.2:t-cn', aliases }),
  )
  .digest('hex');
const latinWord = (s: string) => /^[a-z0-9]/.test(s);
function occurs(field: string, term: string) {
  let index = field.indexOf(term);
  while (index >= 0) {
    if (
      !latinWord(term) ||
      (!/[a-z0-9]/.test(field[index - 1] ?? '') &&
        !/[a-z0-9]/.test(field[index + term.length] ?? ''))
    )
      return true;
    index = field.indexOf(term, index + 1);
  }
  return false;
}
export function searchTerms(query: string): string[][] {
  const text = normalizeSearch(query);
  const result: string[][] = [];
  let literal = '';
  const flush = () => {
    for (const word of literal.split(/\s+/).filter(Boolean))
      result.push([word]);
    literal = '';
  };
  for (let i = 0; i < text.length;) {
    const term = terms.find(
      (term) =>
        text.startsWith(term, i) &&
        (!latinWord(term) ||
          (!/[a-z0-9]/.test(text[i - 1] ?? '') &&
            !/[a-z0-9]/.test(text[i + term.length] ?? ''))),
    );
    if (term) {
      flush();
      result.push(aliases.find((group) => group.includes(term))!);
      i += term.length;
    } else {
      literal += text[i++];
    }
  }
  flush();
  return result;
}
export function matchesSearch(fields: string[], terms: string[][]) {
  const normalized = fields.map(normalizeSearch);
  return terms.every((alternatives) =>
    alternatives.some((term) =>
      normalized.some((field) => occurs(field, term)),
    ),
  );
}
