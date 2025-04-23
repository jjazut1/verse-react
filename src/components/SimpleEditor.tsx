import React, { useRef, useState, useEffect } from 'react';
import './SimpleEditor.css';

interface SimpleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  showToolbar?: boolean;
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  compact = false,
  showToolbar = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Range | null>(null);

  // Update the editor content when the value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle format actions
  const handleFormat = (command: string) => {
    // Save current selection
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.rangeCount === 0) return;
    
    // Store the selection
    const range = currentSelection.getRangeAt(0);
    setSelection(range.cloneRange());
    
    // Apply format command
    document.execCommand(command, false);
    
    // Focus back to the editor after applying format
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };
  
  // Handle input changes
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={`simple-editor-container ${compact ? 'compact' : ''} ${className}`}>
      {showToolbar && (
        <div className="editor-toolbar">
          <button type="button" onClick={() => handleFormat('bold')} className="toolbar-btn">B</button>
          <button type="button" onClick={() => handleFormat('italic')} className="toolbar-btn">I</button>
          <button type="button" onClick={() => handleFormat('underline')} className="toolbar-btn">U</button>
          <button type="button" onClick={() => handleFormat('strikeThrough')} className="toolbar-btn">S</button>
          <button type="button" onClick={() => handleFormat('subscript')} className="toolbar-btn">Sub</button>
          <button type="button" onClick={() => handleFormat('superscript')} className="toolbar-btn">Sup</button>
        </div>
      )}
      <div 
        ref={editorRef}
        className={`simple-editor ${!value ? 'empty' : ''}`}
        contentEditable="true"
        onInput={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default SimpleEditor; 