// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";

// The film a client sees on first login, and can play again from the header.
//
// Aimed at whoever decides which hire company to use. He has hired plant before
// and does not need convincing to hire — so there is nothing here about capital
// or depreciation. He settled that years ago. What he has not seen is a supplier
// where he can find things out himself.
//
// The argument is section two: every answer he wants is in somebody else's head.
// Everything after it is the contrast.
//
// Panel is declared at MODULE scope on purpose. Inside the component it would be
// a new type on every render, and the dashboard's polling would restart every
// animation a few times a minute.

const LINES = [
  "You need a machine on Monday. So you ring around.",
  "Someone will get back to you. Might be an hour. Might be Thursday.",
  "Then you ring again to check the rate. Then again to see if it is still available.",
  "Every answer you want is in somebody else's head, and you have to ask for it.",
  "Or you log in.",
  "Every machine we have. Photos, specifications, hours, what it will do.",
  "What it costs. This month, and every month after it.",
  "Move the slider. Twelve months instead of three, and watch the rate fall.",
  "Generate your own quote. On our letterhead, with your figures, at eleven at night if that is when you are working.",
  "Every other supplier's rate goes one way. Ours falls one percent a month for as long as you keep the machine.",
  "You see the whole term before you sign anything. Check the arithmetic yourself.",
  "Every machine on your site, and where it is up to. Month four of twelve, and what is left to run.",
  "And whether it is being looked after. Hours and time, watched separately, because they never fall due together.",
  "When something goes wrong, your supervisor reports it from the seat. A photo, thirty seconds.",
  "We have a fitter on the way before anyone has picked up a phone. And you can watch it happen from your desk.",
  "We have not seen another hire company in Australia doing this.",
  "Not a website. Your own portal, your own rates, your own machines, open whenever you want it.",
  "Everything else stays the same. Same machines, same trucks, same blokes.",
  "You just stop waiting for someone to ring you back.",
];

const DURATIONS = [
  5000, 6000, 6500, 7000,
  4000,
  7000, 6000, 7000, 9000,
  9000, 7000,
  8000, 9000,
  8000, 9000,
  6500, 8000,
  6000, 5500,
];

// One recording per line, named to match. Drop them in /film/ on the site and
// they play; leave them out and the film runs silent on the timings above.
const VOICE = LINES.map((_, k) => "/film/line-" + String(k + 1).padStart(2, "0") + ".mp3");

const CSS = `
  .ltf-panel { opacity:0; transition:opacity .6s ease; position:absolute; inset:0; }
  .ltf-panel.on { opacity:1; }
  @keyframes ltf-ring { 0%,100% { transform:rotate(0deg); } 20% { transform:rotate(-9deg); } 40% { transform:rotate(9deg); } 60% { transform:rotate(-5deg); } }
  @keyframes ltf-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ltf-slide { from { transform:translateX(0); } to { transform:translateX(150px); } }
  @keyframes ltf-drop { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ltf-pulse { 0%,100% { opacity:.35; } 50% { opacity:1; } }
  @keyframes ltf-sweep { from { width:0; } to { width:var(--w); } }
  @keyframes ltf-hook { 0%,100% { transform:translate(-30px,-58px) rotate(-24deg); }
    25% { transform:translate(-32px,-61px) rotate(-28deg); }
    50% { transform:translate(-28px,-56px) rotate(-20deg); }
    75% { transform:translate(-31px,-60px) rotate(-26deg); } }
  @keyframes ltf-wave { 0% { opacity:0; transform:scale(.7); } 35% { opacity:1; transform:scale(1); } 100% { opacity:0; transform:scale(1.15); } }
  @keyframes ltf-zed { 0% { opacity:0; transform:translateY(6px); } 30% { opacity:.9; } 100% { opacity:0; transform:translateY(-16px); } }
  .ltf-hook { animation: ltf-hook 0.5s ease-in-out infinite; }
  .ltf-wave { animation: ltf-wave 1.6s ease-out infinite; transform-origin: center; }
  .ltf-zed { animation: ltf-zed 3s ease-out infinite; }
  .ltf-ring { animation: ltf-ring 1.1s ease-in-out infinite; transform-origin: 50% 40%; }
  .ltf-in { animation: ltf-in .7s ease both; }
  .ltf-drop { animation: ltf-drop .6s ease both; }
  .ltf-pulse { animation: ltf-pulse 1.6s ease-in-out infinite; }
`;

const Panel = ({ n, active, children }) => (
  <div className={"ltf-panel" + (active ? " on" : "")}>
    <svg viewBox="0 0 640 300" style={{ width: "100%", height: "100%" }}>
      {active ? children : null}
    </svg>
  </div>
);

// An old desk phone, drawn as a solid silhouette rather than an outline - it
// reads at a glance and at any size. The receiver sits up and away from the
// cradle, tilted, which is what says "ringing" without a word.
const DeskPhone = ({ x, y, s = 1, delay = 0, ringing = false }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}
     className={ringing ? "" : "ltf-drop"}
     style={{ animationDelay: delay + "s" }}>
    {/* base, seen slightly from the front */}
    <path d="M-46 26 q0 -8 8 -10 l10 -26 q2 -5 8 -5 h40 q6 0 8 5 l10 26 q8 2 8 10 q0 6 -8 6 h-76 q-8 0 -8 -6 z"
      fill="#FDCE06" />
    {/* dial */}
    <circle cx="0" cy="8" r="13" fill="#1A1A1B" />
    <circle cx="0" cy="8" r="4.5" fill="#FDCE06" />
    {[0,1,2,3,4,5,6,7,8,9].map((k) => {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      return <circle key={k} cx={Math.cos(a) * 9} cy={8 + Math.sin(a) * 9} r="1.7" fill="#FDCE06" />;
    })}
    {/* cradle arms, empty because the receiver is up */}
    <rect x="-40" y="-14" width="12" height="7" rx="3" fill="#FDCE06" />
    <rect x="28" y="-14" width="12" height="7" rx="3" fill="#FDCE06" />

    {/* the receiver, up and tilted off the hook */}
    <g className={ringing ? "ltf-hook" : ""}
       transform={ringing ? undefined : "translate(-30,-58) rotate(-24)"}>
      <path d="M0 0 q6 -13 20 -13 h26 q14 0 20 13 l-9 7 q-5 -8 -13 -8 h-22 q-8 0 -13 8 z"
        fill="#FDCE06" />
      <path d="M-4 -2 q-7 5 -3 13 q4 8 12 5 l4 -10 q-6 -2 -8 -6 z" fill="#FDCE06" />
      <path d="M62 -2 q7 5 3 13 q-4 8 -12 5 l-4 -10 q6 -2 8 -6 z" fill="#FDCE06" />
    </g>

    {/* cord, curling down from the receiver */}
    <path d="M-26 -34 q-16 10 -10 24 q6 14 -6 22"
      fill="none" stroke="#FDCE06" strokeWidth="3.5" strokeLinecap="round" />
  </g>
);

// Three arcs sweeping off the receiver. The convention everybody reads as sound.
const RingWaves = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {[0, 1, 2].map((k) => (
      <path key={k}
        d={`M${10 + k * 11} ${-16 - k * 9} q${16 + k * 8} ${18 + k * 8} 0 ${40 + k * 18}`}
        fill="none" stroke="#FDCE06" strokeWidth="4" strokeLinecap="round"
        className="ltf-wave" style={{ animationDelay: k * 0.2 + "s" }} />
    ))}
  </g>
);

// The universal shorthand for waiting.
const Zeds = ({ x, y, delay = 0 }) => (
  <g transform={`translate(${x},${y})`}>
    {[
      { d: 0, s: 15, dx: 0, dy: 0 },
      { d: 0.5, s: 21, dx: 20, dy: -20 },
      { d: 1.0, s: 28, dx: 46, dy: -46 },
    ].map((z, k) => (
      <text key={k} x={z.dx} y={z.dy} fill="#6B7280" fontSize={z.s}
        fontFamily="Inter, sans-serif" fontWeight="600"
        className="ltf-zed" style={{ animationDelay: delay + z.d + "s" }}>
        z
      </text>
    ))}
  </g>
);

const IntroFilm = ({ onClose }) => {
  const [i, setI] = useState(0);
  const [sound, setSound] = useState(false);
  const timer = useRef(null);
  const audio = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    if (i >= LINES.length - 1) return;

    // With sound on, the panel waits for its own clip rather than a stopwatch,
    // so a line that runs long cannot get cut off by the next picture.
    if (sound) {
      const clip = new Audio(VOICE[i]);
      audio.current = clip;
      let moved = false;
      const next = () => {
        if (moved) return;
        moved = true;
        setI((n) => n + 1);
      };
      clip.addEventListener("ended", () => setTimeout(next, 700));
      // No clip for this line, or it will not load - fall back to the timing.
      clip.addEventListener("error", () => {
        timer.current = setTimeout(next, DURATIONS[i]);
      });
      clip.play().catch(() => {
        timer.current = setTimeout(next, DURATIONS[i]);
      });
    } else {
      timer.current = setTimeout(() => setI((n) => n + 1), DURATIONS[i]);
    }

    return () => {
      clearTimeout(timer.current);
      if (audio.current) {
        audio.current.pause();
        audio.current = null;
      }
    };
  }, [i, sound]);

  const done = i >= LINES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0E0E0F] flex flex-col">
      <style>{CSS}</style>

      <div className="absolute top-4 right-5 z-10 flex items-center gap-4">
        <button
          onClick={() => setSound((s) => !s)}
          title={sound ? "Turn the sound off" : "Turn the sound on"}
          aria-label={sound ? "Turn the sound off" : "Turn the sound on"}
          className="flex items-center gap-2 text-[#6B7280] hover:text-[#FDCE06] transition-colors"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 L6 9 H2.5 v6 H6 l5 4 z" />
            {sound ? (
              <>
                <path d="M15 9.5 a3.5 3.5 0 0 1 0 5" />
                <path d="M17.8 6.8 a7.5 7.5 0 0 1 0 10.4" />
              </>
            ) : (
              <>
                <path d="M16 10 l5 4" />
                <path d="M21 10 l-5 4" />
              </>
            )}
          </svg>
          <span className="font-[Inter] text-[13px] hidden sm:inline">
            {sound ? "Sound on" : "Sound off"}
          </span>
        </button>

        <button
          onClick={onClose}
          className="text-[#6B7280] hover:text-[#E5E5E5] font-[Inter] text-[13px] transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 relative max-w-[860px] w-full mx-auto px-6 pt-10">
        {/* 1 — you ring around */}
        <Panel n={0} active={i === 0}>
          <DeskPhone x={300} y={160} s={1.45} ringing />
          <RingWaves x={352} y={92} s={1.35} />
          <text x="320" y="252" textAnchor="middle" fill="#6B7280"
            fontSize="13" fontFamily="Inter, sans-serif" className="ltf-in"
            style={{ animationDelay: "1.4s" }}>
            ringing out
          </text>
        </Panel>

        {/* 2 — someone will get back to you */}
        <Panel n={1} active={i === 1}>
          <DeskPhone x={250} y={160} s={1.3} />
          <Zeds x={330} y={112} />
          <text x="430" y="146" fill="#9CA3AF" fontSize="16" fontFamily="Inter, sans-serif"
            className="ltf-in" style={{ animationDelay: "1s" }}>
            an hour?
          </text>
          <text x="430" y="176" fill="#9CA3AF" fontSize="16" fontFamily="Inter, sans-serif"
            className="ltf-in" style={{ animationDelay: "2.6s" }}>
            Thursday?
          </text>
        </Panel>

        {/* 3 — and again, and again */}
        <Panel n={2} active={i === 2}>
          <DeskPhone x={168} y={150} s={0.82} delay={0} />
          <DeskPhone x={320} y={150} s={0.82} delay={1.5} />
          <DeskPhone x={472} y={150} s={0.82} delay={3.0} />
          <text x="320" y="248" textAnchor="middle" fill="#6B7280" fontSize="13"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "3.9s" }}>
            same question, three times
          </text>
        </Panel>

        {/* 4 — in somebody else's head */}
        <Panel n={3} active={i === 3}>
          {/* the bloke at the other end */}
          <g className="ltf-in">
            <circle cx="410" cy="128" r="30" fill="#292A2B" stroke="#5A5A5C" strokeWidth="2" />
            <path d="M368 214 q0 -44 42 -44 q42 0 42 44" fill="#292A2B"
              stroke="#5A5A5C" strokeWidth="2" strokeLinejoin="round" />
            {/* a padlock where the answers are */}
            <rect x="398" y="122" width="24" height="19" rx="3" fill="#FDCE06" />
            <path d="M403 122 v-6 a7 7 0 0 1 14 0 v6" fill="none" stroke="#FDCE06" strokeWidth="2.5" />
            <circle cx="410" cy="131" r="2.6" fill="#1A1A1B" />
          </g>

          {/* the questions, going nowhere */}
          {["what does it cost?", "have you got one?", "when can I have it?"].map((t, k) => (
            <g key={t} className="ltf-in" style={{ animationDelay: 0.6 + k * 0.9 + "s" }}>
              <rect x={118} y={92 + k * 46} width={172} height={32} rx="16"
                fill="#1F1F20" stroke="#3A3A3C" strokeWidth="1.5" />
              <text x={204} y={113 + k * 46} textAnchor="middle" fill="#9CA3AF"
                fontSize="13" fontFamily="Inter, sans-serif">{t}</text>
              {/* an arrow that stops short of him */}
              <path d={`M296 ${108 + k * 46} h44`} stroke="#4A4A4C" strokeWidth="2"
                strokeDasharray="4 5" />
            </g>
          ))}
        </Panel>

        {/* 5 — or you log in */}
        <Panel n={4} active={i === 4}>
          <g className="ltf-in">
            <rect x="150" y="70" width="340" height="170" rx="10"
              fill="#1F1F20" stroke="#FDCE06" strokeWidth="2" />
            <rect x="150" y="70" width="340" height="30" rx="10" fill="#292A2B" />
            <circle cx="168" cy="85" r="4" fill="#3A3A3C" />
            <circle cx="182" cy="85" r="4" fill="#3A3A3C" />
            <text x="320" y="170" textAnchor="middle" fill="#FDCE06"
              fontSize="17" fontFamily="Inter, sans-serif" fontWeight="600">
              Long Term Hire
            </text>
          </g>
        </Panel>

        {/* 6 — every machine we have */}
        <Panel n={5} active={i === 5}>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <g key={k} className="ltf-drop" style={{ animationDelay: k * 0.22 + "s" }}>
              <rect x={120 + (k % 3) * 140} y={80 + Math.floor(k / 3) * 100}
                width="120" height="84" rx="7" fill="#1F1F20" stroke="#333" strokeWidth="1.5" />
              <rect x={128 + (k % 3) * 140} y={88 + Math.floor(k / 3) * 100}
                width="104" height="44" rx="4" fill="#292A2B" />
              <rect x={128 + (k % 3) * 140} y={140 + Math.floor(k / 3) * 100}
                width="58" height="6" rx="3" fill="#3A3A3C" />
              <rect x={128 + (k % 3) * 140} y={150 + Math.floor(k / 3) * 100}
                width="38" height="5" rx="2.5" fill="#FDCE06" opacity="0.7" />
            </g>
          ))}
        </Panel>

        {/* 7 — what it costs */}
        <Panel n={6} active={i === 6}>
          <g className="ltf-in">
            <rect x="180" y="90" width="280" height="120" rx="9"
              fill="#1F1F20" stroke="#333" strokeWidth="1.5" />
            <text x="320" y="140" textAnchor="middle" fill="#FDCE06"
              fontSize="34" fontFamily="Inter, sans-serif" fontWeight="600">
              $2,700
            </text>
            <text x="320" y="166" textAnchor="middle" fill="#6B7280"
              fontSize="13" fontFamily="Inter, sans-serif">
              a month
            </text>
            <text x="320" y="192" textAnchor="middle" fill="#9CA3AF"
              fontSize="12" fontFamily="Inter, sans-serif" className="ltf-in"
              style={{ animationDelay: "1.6s" }}>
              and every month after it
            </text>
          </g>
        </Panel>

        {/* 8 — the slider */}
        <Panel n={7} active={i === 7}>
          <g className="ltf-in">
            <rect x="140" y="150" width="360" height="4" rx="2" fill="#3A3A3C" />
            <circle cx="200" cy="152" r="11" fill="#FDCE06">
              <animate attributeName="cx" from="200" to="460" dur="3.5s"
                begin="0.8s" fill="freeze" calcMode="spline"
                keySplines="0.4 0 0.2 1" />
            </circle>
            <text x="200" y="120" textAnchor="middle" fill="#9CA3AF"
              fontSize="13" fontFamily="Inter, sans-serif">3 months</text>
            <text x="460" y="120" textAnchor="middle" fill="#FDCE06"
              fontSize="13" fontFamily="Inter, sans-serif">12 months</text>
            <text x="320" y="210" textAnchor="middle" fill="#FDCE06"
              fontSize="26" fontFamily="Inter, sans-serif" fontWeight="600"
              className="ltf-in" style={{ animationDelay: "3.4s" }}>
              $1,724 back in your pocket
            </text>
          </g>
        </Panel>

        {/* 9 — your own quote */}
        <Panel n={8} active={i === 8}>
          <g className="ltf-in">
            <rect x="215" y="60" width="210" height="180" rx="6"
              fill="#F2F0EA" stroke="#CFCBC0" strokeWidth="1" />
            <rect x="235" y="82" width="76" height="9" rx="4" fill="#FDCE06" />
            <rect x="235" y="104" width="140" height="5" rx="2.5" fill="#BDB8AC" />
            <rect x="235" y="116" width="112" height="5" rx="2.5" fill="#BDB8AC" />
            {[0, 1, 2, 3, 4].map((k) => (
              <g key={k} className="ltf-drop" style={{ animationDelay: 0.9 + k * 0.28 + "s" }}>
                <rect x="235" y={140 + k * 17} width="90" height="5" rx="2.5" fill="#8C877A" />
                <rect x={340} y={140 + k * 17} width={62 - k * 7} height="5" rx="2.5" fill="#1F1F20" />
              </g>
            ))}
          </g>
          <text x="320" y="268" textAnchor="middle" fill="#6B7280" fontSize="12.5"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "2.6s" }}>
            eleven at night, if that is when you are working
          </text>
        </Panel>

        {/* 10 — the rate falls */}
        <Panel n={9} active={i === 9}>
          <line x1="120" y1="240" x2="520" y2="240" stroke="#3A3A3C" strokeWidth="1.5" />
          <g className="ltf-in">
            <path d="M140 100 L500 76" stroke="#D97B6C" strokeWidth="2.5" fill="none"
              strokeDasharray="420" strokeDashoffset="420">
              <animate attributeName="stroke-dashoffset" from="420" to="0" dur="2s"
                begin="0.4s" fill="freeze" />
            </path>
            <text x="508" y="72" fill="#D97B6C" fontSize="12" fontFamily="Inter, sans-serif"
              className="ltf-in" style={{ animationDelay: "2.2s" }}>theirs</text>

            <path d="M140 130 L500 206" stroke="#FDCE06" strokeWidth="3" fill="none"
              strokeDasharray="420" strokeDashoffset="420">
              <animate attributeName="stroke-dashoffset" from="420" to="0" dur="2s"
                begin="0.9s" fill="freeze" />
            </path>
            <text x="508" y="212" fill="#FDCE06" fontSize="12" fontFamily="Inter, sans-serif"
              className="ltf-in" style={{ animationDelay: "2.7s" }}>ours</text>
          </g>
        </Panel>

        {/* 11 — the whole term */}
        <Panel n={10} active={i === 10}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => (
            <g key={k} className="ltf-drop" style={{ animationDelay: k * 0.14 + "s" }}>
              <rect x={132 + k * 31} y={220 - (100 - k * 6)} width="22"
                height={100 - k * 6} rx="3" fill="#FDCE06" opacity={0.9 - k * 0.03} />
            </g>
          ))}
          <text x="320" y="256" textAnchor="middle" fill="#6B7280" fontSize="12.5"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "2s" }}>
            every month of it, before you sign
          </text>
        </Panel>

        {/* 12 — hire progress */}
        <Panel n={11} active={i === 11}>
          {[
            { name: "1.7 ton Excavator", pct: 33, label: "month 4 of 12" },
            { name: "Kubota SVL 75-3", pct: 75, label: "month 9 of 12" },
            { name: "Fuso Tipper", pct: 8, label: "month 1 of 12" },
          ].map((m, k) => (
            <g key={m.name} className="ltf-in" style={{ animationDelay: k * 0.55 + "s" }}>
              <text x="120" y={84 + k * 62} fill="#E5E5E5" fontSize="14"
                fontFamily="Inter, sans-serif">{m.name}</text>
              <text x="520" y={84 + k * 62} textAnchor="end" fill="#6B7280" fontSize="12"
                fontFamily="Inter, sans-serif">{m.label}</text>
              <rect x="120" y={94 + k * 62} width="400" height="9" rx="4.5" fill="#292A2B" />
              <rect x="120" y={94 + k * 62} width="0" height="9" rx="4.5" fill="#FDCE06">
                <animate attributeName="width" from="0" to={4 * m.pct} dur="1.1s"
                  begin={0.5 + k * 0.55 + "s"} fill="freeze"
                  calcMode="spline" keySplines="0.4 0 0.2 1" />
              </rect>
            </g>
          ))}
          <text x="320" y="268" textAnchor="middle" fill="#6B7280" fontSize="12.5"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "2.4s" }}>
            no ringing up to ask where you are
          </text>
        </Panel>

        {/* 13 — servicing */}
        <Panel n={12} active={i === 12}>
          {[
            { name: "1.7 ton Excavator", hrs: 28, mth: 42 },
            { name: "Kubota SVL 75-3", hrs: 71, mth: 55 },
            { name: "14 ton Excavator", hrs: 94, mth: 61 },
          ].map((m, k) => {
            const colour = (p) => (p >= 85 ? "#ef4444" : p >= 60 ? "#F59E0B" : "#4CAF50");
            return (
              <g key={m.name} className="ltf-in" style={{ animationDelay: k * 0.55 + "s" }}>
                <text x="118" y={78 + k * 66} fill="#E5E5E5" fontSize="13.5"
                  fontFamily="Inter, sans-serif">{m.name}</text>
                {[
                  { p: m.hrs, tag: "hours", dy: 0 },
                  { p: m.mth, tag: "time", dy: 20 },
                ].map((bar) => (
                  <g key={bar.tag}>
                    <text x="118" y={98 + k * 66 + bar.dy} fill="#6B7280" fontSize="10.5"
                      fontFamily="Inter, sans-serif">{bar.tag}</text>
                    <rect x="164" y={90 + k * 66 + bar.dy} width="300" height="8" rx="4"
                      fill="#292A2B" />
                    <rect x="164" y={90 + k * 66 + bar.dy} width="0" height="8" rx="4"
                      fill={colour(bar.p)}>
                      <animate attributeName="width" from="0" to={3 * bar.p} dur="1s"
                        begin={0.5 + k * 0.55 + "s"} fill="freeze"
                        calcMode="spline" keySplines="0.4 0 0.2 1" />
                    </rect>
                  </g>
                ))}
              </g>
            );
          })}
          <text x="320" y="276" textAnchor="middle" fill="#6B7280" fontSize="12.5"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "2.6s" }}>
            four hundred hours and four months never fall due together
          </text>
        </Panel>

        {/* 14 — reported from the seat */}
        <Panel n={13} active={i === 13}>
          <g className="ltf-in">
            <rect x="248" y="70" width="144" height="180" rx="14"
              fill="#1F1F20" stroke="#3A3A3C" strokeWidth="2" />
            <rect x="258" y="86" width="124" height="120" rx="4" fill="#292A2B" />
            <circle cx="320" cy="146" r="26" fill="none" stroke="#4A4A4C" strokeWidth="2" />
            <circle cx="320" cy="146" r="9" fill="#4A4A4C" />
            <rect x="278" y="218" width="84" height="18" rx="9" fill="#FDCE06"
              className="ltf-drop" style={{ animationDelay: "1.4s" }} />
          </g>
          <text x="320" y="278" textAnchor="middle" fill="#6B7280" fontSize="12.5"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "2.2s" }}>
            thirty seconds, from the machine
          </text>
        </Panel>

        {/* 13 — a fitter on the way */}
        <Panel n={14} active={i === 14}>
          {[
            ["Reported", "#F59E0B", 0],
            ["Sent to the fitter", "#FDCE06", 1],
            ["On his way", "#7F77DD", 2],
            ["Back in service", "#4CAF50", 3],
          ].map(([label, colour, k]) => (
            <g key={label} className="ltf-drop" style={{ animationDelay: k * 0.9 + "s" }}>
              <circle cx="180" cy={92 + k * 44} r="7" fill={colour} />
              {k < 3 ? (
                <line x1="180" y1={101 + k * 44} x2="180" y2={127 + k * 44}
                  stroke="#3A3A3C" strokeWidth="2" />
              ) : null}
              <text x="206" y={97 + k * 44} fill="#E5E5E5" fontSize="14"
                fontFamily="Inter, sans-serif">{label}</text>
            </g>
          ))}
          <text x="470" y="252" textAnchor="end" fill="#6B7280" fontSize="12"
            fontFamily="Inter, sans-serif" className="ltf-in" style={{ animationDelay: "3.8s" }}>
            from your desk
          </text>
        </Panel>

        {/* 14 — the claim */}
        <Panel n={15} active={i === 15}>
          <g className="ltf-in">
            <text x="320" y="150" textAnchor="middle" fill="#E5E5E5"
              fontSize="21" fontFamily="Inter, sans-serif">
              We have not seen this
            </text>
            <text x="320" y="182" textAnchor="middle" fill="#FDCE06"
              fontSize="21" fontFamily="Inter, sans-serif" fontWeight="600">
              anywhere else in Australia
            </text>
          </g>
        </Panel>

        {/* 15 — not a website */}
        <Panel n={16} active={i === 16}>
          <g className="ltf-in">
            <rect x="170" y="80" width="300" height="150" rx="10"
              fill="#1F1F20" stroke="#FDCE06" strokeWidth="2" />
            <rect x="170" y="80" width="300" height="28" rx="10" fill="#292A2B" />
            <text x="320" y="150" textAnchor="middle" fill="#9CA3AF"
              fontSize="14" fontFamily="Inter, sans-serif">yours</text>
            <text x="320" y="178" textAnchor="middle" fill="#E5E5E5"
              fontSize="15" fontFamily="Inter, sans-serif">
              your rates, your machines
            </text>
          </g>
        </Panel>

        {/* 16 — everything else stays the same */}
        <Panel n={17} active={i === 17}>
          <g className="ltf-in">
            <rect x="120" y="150" width="120" height="56" rx="6" fill="#292A2B" stroke="#3A3A3C" strokeWidth="1.5" />
            <rect x="260" y="150" width="120" height="56" rx="6" fill="#292A2B" stroke="#3A3A3C" strokeWidth="1.5" />
            <rect x="400" y="150" width="120" height="56" rx="6" fill="#292A2B" stroke="#3A3A3C" strokeWidth="1.5" />
            <text x="180" y="184" textAnchor="middle" fill="#9CA3AF" fontSize="13" fontFamily="Inter, sans-serif">machines</text>
            <text x="320" y="184" textAnchor="middle" fill="#9CA3AF" fontSize="13" fontFamily="Inter, sans-serif">trucks</text>
            <text x="460" y="184" textAnchor="middle" fill="#9CA3AF" fontSize="13" fontFamily="Inter, sans-serif">blokes</text>
          </g>
        </Panel>

        {/* 17 — the close */}
        <Panel n={18} active={i === 18}>
          <g className="ltf-in">
            <text x="320" y="140" textAnchor="middle" fill="#E5E5E5"
              fontSize="19" fontFamily="Inter, sans-serif">
              You just stop waiting
            </text>
            <text x="320" y="170" textAnchor="middle" fill="#E5E5E5"
              fontSize="19" fontFamily="Inter, sans-serif">
              for someone to ring you back.
            </text>
          </g>
        </Panel>
      </div>

      {/* The line, under the picture */}
      <div className="max-w-[860px] w-full mx-auto px-6 pb-10">
        <p key={i} className="ltf-in text-[#E5E5E5] font-[Inter] text-[19px] sm:text-[23px]
                              leading-[1.45] min-h-[72px]">
          {LINES[i]}
        </p>

        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 h-[3px] bg-[#292A2B] rounded overflow-hidden">
            <div className="h-full bg-[#FDCE06] transition-all duration-500"
              style={{ width: ((i + 1) / LINES.length) * 100 + "%" }} />
          </div>
          {done ? (
            <button onClick={onClose}
              className="bg-[#FDCE06] text-[#1A1A1B] font-[Inter] font-bold text-[15px]
                         px-5 py-2.5 rounded-lg whitespace-nowrap">
              Have a look around
            </button>
          ) : (
            <button onClick={() => setI((n) => Math.min(n + 1, LINES.length - 1))}
              className="text-[#6B7280] hover:text-[#E5E5E5] font-[Inter] text-[13px]
                         whitespace-nowrap transition-colors">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntroFilm;
