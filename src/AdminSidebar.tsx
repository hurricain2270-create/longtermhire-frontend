import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "./services/authApi";
import { useCompanyLogo } from "./hooks/useCompanyLogo";
import { chatApi } from "./services/chatApi";

const AdminSidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { companyLogo } = useCompanyLogo();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            // Set offline status before logout
            await chatApi.setOffline();

            // Then logout
            await authApi.logout();
            navigate("/login");
        } catch (error) {
            console.error("Logout error:", error);
            // Force logout even if API call fails
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
        }
    };

    const menuItems = [
        {
            path: "/dashboard",
            name: "Dashboard",
            icon: (
                <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M14 14.75H0V0.75H14V14.75Z" stroke="#E5E7EB" />
                    <path
                        d="M0 3.375C0 2.40977 0.784766 1.625 1.75 1.625H12.25C13.2152 1.625 14 2.40977 14 3.375V12.125C14 13.0902 13.2152 13.875 12.25 13.875H1.75C0.784766 13.875 0 13.0902 0 12.125V3.375ZM1.75 5.125V12.125H6.125V5.125H1.75ZM12.25 5.125H7.875V12.125H12.25V5.125Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
        {
            path: "/client-management",
            name: "Client Management",
            icon: (
                <svg
                    width="18"
                    height="15"
                    viewBox="0 0 18 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g clip-path="url(#clip0_2_1137)">
                        <g clip-path="url(#clip1_2_1137)">
                            <path
                                d="M4.1875 0.75C4.76766 0.75 5.32406 0.980468 5.7343 1.3907C6.14453 1.80094 6.375 2.35734 6.375 2.9375C6.375 3.51766 6.14453 4.07406 5.7343 4.4843C5.32406 4.89453 4.76766 5.125 4.1875 5.125C3.60734 5.125 3.05094 4.89453 2.6407 4.4843C2.23047 4.07406 2 3.51766 2 2.9375C2 2.35734 2.23047 1.80094 2.6407 1.3907C3.05094 0.980468 3.60734 0.75 4.1875 0.75ZM14.25 0.75C14.8302 0.75 15.3866 0.980468 15.7968 1.3907C16.207 1.80094 16.4375 2.35734 16.4375 2.9375C16.4375 3.51766 16.207 4.07406 15.7968 4.4843C15.3866 4.89453 14.8302 5.125 14.25 5.125C13.6698 5.125 13.1134 4.89453 12.7032 4.4843C12.293 4.07406 12.0625 3.51766 12.0625 2.9375C12.0625 2.35734 12.293 1.80094 12.7032 1.3907C13.1134 0.980468 13.6698 0.75 14.25 0.75ZM0.25 8.91758C0.25 7.30703 1.55703 6 3.16758 6H4.33516C4.76992 6 5.18281 6.0957 5.55469 6.26523C5.51914 6.46211 5.50273 6.66719 5.50273 6.875C5.50273 7.91953 5.96211 8.85742 6.68672 9.5C6.68125 9.5 6.67578 9.5 6.66758 9.5H0.832422C0.5125 9.5 0.25 9.2375 0.25 8.91758ZM11.3324 9.5C11.327 9.5 11.3215 9.5 11.3133 9.5C12.0406 8.85742 12.4973 7.91953 12.4973 6.875C12.4973 6.66719 12.4781 6.46484 12.4453 6.26523C12.8172 6.09297 13.2301 6 13.6648 6H14.8324C16.443 6 17.75 7.30703 17.75 8.91758C17.75 9.24023 17.4875 9.5 17.1676 9.5H11.3324ZM6.375 6.875C6.375 6.17881 6.65156 5.51113 7.14384 5.01884C7.63613 4.52656 8.30381 4.25 9 4.25C9.69619 4.25 10.3639 4.52656 10.8562 5.01884C11.3484 5.51113 11.625 6.17881 11.625 6.875C11.625 7.57119 11.3484 8.23887 10.8562 8.73116C10.3639 9.22344 9.69619 9.5 9 9.5C8.30381 9.5 7.63613 9.22344 7.14384 8.73116C6.65156 8.23887 6.375 7.57119 6.375 6.875ZM3.75 14.0199C3.75 12.0074 5.38242 10.375 7.39492 10.375H10.6051C12.6176 10.375 14.25 12.0074 14.25 14.0199C14.25 14.4219 13.9246 14.75 13.5199 14.75H4.48008C4.07812 14.75 3.75 14.4246 3.75 14.0199Z"
                                fill="currentColor"
                            />
                        </g>
                    </g>
                    <defs>
                        <clipPath id="clip0_2_1137">
                            <rect
                                width="17.5"
                                height="14"
                                fill="white"
                                transform="translate(0.25 0.75)"
                            />
                        </clipPath>
                        <clipPath id="clip1_2_1137">
                            <path d="M0.25 0.75H17.75V14.75H0.25V0.75Z" fill="white" />
                        </clipPath>
                    </defs>
                </svg>
            ),
        },
        {
            path: "/equipment-management",
            name: "Equipment Management",
            icon: (
                <svg
                    width="18"
                    height="15"
                    viewBox="0 0 18 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g clip-path="url(#clip0_2_1144)">
                        <path
                            d="M17.6723 0.75V11.6875C17.6723 13.3801 16.3024 14.75 14.6098 14.75C12.9419 14.75 11.5884 13.4184 11.5473 11.7613L1.49578 14.5012C1.0282 14.627 0.549686 14.3535 0.42117 13.8859C0.292655 13.4184 0.568826 12.9398 1.0364 12.8113L9.79734 10.4242V2.5C9.79734 1.53477 10.5821 0.75 11.5473 0.75H17.6723ZM15.9223 11.6875C15.9223 11.3394 15.7841 11.0056 15.5379 10.7594C15.2918 10.5133 14.9579 10.375 14.6098 10.375C14.2617 10.375 13.9279 10.5133 13.6818 10.7594C13.4356 11.0056 13.2973 11.3394 13.2973 11.6875C13.2973 12.0356 13.4356 12.3694 13.6818 12.6156C13.9279 12.8617 14.2617 13 14.6098 13C14.9579 13 15.2918 12.8617 15.5379 12.6156C15.7841 12.3694 15.9223 12.0356 15.9223 11.6875ZM0.803983 6.4293C0.678201 5.96172 0.957108 5.4832 1.42195 5.35742L2.6907 5.01836L3.25672 7.13203C3.31961 7.36445 3.56023 7.50391 3.79265 7.44102L4.63758 7.21406C4.87 7.15117 5.00945 6.91055 4.94656 6.67812L4.38055 4.56445L5.64930 4.22539C6.11687 4.09961 6.59539 4.37852 6.72117 4.84336L7.85320 9.06797C7.97898 9.53555 7.70008 10.0141 7.23523 10.1398L3.00789 11.2746C2.54031 11.4004 2.06180 11.1215 1.93601 10.6566L0.803983 6.4293Z"
                            fill="currentColor"
                        />
                    </g>
                    <defs>
                        <clipPath id="clip0_2_1144">
                            <path
                                d="M0.171875 0.75H17.6719V14.75H0.171875V0.75Z"
                                fill="currentColor"
                            />
                        </clipPath>
                    </defs>
                </svg>
            ),
        },
        {
            path: "/content-management",
            name: "Content Management",
            icon: (
                <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g clip-path="url(#clip0_2_1159)">
                        <path
                            d="M11.2189 7.0664L11.5279 6.75742L10.6009 5.83046L8.90288 4.13242L7.97593 3.20546L7.66695 3.51445L7.04898 4.13242L1.6021 9.57929C1.31773 9.86367 1.10991 10.2164 0.995071 10.6019L0.0271024 13.8941C-0.041257 14.1238 0.0216336 14.3726 0.193899 14.5422C0.366165 14.7117 0.612259 14.7746 0.841946 14.709L4.1314 13.741C4.51695 13.6262 4.86968 13.4184 5.15406 13.134L10.6009 7.6871L11.2189 7.0664ZM4.37476 11.6711L4.12593 12.2918C4.01655 12.3766 3.89351 12.4394 3.76226 12.4805L1.62398 13.1094L2.25288 10.9738C2.29116 10.8398 2.35679 10.7168 2.44156 10.6102L3.06226 10.3613V11.2363C3.06226 11.4769 3.25913 11.6738 3.49976 11.6738H4.37476V11.6711ZM9.91734 1.26132L9.52359 1.65781L8.90562 2.27578L8.5939 2.58476L9.52085 3.51171L11.2189 5.20976L12.1459 6.13671L12.4548 5.82773L13.0728 5.20976L13.4693 4.81328C14.1529 4.12968 14.1529 3.02226 13.4693 2.33867L12.3947 1.26132C11.7111 0.577728 10.6037 0.577728 9.92007 1.26132H9.91734ZM8.62124 5.85507L4.68374 9.79257C4.51421 9.9621 4.23530 9.9621 4.06577 9.79257C3.89624 9.62304 3.89624 9.34413 4.06577 9.1746L8.00327 5.2371C8.17281 5.06757 8.45171 5.06757 8.62124 5.2371C8.79077 5.40663 8.79077 5.68554 8.62124 5.85507Z"
                            fill="currentColor"
                        />
                    </g>
                    <defs>
                        <clipPath id="clip0_2_1159">
                            <path d="M0 0.75H14V14.75H0V0.75Z" fill="white" />
                        </clipPath>
                    </defs>
                </svg>
            ),
        },
        {
            path: "/quote-management",
            name: "Quote Management",
            icon: (
                <svg
                    width="14"
                    height="15"
                    viewBox="0 0 14 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M12.25 0.75H1.75C0.784766 0.75 0 1.53477 0 2.5V12.5C0 13.4652 0.784766 14.25 1.75 14.25H12.25C13.2152 14.25 14 13.4652 14 12.5V2.5C14 1.53477 13.2152 0.75 12.25 0.75ZM12.25 12.5H1.75V2.5H12.25V12.5ZM3.5 4.25H10.5V5.75H3.5V4.25ZM3.5 7.25H10.5V8.75H3.5V7.25ZM3.5 10.25H7V11.75H3.5V10.25Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
        {
            path: "/chat",
            name: "Chat",
            icon: (
                <svg
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M5.6878 9.625C8.8296 9.625 11.3753 7.47031 11.3753 4.8125C11.3753 2.15469 8.8296 0 5.6878 0C2.546 0 0.000299262 2.15469 0.000299262 4.8125C0.000299262 5.86797 0.402252 6.84414 1.08311 7.63984C0.987409 7.89687 0.845221 8.12383 0.69483 8.31523C0.56358 8.48477 0.429596 8.61602 0.331159 8.70625C0.28194 8.75 0.240924 8.78555 0.213581 8.80742C0.199909 8.81836 0.188971 8.82656 0.183502 8.8293L0.178034 8.83477C0.027643 8.94688 -0.037982 9.14375 0.0221743 9.32148C0.0823305 9.49922 0.249127 9.625 0.437799 9.625C1.03389 9.625 1.63546 9.47188 2.13585 9.2832C2.38741 9.1875 2.62256 9.08086 2.82764 8.97148C3.6671 9.38711 4.64327 9.625 5.6878 9.625ZM12.2503 4.8125C12.2503 7.8832 9.54053 10.1965 6.33038 10.4727C6.99483 12.507 9.19874 14 11.8128 14C12.8573 14 13.8335 13.7621 14.6757 13.3465C14.8808 13.4559 15.1132 13.5625 15.3648 13.6582C15.8651 13.8469 16.4667 14 17.0628 14C17.2515 14 17.421 13.877 17.4784 13.6965C17.5358 13.516 17.473 13.3191 17.3198 13.207L17.3144 13.2016C17.3089 13.1961 17.298 13.1906 17.2843 13.1797C17.2569 13.1578 17.2159 13.125 17.1667 13.0785C17.0683 12.9883 16.9343 12.857 16.803 12.6875C16.6526 12.4961 16.5105 12.2664 16.4148 12.0121C17.0956 11.2191 17.4976 10.243 17.4976 9.18477C17.4976 6.64727 15.1761 4.56641 12.2312 4.38594C12.2421 4.52539 12.2476 4.66758 12.2476 4.80977L12.2503 4.8125Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
    ];

    const isActive = (path) => {
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-[#1F1F20] text-[#FDCE06] rounded-md border border-[#333333]"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
        bg-[#1F1F20] fixed left-0 top-0 h-full z-40 transition-transform duration-300 ease-in-out
        w-64 lg:w-64
        ${isMobileMenuOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                    }
      `}
            >
                {/* Logo section */}
                <div className="flex items-center justify-center border-b border-[#333333] h-20 px-4">
                    <img
                        src={companyLogo || "/figma-assets/logo.svg"}
                        alt="Company Logo"
                        className="h-[140px]"
                    />
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`
                flex items-center px-4 py-3 rounded-l-xl transition-all duration-200 relative
                ${isActive(item.path)
                                    ? "bg-[#292A2B] text-[#FDCE06]"
                                    : "text-white hover:text-white hover:bg-[#292A2B]"
                                }
              `}
                        >
                            {/* Left border for active item */}
                            {isActive(item.path) && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-l-xl"></div>
                            )}

                            <span
                                className={`
                mr-3 transition-colors duration-200
                ${isActive(item.path) ? "text-[#FDCE06]" : "text-white"}
              `}
                            >
                                {item.icon}
                            </span>
                            <span
                                className={`text-sm font-normal ${isActive(item.path) ? "text-[#FDCE06] font-semibold" : "text-white"}`}
                            >
                                {item.name}
                            </span>
                        </Link>
                    ))}
                </nav>

                {/* Profile section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#333333]">
                    <div className="flex items-center justify-between">
                        <Link
                            to="/profile"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`
                flex items-center flex-1 px-3 py-2 rounded-lg transition-all duration-200
                ${isActive("/profile")
                                    ? "bg-[#292A2B] text-[#FDCE06]"
                                    : "text-white hover:text-white hover:bg-[#292A2B]"
                                }
              `}
                        >
                            <div className="w-8 h-8 bg-[#333333] rounded-full flex items-center justify-center mr-3">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium">Profile</span>
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="p-2 ml-2 text-white hover:text-[#FDCE06] hover:bg-[#333333] rounded-md transition-colors"
                            title="Logout"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16,17 21,12 16,7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default AdminSidebar;
