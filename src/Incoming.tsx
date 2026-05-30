// @ts-nocheck
import React from "react";

function Incoming() {
  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      <header className="mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px]">
          Incoming Requests
        </h1>
      </header>
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-8 text-center">
        <p className="text-[#9CA3AF] font-[Inter] text-sm">
          No incoming requests at this time.
        </p>
      </div>
    </div>
  );
}

export default Incoming;
