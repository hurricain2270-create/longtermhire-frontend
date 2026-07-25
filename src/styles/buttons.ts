// Shared button styles.
//
// Defined once so pages can't drift apart. Before this existed, Contract Set Up
// and Equipment Management used pill buttons, Content Management used text
// links, and Client Management used something else again.
//
// The rule: an action always looks the same wherever it appears.
//   View / primary  — yellow, dark text
//   Delete / danger — red, dark text
//   Everything else — bordered, grey, yellow on hover

const base =
  "rounded font-[Inter] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const size = {
  md: "px-3 py-1.5 text-[14px]",
  sm: "px-2.5 py-1 text-[12px]",
};

export const BTN = {
  // The main action on a row or form — View, Open, Save.
  primary: `${base} ${size.md} bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]`,

  // Supporting actions — Edit, Resend, Complete.
  secondary: `${base} ${size.md} border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06]`,

  // Destructive — always red, always dark text, so it reads the same everywhere.
  danger: `${base} ${size.md} bg-[#ef4444] text-[#1F1F20] hover:bg-[#dc2626]`,

  // Same three at the smaller size, for nested rows and tight columns.
  primarySm: `${base} ${size.sm} bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]`,
  secondarySm: `${base} ${size.sm} border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06]`,
  dangerSm: `${base} ${size.sm} bg-[#ef4444] text-[#1F1F20] hover:bg-[#dc2626]`,
};

export default BTN;
