// @ts-nocheck
import React, { useRef, useEffect } from "react";

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  height = 150,
  placeholder = "Enter text...",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML || "");
  };

  const btnClass = "px-2 py-1 text-xs bg-[#292A2B] border border-[#444] text-[#E5E5E5] rounded hover:bg-[#333] transition-colors";

  return (
    <div className="border border-[#333333] rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-[#1F1F20] border-b border-[#333333]">
        <button type="button" onClick={() => exec("bold")} className={btnClass}><b>B</b></button>
        <button type="button" onClick={() => exec("italic")} className={btnClass}><i>I</i></button>
        <button type="button" onClick={() => exec("underline")} className={btnClass}><u>U</u></button>
        <button type="button" onClick={() => exec("formatBlock", "h3")} className={btnClass}>H</button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={btnClass}>1.</button>
        <button type="button" onClick={() => exec("insertUnorderedList")} className={btnClass}>•</button>
        <button type="button" onClick={() => exec("justifyLeft")} className={btnClass}>←</button>
        <button type="button" onClick={() => exec("justifyCenter")} className={btnClass}>↔</button>
        <button type="button" onClick={() => exec("justifyRight")} className={btnClass}>→</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{ minHeight: `${height}px`, maxHeight: `${height * 2}px`, overflowY: "auto" }}
        className="p-3 bg-[#292A2B] text-[#E5E5E5] text-sm font-[Inter] outline-none"
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default SimpleRichTextEditor;
