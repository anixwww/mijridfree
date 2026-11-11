import React, { useState } from 'react';
import { ConnectionLine } from '../types/tree';

interface TreeConnectionsProps {
  connections: ConnectionLine[];
  onLineClick?: (connectionId: string, clickCoords: { x: number; y: number }) => void;
  activeLineageIds?: Set<string>;
  hoveredPersonId?: string | null;
  visibleBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

const TreeConnectionsComponent: React.FC<TreeConnectionsProps> = ({
  connections,
  onLineClick,
  activeLineageIds,
  hoveredPersonId,
  visibleBounds,
}) => {
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [hoverMousePos, setHoverMousePos] = useState<{ x: number; y: number } | null>(null);

  // Filter connections: render only lines that intersect or are near the viewport bounds
  const visibleConnections = React.useMemo(() => {
    if (!visibleBounds) return connections;
    return connections.filter((conn) => {
      if (typeof conn.midX === 'number' && typeof conn.midY === 'number') {
        const MARGIN = 1200; // safe buffer for long connection curves
        if (
          conn.midX < visibleBounds.minX - MARGIN ||
          conn.midX > visibleBounds.maxX + MARGIN ||
          conn.midY < visibleBounds.minY - MARGIN ||
          conn.midY > visibleBounds.maxY + MARGIN
        ) {
          return false;
        }
      }
      return true;
    });
  }, [connections, visibleBounds]);

  const hoveredConn = React.useMemo(() => {
    if (!hoveredConnId) return null;
    return visibleConnections.find((c) => c.id === hoveredConnId) || null;
  }, [hoveredConnId, visibleConnections]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible select-none"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {/* Subtle drop shadow for active/hovered lineage and junction indicators */}
        <filter id="genealogy-line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
        <filter id="genealogy-node-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* 1. Base Layer: Connection paths */}
      {visibleConnections.map((conn) => {
        const isHovered = hoveredConnId === conn.id;

        // Lineage focus check
        let isLineageLine = false;
        let isDimmed = false;

        if (activeLineageIds && activeLineageIds.size > 0) {
          const idsInConn = conn.personIds || [conn.fromId, conn.toId].filter(Boolean) as string[];
          const matchesCount = idsInConn.filter((id) => activeLineageIds.has(id)).length;

          if (matchesCount > 0) {
            isLineageLine = true;
          } else {
            isDimmed = true;
          }
        }

        const isUnverifiedLine = !conn.isVerified || conn.isDashed || conn.confidenceLevel === 'hypothetical';

        const handlePathClick = (e: React.MouseEvent<SVGElement>) => {
          e.stopPropagation();
          const svgElement = e.currentTarget.ownerSVGElement;
          if (svgElement && onLineClick) {
            const pt = svgElement.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
            onLineClick(conn.id, { x: svgP.x, y: svgP.y });
          } else if (onLineClick) {
            onLineClick(conn.id, { x: conn.midX || 0, y: conn.midY || 0 });
          }
        };

        const handleMouseMoveOnPath = (e: React.MouseEvent<SVGPathElement>) => {
          const svgElement = e.currentTarget.ownerSVGElement;
          if (svgElement) {
            const pt = svgElement.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
            setHoverMousePos({ x: svgP.x, y: svgP.y });
          }
        };

        // Highlight direct lines of hovered person
        const isConnectedToHoveredPerson = Boolean(
          hoveredPersonId &&
          (conn.personIds?.includes(hoveredPersonId) || conn.fromId === hoveredPersonId || conn.toId === hoveredPersonId)
        );

        // Elegant editorial palette: Slate, Warm Amber (main branch), Muted Zinc (unverified)
        const baseColor = isUnverifiedLine
          ? '#94a3b8' // Slate-400
          : conn.isMainBranch
          ? '#b45309' // Amber-700
          : conn.color || '#475569'; // Slate-600

        const strokeColor = isLineageLine
          ? '#1e293b' // Deep navy/slate-800
          : isConnectedToHoveredPerson
          ? '#0f172a' // Slate-900
          : baseColor;

        const isHighlightActive = isHovered || isLineageLine || isConnectedToHoveredPerson;

        // Elegant line width scale
        const baseStrokeWidth = conn.isMainBranch ? 3.4 : conn.isVerified ? 2.0 : 1.75;
        const activeStrokeWidth = conn.isMainBranch ? 4.2 : 3.0;
        const currentStrokeWidth = isHighlightActive ? activeStrokeWidth : baseStrokeWidth;

        return (
          <g
            key={conn.id}
            className={`pointer-events-auto transition-opacity duration-200 ${
              isDimmed ? 'opacity-20' : 'opacity-100'
            }`}
          >
            {/* Wide transparent hit area for effortless clicking and hover */}
            <path
              d={conn.path}
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cursor-pointer pointer-events-stroke"
              onMouseEnter={() => setHoveredConnId(conn.id)}
              onMouseMove={handleMouseMoveOnPath}
              onMouseLeave={() => {
                setHoveredConnId(null);
                setHoverMousePos(null);
              }}
              onClick={handlePathClick}
            />

            {/* Ambient halo underlay when hovered or focused */}
            {isHighlightActive && (
              <path
                d={conn.path}
                fill="none"
                stroke={isLineageLine || isConnectedToHoveredPerson ? '#cbd5e1' : strokeColor}
                strokeWidth={currentStrokeWidth + 4}
                opacity={0.35}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none transition-all duration-150"
              />
            )}

            {/* Core Visible Connection Line */}
            <path
              d={conn.path}
              fill="none"
              stroke={strokeColor}
              strokeWidth={currentStrokeWidth}
              strokeDasharray={isUnverifiedLine ? '5,4' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={isHighlightActive ? 'url(#genealogy-line-glow)' : undefined}
              className="transition-colors duration-150 pointer-events-none"
            />

            {/* Architectural branch node anchor dot at midpoint for verified main branches or hubs */}
            {conn.type === 'child-branch' && typeof conn.midX === 'number' && typeof conn.midY === 'number' && (
              <circle
                cx={conn.midX}
                cy={conn.midY}
                r={isHighlightActive ? 3.5 : 2.5}
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth={isHighlightActive ? 2.2 : 1.6}
                filter="url(#genealogy-node-glow)"
                className="pointer-events-none transition-all duration-150"
              />
            )}
          </g>
        );
      })}

      {/* 2. Interactive Tooltip Overlay (single high-precision floating badge) */}
      {hoveredConn && hoverMousePos && (
        <g
          transform={`translate(${hoverMousePos.x}, ${hoverMousePos.y - 18})`}
          className="pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Card-style pill with hairline border and deep shadow */}
          <rect
            x="-82"
            y="-15"
            width="164"
            height="26"
            rx="8"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1"
            opacity="0.96"
            filter="url(#genealogy-node-glow)"
          />

          {/* Status Dot */}
          <circle
            cx="-68"
            cy="-2"
            r="3.5"
            fill={hoveredConn.isVerified && !hoveredConn.isDashed ? '#10b981' : '#f59e0b'}
          />

          {/* Status Label */}
          <text
            x="-58"
            y="1.5"
            fontSize="10"
            fill="#f8fafc"
            fontWeight="600"
            letterSpacing="0.02em"
            className="font-sans select-none"
          >
            {hoveredConn.isVerified && !hoveredConn.isDashed ? 'Перевірений звʼязок' : 'Гіпотетичний звʼязок'}
          </text>

          {/* Subtext indicator */}
          <text
            x="48"
            y="1.5"
            fontSize="9"
            fill="#94a3b8"
            fontWeight="500"
            textAnchor="end"
            className="font-sans select-none"
          >
            клікніть
          </text>
        </g>
      )}
    </svg>
  );
};

export const TreeConnections = React.memo(TreeConnectionsComponent);
