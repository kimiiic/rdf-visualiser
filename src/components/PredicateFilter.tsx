import { useMemo, useState } from 'react';
import type { PredicateFilterOption } from '../types/rdf';

interface Props {
  options: PredicateFilterOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

const PredicateFilter = ({ options, selectedIds, onChange }: Props) => {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => (
      `${option.label} ${option.iri}`.toLowerCase().includes(normalizedQuery)
    ));
  }, [options, query]);

  const toggleOption = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  return (
    <details className="predicate-filter" open>
      <summary>
        <span>
          <strong>Predicate visibility</strong>
          <small>Selected predicates are hidden from the graph.</small>
        </span>
        <span className="pill">{selectedIds.length} hidden</span>
      </summary>
      <div className="predicate-filter-body">
        <div className="predicate-filter-tools">
          <input
            type="search"
            aria-label="Search predicates"
            placeholder="Search predicates"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="ghost-button" onClick={() => onChange(options.map((option) => option.id))}>
            Hide all
          </button>
          <button type="button" className="ghost-button" onClick={() => onChange([])} disabled={!selectedIds.length}>
            Show all
          </button>
        </div>
        {visibleOptions.length ? (
          <div className="predicate-options" aria-label="Predicates to hide">
            {visibleOptions.map((option) => (
              <label key={option.id} className={selectedSet.has(option.id) ? 'predicate-option selected' : 'predicate-option'}>
                <input
                  type="checkbox"
                  checked={selectedSet.has(option.id)}
                  onChange={() => toggleOption(option.id)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small title={option.iri}>{option.iri}</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="predicate-filter-empty">No predicates match “{query}”.</p>
        )}
      </div>
    </details>
  );
};

export default PredicateFilter;
