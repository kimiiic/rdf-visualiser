import { useEffect, useMemo, useRef } from 'react';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';
import type { GraphBundle } from '../types/rdf';

interface Props {
  data: GraphBundle | null;
  filterQuery?: string;
}

const GraphView = ({ data, filterQuery = '' }: Props) => {
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
        const palette = node.kind === 'literal'
          ? {
              background: '#9333ea',
              border: '#f472b6',
              highlight: '#f9a8d4'
            }
          : {
              background: '#1d4ed8',
              border: '#38bdf8',
              highlight: '#60a5fa'
            };

        const shape = node.kind === 'literal' ? 'box' : 'dot';
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
        smooth: { type: 'cubicBezier', roundness: 0.35 },
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

  return <div className="graph-container" ref={containerRef} />;
};

export default GraphView;
