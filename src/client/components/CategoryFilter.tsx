import React, { useState, useEffect, useRef } from "react";

interface CategoryFilterProps {
    categories: string[];
    selectedCategories: string[];
    onCategoryChange: (categories: string[]) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
    categories,
    selectedCategories,
    onCategoryChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCategoryToggle = (category: string) => {
        const newSelectedCategories = selectedCategories.includes(category)
            ? selectedCategories.filter((c) => c !== category)
            : [...selectedCategories, category];

        onCategoryChange(newSelectedCategories);
    };

    const handleSelectAll = () => {
        if (selectedCategories.length === categories.length) {
            onCategoryChange([]);
        } else {
            onCategoryChange([...categories]);
        }
    };

    const getDisplayText = () => {
        if (selectedCategories.length === 0) {
            return "All Categories";
        }
        if (selectedCategories.length === categories.length) {
            return "All Categories";
        }
        if (selectedCategories.length === 1) {
            return selectedCategories[0];
        }
        return `${selectedCategories.length} Categories`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Filter Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F1F20] border-2 border-[#333333] rounded-lg text-[#E5E5E5] hover:border-[#FDCE06] transition-colors min-w-[200px] justify-between"
            >
                <span className="text-sm font-medium">{getDisplayText()}</span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                    <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[250px] bg-[#1F1F20] border-2 border-[#333333] rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto">
                    {/* Select All Option */}
                    <div
                        onClick={handleSelectAll}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#2A2A2B] cursor-pointer border-b border-[#333333]"
                    >
                        <div className="relative flex items-center justify-center w-5 h-5">
                            <input
                                type="checkbox"
                                checked={selectedCategories.length === categories.length}
                                onChange={() => {}}
                                className="appearance-none w-5 h-5 border-2 border-[#9CA3AF] rounded checked:bg-[#FDCE06] checked:border-[#FDCE06] cursor-pointer"
                            />
                            {selectedCategories.length === categories.length && (
                                <svg
                                    className="absolute w-3 h-3 pointer-events-none"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M5 13l4 4L19 7"
                                        stroke="#000000"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                        </div>
                        <span className="text-[#E5E5E5] text-sm font-semibold">All Categories</span>
                    </div>

                    {/* Category Options */}
                    {categories.map((category) => (
                        <div
                            key={category}
                            onClick={() => handleCategoryToggle(category)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#2A2A2B] cursor-pointer"
                        >
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(category)}
                                    onChange={() => {}}
                                    className="appearance-none w-5 h-5 border-2 border-[#9CA3AF] rounded checked:bg-[#FDCE06] checked:border-[#FDCE06] cursor-pointer"
                                />
                                {selectedCategories.includes(category) && (
                                    <svg
                                        className="absolute w-3 h-3 pointer-events-none"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="#000000"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span className="text-[#E5E5E5] text-sm capitalize">{category}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryFilter;
