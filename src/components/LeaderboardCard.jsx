import React from "react";
import SectionCard from "./SectionCard";
import { Medal, TrendingUp, TrendingDown, Minus } from "lucide-react";

const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#B45309"];

export default function LeaderboardCard({ title, subtitle, icon: Icon, items, myRank, myItem, footer, loading, error, scoreLabel = "score" }) {
  const fmtScore = (v) => v != null ? (typeof v === "number" ? v.toFixed(1) : v) : "—";

  function Trend({ score, prevScore }) {
    if (prevScore == null || score == null) return null;
    const diff = score - prevScore;
    if (Math.abs(diff) < 0.05) {
      return <span className="inline-flex items-center text-slate-400" title={`No change (prev ${prevScore.toFixed(1)})`}><Minus className="w-3.5 h-3.5" /></span>;
    }
    return diff > 0 ? (
      <span className="inline-flex items-center text-emerald-600" title={`+${diff.toFixed(1)} vs last year (${prevScore.toFixed(1)})`}><TrendingUp className="w-3.5 h-3.5" /></span>
    ) : (
      <span className="inline-flex items-center text-rose-500" title={`${diff.toFixed(1)} vs last year (${prevScore.toFixed(1)})`}><TrendingDown className="w-3.5 h-3.5" /></span>
    );
  }

  return (
    <SectionCard title={title} subtitle={subtitle} icon={Icon}>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-slate-400 text-center py-8">{error}</p>
      ) : (
        <div className="space-y-1.5">
          {(items || []).map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                s.isMe ? "bg-blue-50 border border-blue-200" : i < 3 ? "bg-slate-50" : ""
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                style={{
                  backgroundColor: i < 3 ? MEDAL_COLORS[i] + "20" : "#F1F5F9",
                  color: i < 3 ? MEDAL_COLORS[i] : "#64748B",
                }}
              >
                {i < 3 ? <Medal className="w-4 h-4" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                {s.sublabel && <p className="text-xs text-slate-400 truncate">{s.sublabel}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Trend score={s.score} prevScore={s.prevScore} />
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{fmtScore(s.score)}</p>
                  <p className="text-[10px] text-slate-400">{scoreLabel}</p>
                </div>
              </div>
            </div>
          ))}

          {myItem && !(items || []).some((s) => s.isMe) && (
            <>
              <div className="flex items-center justify-center py-1">
                <div className="flex-1 border-t border-dashed border-slate-200" />
                <span className="px-2 text-[10px] text-slate-400">your position</span>
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {myRank || "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{myItem.name}</p>
                  {myItem.sublabel && <p className="text-xs text-slate-400 truncate">{myItem.sublabel}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Trend score={myItem.score} prevScore={myItem.prevScore} />
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{fmtScore(myItem.score)}</p>
                    <p className="text-[10px] text-slate-400">{scoreLabel}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {footer && <p className="text-[11px] text-slate-400 text-center pt-2">{footer}</p>}
        </div>
      )}
    </SectionCard>
  );
}