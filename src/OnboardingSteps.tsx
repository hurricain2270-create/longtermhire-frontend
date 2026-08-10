// @ts-nocheck
import React from "react";

// The order of operations for taking on a new client.
//
// Built because the steps are spread across four screens and there is no way to
// tell, from any one of them, what comes next. Twelve steps is not many, but
// remembering them in order after a fortnight away is asking a lot.
//
// Declared at module scope so React keeps the same DOM between renders.

const STEPS = [
  {
    band: "Before they are a client",
    items: [
      {
        title: "Send an onboarding form",
        note: "Green button on this page. Their name and email is all you need — they fill in the business, ABN, address and who needs logins.",
      },
      {
        title: "Watch for the Submissions chip",
        note: "Goes amber when something lands, and you get an email. Open it and it marks itself seen.",
      },
    ],
  },
  {
    band: "Setting them up",
    items: [
      {
        title: "Add Company, from what they typed",
        note: "Their spelling of their own business beats yours. Copy it across rather than retyping from memory.",
      },
      {
        title: "Quote terms",
        done: "1 of 4",
        note: "GST, the levies and waiver, float charged separately, how long the quote stands.",
      },
      {
        title: "Assign equipment",
        done: "2 of 4",
        note: "Which machines they can see. Assign is a dropdown on their row.",
      },
      {
        title: "Pricing and discount",
        done: "3 of 4",
        note: "Base rate per machine and their compounding discount. The discount is the bit that makes this count as done.",
      },
      {
        title: "Welcome note",
        done: "4 of 4",
        note: "The sticky note on their dashboard. Anything you want them to see first.",
      },
    ],
  },
  {
    band: "Letting them in",
    items: [
      {
        title: "Send welcome",
        note: "Green button on their row. Their login plus what the portal does. Turns grey to Welcomed once sent.",
      },
      {
        title: "Add their people",
        note: "Company Details. Owner, engineer, supervisor, and tick what each can see. The role sets the usual boxes; change any of them.",
      },
    ],
  },
  {
    band: "When they want a machine",
    items: [
      {
        title: "They generate a quote",
        note: "From their own portal. It lands in Quote Management with their name on it.",
      },
      {
        title: "Contract Set Up",
        note: "Pick the client and machine and most of it fills itself. Delivery address is separate from the site — the truck might drop it next door.",
      },
      {
        title: "Start Hire",
        note: "Hire Management. Asks where it is going, who to meet and how to get in. That travels with the hire, and dispatch reads it when something breaks.",
      },
    ],
  },
];

const OnboardingSteps = ({ open, onClose }) => {
  if (!open) return null;

  let n = 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-label="How to onboard a client"
      onClick={onClose}
    >
      <div
        className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-[620px] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 p-5 border-b border-[#2a2a2a]">
          <div>
            <p className="text-[#E5E5E5] font-[Inter] text-[20px] font-semibold">
              Taking on a new client
            </p>
            <p className="text-[#9CA3AF] font-[Inter] text-[13px] mt-1">
              The order it goes in. Nothing here is enforced — it is just what works.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#6B7280] hover:text-[#E5E5E5] text-[22px] leading-none flex-none"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {STEPS.map((group) => (
            <div key={group.band}>
              <p className="text-[#FDCE06] font-[Inter] text-[11px] uppercase tracking-[0.06em] mt-4 first:mt-0 mb-2.5">
                {group.band}
              </p>
              {group.items.map((item) => {
                n += 1;
                return (
                  <div
                    key={item.title}
                    className="bg-[#292A2B] border-l-[3px] border-l-[#FDCE06] rounded-lg px-4 py-3 mb-1.5"
                  >
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[#FDCE06] font-mono text-[12px] flex-none">
                        {n}
                      </span>
                      <p className="text-[#E5E5E5] font-[Inter] text-[15px] font-semibold">
                        {item.title}
                      </p>
                      {item.done ? (
                        <span className="ml-auto text-[#4CAF50] font-[Inter] text-[11px] flex-none">
                          {item.done}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[#9CA3AF] font-[Inter] text-[12.5px] leading-relaxed mt-1.5 pl-[22px]">
                      {item.note}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingSteps;
