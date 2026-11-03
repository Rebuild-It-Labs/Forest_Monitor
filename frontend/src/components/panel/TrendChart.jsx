import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtNum } from '../../lib/format.js';

const GREEN = '#00ff88';
const RED = '#ff2e63';
const MAGENTA = '#ff00aa';
const tick = { fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: '"Share Tech Mono", monospace' };

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = (k) => payload.find((p) => p.dataKey === k)?.value;
  const cover = val('cover');
  const loss = val('loss');
  const fc = val('forecast');
  return (
    <div className="glass-strong rounded px-2.5 py-2 font-mono text-[10.5px] shadow-neon">
      <div className="mb-1 tracking-[0.2em] text-white">{label}</div>
      {cover != null && (
        <div className="text-neon">
          COVER <span className="text-white">{fmtNum(cover, 1)} kha</span>
        </div>
      )}
      {loss != null && loss > 0 && (
        <div className="text-alert-red">
          LOSS <span className="text-white">{fmtNum(loss)} ha</span>
        </div>
      )}
      {fc != null && cover == null && (
        <div className="text-alert-magenta">
          FORECAST <span className="text-white">{fmtNum(fc, 1)} kha</span>
        </div>
      )}
    </div>
  );
}

/**
 * 10-year forest-cover trend (emerald area) with annual loss (red line, right axis)
 * and the model's 1-year forecast (dashed magenta). Glow comes from CSS drop-shadows on `.neon-chart`.
 */
export default function TrendChart({ series, forecast }) {
  const data = useMemo(() => {
    const rows = series.map((r) => ({ year: r.year, cover: r.coverKha, loss: r.lossHa, forecast: null }));
    rows[rows.length - 1].forecast = rows[rows.length - 1].cover; // join the forecast to the last real point
    rows.push({ year: forecast.year, cover: null, loss: null, forecast: forecast.coverKha });
    return rows;
  }, [series, forecast]);

  const lastYear = series[series.length - 1].year;

  return (
    <section aria-label="Forest cover trend">
      <div className="mb-2 flex items-end justify-between">
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-neon/85">FOREST COVER · {series[0].year}–{lastYear}</h3>
        <div className="flex gap-3 font-mono text-[9px] tracking-widest text-white/55">
          <span className="flex items-center gap-1">
            <i className="inline-block h-0.5 w-3 bg-neon" /> COVER
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-0.5 w-3 bg-alert-red" /> LOSS
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-0.5 w-3 border-t border-dashed border-alert-magenta" /> AI
          </span>
        </div>
      </div>
      <div className="neon-chart hud-corners h-56 rounded-lg border border-neon/15 bg-black/40 p-1.5 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="coverFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(0,255,136,0.08)" vertical={false} />
            <XAxis dataKey="year" tick={tick} tickLine={false} axisLine={{ stroke: 'rgba(0,255,136,0.25)' }} interval={1} />
            <YAxis
              yAxisId="cover"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={46}
              domain={[(min) => Math.floor(min * 0.96), (max) => Math.ceil(max * 1.01)]}
              tickFormatter={(v) => fmtNum(v)}
            />
            <YAxis yAxisId="loss" orientation="right" tick={{ ...tick, fill: 'rgba(255,46,99,0.7)' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(0,255,136,0.4)', strokeDasharray: '3 3' }} />
            <ReferenceLine yAxisId="cover" x={lastYear} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" label={{ value: 'NOW', fill: '#fff', fontSize: 9, position: 'insideTopLeft' }} />
            <Area yAxisId="cover" type="monotone" dataKey="cover" stroke={GREEN} strokeWidth={2.2} fill="url(#coverFill)" dot={false} activeDot={{ r: 4, fill: GREEN, stroke: '#000' }} animationDuration={1400} />
            <Line yAxisId="loss" type="monotone" dataKey="loss" stroke={RED} strokeWidth={1.8} dot={{ r: 2, fill: RED, strokeWidth: 0 }} activeDot={{ r: 4, fill: RED, stroke: '#000' }} animationDuration={1600} />
            <Line yAxisId="cover" type="monotone" dataKey="forecast" stroke={MAGENTA} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: MAGENTA, strokeWidth: 0 }} animationDuration={1800} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
