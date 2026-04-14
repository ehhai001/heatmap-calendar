import { useState, useEffect, useRef } from "react";

const COLORS = [
  "#21262d","#0e4429","#006d32","#26a641","#39d353",
  "#f0e68c","#f5a623","#e8720c","#d94f00","#b83200","#7b1a00",
];
const TEXT_COLORS = [
  "#8b949e","#6ee7b7","#6ee7b7","#0d1117","#0d1117",
  "#0d1117","#0d1117","#fff","#fff","#fff","#fff",
];
const MONTH_NAMES = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
const DOW = ["日","一","二","三","四","五","六"];

function getLevel(val) {
  if (!val || val <= 0) return 0;
  return Math.min(10, Math.ceil(val / 50));
}
function getRangeLabel(level) {
  if (level === 0) return "无";
  return `${(level - 1) * 50 + 1}–${level * 50}`;
}
function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const navBtn = {
  background: "#21262d", border: "1px solid #30363d",
  color: "#e6edf3", borderRadius: "8px", padding: "6px 14px",
  cursor: "pointer", fontSize: "18px", fontWeight: "700", lineHeight: "1",
};

export default function App() {
  const [data, setData] = useState({});
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState("month");
  const [popup, setPopup] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);
  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage?.get("heatmap-data");
        if (r?.value) { setData(JSON.parse(r.value)); setLoaded(true); return; }
      } catch {}
      try {
        const s = localStorage.getItem("heatmap-data");
        if (s) setData(JSON.parse(s));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Save data
  useEffect(() => {
    if (!loaded) return;
    const json = JSON.stringify(data);
    (async () => { try { await window.storage?.set("heatmap-data", json); } catch {} })();
    try { localStorage.setItem("heatmap-data", json); } catch {}
  }, [data, loaded]);

  function openPopup(e, key) {
    e.stopPropagation();
    setPopup({ key, input: data[key] !== undefined ? String(data[key]) : "" });
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  function savePopup() {
    const v = parseInt(popup.input);
    if (!isNaN(v) && v > 0 && v <= 500) {
      setData(p => ({ ...p, [popup.key]: v }));
    } else {
      setData(p => { const n = { ...p }; delete n[popup.key]; return n; });
    }
    setPopup(null);
  }
  function clearPopup() {
    setData(p => { const n = { ...p }; delete n[popup.key]; return n; });
    setPopup(null);
  }
  function handleKey(e) {
    if (e.key === "Enter") savePopup();
    if (e.key === "Escape") setPopup(null);
  }

  const popupVal = popup ? (parseInt(popup.input) || 0) : 0;
  const popupLevel = getLevel(popupVal);

  // Year stats
  const yEntries = Object.entries(data).filter(([k]) => k.startsWith(year + "-"));
  const yActive = yEntries.filter(([, v]) => v > 0).length;
  const yTotal = yEntries.reduce((s, [, v]) => s + v, 0);
  const yMax = yEntries.reduce((m, [, v]) => Math.max(m, v), 0);
  const yStreak = (() => {
    let max = 0, cur = 0;
    const total = isLeapYear(year) ? 366 : 365;
    for (let i = 0; i < total; i++) {
      const d = new Date(year, 0, i + 1);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (data[k] && data[k] > 0) { cur++; max = Math.max(max, cur); } else cur = 0;
    }
    return max;
  })();

  // Month stats
  const mPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const mEntries = Object.entries(data).filter(([k]) => k.startsWith(mPrefix));
  const mActive = mEntries.filter(([, v]) => v > 0).length;
  const mTotal = mEntries.reduce((s, [, v]) => s + v, 0);
  const mMax = mEntries.reduce((m, [, v]) => Math.max(m, v), 0);
  const mStreak = (() => {
    let max = 0, cur = 0;
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const k = dateKey(year, month, i);
      if (data[k] && data[k] > 0) { cur++; max = Math.max(max, cur); } else cur = 0;
    }
    return max;
  })();

  const isYear = viewMode === "year";
  const statsData = [
    { label: (isYear ? "全年" : "本月") + "活跃天数", value: (isYear ? yActive : mActive) + " 天", color: "#26a641" },
    { label: (isYear ? "全年" : "本月") + "总量", value: isYear ? yTotal : mTotal, color: "#f97316" },
    { label: "日均工作量", value: (() => { const a = isYear ? yActive : mActive, t = isYear ? yTotal : mTotal; return a > 0 ? (t / a).toFixed(1) : 0; })(), color: "#facc15" },
    { label: "最高单日", value: isYear ? yMax : mMax, color: "#e74c3c" },
    { label: "最高连续天数", value: (isYear ? yStreak : mStreak) + " 天", color: "#a78bfa" },
  ];

  function buildCells(y, mi) {
    const days = new Date(y, mi + 1, 0).getDate();
    const first = new Date(y, mi, 1).getDay();
    const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  return (
    <div
      onClick={() => setPopup(null)}
      style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "'Noto Sans SC','PingFang SC',sans-serif", padding: "28px 20px", boxSizing: "border-box" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: "linear-gradient(90deg,#f97316,#facc15)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              工作热力日历
            </h1>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: 12 }}>点击日期输入工作量（1–500），每50为一色阶</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* Year nav */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={e => { e.stopPropagation(); setYear(y => y - 1); }} style={navBtn}>&#8249;</button>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#f97316", minWidth: 44, textAlign: "center" }}>{year}</span>
              <button onClick={e => { e.stopPropagation(); setYear(y => y + 1); }} style={navBtn}>&#8250;</button>
            </div>
            {/* Month nav — only in month view */}
            {viewMode === "month" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={e => { e.stopPropagation(); setMonth(m => m === 0 ? 11 : m - 1); }} style={navBtn}>&#8249;</button>
                <select
                  value={month}
                  onChange={e => { e.stopPropagation(); setMonth(Number(e.target.value)); }}
                  onClick={e => e.stopPropagation()}
                  style={{ background: "#21262d", border: "1px solid #30363d", color: "#e6edf3", borderRadius: 8, padding: "6px 10px", fontSize: 15, fontWeight: 800, cursor: "pointer", outline: "none", minWidth: 72 }}
                >
                  {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
                <button onClick={e => { e.stopPropagation(); setMonth(m => m === 11 ? 0 : m + 1); }} style={navBtn}>&#8250;</button>
              </div>
            )}
            {/* View toggle */}
            <div style={{ display: "flex", background: "#21262d", border: "1px solid #30363d", borderRadius: 8, overflow: "hidden" }}>
              {[["month", "月视图"], ["year", "年视图"]].map(([mode, label]) => (
                <button key={mode} onClick={e => { e.stopPropagation(); setViewMode(mode); }}
                  style={{ padding: "6px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: viewMode === mode ? "#f97316" : "transparent", color: viewMode === mode ? "#0d1117" : "#8b949e", transition: "background 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {statsData.map(s => (
            <div key={s.label} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "10px 18px", flex: "1 1 110px" }}>
              <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        {viewMode === "year" ? (
          // Year view
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
            {Array.from({ length: 12 }, (_, mi) => {
              const cells = buildCells(year, mi);
              const mVals = Array.from({ length: new Date(year, mi + 1, 0).getDate() }, (_, i) => data[dateKey(year, mi, i + 1)] || 0);
              const mT = mVals.reduce((a, b) => a + b, 0);
              const mM = mVals.reduce((a, b) => Math.max(a, b), 0);
              const isCur = year === now.getFullYear() && mi === now.getMonth();
              return (
                <div key={mi}
                  style={{ background: "#161b22", border: isCur ? "1.5px solid #f97316" : "1px solid #30363d", borderRadius: 12, padding: 12 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span
                      onClick={e => { e.stopPropagation(); setViewMode("month"); setMonth(mi); }}
                      style={{ fontSize: 14, fontWeight: 800, color: isCur ? "#f97316" : "#e6edf3", cursor: "pointer", textDecoration: "underline", textDecorationColor: "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.textDecorationColor = "#f97316"}
                      onMouseLeave={e => e.currentTarget.style.textDecorationColor = "transparent"}
                    >
                      {MONTH_NAMES[mi]}
                    </span>
                    <span style={{ fontSize: 10, color: "#8b949e" }}>
                      <span style={{ color: "#facc15", fontWeight: 700 }}>{mT}</span>
                      {mM > 0 && <> &middot; <span style={{ color: "#e74c3c", fontWeight: 700 }}>{mM}</span></>}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 3 }}>
                    {DOW.map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#8b949e" }}>{d}</div>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                    {cells.map((day, ci) => {
                      if (!day) return <div key={ci} style={{ aspectRatio: "1" }} />;
                      const key = dateKey(year, mi, day);
                      const val = data[key];
                      const level = getLevel(val);
                      const tc = TEXT_COLORS[level];
                      const isToday = key === todayKey;
                      return (
                        <div key={ci}
                          onClick={e => { e.stopPropagation(); setViewMode("month"); setMonth(mi); openPopup(e, key); }}
                          title={val > 0 ? `${key} — ${val}` : key}
                          style={{
                            aspectRatio: "1", borderRadius: 3, background: COLORS[level],
                            border: isToday ? "2px solid #f97316" : "2px solid transparent",
                            boxSizing: "border-box", cursor: "pointer",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", overflow: "hidden",
                          }}
                        >
                          <span style={{ fontSize: 8, fontWeight: 600, lineHeight: 1, color: level > 0 ? tc : "#8b949e" }}>{day}</span>
                          {val > 0 && <span style={{ fontSize: 7, fontWeight: 800, lineHeight: 1, color: tc, marginTop: 1 }}>{val}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Month view
          (() => {
            const cells = buildCells(year, month);
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const mVals = Array.from({ length: daysInMonth }, (_, i) => data[dateKey(year, month, i + 1)] || 0);
            const monthTotal = mVals.reduce((a, b) => a + b, 0);
            const monthMax = mVals.reduce((a, b) => Math.max(a, b), 0);
            const isCurMonth = year === now.getFullYear() && month === now.getMonth();
            return (
              <div style={{ background: "#161b22", border: isCurMonth ? "1.5px solid #f97316" : "1px solid #30363d", borderRadius: 16, padding: 20, maxWidth: 520, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: isCurMonth ? "#f97316" : "#e6edf3" }}>{year}年 {MONTH_NAMES[month]}</span>
                  <span style={{ fontSize: 12, color: "#8b949e" }}>
                    总量 <span style={{ color: "#facc15", fontWeight: 700 }}>{monthTotal}</span>
                    {monthMax > 0 && <> &middot; 峰值 <span style={{ color: "#e74c3c", fontWeight: 700 }}>{monthMax}</span></>}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 8 }}>
                  {DOW.map(d => <div key={d} style={{ textAlign: "center", fontSize: 13, color: "#8b949e", padding: "4px 0", fontWeight: 600 }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
                  {cells.map((day, ci) => {
                    if (!day) return <div key={ci} style={{ aspectRatio: "1" }} />;
                    const key = dateKey(year, month, day);
                    const val = data[key];
                    const level = getLevel(val);
                    const bg = COLORS[level];
                    const tc = TEXT_COLORS[level];
                    const isToday = key === todayKey;
                    return (
                      <div key={ci}
                        onClick={e => openPopup(e, key)}
                        title={val > 0 ? `${key} — ${val} (${getRangeLabel(level)})` : key}
                        style={{
                          aspectRatio: "1", borderRadius: 8, background: bg,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", boxSizing: "border-box",
                          border: isToday ? "2px solid #f97316" : "2px solid transparent",
                          transition: "transform 0.1s, box-shadow 0.1s", position: "relative",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.zIndex = "10"; e.currentTarget.style.boxShadow = `0 0 10px ${bg}bb`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "1"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <span style={{ fontSize: 12, color: level > 0 ? tc : "#8b949e", fontWeight: 600, lineHeight: 1 }}>{day}</span>
                        {val > 0 && <span style={{ fontSize: 10, color: tc, fontWeight: 800, lineHeight: 1, marginTop: 2 }}>{val}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        )}

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#8b949e", marginRight: 4 }}>色阶：</span>
          {COLORS.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 28, height: 20, borderRadius: 4, background: c, border: "1px solid #30363d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: TEXT_COLORS[i], fontWeight: 700 }}>
                {i === 0 ? "无" : getRangeLabel(i)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popup */}
      {popup && (
        <>
          <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.45)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#1c2128", border: "1px solid #30363d", borderRadius: 18, padding: 22, zIndex: 1000, width: 280, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 12 }}>&#128197; {popup.key}</div>

            {/* Value display */}
            <div style={{ textAlign: "center", marginBottom: 16, padding: 14, borderRadius: 12, background: COLORS[popupLevel] + "44", border: `1.5px solid ${popupLevel === 0 ? "#30363d" : COLORS[popupLevel]}` }}>
              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: popupLevel === 0 ? "#8b949e" : COLORS[popupLevel] }}>
                {popupVal || "–"}
              </div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>
                色阶 {popupLevel} &middot; {getRangeLabel(popupLevel)}
              </div>
            </div>

            {/* Slider */}
            <div style={{ marginBottom: 8 }}>
              <input type="range" min={0} max={500} step={1}
                value={popupVal}
                onChange={e => setPopup(p => ({ ...p, input: e.target.value }))}
                style={{ width: "100%", accentColor: "#f97316" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8b949e", marginTop: 2 }}>
                <span>0</span><span>125</span><span>250</span><span>375</span><span>500</span>
              </div>
            </div>

            {/* Number input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "#8b949e", whiteSpace: "nowrap" }}>精确输入：</span>
              <input
                ref={inputRef}
                type="number" min={0}
                value={popup.input}
                onChange={e => setPopup(p => ({ ...p, input: e.target.value }))}
                onKeyDown={handleKey}
                placeholder="0–500"
                style={{ width: 0, minWidth: 0, flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, padding: "8px 8px", color: "#e6edf3", fontSize: 15, fontWeight: 700, textAlign: "center", outline: "none", MozAppearance: "textfield" }}
              />
            </div>

            {/* Color level quick select */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(11,1fr)", gap: 3, marginBottom: 18 }}>
              {COLORS.map((c, i) => (
                <div key={i}
                  onClick={() => setPopup(p => ({ ...p, input: i === 0 ? "0" : String((i - 1) * 50 + 25) }))}
                  title={getRangeLabel(i)}
                  style={{ aspectRatio: "1", borderRadius: 4, background: c, cursor: "pointer", border: popupLevel === i ? "2px solid #facc15" : "1px solid transparent", boxSizing: "border-box" }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={savePopup} style={{ flex: 1, padding: 10, borderRadius: 10, background: "linear-gradient(90deg,#f97316,#facc15)", border: "none", color: "#0d1117", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>保存</button>
              <button onClick={clearPopup} style={{ padding: "10px 12px", borderRadius: 10, background: "#21262d", border: "1px solid #30363d", color: "#8b949e", cursor: "pointer", fontSize: 12 }}>清除</button>
              <button onClick={() => setPopup(null)} style={{ padding: "10px 12px", borderRadius: 10, background: "#21262d", border: "1px solid #30363d", color: "#8b949e", cursor: "pointer", fontSize: 14 }}>&#10005;</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;800&display=swap');
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 6px; background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>
    </div>
  );
}


