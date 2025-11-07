import { useCallback, useMemo, useState } from 'react';
import FileDropzone from './components/FileDropzone';
import GraphView from './components/GraphView';
import AnalysisPanel from './components/AnalysisPanel';
import { parseTurtle } from './utils/ttlParser';
import { SAMPLE_TTL } from './utils/sampleTtl';
import type { GraphBundle, TripleRecord } from './types/rdf';
import './styles/app.css';

const tabs = [
  { id: 'graph', label: 'Graph Explorer' },
  { id: 'analysis', label: 'Relationship Analysis' }
] as const;

type TabId = (typeof tabs)[number]['id'];

const App = () => {
  const [activeTab, setActiveTab] = useState<TabId>('graph');
  const [graph, setGraph] = useState<GraphBundle | null>(null);
  const [triples, setTriples] = useState<TripleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [graphQuery, setGraphQuery] = useState('');

  const handleTurtlePayload = useCallback(async (fileOrText: File | string, name?: string) => {
    setIsParsing(true);
    setError(null);

    try {
      const payload = typeof fileOrText === 'string'
        ? fileOrText
        : await fileOrText.text();

      const result = parseTurtle(payload);
      setGraph(result.graph);
      setTriples(result.triples);
      setFileName(name ?? (typeof fileOrText === 'string' ? 'Sample Turtle' : fileOrText.name));
      setGraphQuery('');
      if (activeTab === 'analysis' && !result.triples.length) {
        setActiveTab('graph');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to parse Turtle file.';
      setError(message);
      setGraph(null);
      setTriples([]);
    } finally {
      setIsParsing(false);
    }
  }, [activeTab]);

  const summaryChips = useMemo(() => {
    if (!graph) return [];
    return [
      { label: 'Triples', value: graph.summary.triples },
      { label: 'Subjects', value: graph.summary.subjects },
      { label: 'Predicates', value: graph.summary.predicates },
      { label: 'Objects', value: graph.summary.objects }
    ];
  }, [graph]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">RDF Visualizer</p>
          <h1>Upload .ttl data, explore the connected knowledge graph.</h1>
          <p className="subhead">Drop a Turtle file to render an interactive graph and inspect entity relationships in seconds.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => handleTurtlePayload(SAMPLE_TTL, 'Sample graph.ttl')}>
            Load sample graph
          </button>
        </div>
      </header>

      <section className="panel">
        <FileDropzone
          disabled={isParsing}
          onFileAccepted={(file) => handleTurtlePayload(file)}
          status={isParsing ? 'Parsing Turtle…' : fileName ? `Loaded: ${fileName}` : 'No file loaded yet'}
        />
        {error && <p className="error-banner">{error}</p>}
      </section>

      {graph && (
        <section className="summary-panel">
          {summaryChips.map((chip) => (
            <div key={chip.label} className="summary-chip">
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </div>
          ))}
        </section>
      )}

      <nav className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="panel fill">
        {activeTab === 'graph' && (
          <div className="graph-pane">
            <div className="graph-toolbar">
              <div>
                <p className="toolbar-title">Graph Explorer</p>
                <p className="toolbar-sub">Filter nodes and predicates to focus on the relationships that matter.</p>
              </div>
              <div className="search-box">
                <input
                  type="search"
                  placeholder={graph ? 'Filter graph (subject, predicate, object)' : 'Load a graph to start filtering'}
                  value={graphQuery}
                  onChange={(event) => setGraphQuery(event.target.value)}
                  disabled={!graph}
                />
                {graphQuery && (
                  <button type="button" className="ghost-button" onClick={() => setGraphQuery('')} disabled={!graph}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <GraphView data={graph} filterQuery={graphQuery} />
          </div>
        )}
        {activeTab === 'analysis' && (
          <AnalysisPanel
            triples={triples}
            summary={graph?.summary}
          />
        )}
        {!graph && activeTab !== 'graph' && <p className="empty-state">Load a Turtle file to unlock analysis tools.</p>}
      </section>
    </div>
  );
};

export default App;
