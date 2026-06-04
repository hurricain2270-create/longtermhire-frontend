// @ts-nocheck
import React from "react";

const CategoryFilter = ({ categories, selectedCategories, onCategoryChange }) => {
  if (!categories?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => onCategoryChange([])}
        className={`px-3 py-1.5 rounded-full text-sm font-[Inter] font-medium transition-colors ${selectedCategories.length === 0 ? "bg-[#FDCE06] text-black" : "bg-[#1F1F20] border border-[#333] text-[#9CA3AF] hover:text-[#E5E5E5]"}`}
      >All</button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => {
            if (selectedCategories.includes(cat)) {
              onCategoryChange(selectedCategories.filter(c => c !== cat));
            } else {
              onCategoryChange([...selectedCategories, cat]);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-sm font-[Inter] font-medium transition-colors ${selectedCategories.includes(cat) ? "bg-[#FDCE06] text-black" : "bg-[#1F1F20] border border-[#333] text-[#9CA3AF] hover:text-[#E5E5E5]"}`}
        >{cat}</button>
      ))}
    </div>
  );
};
export default CategoryFilter;
