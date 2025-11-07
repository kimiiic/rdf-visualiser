export type TermKind = 'uri' | 'literal' | 'blank';

export interface TripleRecord {
  subject: string;
  predicate: string;
  object: string;
  objectType: TermKind;
  datatype?: string;
  language?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: 'resource' | 'literal';
  title?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface GraphSummary {
  triples: number;
  subjects: number;
  predicates: number;
  objects: number;
}

export interface GraphBundle {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: GraphSummary;
}
