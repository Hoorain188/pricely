'use client';

import React from 'react';
import { Calendar, LineChart } from 'lucide-react';
import { PriceHistoryPoint, formatPrice } from '../services/api';

interface PriceHistoryChartProps {
  points: PriceHistoryPoint[];
  currentPrice?: number;
  lowestPrice?: number;
  highestPrice?: number;
  averagePrice?: number;
  hasHistory?: boolean;
}

export default function PriceHistoryChart({
  points,
  currentPrice,
  lowestPrice,
  highestPrice,
  averagePrice,
  hasHistory,
}: PriceHistoryChartProps) {
  if (!hasHistory || !points || points.length < 2) {
    return null; // Hide section entirely if hasHistory is false or insufficient points
  }

  // Calculate SVG line points
  const minP = lowestPrice || Math.min(...points.map((p) => p.price));
  const maxP = highestPrice || Math.max(...points.map((p) => p.price));
  const rangeP = maxP - minP || 1;

  const width = 600;
  const height = 180;
  const padding = 20;

  const chartPoints = points.map((pt, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((pt.price - minP) / rangeP) * (height - padding * 2);
    return { x, y, price: pt.price, date: pt.date };
  });

  const pathD = chartPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${height - padding} L ${chartPoints[0].x} ${height - padding} Z`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="text-[#1D9A7C]" size={22} />
          <h3 className="text-base font-bold text-slate-900">
            Price History (30 Days)
          </h3>
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <Calendar size={14} />
          Last 30 days trend
        </span>
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
        >
          {/* Gradient Fill */}
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D9A7C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1D9A7C" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Fill Area */}
          <path d={areaD} fill="url(#priceGradient)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#1D9A7C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Point Dots */}
          {chartPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="4"
              className="fill-white stroke-[#1D9A7C] stroke-2 hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${formatPrice(pt.price)} (${new Date(pt.date).toLocaleDateString()})`}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* Stats Summary Row below */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Current
          </span>
          <span className="text-sm font-bold text-slate-900 font-mono">
            {formatPrice(currentPrice ?? points[points.length - 1]?.price)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Lowest
          </span>
          <span className="text-sm font-bold text-emerald-700 font-mono">
            {formatPrice(minP)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Highest
          </span>
          <span className="text-sm font-bold text-slate-900 font-mono">
            {formatPrice(maxP)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Average
          </span>
          <span className="text-sm font-bold text-slate-900 font-mono">
            {formatPrice(averagePrice || (minP + maxP) / 2)}
          </span>
        </div>
      </div>
    </div>
  );
}
