import { Parser } from 'n3';
import type { Quad } from 'n3';
import type {
  GraphBundle,
  GraphEdge,
  GraphNode,
  GraphNodeCategory,
  GraphSummary,
  PredicateFilterOption,
  TripleRecord,
  TermKind
} from '../types/rdf';

const literalPrefix = 'literal::';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const OWL_ANNOTATION_PROPERTY = 'http://www.w3.org/2002/07/owl#AnnotationProperty';
const OWL_CLASS = 'http://www.w3.org/2002/07/owl#Class';
const RDFS_CLASS = 'http://www.w3.org/2000/01/rdf-schema#Class';
const OWL_OBJECT_PROPERTY = 'http://www.w3.org/2002/07/owl#ObjectProperty';
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty';
const OWL_NAMED_INDIVIDUAL = 'http://www.w3.org/2002/07/owl#NamedIndividual';
const ANNOTATION_PROPERTY_DECLARATION = 'annotation-property-declaration';
const ignoredGraphPredicates = new Set([
  'http://www.w3.org/2000/01/rdf-schema#comment',
  'http://www.w3.org/2000/01/rdf-schema#label',
  'http://www.w3.org/2000/01/rdf-schema#isDefinedBy',
  'http://www.w3.org/2002/07/owl#versionInfo'
]);
const ignoredGraphPredicateNames = new Set(['iddefinedby']);

const normalizeTerm = (value: string, type: TermKind): string => {
  if (type === 'literal') {
    return `${literalPrefix}${value}`;
  }
  return value;
};

const getIriName = (iri: string): string => {
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  return iri.slice(Math.max(hashIndex, slashIndex) + 1);
};

const isAnnotationPropertyDeclaration = (triple: TripleRecord): boolean => (
  triple.predicate === RDF_TYPE && triple.object === OWL_ANNOTATION_PROPERTY
);

const getDeclaredAnnotationProperties = (triples: TripleRecord[]): Set<string> => new Set(
  triples
    .filter(isAnnotationPropertyDeclaration)
    .map((triple) => triple.subject)
);

const getDefaultHiddenId = (triple: TripleRecord, declaredProperties: Set<string>): string | null => {
  if (isAnnotationPropertyDeclaration(triple)) return ANNOTATION_PROPERTY_DECLARATION;
  if (ignoredGraphPredicates.has(triple.predicate)) return triple.predicate;
  if (ignoredGraphPredicateNames.has(getIriName(triple.predicate).toLowerCase())) return triple.predicate;
  if (declaredProperties.has(triple.predicate)) return triple.predicate;
  return null;
};

const getResourceCategory = (value: string, resourceTypes: Map<string, Set<string>>): GraphNodeCategory => {
  const types = resourceTypes.get(value);
  if (!types?.size) return 'resource';
  if (types.has(OWL_CLASS) || types.has(RDFS_CLASS)) return 'class';
  if (types.has(OWL_OBJECT_PROPERTY)) return 'objectProperty';
  if (types.has(OWL_DATATYPE_PROPERTY)) return 'datatypeProperty';
  if (types.has(OWL_ANNOTATION_PROPERTY)) return 'annotationProperty';
  if (types.has(OWL_NAMED_INDIVIDUAL) || types.size > 0) return 'individual';
  return 'resource';
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

  const graph = createGraphBundle(triples, getDefaultHiddenPredicateIds(triples));
  return { triples, graph };
};

export const getPredicateFilterOptions = (triples: TripleRecord[]): PredicateFilterOption[] => {
  const options = new Map<string, PredicateFilterOption>();

  triples.forEach((triple) => {
    if (!options.has(triple.predicate)) {
      options.set(triple.predicate, {
        id: triple.predicate,
        label: getIriName(triple.predicate),
        iri: triple.predicate
      });
    }

    if (isAnnotationPropertyDeclaration(triple)) {
      options.set(ANNOTATION_PROPERTY_DECLARATION, {
        id: ANNOTATION_PROPERTY_DECLARATION,
        label: 'AnnotationProperty declarations',
        iri: OWL_ANNOTATION_PROPERTY
      });
    }
  });

  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
};

export const getDefaultHiddenPredicateIds = (triples: TripleRecord[]): string[] => {
  const declaredProperties = getDeclaredAnnotationProperties(triples);
  const hiddenIds = new Set<string>();

  triples.forEach((triple) => {
    const id = getDefaultHiddenId(triple, declaredProperties);
    if (id) hiddenIds.add(id);
  });

  return Array.from(hiddenIds);
};

export const createGraphBundle = (triples: TripleRecord[], hiddenPredicateIds: Iterable<string> = []): GraphBundle => {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const predicateSet = new Set<string>();
  const subjectSet = new Set<string>();
  const objectSet = new Set<string>();
  const resourceTypes = new Map<string, Set<string>>();

  triples.forEach((triple) => {
    if (triple.predicate !== RDF_TYPE || triple.objectType === 'literal') return;
    const types = resourceTypes.get(triple.subject) ?? new Set<string>();
    types.add(triple.object);
    resourceTypes.set(triple.subject, types);
  });

  const hiddenIds = new Set(hiddenPredicateIds);
  const graphTriples = triples.filter((triple) => {
    if (hiddenIds.has(triple.predicate)) return false;
    return !(isAnnotationPropertyDeclaration(triple) && hiddenIds.has(ANNOTATION_PROPERTY_DECLARATION));
  });

  graphTriples.forEach((triple, index) => {
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
        category: getResourceCategory(triple.subject, resourceTypes),
        title: triple.subject
      });
    }

    if (!nodeMap.has(objectId)) {
      nodeMap.set(objectId, {
        id: objectId,
        label: shrinkIri(triple.object, triple.objectType === 'literal'),
        kind: triple.objectType === 'literal' ? 'literal' : 'resource',
        category: triple.objectType === 'literal'
          ? 'literal'
          : getResourceCategory(triple.object, resourceTypes),
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
