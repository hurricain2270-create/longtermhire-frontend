import React, { useRef, useState, useEffect } from "react";

const SimpleRichTextEditor = ({ value, onChange, height = 100 }) => {
  const editorRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Set initial content when value changes - preserve formatting
  useEffect(() => {
    if (editorRef.current) {
      // Only update if the value has actually changed to prevent cursor jumping
      const currentContent = editorRef.current.innerHTML;
      const newValue = value || "";

      // Normalize both for comparison (strip extra whitespace/newlines)
      const normalizedCurrent = currentContent.replace(/\s+/g, ' ').trim();
      const normalizedNew = newValue.replace(/\s+/g, ' ').trim();

      if (normalizedCurrent !== normalizedNew) {
        editorRef.current.innerHTML = newValue;
      }
    }
  }, [value]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const applyColor = (color) => {
    execCommand("foreColor", color);
    setShowColorPicker(false);
  };

  const applyHighlight = (color) => {
    execCommand("hiliteColor", color);
    setShowHighlightPicker(false);
  };

  const textColors = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
    "#008000", "#FFC0CB", "#A52A2A", "#808080", "#FFD700"
  ];

  const highlightColors = [
    "#FFFF00", "#00FF00", "#00FFFF", "#FF00FF", "#FFA500",
    "#FF6B6B", "#4ECDC4", "#95E1D3", "#F38181", "#DDA15E",
    "#FFDAB9", "#E0BBE4", "#C9E4DE", "#FFB6C1", "#D4A5A5"
  ];

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 rounded-t border border-b-0 border-[#333333] bg-[#1F1F20] p-2">
        {/* Bold Button */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <span className="font-bold text-[#E5E5E5]">B</span>
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <span className="italic text-[#E5E5E5]">I</span>
        </button>

        {/* Underline Button */}
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Underline (Ctrl+U)"
        >
          <span className="underline text-[#E5E5E5]">U</span>
        </button>

        {/* Divider */}
        <div className="mx-1 w-px bg-[#333333]" />

        {/* Text Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
            title="Text Color"
          >
            <span className="text-[#E5E5E5]">A</span>
          </button>

          {showColorPicker && (
            <div className="absolute left-0 top-10 z-50 rounded border border-[#333333] bg-[#1F1F20] p-3 shadow-lg">
              <div className="mb-2 text-xs font-medium text-[#E5E5E5]">Text Color</div>
              <div className="grid grid-cols-5 gap-1">
                {textColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyColor(color)}
                    className="h-6 w-6 rounded border border-[#333333] hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowColorPicker(false)}
                className="mt-2 w-full rounded bg-[#FDCE06] px-2 py-1 text-xs text-[#1F1F20] font-medium hover:bg-[#E5B800] transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Highlight Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
            title="Highlight Color"
          >
            <span className="bg-[#FDCE06] px-1 text-[#1F1F20] font-medium">H</span>
          </button>

          {showHighlightPicker && (
            <div className="absolute left-0 top-10 z-50 rounded border border-[#333333] bg-[#1F1F20] p-3 shadow-lg">
              <div className="mb-2 text-xs font-medium text-[#E5E5E5]">Highlight</div>
              <div className="grid grid-cols-5 gap-1">
                {highlightColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyHighlight(color)}
                    className="h-6 w-6 rounded border border-[#333333] hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowHighlightPicker(false)}
                className="mt-2 w-full rounded bg-[#FDCE06] px-2 py-1 text-xs text-[#1F1F20] font-medium hover:bg-[#E5B800] transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1 w-px bg-[#333333]" />

        {/* Bullet List Button */}
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Bullet List"
        >
          <span className="text-[#E5E5E5]">•</span>
        </button>

        {/* Numbered List Button */}
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Numbered List"
        >
          <span className="text-[#E5E5E5]">1.</span>
        </button>

        {/* Divider */}
        <div className="mx-1 w-px bg-[#333333]" />

        {/* Align Left */}
        <button
          type="button"
          onClick={() => execCommand("justifyLeft")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Align Left"
        >
          <span className="text-[#E5E5E5] text-xs">⇤</span>
        </button>

        {/* Align Center */}
        <button
          type="button"
          onClick={() => execCommand("justifyCenter")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Align Center"
        >
          <span className="text-[#E5E5E5] text-xs">≡</span>
        </button>

        {/* Align Right */}
        <button
          type="button"
          onClick={() => execCommand("justifyRight")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Align Right"
        >
          <span className="text-[#E5E5E5] text-xs">⇥</span>
        </button>

        {/* Divider */}
        <div className="mx-1 w-px bg-[#333333]" />

        {/* Remove Formatting */}
        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#FDCE06]/20 transition-colors"
          title="Clear Formatting"
        >
          <span className="text-[#E5E5E5] text-xs">✕</span>
        </button>
      </div>

      {/* Editor Area - Dark Mode with HTML rendering */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        className="w-full rounded-b border border-[#333333] bg-[#292A2B] px-3 py-2 text-sm text-[#E5E5E5] outline-none focus:border-[#FDCE06] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_li]:ml-0 [&_h3]:text-base [&_h3]:font-bold [&_h3]:my-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:my-1 [&_br]:block [&_br]:my-1 [&_p]:my-1 [&_div]:block"
        style={{
          minHeight: `${height}px`,
          maxHeight: `${height * 2}px`,
          overflowY: "auto",
          lineHeight: "1.6",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap"
        }}
      />
    </div>
  );
};

export default SimpleRichTextEditor;
