// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";

// The 60 second introduction, shown once when a client first logs in. They have
// been set up to look around, not to hire, so this makes the case for long term
// hire rather than explaining an interface they have not committed to.
const LINES = [
  "Hire short term and you pay the top rate every time. Float in, float out, again next month.",
  "Keep it, and you save more every month. One percent off the rate, compounding, for as long as it stays on your site.",
  "No capital tied up. No maintenance bill. Nothing to sell at the end of it.",
  "Rates, specifications and quotes, there when you want them. Eleven at night, pricing a job. No phone calls. No waiting.",
  "And when something goes wrong, it is reported from the seat. Photo, machine, what it is doing.",
  "You see it as it happens. The clock starts. We answer in the same place.",
  "Hours come off the machine, so it is serviced on time and stays safe to work.",
  "Long Term Hire. The longer you keep it, the more you save.",
];
const DURATIONS = [8000, 9000, 7000, 10000, 8000, 8000, 6000, 4000];

const CSS = `
.ltf-panel { opacity:0; transition:opacity .5s ease; position:absolute; inset:0; }
.ltf-panel.on { opacity:1; }
@keyframes ltfIn { to { opacity:1; } }
.ltf-panel.on .p1a { animation:ltfIn .4s .6s forwards; }
.ltf-panel.on .p1b { animation:ltfIn .4s 2.4s forwards; }
.ltf-panel.on .p1c { animation:ltfIn .4s 4.2s forwards; }
.ltf-panel.on .b1 { animation:ltfG1 .5s .3s forwards; }
.ltf-panel.on .b2 { animation:ltfG2 .5s 1.3s forwards; }
.ltf-panel.on .b3 { animation:ltfG3 .5s 2.3s forwards; }
.ltf-panel.on .b4 { animation:ltfG4 .5s 3.3s forwards; }
.ltf-panel.on .b5 { animation:ltfG5 .5s 4.3s forwards; }
@keyframes ltfG1 { to { height:150px; y:80px; } }
@keyframes ltfG2 { to { height:124px; y:106px; } }
@keyframes ltfG3 { to { height:100px; y:130px; } }
@keyframes ltfG4 { to { height:80px; y:150px; } }
@keyframes ltfG5 { to { height:64px; y:166px; } }
.ltf-panel.on .lbl1 { animation:ltfIn .4s .8s forwards; }
.ltf-panel.on .lbl5 { animation:ltfIn .4s 4.8s forwards; }
.ltf-panel.on .pct  { animation:ltfIn .5s 5.4s forwards; }
.ltf-panel.on .fade3 { animation:ltfOut 2s 1.6s forwards; }
@keyframes ltfOut { to { opacity:.12; } }
.ltf-panel.on .ph { animation:ltfIn .6s .8s forwards; }
.ltf-panel.on .flash { animation:ltfFl 1.2s .4s; }
@keyframes ltfFl { 0%,100% { opacity:0; } 40% { opacity:1; } }
.ltf-panel.on .arrow { stroke-dasharray:80; stroke-dashoffset:80; animation:ltfDash .8s 1.4s forwards; }
@keyframes ltfDash { to { stroke-dashoffset:0; } }
.ltf-panel.on .alert { animation:ltfIn .4s 2.2s forwards; }
.ltf-panel.on .rbar { animation:ltfRb 3s .4s forwards; }
@keyframes ltfRb { to { width:320px; } }
.ltf-panel.on .rbar2 { animation:ltfRb2 3s .4s forwards; }
@keyframes ltfRb2 { to { width:130px; } }
.ltf-panel.on .reply { animation:ltfIn .5s 4s forwards; }
.ltf-panel.on .sbar { animation:ltfSb 3.5s .3s forwards; }
@keyframes ltfSb { to { width:420px; } }
`;

// Defined outside the component on purpose. Declared inside, this would be a
// new component type on every render, so React would unmount and remount the
// panels — restarting every animation. The dashboard re-renders often (chat
// polling, unread counts), which made the slides flicker and repeat.
const Panel = ({ n, active, children, bg }) => (
  <div className={"ltf-panel" + (active ? " on" : "")} style={bg ? { background: bg } : undefined}>
    <svg viewBox="0 0 640 300" style={{ width: "100%", height: "100%" }}>{children}</svg>
  </div>
);

const IntroFilm = ({ onClose }) => {
  const [i, setI] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (i < LINES.length - 1) {
      timer.current = setTimeout(() => setI((n) => n + 1), DURATIONS[i]);
    }
    return () => clearTimeout(timer.current);
  }, [i]);

  return (
    <div
      role="dialog"
      aria-label="Introduction to Long Term Hire"
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <style>{CSS}</style>
      <div style={{ width: "100%", maxWidth: "760px" }}>
        <div style={{ background: "#111", border: "1px solid #333", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ position: "relative", aspectRatio: "16/9", background: "#111" }}>

            <Panel n={0} active={i === 0}>
              <g stroke="#fff" strokeWidth="2" fill="none">
                <path d="M70 200 h120 v-30 h30 l18 30 h20" /><circle cx="100" cy="212" r="13" /><circle cx="172" cy="212" r="13" />
                <path d="M120 170 l28 -38 l24 14" />
              </g>
              <g className="p1a" opacity="0"><text x="330" y="120" fill="#FDCE06" fontSize="26" textAnchor="middle">$6,000</text></g>
              <g className="p1b" opacity="0"><text x="450" y="120" fill="#FDCE06" fontSize="26" textAnchor="middle">$6,000</text></g>
              <g className="p1c" opacity="0"><text x="570" y="120" fill="#FDCE06" fontSize="26" textAnchor="middle">$6,000</text></g>
              <g stroke="#666" strokeWidth="2" fill="none" opacity=".7">
                <path d="M300 200 h60 M360 200 l-12 -8 M360 200 l-12 8" />
                <path d="M420 200 h60 M480 200 l-12 -8 M480 200 l-12 8" />
              </g>
            </Panel>

            <Panel n={1} active={i === 1}>
              <g stroke="#fff" strokeWidth="2" fill="none">
                <path d="M60 210 h110 v-28 h28 l16 28 h18" /><circle cx="88" cy="222" r="12" /><circle cx="156" cy="222" r="12" />
              </g>
              <line x1="290" y1="230" x2="600" y2="230" stroke="#444" strokeWidth="1.5" />
              <rect className="b1" x="300" y="230" width="42" height="0" fill="#FDCE06" />
              <rect className="b2" x="358" y="230" width="42" height="0" fill="#FDCE06" opacity=".85" />
              <rect className="b3" x="416" y="230" width="42" height="0" fill="#FDCE06" opacity=".7" />
              <rect className="b4" x="474" y="230" width="42" height="0" fill="#FDCE06" opacity=".55" />
              <rect className="b5" x="532" y="230" width="42" height="0" fill="#FDCE06" opacity=".4" />
              <text className="lbl1" x="321" y="70" fill="#9CA3AF" fontSize="13" textAnchor="middle" opacity="0">$6,000</text>
              <text className="lbl5" x="553" y="152" fill="#4CAF50" fontSize="13" textAnchor="middle" opacity="0">$5,706</text>
              <text className="pct" x="445" y="272" fill="#4CAF50" fontSize="15" textAnchor="middle" opacity="0">−1% every month</text>
            </Panel>

            <Panel n={2} active={i === 2}>
              <g className="fade3" stroke="#fff" strokeWidth="2" fill="none" opacity=".85">
                <rect x="80" y="130" width="80" height="60" /><path d="M100 130 v-24 h40 v24" />
                <rect x="200" y="130" width="80" height="60" /><path d="M220 130 v-24 h40 v24" />
                <rect x="320" y="130" width="80" height="60" /><path d="M340 130 v-24 h40 v24" />
              </g>
              <g className="fade3" fill="#FDCE06" fontSize="18" textAnchor="middle" opacity=".85">
                <text x="120" y="220">$210k</text><text x="240" y="220">$180k</text><text x="360" y="220">$260k</text>
              </g>
              <g stroke="#fff" strokeWidth="2.5" fill="none">
                <path d="M450 200 h110 v-28 h28 l16 28 h16" /><circle cx="478" cy="212" r="13" /><circle cx="546" cy="212" r="13" />
                <path d="M498 172 l28 -36 l24 14" />
              </g>
            </Panel>

            <Panel n={3} active={i === 3} bg="#080808">
              <circle cx="560" cy="60" r="22" fill="none" stroke="#444" strokeWidth="2" />
              <g stroke="#3a3a3a" strokeWidth="2" fill="none">
                <path d="M40 250 h200 M60 250 v-60 h160 v60" /><path d="M88 190 v-34 h104 v34" />
              </g>
              <rect x="290" y="60" width="110" height="190" rx="14" fill="#0f0f0f" stroke="#fff" strokeWidth="2.5" />
              <rect x="300" y="82" width="90" height="146" fill="#1F1F20" />
              <g className="ph" opacity="0">
                <rect x="308" y="90" width="74" height="40" rx="4" fill="#292A2B" />
                <text x="316" y="150" fill="#FDCE06" fontSize="18">$6,000</text>
                <text x="316" y="170" fill="#4CAF50" fontSize="11">Save 1%/month</text>
                <rect x="308" y="184" width="46" height="20" rx="5" fill="#FDCE06" />
                <text x="331" y="198" fill="#1F1F20" fontSize="10" textAnchor="middle">Request</text>
                <rect x="360" y="184" width="26" height="20" rx="5" fill="none" stroke="#555" />
                <text x="373" y="198" fill="#9CA3AF" fontSize="9" textAnchor="middle">Info</text>
              </g>
            </Panel>

            <Panel n={4} active={i === 4}>
              <g stroke="#fff" strokeWidth="2" fill="none">
                <path d="M50 210 h100 v-28 h26 l16 28 h16" /><circle cx="76" cy="222" r="12" /><circle cx="140" cy="222" r="12" />
              </g>
              <circle className="flash" cx="150" cy="150" r="8" fill="#FDCE06" opacity="0" />
              <rect x="230" y="110" width="60" height="96" rx="9" fill="none" stroke="#fff" strokeWidth="2" />
              <rect x="240" y="126" width="40" height="48" fill="#FDCE06" opacity=".28" />
              <path className="arrow" d="M320 158 h70 M390 158 l-14 -9 M390 158 l-14 9" stroke="#fff" strokeWidth="2" fill="none" />
              <rect x="410" y="96" width="180" height="120" rx="8" fill="#1F1F20" stroke="#333" strokeWidth="2" />
              <line x1="410" y1="124" x2="590" y2="124" stroke="#333" strokeWidth="2" />
              <rect className="alert" x="426" y="140" width="80" height="14" rx="3" fill="#ef4444" opacity="0" />
              <line x1="426" y1="172" x2="574" y2="172" stroke="#3a3a3a" strokeWidth="3" />
              <line x1="426" y1="192" x2="520" y2="192" stroke="#3a3a3a" strokeWidth="3" />
            </Panel>

            <Panel n={5} active={i === 5}>
              <rect x="60" y="50" width="520" height="200" rx="12" fill="#1F1F20" stroke="#333" strokeWidth="2" />
              <text x="84" y="86" fill="#E5E5E5" fontSize="17">Hydraulic leak on boom</text>
              <text x="84" y="106" fill="#6B7280" fontSize="12">Reported from site · 2 hours ago</text>
              <rect x="440" y="68" width="118" height="24" rx="12" fill="#B91C1C22" stroke="#B91C1C55" />
              <text x="499" y="85" fill="#B91C1C" fontSize="12" textAnchor="middle">Emergency · 24h</text>
              <text x="84" y="140" fill="#9CA3AF" fontSize="11">RESPONSE</text>
              <rect x="84" y="148" width="440" height="8" rx="4" fill="#2F2F31" />
              <rect className="rbar" x="84" y="148" width="0" height="8" rx="4" fill="#F59E0B" />
              <text x="84" y="186" fill="#9CA3AF" fontSize="11">REPAIR</text>
              <rect x="84" y="194" width="440" height="8" rx="4" fill="#2F2F31" />
              <rect className="rbar2" x="84" y="194" width="0" height="8" rx="4" fill="#4CAF50" />
              <g className="reply" opacity="0">
                <rect x="330" y="216" width="194" height="22" rx="11" fill="#FDCE06" />
                <text x="427" y="231" fill="#1F1F20" fontSize="12" textAnchor="middle">Seals on the way</text>
              </g>
            </Panel>

            <Panel n={6} active={i === 6}>
              <rect x="70" y="90" width="170" height="60" rx="6" fill="none" stroke="#fff" strokeWidth="2" />
              <text x="155" y="132" fill="#FDCE06" fontSize="32" textAnchor="middle" fontFamily="monospace">3590</text>
              <rect x="70" y="196" width="500" height="12" rx="6" fill="#2F2F31" />
              <rect className="sbar" x="70" y="196" width="0" height="12" rx="6" fill="#F59E0B" />
              <line x1="500" y1="182" x2="500" y2="222" stroke="#fff" strokeWidth="3" />
              <text x="500" y="244" fill="#888" fontSize="13" textAnchor="middle">service</text>
              <text x="155" y="172" fill="#6B7280" fontSize="12" textAnchor="middle">hours</text>
              <path d="M330 120 h110 v66 h-110 z M330 120 l55 -30 l55 30" fill="none" stroke="#3a3a3a" strokeWidth="2" />
            </Panel>

            <Panel n={7} active={i === 7}>
              <text x="320" y="150" fill="#FDCE06" fontSize="42" textAnchor="middle" fontWeight="700">LONG TERM HIRE</text>
              <line x1="180" y1="176" x2="460" y2="176" stroke="#333" strokeWidth="2" />
              <text x="320" y="206" fill="#9CA3AF" fontSize="15" textAnchor="middle">longtermhire.com</text>
            </Panel>

          </div>

          <div style={{ padding: "16px 20px 18px", background: "#0d0d0d", borderTop: "1px solid #262626" }}>
            <p style={{ margin: "0 0 14px", color: "#E5E5E5", fontSize: "16px", lineHeight: 1.5, minHeight: "48px" }}>
              {LINES[i]}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                {LINES.map((_, n) => (
                  <div key={n} style={{
                    height: "3px", flex: 1, borderRadius: "2px",
                    background: n <= i ? "#FDCE06" : "#2a2a2a",
                    transition: "background .3s",
                  }} />
                ))}
              </div>
              {i === LINES.length - 1 ? (
                <button onClick={onClose}
                  style={{ background: "#FDCE06", color: "#1F1F20", border: "none", padding: "9px 20px",
                           borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  Have a look around
                </button>
              ) : (
                <button onClick={onClose}
                  style={{ background: "transparent", color: "#9CA3AF", border: "1px solid #333",
                           padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroFilm;
