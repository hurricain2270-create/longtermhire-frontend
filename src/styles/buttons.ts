// Shared button styles.
//
// Defined once so pages can't drift apart. Before this existed, Contract Set Up
// and Equipment Management used pill buttons, Content Management used text
// links, and Client Management used something else again.
//
// The rule: an action always looks the same wherever it appears.
//   View / primary  — yellow, dark text
//   Edit            — blue, dark text
//   Start / go       — green, dark text
//   Back / navigate  — purple, white text
//   Delete / danger — red, dark text
//   Everything else — bordered, grey, yellow on hover

const base =
  "rounded font-[Inter] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const size = {
  xl: "px-7 py-3.5 text-[19px]",
  lg: "px-5 py-2.5 text-[16px]",
  md: "px-3 py-1.5 text-[14px]",
  sm: "px-2.5 py-1 text-[12px]",
};

export const BTN = {
  // The main action on a row or form — View, Open, Save.
  primary: `${base} ${size.md} bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]`,

  // Edit — always blue, so it reads the same on every page.
  edit: `${base} ${size.md} bg-[#60A5FA] text-[#1F1F20] hover:bg-[#3B82F6]`,

  // Go / start actions — Start Hire and the like.
  success: `${base} ${size.md} bg-[#4CAF50] text-[#1F1F20] hover:bg-[#3d9e43]`,

  // Supporting actions — Resend, Complete, anything without its own colour.
  secondary: `${base} ${size.md} border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06]`,

  // Destructive — always red, always dark text, so it reads the same everywhere.
  danger: `${base} ${size.md} bg-[#ef4444] text-[#1F1F20] hover:bg-[#dc2626]`,

  // Navigate away / step back out — purple with white text, so it reads as
  // "leave this screen" rather than as an action on the thing you're editing.
  nav: `${base} ${size.md} bg-[#7C3AED] text-white hover:bg-[#6D28D9]`,
  navLg: `${base} ${size.lg} bg-[#7C3AED] text-white hover:bg-[#6D28D9]`,
  navXl: `${base} ${size.xl} bg-[#7C3AED] text-white hover:bg-[#6D28D9]`,
  navSm: `${base} ${size.sm} bg-[#7C3AED] text-white hover:bg-[#6D28D9]`,

  // Extra large, for the machine editor — a screen you work in for a while.
  primaryXl: `${base} ${size.xl} bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]`,
  secondaryXl: `${base} ${size.xl} border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06]`,
  dangerXl: `${base} ${size.xl} bg-[#ef4444] text-[#1F1F20] hover:bg-[#dc2626]`,

  // Larger, for editing screens where you're working for a while and shouldn't
  // have to aim.
  primaryLg: `${base} ${size.lg} bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]`,
  secondaryLg: `${base} ${size.lg} border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06]`,
  dangerLg: `${base} ${size.lg} bg-[#ef4444] text-[#1F1F20] hover:bg-[#dc2626]`,

  // Same three at the smaller size, for nested rows and tight columns.
  primarySm: `${base} ${size.sm} bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]`,
  editSm: `${base} ${size.sm} bg-[#60A5FA] text-[#1F1F20] hover:bg-[#3B82F6]`,
  successSm: `${base} ${size.sm} bg-[#4CAF50] text-[#1F1F20] hover:bg-[#3d9e43]`,
  secondarySm: `${base} ${size.sm} border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06]`,
  dangerSm: `${base} ${size.sm} bg-[#ef4444] text-[#1F1F20] hover:bg-[#dc2626]`,
};

export default BTN;
