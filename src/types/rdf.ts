export type TermKind = 'uri' | 'literal' | 'blank';

export interface TripleRecord {
  subject: string;
  predicate: string;
  object: string;
  objectType: TermKind;
  datatype?: string;
  language?: string;
}

export type GraphNodeCategory =
  | 'class'
  | 'objectProperty'
  | 'datatypeProperty'
  | 'annotationProperty'
  | 'individual'
  | 'resource'
  | 'literal';

export interface GraphNode {
  id: string;
  label: string;
  kind: 'resource' | 'literal';
  category: GraphNodeCategory;
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

export interface PredicateFilterOption {
  id: string;
  label: string;
  iri: string;
}
