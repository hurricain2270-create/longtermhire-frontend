import React from "react";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#292A2B] text-[#E5E5E5] flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <img
          src="/figma-assets/logo.png"
          alt="Long Term Hire Logo"
          className="h-[120px] w-auto mx-auto"
        />
        <div className="space-y-2">
          <p className="text-[#ADAEBC]">Contact Administrator for more info</p>
          <a
            href="mailto:admin@longtermhire.com"
            className="text-[#FDCE06] font-semibold hover:underline break-all"
          >
            admin@longtermhire.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

