import React from 'react';
import { TimelineTick } from '../utils/timelineUtils';
import { Person } from '../types/tree';

interface TimelineRulerProps {
  ticks: TimelineTick[];
  viewportY: number;
  zoom: number;
  showGuidelines?: boolean;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  ticks,
  viewportY,
  zoom,
}) => {
  return (
    <div
      className="absolute top-0 left-0 bottom-0 w-16 sm:w-20 bg-[#f4f7f4]/95 backdrop-blur-xs border-r border-[#cad8cc] z-30 select-none overflow-hidden pointer-events-none shadow-[2px_0_6px_rgba(0,0,0,0.02)]"
    >
      {/* Top Header Badge */}
      <div className="h-7 border-b border-[#cad8cc] bg-[#e8efe9] flex items-center justify-center text-[10px] font-semibold text-stone-600 tracking-wider uppercase">
        Роки
      </div>

      {/* Synchronized Vertical Ruler Container */}
      <div
        className="relative w-full h-full"
        style={{
          transform: `translateY(${viewportY}px)`,
          transformOrigin: '0 0',
        }}
      >
        {ticks.map((tick) => {
          const scaledY = tick.y * zoom;

          return (
            <div
              key={tick.year}
              style={{
                position: 'absolute',
                top: `${scaledY}px`,
                right: 0,
                left: 0,
                transform: 'translateY(-50%)',
              }}
              className="flex items-center justify-between pr-2 pl-2"
            >
              {/* Year Label */}
              <span
                className={`font-mono text-right transition-colors ${
                  tick.isCentury
                    ? 'text-[11px] font-bold text-emerald-950'
                    : tick.isMajor
                    ? 'text-[10px] font-semibold text-stone-700'
                    : 'text-[9px] font-normal text-stone-600'
                }`}
              >
                {tick.year}
              </span>

              {/* Tick Mark on Right Border */}
              <div
                className={`h-0.5 rounded-full ${
                  tick.isCentury
                    ? 'w-3.5 bg-emerald-800'
                    : tick.isMajor
                    ? 'w-2.5 bg-stone-600'
                    : 'w-1.5 bg-stone-400'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CanvasTimelineGuidelinesProps {
  ticks: TimelineTick[];
  selectedPerson?: Person | null;
  allPersons?: Record<string, Person>;
}

export const CanvasTimelineGuidelines: React.FC<CanvasTimelineGuidelinesProps> = ({
  ticks,
  selectedPerson,
  allPersons,
}) => {

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
      {/* Background timeline year ticks */}
      {ticks.map((tick) => {
        if (!tick.isMajor && !tick.isCentury) return null;

        return (
          <div
            key={tick.year}
            style={{
              position: 'absolute',
              top: `${tick.y}px`,
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
            }}
            className="flex items-center"
          >
            {/* Guide line across entire canvas */}
            <div
              className={`w-full border-t ${
                tick.isCentury
                  ? 'border-emerald-700/25 border-dashed'
                  : 'border-stone-300/40 border-dotted'
              }`}
            />
            {/* Subtle year marker inside canvas */}
            <span
              className={`text-[9px] font-mono select-none px-2 py-0.5 rounded opacity-40 ml-4 ${
                tick.isCentury
                  ? 'text-emerald-900 bg-emerald-100/40 font-bold'
                  : 'text-stone-500'
              }`}
            >
              {tick.year} р.
            </span>
          </div>
        );
      })}
    </div>
  );
};
