import { describe, expect, it } from 'vitest';
import { parseTurtle } from './ttlParser';

describe('parseTurtle', () => {
  it('parses Turtle triples into graph data', () => {
    const ttl = `@prefix ex: <http://example.com/> .\nex:a ex:rel ex:b .`;
    const { triples, graph } = parseTurtle(ttl);

    expect(triples).toHaveLength(1);
    expect(graph.summary.triples).toBe(1);
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
  });

  it('throws on invalid Turtle input', () => {
    expect(() => parseTurtle('invalid content')).toThrow();
  });
});
