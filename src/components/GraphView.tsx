import { useEffect, useMemo, useRef } from 'react';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';
import type { GraphBundle, GraphNodeCategory } from '../types/rdf';

const categoryStyles: Record<GraphNodeCategory, {
  label: string;
  background: string;
  border: string;
  highlight: string;
  shape: 'box' | 'diamond' | 'dot' | 'hexagon' | 'triangle';
}> = {
  class: { label: 'Class', background: '#2563eb', border: '#60a5fa', highlight: '#93c5fd', shape: 'diamond' },
  objectProperty: { label: 'Object property', background: '#059669', border: '#34d399', highlight: '#6ee7b7', shape: 'hexagon' },
  datatypeProperty: { label: 'Datatype property', background: '#d97706', border: '#fbbf24', highlight: '#fde68a', shape: 'triangle' },
  annotationProperty: { label: 'Annotation property', background: '#c026d3', border: '#e879f9', highlight: '#f0abfc', shape: 'hexagon' },
  individual: { label: 'Individual', background: '#0891b2', border: '#22d3ee', highlight: '#67e8f9', shape: 'dot' },
  resource: { label: 'Resource', background: '#475569', border: '#94a3b8', highlight: '#cbd5e1', shape: 'dot' },
  literal: { label: 'Literal', background: '#9333ea', border: '#f472b6', highlight: '#f9a8d4', shape: 'box' }
};

const categoryOrder: GraphNodeCategory[] = [
  'class',
  'objectProperty',
  'datatypeProperty',
  'annotationProperty',
  'individual',
  'resource',
  'literal'
];

interface Props {
  data: GraphBundle | null;
  filterQuery?: string;
  isFullscreen?: boolean;
}

const GraphView = ({ data, filterQuery = '', isFullscreen = false }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);
  const trimmedQuery = filterQuery.trim();
  const hasFilter = trimmedQuery.length > 0;

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!hasFilter) return data;

    const query = trimmedQuery.toLowerCase();
    const matchedNodeIds = new Set(
      data.nodes
        .filter((node) => `${node.label} ${node.title ?? ''}`.toLowerCase().includes(query))
        .map((node) => node.id)
    );

    const edges = data.edges.filter((edge) => {
      if (edge.label.toLowerCase().includes(query)) return true;
      return matchedNodeIds.has(edge.from) || matchedNodeIds.has(edge.to);
    });

    if (!edges.length) {
      return { ...data, nodes: [], edges: [] };
    }

    const nodeIds = new Set<string>();
    edges.forEach((edge) => {
      nodeIds.add(edge.from);
      nodeIds.add(edge.to);
    });

    const nodes = data.nodes.filter((node) => nodeIds.has(node.id));
    return { ...data, nodes, edges };
  }, [data, hasFilter, trimmedQuery]);

  const visibleCategories = useMemo(() => {
    if (!filteredData) return [];
    const categories = new Set(filteredData.nodes.map((node) => node.category));
    return categoryOrder.filter((category) => categories.has(category));
  }, [filteredData]);

  useEffect(() => {
    if (networkRef.current && (!filteredData || !filteredData.nodes.length)) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    if (!containerRef.current || !filteredData || !filteredData.nodes.length) {
      return;
    }

    const nodes = new DataSet(
      filteredData.nodes.map((node) => {
        const palette = categoryStyles[node.category];
        const shape = palette.shape;
        const literalShapeProps = node.kind === 'literal' ? { borderRadius: 10 } : undefined;

        return {
          id: node.id,
          label: node.label,
          title: node.title,
          color: {
            background: palette.background,
            border: palette.border,
            highlight: { background: palette.highlight, border: palette.border },
            hover: { background: palette.highlight, border: palette.border }
          },
          font: {
            color: '#f8fafc',
            face: 'Space Grotesk',
            size: 16,
            vadjust: 0
          },
          borderWidth: 2,
          size: node.kind === 'literal' ? 24 : 18,
          shadow: {
            enabled: true,
            color: 'rgba(8, 47, 73, 0.4)',
            size: 18,
            x: 0,
            y: 3
          },
          shape,
          ...(literalShapeProps ? { shapeProperties: literalShapeProps } : {})
        };
      })
    );

    const edges = new DataSet(
      filteredData.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        arrows: 'to',
        color: {
          color: 'rgba(226, 232, 240, 0.8)',
          highlight: '#f472b6'
        },
        width: 1.8,
        smooth: { enabled: true, type: 'cubicBezier', roundness: 0.35 },
        font: { color: '#e2e8f0', face: 'Inter', strokeWidth: 0, size: 12 }
      }))
    );

    const network = new Network(containerRef.current, { nodes, edges }, {
      autoResize: true,
      height: '100%',
      width: '100%',
      physics: {
        solver: 'forceAtlas2Based',
        stabilization: { iterations: 150, updateInterval: 25 },
        minVelocity: 0.3
      },
      interaction: {
        tooltipDelay: 150,
        hover: true,
        hoverConnectedEdges: true,
        zoomView: true,
        dragView: true,
        multiselect: false
      },
      layout: { improvedLayout: true, randomSeed: 3 },
      nodes: {
        shadow: true
      },
      edges: {
        selectionWidth: 3
      }
    });

    network.once('stabilizationIterationsDone', () => {
      network.fit({ animation: { duration: 500, easingFunction: 'easeInOutCubic' } });
    });

    networkRef.current = network;
    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [filteredData]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      networkRef.current?.redraw();
      networkRef.current?.fit({ animation: { duration: 300, easingFunction: 'easeInOutCubic' } });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isFullscreen]);

  if (!data) {
    return (
      <div className="empty-state">
        Upload a Turtle file to see its relational graph.
      </div>
    );
  }

  if (!filteredData || !filteredData.nodes.length) {
    if (hasFilter) {
      return <div className="empty-state">No relationships match '{trimmedQuery}'.</div>;
    }
    return <div className="graph-container" ref={containerRef} />;
  }

  return (
    <div className="graph-stage">
      <div className="graph-legend" aria-label="Graph node legend">
        {visibleCategories.map((category) => (
          <span key={category} className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: categoryStyles[category].background, borderColor: categoryStyles[category].border }}
            />
            {categoryStyles[category].label}
          </span>
        ))}
      </div>
      <div className="graph-container" ref={containerRef} />
    </div>
  );
};

export default GraphView;
