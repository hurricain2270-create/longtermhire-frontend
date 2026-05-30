import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const equipment = [
    { icon: "⛏", name: "Excavators", desc: "1.7t to 23t — full range for any dig" },
    { icon: "🚛", name: "Trucks", desc: "Tippers, wide cabs, water carts & more" },
    { icon: "🏗", name: "Skid Steers", desc: "Kubota SVL plus attachments" },
    { icon: "🚜", name: "Vac Trucks", desc: "STG 6000 & Hammelman hydro-demo" },
    { icon: "🔩", name: "Attachments", desc: "Jibs, forks, brooms & smudge bars" },
    { icon: "🚗", name: "Vehicles", desc: "Dual cab utes & site vehicles" },
  ];

  const benefits = [
    {
      title: "Fixed Monthly Fee",
      desc: "One predictable payment covers hire, servicing, repairs and inspections. No surprise bills.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDCE06" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      title: "No Capital Outlay",
      desc: "Keep your cash in the business. No large upfront purchase required — ever.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDCE06" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      title: "We Handle Maintenance",
      desc: "Our fleet of service vans keeps your equipment running. Normal wear and tear? Covered.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDCE06" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      title: "Australia Wide",
      desc: "We supply and service long-term hire equipment right across the country.",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDCE06" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#1C1C1E] text-[#E5E5E5] overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          transition: "all 0.3s",
          background: scrolled ? "rgba(28,28,30,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          borderBottom: scrolled ? "1px solid #2E2E2F" : "none",
        }}
      >
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/figma-assets/logo.png" alt="Long Term Hire" style={{ height: 48, width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="mailto:admin@longtermhire.com" style={{ color: "#9CA3AF", fontSize: 14, textDecoration: "none" }}>
              admin@longtermhire.com
            </a>
            <button
              onClick={() => navigate("/client/login")}
              style={{ background: "#FDCE06", color: "#1C1C1E", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
            >
              Client Login
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(#FDCE06 1px, transparent 1px), linear-gradient(90deg, #FDCE06 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        {/* Glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(253,206,6,0.07) 0%, transparent 70%)" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto", padding: "96px 24px 64px", textAlign: "center" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(253,206,6,0.1)", border: "1px solid rgba(253,206,6,0.3)",
            borderRadius: 999, padding: "6px 16px", color: "#FDCE06",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 32,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FDCE06" }} />
            Minimum 3 Month Hire · Australia Wide
          </div>

          <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 24 }}>
            Construction Equipment.
            <br />
            <span style={{ color: "#FDCE06" }}>Long-Term. No Fuss.</span>
          </h1>

          <p style={{ color: "#9CA3AF", fontSize: 18, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Skip the big capital purchase. We supply excavators, trucks, skid steers and more on flexible long-term hire — with maintenance and servicing included in your monthly fee.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <a
              href="mailto:admin@longtermhire.com"
              style={{
                background: "#FDCE06", color: "#1C1C1E", padding: "16px 32px",
                borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: "none",
                boxShadow: "0 8px 32px rgba(253,206,6,0.25)",
              }}
            >
              Get a Quote
            </a>
            <button
              onClick={() => navigate("/client/login")}
              style={{
                background: "#2A2A2B", border: "1px solid #3E3E3F",
                color: "#E5E5E5", padding: "16px 32px", borderRadius: 12,
                fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}
            >
              Existing Client? Login →
            </button>
          </div>
        </div>
      </section>

      {/* ── WHAT IS LONG-TERM HIRE ── */}
      <section style={{ padding: "96px 24px", background: "#1F1F20" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <p style={{ color: "#FDCE06", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>What We Do</p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, marginBottom: 24 }}>
              An alternative to buying equipment
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: 17, lineHeight: 1.75, marginBottom: 16 }}>
              Long-term hire is a smarter way to access the equipment you need without tying up capital in ownership. Instead of a large purchase price, you pay an agreed monthly fee for a minimum of 3 months.
            </p>
            <p style={{ color: "#9CA3AF", fontSize: 17, lineHeight: 1.75, marginBottom: 32 }}>
              We take care of scheduled servicing, repairs from normal wear and tear, and all required inspections — so you can focus on the job, not the machinery.
            </p>
            <a href="mailto:admin@longtermhire.com" style={{ color: "#FDCE06", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
              Talk to us about your next project →
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { value: "20+", label: "Equipment Items Available" },
              { value: "3mo", label: "Minimum Hire Period" },
              { value: "100%", label: "Maintenance Included" },
              { value: "AU", label: "Australia Wide Service" },
            ].map((stat, i) => (
              <div key={i} style={{ background: "#292A2B", border: "1px solid #333", borderRadius: 20, padding: 24 }}>
                <div style={{ color: "#FDCE06", fontSize: 40, fontWeight: 800, marginBottom: 8 }}>{stat.value}</div>
                <div style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1.4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section style={{ padding: "96px 24px", background: "#1C1C1E" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: "#FDCE06", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Why Long-Term Hire</p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff" }}>Built for builders</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ background: "#1F1F20", border: "1px solid #2E2E2F", borderRadius: 20, padding: 24 }}>
                <div style={{ marginBottom: 16, padding: 12, background: "rgba(253,206,6,0.1)", borderRadius: 12, width: "fit-content" }}>
                  {b.icon}
                </div>
                <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 17, marginBottom: 8 }}>{b.title}</h3>
                <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.65 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EQUIPMENT ── */}
      <section style={{ padding: "96px 24px", background: "#1F1F20" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: "#FDCE06", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Our Fleet</p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>What we hire</h2>
            <p style={{ color: "#9CA3AF", fontSize: 17, maxWidth: 480, margin: "0 auto" }}>
              A growing fleet of quality construction equipment available for long-term hire Australia wide.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
            {equipment.map((item, i) => (
              <div key={i} style={{ background: "#292A2B", border: "1px solid #333", borderRadius: 20, padding: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.name}</h3>
                <p style={{ color: "#9CA3AF", fontSize: 13 }}>{item.desc}</p>
              </div>
            ))}
          </div>


        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "96px 24px", background: "#1C1C1E" }}>
        <div style={{ maxWidth: 768, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: "#FDCE06", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>The Process</p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff" }}>Simple from day one</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { step: "01", title: "Get in touch", desc: "Tell us what equipment you need and for how long. We'll put together a tailored quote." },
              { step: "02", title: "Agree on terms", desc: "We set an agreed monthly fee covering hire, maintenance and inspections — no hidden costs." },
              { step: "03", title: "We deliver", desc: "Equipment arrives ready to work. Your client portal gives you full visibility over your hire." },
              { step: "04", title: "We maintain it", desc: "Our service team handles all upkeep. If something goes wrong, we fix it. You just keep building." },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start", background: "#1F1F20", border: "1px solid #2E2E2F", borderRadius: 20, padding: 24 }}>
                <div style={{ color: "#FDCE06", fontWeight: 800, fontSize: 24, width: 48, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 17, marginBottom: 4 }}>{s.title}</h3>
                  <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "96px 24px", background: "#1F1F20" }}>
        <div style={{ maxWidth: 672, margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(253,206,6,0.1), rgba(253,206,6,0.05))", border: "1px solid rgba(253,206,6,0.2)", borderRadius: 32, padding: "64px 48px" }}>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              Ready to get started?
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: 17, marginBottom: 32, lineHeight: 1.65 }}>
              Get in touch today and we'll put together a quote for your equipment needs. Fast, fair and flexible.
            </p>
            <a
              href="mailto:admin@longtermhire.com"
              style={{
                display: "inline-block", background: "#FDCE06", color: "#1C1C1E",
                padding: "18px 40px", borderRadius: 12, fontWeight: 800, fontSize: 17,
                textDecoration: "none", boxShadow: "0 12px 40px rgba(253,206,6,0.3)",
              }}
            >
              admin@longtermhire.com
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #2E2E2F", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <img src="/figma-assets/logo.png" alt="Long Term Hire" style={{ height: 32, width: "auto" }} />
          <p style={{ color: "#555", fontSize: 13 }}>© {new Date().getFullYear()} Long Term Hire. Australia Wide.</p>
          <button onClick={() => navigate("/client/login")} style={{ color: "#FDCE06", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
            Client Login →
          </button>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
