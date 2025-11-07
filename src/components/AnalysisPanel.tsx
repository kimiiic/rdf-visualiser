import { useMemo, useState } from 'react';
import type { GraphSummary, TripleRecord } from '../types/rdf';

interface Props {
  triples: TripleRecord[];
  summary?: GraphSummary;
}

const AnalysisPanel = ({ triples, summary }: Props) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return triples;
    const lower = query.toLowerCase();
    return triples.filter((triple) =>
      [triple.subject, triple.predicate, triple.object].some((value) => value.toLowerCase().includes(lower))
    );
  }, [triples, query]);

  return (
    <div className="analysis-panel">
      <div className="analysis-toolbar">
        <div>
          <p className="toolbar-title">Triple Inspector</p>
          <p className="toolbar-sub">Search across subjects, predicates, or objects.</p>
        </div>
        <div className="search-box">
          <input
            type="search"
            placeholder="Filter relationships"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {summary && (
            <span className="pill">{filtered.length}/{summary.triples} shown</span>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No triples match this query.</div>
      ) : (
        <div className="triple-table" role="table">
          <div className="triple-row header" role="row">
            <span>Subject</span>
            <span>Predicate</span>
            <span>Object</span>
          </div>
          {filtered.map((triple, index) => (
            <div key={`${triple.subject}-${index}`} className="triple-row" role="row">
              <span title={triple.subject}>{triple.subject}</span>
              <span title={triple.predicate}>{triple.predicate}</span>
              <span title={triple.object}>{triple.object}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
