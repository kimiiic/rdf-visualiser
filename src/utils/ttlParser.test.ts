import { describe, expect, it } from 'vitest';
import {
  createGraphBundle,
  getDefaultHiddenPredicateIds,
  getPredicateFilterOptions,
  parseTurtle
} from './ttlParser';

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

  it('keeps annotation metadata in parsed triples but hides it from the graph', () => {
    const ttl = `
      @prefix ex: <http://example.com/> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix owl: <http://www.w3.org/2002/07/owl#> .

      ex:a ex:rel ex:b ;
        ex:note "A custom annotation" ;
        rdfs:comment "A graph annotation" ;
        rdfs:label "Entity A" ;
        rdfs:isDefinedBy ex:schema ;
        ex:idDefinedby ex:legacySchema ;
        owl:versionInfo "1.0" .

      ex:note a owl:AnnotationProperty .
    `;
    const { triples, graph } = parseTurtle(ttl);

    expect(triples).toHaveLength(8);
    expect(graph.summary.triples).toBe(8);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.label).toBe('rel');
    expect(graph.nodes.map((node) => node.label)).toEqual(['a', 'b']);

    const options = getPredicateFilterOptions(triples);
    expect(options.map((option) => option.label)).toEqual([
      'AnnotationProperty declarations',
      'comment',
      'idDefinedby',
      'isDefinedBy',
      'label',
      'note',
      'rel',
      'type',
      'versionInfo'
    ]);

    const labelId = options.find((option) => option.label === 'label')?.id;
    const graphWithLabels = createGraphBundle(triples, getDefaultHiddenPredicateIds(triples)
      .filter((id) => id !== labelId));
    expect(graphWithLabels.edges.map((edge) => edge.label)).toEqual(['rel', 'label']);
  });

  it('offers structural predicates such as rdfs:range without hiding them by default', () => {
    const ttl = `
      @prefix ex: <http://example.com/> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      ex:property rdfs:range ex:Value .
    `;
    const { triples } = parseTurtle(ttl);
    const options = getPredicateFilterOptions(triples);

    expect(options.map((option) => option.label)).toEqual(['range']);
    expect(getDefaultHiddenPredicateIds(triples)).toEqual([]);
  });

  it('categorizes graph nodes from rdf:type declarations', () => {
    const ttl = `
      @prefix ex: <http://example.com/> .
      @prefix owl: <http://www.w3.org/2002/07/owl#> .
      ex:Person a owl:Class .
      ex:knows a owl:ObjectProperty .
      ex:name a owl:DatatypeProperty .
      ex:Alice a ex:Person ; ex:knows ex:Bob ; ex:name "Alice" .
    `;
    const { graph } = parseTurtle(ttl);
    const categories = new Map(graph.nodes.map((node) => [node.id, node.category]));

    expect(categories.get('http://example.com/Person')).toBe('class');
    expect(categories.get('http://example.com/knows')).toBe('objectProperty');
    expect(categories.get('http://example.com/name')).toBe('datatypeProperty');
    expect(categories.get('http://example.com/Alice')).toBe('individual');
    expect(categories.get('http://example.com/Alice')).not.toBe(categories.get('http://example.com/Person'));
  });
});
