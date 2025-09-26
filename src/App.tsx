import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Bell, MapPin, Activity, Clock, RefreshCw, Satellite } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

type ParamKey = "temp" | "sal" | "ph" | "do" | "turb" | "chl" | "gene_expr" | "methyl" | "metabo" | "lipid_ox";

type Reading = {
  ts: number;
  temp: number;
  sal: number;
  ph: number;
  do: number;
  turb: number;
  chl: number;
  gene_expr: number; // HAB-related toxin gene expression (AU)
  methyl: number;    // Epigenetic stress methylation fraction (0-1)
  metabo: number;    // Oxidative/toxin metabolite index (AU)
  lipid_ox: number;  // Lipid oxidation ratio (0-1)
};

type Site = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  depth_m: number;
};

const SITES: Site[] = [
  { id: "PS-EDMONDS", name: "Edmonds Nearshore", lat: 47.812, lon: -122.377, depth_m: 4 },
  { id: "PS-ALKI", name: "Alki Cove", lat: 47.576, lon: -122.413, depth_m: 5 },
  { id: "PS-DOCKTON", name: "Dockton Cove", lat: 47.373, lon: -122.463, depth_m: 3 },
  { id: "PS-SKAGIT", name: "Skagit Bay Farm", lat: 48.327, lon: -122.482, depth_m: 2 },
];

const THRESHOLDS: Record<ParamKey, { warn: number; crit: number; dir: "over" | "under" }>
  = {
    temp: { warn: 20, crit: 24, dir: "over" },
    sal:  { warn: 20, crit: 15, dir: "under" },
    ph:   { warn: 7.7, crit: 7.6, dir: "under" },
    do:   { warn: 6.0, crit: 4.0, dir: "under" },
    turb: { warn: 50, crit: 150, dir: "over" },
    chl:  { warn: 15, crit: 40, dir: "over" },
    gene_expr: { warn: 40, crit: 70, dir: "over" },
    methyl:    { warn: 0.55, crit: 0.7, dir: "over" },
    metabo:    { warn: 50, crit: 75, dir: "over" },
    lipid_ox:  { warn: 0.35, crit: 0.55, dir: "over" },
  };

const fmttime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function classifyAlert(key: ParamKey, value: number): "ok" | "warn" | "crit" {
  const { warn, crit, dir } = THRESHOLDS[key];
  if (dir === "over") {
    if (value >= crit) return "crit";
    if (value >= warn) return "warn";
    return "ok";
  } else {
    if (value <= crit) return "crit";
    if (value <= warn) return "warn";
    return "ok";
  }
}

function randomWalk(prev: number, step: number, min: number, max: number) {
  const next = prev + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

function generateSeeded(start: number): Reading {
  return {
    ts: start,
    temp: 16 + Math.random() * 4,
    sal:  28 + Math.random() * 3,
    ph:   7.8 + Math.random() * 0.2,
    do:   7 + Math.random() * 2,
    turb: 10 + Math.random() * 25,
    chl:  3 + Math.random() * 10,
    gene_expr: 20 + Math.random() * 20,
    methyl: 0.4 + Math.random() * 0.1,
    metabo: 20 + Math.random() * 20,
    lipid_ox: 0.25 + Math.random() * 0.1,
  };
}

function tick(prev: Reading, ts: number): Reading {
  return {
    ts,
    temp: randomWalk(prev.temp, 0.3, 8, 26),
    sal:  randomWalk(prev.sal, 0.3, 10, 33),
    ph:   randomWalk(prev.ph, 0.05, 7.3, 8.3),
    do:   randomWalk(prev.do, 0.4, 1.5, 12),
    turb: randomWalk(prev.turb, 6, 1, 300),
    chl:  randomWalk(prev.chl, 3, 0.1, 120),
    gene_expr: randomWalk(prev.gene_expr, 4, 0, 100),
    methyl:    randomWalk(prev.methyl, 0.03, 0, 1),
    metabo:    randomWalk(prev.metabo, 5, 0, 100),
    lipid_ox:  randomWalk(prev.lipid_ox, 0.03, 0, 1),
  };
}

function toCSV(rows: Reading[]): string {
  const header = [
    "timestamp", "time_local",
    "temp_c", "sal_psu", "ph", "do_mgL", "turb_ntu", "chl_ugL",
    "gene_expr_AU", "methyl_frac", "metabo_AU", "lipid_ox_frac"
  ].join(",");
  const lines = rows.map(r => [
    r.ts,
    new Date(r.ts).toISOString(),
    r.temp.toFixed(2),
    r.sal.toFixed(2),
    r.ph.toFixed(2),
    r.do.toFixed(2),
    r.turb.toFixed(1),
    r.chl.toFixed(1),
    r.gene_expr.toFixed(1),
    r.methyl.toFixed(3),
    r.metabo.toFixed(1),
    r.lipid_ox.toFixed(3),
  ].join(","));
  return [header, ...lines].join("\n");
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, unit, alert }: { label: string; value: number; unit: string; alert: "ok"|"warn"|"crit" }) {
  const tone = alert === "crit" ? "bg-red-500/10 text-red-700 border-red-500/30"
    : alert === "warn" ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  return (
    <Card className={`rounded-2xl ${tone}`}>
      <CardContent className="p-4">
        <div className="text-sm opacity-80">{label}</div>
        <div className="text-3xl font-semibold tabular-nums">{value.toFixed(2)} <span className="text-base align-top opacity-70">{unit}</span></div>
      </CardContent>
    </Card>
  );
}

function MiniSpark({ data, dataKey }: { data: Reading[]; dataKey: ParamKey }) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="ts" hide domain={["dataMin", "dataMax"]} type="number"/>
        <YAxis hide/>
        <Tooltip formatter={(v:any)=>Number(v).toFixed(2)} labelFormatter={(l:any)=>new Date(l).toLocaleString()} />
        <Area type="monotone" dataKey={dataKey} strokeWidth={2} fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function App() {
  const [activeSite, setActiveSite] = useState<string>(SITES[0].id);
  const [series, setSeries] = useState<Record<string, Reading[]>>({});
  const [streaming, setStreaming] = useState(true);
  const [search, setSearch] = useState("");
  const [showParam, setShowParam] = useState<ParamKey>("temp");
  const [activeTab, setActiveTab] = useState("thresholds");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const seed: Record<string, Reading[]> = {};
    for (const site of SITES) {
      const rows: Reading[] = [];
      const now = Date.now();
      let r = generateSeeded(now - 3 * 3600_000);
      for (let t = now - 3 * 3600_000; t <= now; t += 300_000) {
        r = tick(r, t);
        rows.push(r);
      }
      seed[site.id] = rows;
    }
    setSeries(seed);
  }, []);

  useEffect(() => {
    if (!streaming) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = window.setInterval(() => {
      setSeries(prev => {
        const copy: Record<string, Reading[]> = { ...prev };
        const now = Date.now();
        for (const site of SITES) {
          const arr = copy[site.id] ?? [];
          const last = arr[arr.length - 1] ?? generateSeeded(now);
          const next = tick(last, now);
          copy[site.id] = [...arr.slice(-240), next];
        }
        return copy;
      });
    }, 5000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [streaming]);

  const data = series[activeSite] ?? [];
  const latest = data[data.length - 1];

  const filteredSites = useMemo(() => {
    if (!search) return SITES;
    return SITES.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const alerts = useMemo(() => {
    if (!latest) return [] as { key: ParamKey; level: "warn"|"crit"; value: number }[];
    const keys: ParamKey[] = ["temp","sal","ph","do","turb","chl","gene_expr","methyl","metabo","lipid_ox"];
    return keys
      .map(k => ({ key: k, level: classifyAlert(k, (latest as any)[k] as number), value: (latest as any)[k] as number }))
      .filter(a => a.level !== "ok")
      .sort((a,b) => (a.level === "crit" ? -1 : 1));
  }, [latest]);

  const paramMeta: Record<ParamKey, { label: string; unit: string }> = {
    temp: { label: "Temperature", unit: "°C" },
    sal: { label: "Salinity", unit: "PSU" },
    ph: { label: "pH", unit: "" },
    do: { label: "Dissolved O₂", unit: "mg/L" },
    turb: { label: "Turbidity", unit: "NTU" },
    chl: { label: "Chlorophyll‑a", unit: "µg/L" },
    gene_expr: { label: "HAB gene expression", unit: "AU" },
    methyl: { label: "Stress methylation", unit: "" },
    metabo: { label: "Toxin metabolites", unit: "AU" },
    lipid_ox: { label: "Lipid oxidation", unit: "" },
  };

  function exportCSV() {
    const siteName = SITES.find(s => s.id === activeSite)?.name?.replace(/\s+/g, "_") ?? activeSite;
    downloadText(`${siteName}_export.csv`, toCSV(data));
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/60 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Satellite className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Shellfish Environmental Monitor</h1>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-slate-100 border">Mock Data</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" onClick={() => setStreaming(s => !s)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${streaming ? "animate-spin" : ""}`} /> {streaming ? "Streaming" : "Paused"}
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2"/> Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-3 space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4"/> Sites</div>
              <Input placeholder="Search sites…" value={search} onChange={e=>setSearch(e.target.value)} />
              <div className="max-h-72 overflow-auto pr-1 space-y-2">
                {filteredSites.map(s => (
                  <button
                    key={s.id}
                    onClick={()=>setActiveSite(s.id)}
                    className={`w-full text-left p-2 rounded-xl border hover:bg-slate-50 ${activeSite===s.id?"border-sky-300 bg-sky-50":"border-slate-200"}`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs opacity-70">{s.id} · {s.lat.toFixed(3)}, {s.lon.toFixed(3)} · depth {s.depth_m} m</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium"><Bell className="h-4 w-4"/> Active Alerts</div>
              {alerts.length === 0 && <div className="text-sm opacity-70">No alerts. All parameters within set thresholds.</div>}
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.key} className={`p-2 rounded-xl border text-sm flex items-center justify-between ${a.level==="crit"?"bg-red-50 border-red-200":"bg-yellow-50 border-yellow-200"}`}>
                    <span className="font-medium">{paramMeta[a.key].label}</span>
                    <span className="tabular-nums">{a.value.toFixed(2)} {paramMeta[a.key].unit}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs opacity-70">Thresholds are generic defaults; customize per site/species.</div>
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-9 space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-lg font-semibold">{SITES.find(s=>s.id===activeSite)?.name}</div>
                <div className="ml-auto text-sm flex items-center gap-2"><Clock className="h-4 w-4"/> Last update: {latest? new Date(latest.ts).toLocaleTimeString():"—"}</div>
              </div>
              {latest && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <MetricCard label="Temp" value={latest.temp} unit="°C" alert={classifyAlert("temp", latest.temp)} />
                  <MetricCard label="Salinity" value={latest.sal} unit="PSU" alert={classifyAlert("sal", latest.sal)} />
                  <MetricCard label="pH" value={latest.ph} unit="" alert={classifyAlert("ph", latest.ph)} />
                  <MetricCard label="DO" value={latest.do} unit="mg/L" alert={classifyAlert("do", latest.do)} />
                  <MetricCard label="Turbidity" value={latest.turb} unit="NTU" alert={classifyAlert("turb", latest.turb)} />
                  <MetricCard label="Chl‑a" value={latest.chl} unit="µg/L" alert={classifyAlert("chl", latest.chl)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 font-medium"><Activity className="h-4 w-4"/> Trends (past ~3 h)</div>
                <div className="ml-auto flex items-center gap-2">
                  <Label className="text-xs">Live</Label>
                  <Switch checked={streaming} onCheckedChange={setStreaming} />
                  <Select
                    value={showParam}
                    onValueChange={(v)=>setShowParam(v as ParamKey)}
                    options={[
                      { value: "temp", label: "Temperature" },
                      { value: "sal", label: "Salinity" },
                      { value: "ph", label: "pH" },
                      { value: "do", label: "Dissolved O₂" },
                      { value: "turb", label: "Turbidity" },
                      { value: "chl", label: "Chlorophyll‑a" },
                      { value: "gene_expr", label: "HAB gene expression" },
                      { value: "methyl", label: "Stress methylation" },
                      { value: "metabo", label: "Toxin metabolites" },
                      { value: "lipid_ox", label: "Lipid oxidation" },
                    ]}
                    className="w-44"
                  />
                </div>
              </div>

              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t)=>fmttime(t)} />
                    <YAxis domain={['auto','auto']} tickFormatter={(v)=>v.toFixed(1)} />
                    <Tooltip formatter={(v:any)=>Number(v).toFixed(2)} labelFormatter={(l:any)=>new Date(l).toLocaleString()} />
                    <Line type="monotone" dataKey={showParam} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {(["temp","sal","ph","do","turb","chl"] as ParamKey[]).map(k => (
                  <div key={k} className={`p-2 rounded-xl border ${showParam===k?"border-sky-300 bg-sky-50":"border-slate-200"}`}>
                    <div className="text-xs mb-1 flex items-center justify-between">
                      <span>{paramMeta[k].label}</span>
                      <span className="opacity-60 tabular-nums">{latest ? (latest as any)[k].toFixed(2) : "—"} {paramMeta[k].unit}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={56}>
                      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="ts" hide domain={["dataMin", "dataMax"]} type="number"/>
                        <YAxis hide/>
                        <Tooltip formatter={(v:any)=>Number(v).toFixed(2)} labelFormatter={(l:any)=>new Date(l).toLocaleString()} />
                        <Area type="monotone" dataKey={k} strokeWidth={2} fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 font-medium"><Activity className="h-4 w-4"/> Environmental BioIndicators</div>
              {latest && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {(["gene_expr","methyl","metabo","lipid_ox"] as ParamKey[]).map(k => (
                    <div key={k} className={`p-2 rounded-xl border ${showParam===k?"border-sky-300 bg-sky-50":"border-slate-200"}`}>
                      <div className="text-xs mb-1 flex items-center justify-between">
                        <span>{paramMeta[k].label}</span>
                        <span className="opacity-60 tabular-nums">{latest ? (latest as any)[k].toFixed(2) : "—"} {paramMeta[k].unit}</span>
                      </div>
                      <ResponsiveContainer width="100%" height={56}>
                        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="ts" hide domain={["dataMin", "dataMax"]} type="number"/>
                          <YAxis hide/>
                          <Tooltip formatter={(v:any)=>Number(v).toFixed(2)} labelFormatter={(l:any)=>new Date(l).toLocaleString()} />
                          <Area type="monotone" dataKey={k} strokeWidth={2} fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="thresholds" activeValue={activeTab} onClick={()=>setActiveTab("thresholds")}>Thresholds</TabsTrigger>
              <TabsTrigger value="about" activeValue={activeTab} onClick={()=>setActiveTab("about")}>About</TabsTrigger>
            </TabsList>
            <TabsContent value="thresholds" activeValue={activeTab}>
              <Card className="rounded-2xl mt-3">
                <CardContent className="p-4">
                  <div className="text-sm opacity-80 mb-3">Customize alert thresholds (mock; non‑persistent).</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {(["temp","sal","ph","do","turb","chl","gene_expr","methyl","metabo","lipid_ox"] as ParamKey[]).map(k => (
                      <div key={k} className="space-y-2 p-3 rounded-xl border">
                        <div className="text-sm font-medium">{paramMeta[k].label}</div>
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <Label className="text-xs">Warn</Label>
                          <Input
                            className="h-8"
                            type="number"
                            defaultValue={THRESHOLDS[k].warn}
                            onBlur={(e)=>{ THRESHOLDS[k].warn = Number((e.target as HTMLInputElement).value); }}
                          />
                          <Label className="text-xs">Critical</Label>
                          <Input
                            className="h-8"
                            type="number"
                            defaultValue={THRESHOLDS[k].crit}
                            onBlur={(e)=>{ THRESHOLDS[k].crit = Number((e.target as HTMLInputElement).value); }}
                          />
                        </div>
                        <div className="text-xs opacity-70">Direction: {THRESHOLDS[k].dir === "over" ? "higher is worse" : "lower is worse"}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="about" activeValue={activeTab}>
              <Card className="rounded-2xl mt-3">
                <CardContent className="p-4 space-y-2 text-sm">
                  <p>
                    This mockup simulates a real‑time data stream for coastal aquaculture sites
                    (temperature, salinity, pH, dissolved oxygen, turbidity, chlorophyll‑a), plus environmental
                    bioindicators: harmful algal bloom gene expression (AU), DNA methylation stress fraction, toxin
                    metabolite index (AU), and lipid oxidation ratio.
                    Replace the generator with your telemetry API or WebSocket.
                  </p>
                 <p className="opacity-80">How to interpret bioindicators (mock guidance):</p>
                 <ul className="list-disc ml-5 space-y-1">
                   <li><strong>HAB gene expression:</strong> higher values suggest emerging algal bloom potential; consider increased sampling or harvest holds.</li>
                   <li><strong>Stress methylation:</strong> elevated fractions indicate chronic environmental stress (temperature, hypoxia, acidification).</li>
                   <li><strong>Toxin metabolites:</strong> rising index can reflect exposure to algal or microbial toxins; monitor product safety plans.</li>
                   <li><strong>Lipid oxidation:</strong> higher ratios indicate oxidative stress impacting shellfish condition and shelf life.</li>
                 </ul>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Live stream:</strong> togglable; updates every 5 s.</li>
                    <li><strong>Alerts:</strong> driven by editable thresholds (non‑persistent here).</li>
                    <li><strong>Export:</strong> CSV of the on‑screen window for quick sharing.</li>
                    <li><strong>Charts:</strong> trend + per‑parameter mini‑sparks for quick scanning.</li>
                    <li><strong>Sites:</strong> simple list; wire to a map or portfolio once ready.</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-6 text-xs opacity-70">
        © {new Date().getFullYear()} Coastal Monitoring Mock • For demonstration only
      </footer>
    </div>
  );
}
