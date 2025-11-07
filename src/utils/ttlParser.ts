import { Parser } from 'n3';
import type { Quad } from 'n3';
import type { GraphBundle, GraphEdge, GraphNode, GraphSummary, TripleRecord, TermKind } from '../types/rdf';

const literalPrefix = 'literal::';

const normalizeTerm = (value: string, type: TermKind): string => {
  if (type === 'literal') {
    return `${literalPrefix}${value}`;
  }
  return value;
};

export const parseTurtle = (ttl: string): { triples: TripleRecord[]; graph: GraphBundle } => {
  const parser = new Parser({ format: 'text/turtle' });
  let quads: Quad[] = [];

  try {
    quads = parser.parse(ttl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Turtle parsing error';
    throw new Error(message);
  }

  const triples: TripleRecord[] = quads.map((quad) => {
    const objectType: TermKind = quad.object.termType === 'Literal'
      ? 'literal'
      : quad.object.termType === 'BlankNode'
        ? 'blank'
        : 'uri';

    return {
      subject: quad.subject.value,
      predicate: quad.predicate.value,
      object: quad.object.value,
      objectType,
      datatype: 'datatype' in quad.object ? quad.object.datatype?.value : undefined,
      language: 'language' in quad.object ? quad.object.language || undefined : undefined
    };
  });

  const graph = createGraphBundle(triples);
  return { triples, graph };
};

const createGraphBundle = (triples: TripleRecord[]): GraphBundle => {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const predicateSet = new Set<string>();
  const subjectSet = new Set<string>();
  const objectSet = new Set<string>();

  triples.forEach((triple, index) => {
    const subjectId = normalizeTerm(triple.subject, 'uri');
    const objectId = normalizeTerm(triple.object, triple.objectType);

    subjectSet.add(triple.subject);
    objectSet.add(triple.object);
    predicateSet.add(triple.predicate);

    if (!nodeMap.has(subjectId)) {
      nodeMap.set(subjectId, {
        id: subjectId,
        label: shrinkIri(triple.subject),
        kind: 'resource',
        title: triple.subject
      });
    }

    if (!nodeMap.has(objectId)) {
      nodeMap.set(objectId, {
        id: objectId,
        label: shrinkIri(triple.object, triple.objectType === 'literal'),
        kind: triple.objectType === 'literal' ? 'literal' : 'resource',
        title: triple.object
      });
    }

    edges.push({
      id: `${triple.subject}-${triple.predicate}-${triple.object}-${index}`,
      from: subjectId,
      to: objectId,
      label: shrinkIri(triple.predicate)
    });
  });

  const summary: GraphSummary = {
    triples: triples.length,
    subjects: subjectSet.size,
    predicates: predicateSet.size,
    objects: objectSet.size
  };

  return { nodes: Array.from(nodeMap.values()), edges, summary };
};

const shrinkIri = (iri: string, isLiteral = false): string => {
  if (isLiteral) {
    return iri.length > 24 ? `${iri.slice(0, 21)}…` : iri;
  }

  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const cutIndex = Math.max(hashIndex, slashIndex);
  if (cutIndex === -1 || cutIndex === iri.length - 1) {
    return iri;
  }
  return iri.slice(cutIndex + 1);
};
