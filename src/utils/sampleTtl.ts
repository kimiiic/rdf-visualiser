export const SAMPLE_TTL = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.com/> .

ex:Alice a foaf:Person ;
  foaf:name "Alice" ;
  foaf:knows ex:Bob, ex:Eve ;
  foaf:topic_interest ex:GraphTech .

ex:Bob a foaf:Person ;
  foaf:name "Bob" ;
  foaf:knows ex:Eve .

ex:Eve a foaf:Person ;
  foaf:name "Eve" ;
  foaf:topic_interest ex:GraphTech .

ex:GraphTech a foaf:Project ;
  foaf:name "Graph Tooling" .
`;
