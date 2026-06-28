"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ── classic MC colour codes ──
const LEGACY: [string, string][] = [
  ["0", "#000000"], ["1", "#0000AA"], ["2", "#00AA00"], ["3", "#00AAAA"],
  ["4", "#AA0000"], ["5", "#AA00AA"], ["6", "#FFAA00"], ["7", "#AAAAAA"],
  ["8", "#555555"], ["9", "#5555FF"], ["a", "#55FF55"], ["b", "#55FFFF"],
  ["c", "#FF5555"], ["d", "#FF55FF"], ["e", "#FFFF55"], ["f", "#FFFFFF"],
];
const MAGIC_CHARS = "!?#@$%&*<>/\\|=+";

type Solid = { type: "hex" | "legacy"; code: string | null; hex: string };
type Styles = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; magic: boolean };
type Mode = "solid" | "gradient" | "rainbow";
type WrapKey = "none" | "square" | "angle" | "thick" | "dot" | "star";

const WRAPS: Record<WrapKey, [string, string]> = {
  none:   ["", ""],
  square: ["[ ", " ]"],
  angle:  ["« ", " »"],
  thick:  ["≪ ", " ≫"],
  dot:    ["• ", " •"],
  star:   ["✦ ", " ✦"],
};

const PRESETS: { label: string; str: string }[] = [
  { label: "Fire",    str: "&7[ &#FF3D00&lFIRE&7 ]" },
  { label: "Royal",   str: "&8« <gradient:#FFD700:#FFA000:#FF6F00>KING</gradient> &8»" },
  { label: "Neon",    str: "{#FF00FF>}&lNEON{#00E5FF<}" },
  { label: "Rainbow", str: "&7[ <rainbow>PARTY</rainbow> &7]" },
  { label: "Galaxy",  str: "<gradient:#7B1FA2:#1976D2>GALAXY</gradient>" },
  { label: "Toxic",   str: "&8[ <gradient:#33691E:#7CB342:#C6FF00>TOXIC</gradient> &8]" },
];

// ── helpers ──
const hexClean = (h: string) => h.replace("#", "").toUpperCase();
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const hx = (n: number) => n.toString(16).padStart(2, "0");
function hexToRgb(h: string): [number, number, number] {
  h = hexClean(h);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgbToHex = (r: number, g: number, b: number) => "#" + hx(r) + hx(g) + hx(b);

function gradientColorAt(stops: string[], progress: number): string {
  const steps = stops.length - 1;
  let scaled = progress * steps;
  let idx = Math.floor(scaled);
  if (idx >= steps) idx = steps - 1;
  const local = scaled - idx;
  const [r1, g1, b1] = hexToRgb(stops[idx]);
  const [r2, g2, b2] = hexToRgb(stops[idx + 1]);
  return rgbToHex(lerp(r1, r2, local), lerp(g1, g2, local), lerp(b1, b2, local));
}

function hsbToRgb(h: number, s: number, v: number): string {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

export default function HomePage() {
  const [text, setText] = useState("LEGEND");
  const [mode, setMode] = useState<Mode>("solid");
  const [solid, setSolid] = useState<Solid>({ type: "hex", code: null, hex: "#FF4D4D" });
  const [stops, setStops] = useState<string[]>(["#FF3D00", "#FFD600"]);
  const [styles, setStyles] = useState<Styles>({ bold: false, italic: false, underline: false, strike: false, magic: false });
  const [wrap, setWrap] = useState<WrapKey>("square");
  const [copied, setCopied] = useState(false);

  const activeStyleCodes = useMemo(() => {
    let s = "";
    if (styles.bold)      s += "&l";
    if (styles.italic)    s += "&o";
    if (styles.underline) s += "&n";
    if (styles.strike)    s += "&m";
    if (styles.magic)     s += "&k";
    return s;
  }, [styles]);

  const hasStyle = Object.values(styles).some(Boolean);

  // ── output string ──
  const { output, warning } = useMemo(() => {
    let core = "", warning = "";
    if (mode === "solid") {
      const color = solid.type === "legacy" ? "&" + solid.code : "&#" + hexClean(solid.hex);
      core = color + activeStyleCodes + text;
    } else if (mode === "gradient") {
      if (hasStyle) {
        const a = hexClean(stops[0]);
        const b = hexClean(stops[stops.length - 1]);
        core = "{#" + a + ">}" + activeStyleCodes + text + "{#" + b + "<}";
        if (stops.length > 2) {
          warning = "Gradient so štýlom drží len <b>2 farby</b> (použila sa prvá a posledná). Pre 3 farby vypni štýl.";
        }
      } else {
        core = "<gradient:" + stops.map((s) => "#" + hexClean(s)).join(":") + ">" + text + "</gradient>";
      }
    } else {
      core = "<rainbow>" + text + "</rainbow>";
      if (hasStyle) {
        warning = "Dúha nedokáže držať štýl (každé písmeno resetuje formátovanie) — <b>štýl sa neprejaví</b>. Vypni ho, alebo zvoľ gradient.";
      }
    }
    const [pre, suf] = WRAPS[wrap];
    return { output: (pre ? "&7" + pre : "") + core + (suf ? "&7" + suf : ""), warning };
  }, [text, mode, solid, stops, activeStyleCodes, hasStyle, wrap]);

  // ── preview characters with effective styles ──
  // Rainbow mode resets formatting per-char in MC, so preview skips styles there too.
  const effectiveStyles = mode === "rainbow"
    ? { bold: false, italic: false, underline: false, strike: false, magic: false }
    : styles;

  const previewChars = useMemo(() => {
    const chars = [...text];
    if (mode === "solid") {
      const hex = solid.type === "legacy"
        ? (LEGACY.find((l) => l[0] === solid.code)?.[1] ?? solid.hex)
        : solid.hex;
      return [{ ch: text || "​", hex }];
    }
    if (mode === "gradient") {
      return chars.map((ch, i) => ({ ch, hex: gradientColorAt(stops, chars.length <= 1 ? 0 : i / (chars.length - 1)) }));
    }
    const L = chars.length || 1;
    return chars.map((ch, i) => ({ ch, hex: hsbToRgb(i / L, 1, 1) }));
  }, [text, mode, solid, stops]);

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="min-h-screen relative">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.18] [background-image:linear-gradient(#1b212b_1px,transparent_1px),linear-gradient(90deg,#1b212b_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle_at_50%_30%,#000_0%,transparent_75%)]" />

      <header className="max-w-6xl mx-auto px-5 pt-10 relative">
        <div className="text-xs uppercase tracking-[0.18em] text-dim mb-2">wfrz.eu · open source</div>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Tag Studio<span className="text-brand">.</span>
            </h1>
            <p className="text-dim mt-3 max-w-2xl">
              Navrhni si chat tag — solid / gradient / rainbow farby, MC štýly, zátvorky.
              Vygenerovaný reťazec je 1:1 kompatibilný s tag pluginom.
            </p>
          </div>
          <div className="text-xs font-mono text-dim border border-border rounded-full px-3.5 py-1.5">
            <code className="text-brand">/tag shop</code> → Vytvoriť vlastný tag → vlož do chatu
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-8 pb-24 relative grid lg:grid-cols-2 gap-5">

        {/* LEFT — controls */}
        <div className="space-y-5">
          <div className="card p-5 space-y-5">
            <Eyebrow num={1}>Text</Eyebrow>
            <div>
              <label className="block text-xs text-dim mb-1.5">Čo má byť v tagu</label>
              <input value={text} onChange={(e) => setText(e.target.value)}
                maxLength={40} spellCheck={false} autoComplete="off"
                className="input input-mono text-base !py-3" />
            </div>

            <Eyebrow num={2}>Farba</Eyebrow>
            <div className="grid grid-cols-3 gap-1 bg-muted border border-border/70 p-1 rounded-xl">
              {(["solid", "gradient", "rainbow"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2 px-3 rounded-md text-sm font-semibold transition ${
                    mode === m
                      ? m === "gradient" ? "bg-surface text-accent-cyan shadow-[inset_0_0_0_1px_#2a2e36]"
                      : m === "rainbow"  ? "bg-surface text-[#f0abfc] shadow-[inset_0_0_0_1px_#2a2e36]"
                                         : "bg-surface text-brand shadow-[inset_0_0_0_1px_#2a2e36]"
                      : "text-dim hover:text-text"
                  }`}>
                  {m === "solid" ? "Jedna farba" : m === "gradient" ? "Gradient" : "Dúha"}
                </button>
              ))}
            </div>

            {mode === "solid" && (
              <div className="space-y-3">
                <div className="grid grid-cols-8 gap-1.5">
                  {LEGACY.map(([code, hex]) => {
                    const active = solid.type === "legacy" && solid.code === code;
                    return (
                      <button key={code}
                        onClick={() => setSolid({ type: "legacy", code, hex })}
                        title={"&" + code}
                        style={{ background: hex }}
                        className={`aspect-square rounded-md border border-white/10 hover:-translate-y-0.5 transition ${
                          active ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : ""
                        }`} />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2.5 bg-muted border border-border/70 rounded-lg p-2">
                  <input type="color" value={solid.hex}
                    onChange={(e) => setSolid({ type: "hex", code: null, hex: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0
                      [&::-webkit-color-swatch-wrapper]:p-0
                      [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-white/15 [&::-webkit-color-swatch]:rounded-md" />
                  <span className="font-mono text-sm text-dim flex-1">{solid.hex.toUpperCase()}</span>
                  <span className="text-[10px] uppercase tracking-wider text-dim font-mono">vlastná hex</span>
                </div>
                <p className="text-xs text-dim">Klikni paletku (16 klasických farieb) alebo si vyber vlastnú hex farbu.</p>
              </div>
            )}

            {mode === "gradient" && (
              <div className="space-y-3">
                {stops.map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-muted border border-border/70 rounded-lg p-2">
                    <input type="color" value={c}
                      onChange={(e) => {
                        const n = [...stops]; n[i] = e.target.value; setStops(n);
                      }}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0
                        [&::-webkit-color-swatch-wrapper]:p-0
                        [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-white/15 [&::-webkit-color-swatch]:rounded-md" />
                    <span className="font-mono text-sm text-dim flex-1">{c.toUpperCase()}</span>
                    <span className="text-[10px] uppercase tracking-wider text-dim font-mono">
                      {stops.length === 2 ? (i === 0 ? "štart" : "koniec") :
                       i === 0 ? "štart" : i === stops.length - 1 ? "koniec" : "stred"}
                    </span>
                    {stops.length > 2 && (
                      <button onClick={() => setStops(stops.filter((_, j) => j !== i))}
                        className="text-dim hover:text-accent-rose text-lg leading-none px-1">×</button>
                    )}
                  </div>
                ))}
                {stops.length < 3 && (
                  <button onClick={() => setStops([stops[0], "#22D3EE", stops[1]])}
                    className="w-full border border-dashed border-border/70 hover:border-accent-cyan hover:text-accent-cyan text-dim rounded-lg py-2.5 text-sm transition">
                    + pridať tretiu farbu
                  </button>
                )}
                <p className="text-xs text-dim">Plynulý prechod medzi farbami zľava doprava.</p>
              </div>
            )}

            {mode === "rainbow" && (
              <p className="text-sm text-dim">🌈 Každé písmeno dostane inú farbu dúhy automaticky. Stačí napísať text vyššie.</p>
            )}
          </div>

          <div className="card p-5 space-y-5">
            <Eyebrow num={3}>Štýl</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {([
                ["bold",      "Tučné"],
                ["italic",    "Kurzíva"],
                ["underline", "Podčiarknuté"],
                ["strike",    "Preškrtnuté"],
                ["magic",     "Magic ✦"],
              ] as const).map(([key, label]) => (
                <button key={key}
                  onClick={() => setStyles((s) => ({ ...s, [key]: !s[key] }))}
                  className={`chip px-3.5 py-2 rounded-full ${
                    styles[key] ? "!bg-brand/10 !text-text !border-brand" : ""
                  } ${
                    styles[key] && key === "bold"      ? "!font-extrabold" :
                    styles[key] && key === "italic"    ? "italic" :
                    styles[key] && key === "underline" ? "underline" :
                    styles[key] && key === "strike"    ? "line-through" : ""
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <Eyebrow num={4}>Zátvorky</Eyebrow>
            <select value={wrap} onChange={(e) => setWrap(e.target.value as WrapKey)}
              className="input cursor-pointer">
              <option value="none">Bez zátvoriek</option>
              <option value="square">[ Tag ]</option>
              <option value="angle">« Tag »</option>
              <option value="thick">≪ Tag ≫</option>
              <option value="dot">• Tag •</option>
              <option value="star">✦ Tag ✦</option>
            </select>
            <p className="text-xs text-dim">Zátvorky sú šedé (<code className="text-brand">&amp;7</code>) a obklopia tvoj farebný text.</p>
          </div>
        </div>

        {/* RIGHT — preview + output */}
        <div className="lg:sticky lg:top-5 lg:self-start space-y-5">
          <div className="card p-5 space-y-4">
            <Eyebrow>Náhľad v chate</Eyebrow>
            <div className="bg-ink border border-border/70 rounded-xl p-4 font-mono text-base overflow-x-auto">
              <div className="text-xs text-dim flex justify-between mb-2.5">
                <span>survival · global</span><span>14:32</span>
              </div>
              <div className="whitespace-nowrap">
                <PreviewSpan chars={previewChars} styles={effectiveStyles} wrap={wrap} />
                {" "}
                <span className="text-[#9aa6b8]">Steve</span>
                <span className="text-[#5b6577]">: Ahoj všetkým!</span>
              </div>
            </div>

            <div className="bg-ink border border-border/70 rounded-xl p-6 text-center font-mono text-2xl overflow-x-auto">
              <PreviewSpan chars={previewChars} styles={effectiveStyles} wrap={wrap} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dim">Tvoj tag — skopíruj do hry</span>
                <button onClick={copy}
                  className={`btn-brand !py-2 !px-4 ${copied ? "!from-muted !to-muted !text-brand !shadow-none" : ""}`}>
                  <span>{copied ? "✓" : "⧉"}</span>
                  {copied ? "Skopírované" : "Kopírovať"}
                </button>
              </div>
              <div className="bg-muted border border-border/70 rounded-lg p-3 font-mono text-sm text-[#cdd6e3] break-all min-h-[3rem] select-all">
                {output}
              </div>
            </div>

            {warning && (
              <div className="border border-accent-amber/40 bg-accent-amber/5 rounded-lg p-3 text-sm text-accent-amber leading-relaxed">
                ⚠ <span dangerouslySetInnerHTML={{ __html: warning }} />
              </div>
            )}

            <div className="border border-border/70 rounded-lg p-3.5 text-sm text-dim leading-relaxed">
              <span className="text-text font-semibold">Ako na to:</span> v hre napíš
              <code className="mx-1 px-1.5 py-0.5 bg-muted border border-border rounded text-brand">/tag shop</code>
              → <span className="text-text font-semibold">Vytvoriť vlastný tag</span> → keď ťa hra vyzve,
              <span className="text-text font-semibold"> vlož tento reťazec do chatu</span>.
              Tag pôjde adminovi na schválenie.
            </div>
          </div>
        </div>

        {/* Cheatsheet — full width */}
        <div className="lg:col-span-2 card p-5">
          <Eyebrow>Šablóny na rýchle skopírovanie</Eyebrow>
          <div className="grid md:grid-cols-2 gap-5 mt-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Hotové príklady</h3>
              <div className="space-y-2">
                {PRESETS.map((p) => <PresetRow key={p.label} preset={p} />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Podporované formáty</h3>
              <div className="space-y-2 text-sm">
                <FormatRow code="&a &c &e …" desc="klasické farby" />
                <FormatRow code="&#FF0000" desc="vlastná hex farba" />
                <FormatRow code="<gradient:#a:#b>…</gradient>" desc="gradient (aj 3 farby)" />
                <FormatRow code="{#a>}…{#b<}" desc="gradient so štýlom" />
                <FormatRow code="<rainbow>…</rainbow>" desc="dúha" />
                <FormatRow code="&l &o &n &m &k" desc="tučné / kurzíva / … / magic" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-sm text-dim relative">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between flex-wrap gap-4">
          <div>by WhiteFreezing_ · Tag Studio — výstupy 1:1 kompatibilné s tag pluginom.</div>
          <a href="https://github.com/WhiteFreezing/tag-wfrz" target="_blank" rel="noopener" className="hover:text-text">GitHub →</a>
        </div>
      </footer>
    </main>
  );
}

function Eyebrow({ num, children }: { num?: number; children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim flex items-center gap-2">
      <span className="w-4 h-px bg-brand inline-block" />
      {num !== undefined && <span className="text-text">{num} ·</span>}
      <span>{children}</span>
    </div>
  );
}

function PreviewSpan({ chars, styles, wrap }: {
  chars: { ch: string; hex: string }[];
  styles: Styles;
  wrap: WrapKey;
}) {
  const [pre, suf] = WRAPS[wrap];
  const ulStrike = styles.underline && styles.strike ? "us-mc" : styles.underline ? "underline-mc" : styles.strike ? "strike-mc" : "";
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!styles.magic) return;
    const id = setInterval(() => setTick((t) => t + 1), 70);
    return () => clearInterval(id);
  }, [styles.magic]);

  function scramble(real: string) {
    return [...real].map((c) => c === " " ? " " : MAGIC_CHARS[Math.floor(Math.random() * MAGIC_CHARS.length)]).join("");
  }

  return (
    <span className="mc-text">
      {pre && <span style={{ color: "#AAAAAA" }}>{pre}</span>}
      {chars.map((c, i) => (
        <span key={i + "-" + tick}
          className={ulStrike}
          style={{
            color: c.hex,
            fontWeight: styles.bold ? 800 : undefined,
            fontStyle: styles.italic ? "italic" : undefined,
          }}>
          {styles.magic ? scramble(c.ch) : c.ch}
        </span>
      ))}
      {suf && <span style={{ color: "#AAAAAA" }}>{suf}</span>}
    </span>
  );
}

function PresetRow({ preset }: { preset: { label: string; str: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs text-dim font-semibold w-14 shrink-0">{preset.label}</span>
        <code className="text-xs text-brand truncate font-mono">{preset.str}</code>
      </div>
      <button onClick={() => {
        navigator.clipboard.writeText(preset.str).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }} className="text-accent-cyan hover:text-text text-base px-1 shrink-0">
        {copied ? "✓" : "⧉"}
      </button>
    </div>
  );
}

function FormatRow({ code, desc }: { code: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
      <code className="text-xs text-brand font-mono">{code}</code>
      <span className="text-xs text-dim">{desc}</span>
    </div>
  );
}
