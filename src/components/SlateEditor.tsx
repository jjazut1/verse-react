import React, { useMemo, useCallback, useState, useEffect, useRef, memo, forwardRef, useImperativeHandle } from 'react';
import { createEditor, Descendant, Element as SlateElement, BaseEditor, Transforms, Editor, Node, Path, Range, Text } from 'slate';
import { Slate, Editable, withReact, useSlate, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { BiBold, BiItalic, BiUnderline } from 'react-icons/bi';
import { MdSuperscript, MdSubscript } from 'react-icons/md';
import isEqual from 'lodash/isEqual';
import './SlateEditor.css';
import { applyMarkSafely } from './utils';
import { Leaf } from './Leaf';

// For debugging selection issues
const DEBUG = true;

// Tooltip replacement component
interface SimpleTooltipProps {
  title: string;
  children: React.ReactNode;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({ title, children }) => (
  <div className="simple-tooltip-container">
    <div className="simple-tooltip-content">{title}</div>
    {children}
  </div>
);

// IconButton replacement component
interface SimpleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  "aria-label"?: string;
}

const SimpleIconButton = React.forwardRef<HTMLButtonElement, SimpleIconButtonProps>(({ 
  children, 
  onClick, 
  onMouseDown, 
  onMouseEnter, 
  onMouseLeave, 
  active, 
  "aria-label": ariaLabel,
  ...rest 
}, ref) => (
  <button
    ref={ref}
    className={`toolbar-btn ${active ? 'active' : ''}`}
    onClick={onClick}
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    aria-label={ariaLabel}
    type="button"
    {...rest}
  >
    {children}
  </button>
));

// Utility function to get the current leaf format state
// This is more reliable than Editor.marks() when selection is collapsed
const getCurrentLeafFormat = (editor: Editor): Record<string, any> => {
  if (!editor.selection) return {};
  
  try {
    // Safety check if editor has content
    if (editor.children.length === 0) {
      return {};
    }
    
    // First check if the path is valid before trying to get the leaf
    // This avoids errors when selection references a non-existent node
    let path = editor.selection.focus.path;
    
    // Clone path to avoid modifying original selection
    path = [...path];
    
    // Try to get the leaf node and path at this selection
    let leaf, leafPath;
    
    try {
      // Try to get the leaf at the current selection position
      [leaf, leafPath] = Editor.leaf(editor, path);
    } catch (err) {
      // If that fails, try to get a valid leaf at the top level
      try {
        if (DEBUG) console.log('Getting leaf at start of document as fallback');
        // Get the first text node in the document
        let firstPath = Editor.start(editor, []);
        [leaf, leafPath] = Editor.leaf(editor, firstPath.path);
      } catch (fallbackErr) {
        // If even that fails, return empty format
        console.error('Failed to get any valid leaf:', fallbackErr);
        return {};
      }
    }
    
    if (!leaf) return {};
    
    if (DEBUG) console.log('Current leaf node format:', leaf);
    
    // Extract the format properties from the leaf node
    const formatProps: Record<string, any> = {};
    
    // Extract all formatting properties - ignore text property
    Object.keys(leaf as object).forEach(key => {
      if (key !== 'text') {
        formatProps[key] = (leaf as Record<string, any>)[key];
      }
    });
    
    return formatProps;
  } catch (err) {
    console.error('Error getting leaf format:', err);
    return {};
  }
};

// Types
interface SlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  showToolbar?: boolean;
}

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  subscript?: boolean;
  superscript?: boolean;
};

type CustomElement = {
  type: 'paragraph';
  children: CustomText[];
};

type CustomEditor = BaseEditor & ReactEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Define a custom interface for the ref
interface SlateEditorRef extends HTMLDivElement {
  focus: () => boolean;
  undo: () => void;
  redo: () => void;
}

// Update the SlateEditor component to use forwardRef
export const SlateEditor = forwardRef<HTMLDivElement, SlateEditorProps>(({
  value: inputValue,
  onChange,
  placeholder = '',
  className = '',
  compact = false,
  showToolbar = true
}, ref) => {
  // Create editor with selection preservation
  const editor = useMemo(() => {
    const e = withHistory(withReact(createEditor()));
    const { onChange: originalOnChange } = e;

    e.onChange = () => {
      if (DEBUG) {
        console.log('Editor onChange called, selection:', e.selection);
      }
      originalOnChange();
    };
    return e;
  }, []);

  // Create a unique ID for this editor instance
  const editorId = useRef(`editor-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track initialization
  const isInitialized = useRef(false);
  const domRef = useRef<HTMLDivElement>(null);

  // NEW: Global selection tracking system
  // This ensures we don't lose selection context between multiple editors
  useEffect(() => {
    // Create a global store for active editor if it doesn't exist
    if (typeof window !== 'undefined' && !window.hasOwnProperty('_activeSlateEditor')) {
      (window as any)._activeSlateEditor = {
        id: null,
        selection: null,
        timestamp: 0
      };
    }

    // Handle focus to set this as the active editor
    const handleFocus = () => {
      const globalState = (window as any)._activeSlateEditor;
      globalState.id = editorId.current;
      globalState.timestamp = Date.now();
      if (DEBUG) console.log(`Editor ${editorId.current} is now active`);
    };

    // Attach focus handler to our editor DOM element
    const editorElement = domRef.current;
    if (editorElement) {
      editorElement.addEventListener('focus', handleFocus, true);
      
      // Check if we should be the active editor (e.g., if we were before page reload)
      if (!(window as any)._activeSlateEditor.id) {
        (window as any)._activeSlateEditor.id = editorId.current;
      }
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener('focus', handleFocus, true);
      }
    };
  }, []);

  // NEW: Selection saving logic that's editor-instance aware
  const saveSelection = useCallback(() => {
    if (editor.selection) {
      lastSelectionRef.current = editor.selection;
      
      // Also update the global state if this is the active editor
      if ((window as any)._activeSlateEditor?.id === editorId.current) {
        (window as any)._activeSlateEditor.selection = editor.selection;
        (window as any)._activeSlateEditor.timestamp = Date.now();
        if (DEBUG) console.log(`Saved selection in active editor ${editorId.current}:`, editor.selection);
      }
    }
  }, [editor]);

  // NEW: Selection restoration logic that's editor-instance aware
  const restoreSelection = useCallback(() => {
    try {
      // Only restore if we're the active editor
      if ((window as any)._activeSlateEditor?.id === editorId.current) {
        const savedSelection = lastSelectionRef.current;
        
        if (savedSelection) {
          // Check if selection paths still exist in the document
          if (Editor.hasPath(editor, savedSelection.anchor.path) && 
              Editor.hasPath(editor, savedSelection.focus.path)) {
            Transforms.select(editor, savedSelection);
            if (DEBUG) console.log(`Restored selection in editor ${editorId.current}`);
          } else if (DEBUG) {
            console.log(`Couldn't restore selection in editor ${editorId.current} - paths don't exist`);
          }
        }
      }
    } catch (err) {
      console.error('Error restoring selection:', err);
    }
  }, [editor]);

  // Track last value received from props to avoid unnecessary rerenders
  const lastPropValueRef = useRef(inputValue);

  // Initialize with proper state
  const [editorState, setEditorState] = useState<Descendant[]>(() => {
    isInitialized.current = true;
    const parsed = deserialize(inputValue);
    lastPropValueRef.current = inputValue;
    if (DEBUG) console.log('Initial editor state:', parsed);
    return parsed;
  });
  
  // Track last selection to restore it
  const lastSelectionRef = useRef<any>(null);
  
  // Create a sticky ref for active marks to maintain state between renders
  const activeMarksRef = useRef<Record<string, boolean>>({
    bold: false, 
    italic: false, 
    underline: false, 
    subscript: false, 
    superscript: false
  });
  
  // Track active marks for toolbar state
  const [activeMarks, setActiveMarks] = useState<Record<string, boolean>>(activeMarksRef.current);

  // Ensure isFocused is accessed correctly from the state
  const [isFocused, setIsFocused] = useState(false);
  
  // Track if we're currently interacting with toolbar
  const isToolbarInteractionRef = useRef(false);
  
  // Track toolbar visibility
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  // Track selection state
  const [hasSelection, setHasSelection] = useState(false);
  
  // Add this at the top of the component function before any other state
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update editor state only if the value from props changes significantly
  useEffect(() => {
    // Skip if value hasn't changed
    if (inputValue === lastPropValueRef.current) {
      return;
    }
    
    // Skip if we're focused (user is typing)
    if (isFocused) {
      if (DEBUG) console.log('Skipping value update while editor is focused');
      return;
    }
    
    lastPropValueRef.current = inputValue;
    const newState = deserialize(inputValue);
    
    // Save current selection before updating state
    const currentSelection = editor.selection;
    
    if (DEBUG) console.log('Updating editor state from props:', newState);
    
    // Critical: Update the editor's children directly to avoid full remounts
    // This is necessary because initialValue is only read on first mount
    try {
      // Replace the editor content with the new value
      editor.children = newState;
      // Notify Slate about the change
      editor.onChange();
      // Also update our state
      setEditorState(newState);
    } catch (err) {
      console.error('Error updating editor content:', err);
    }
    
    // Restore selection after state update if needed
    if (currentSelection) {
    setTimeout(() => {
        try {
          Transforms.select(editor, currentSelection);
        } catch (e) {
          console.error('Failed to restore selection after value update:', e);
        }
    }, 0);
    }
  }, [inputValue, editor, isFocused]);
  
  // Log when the component renders for debugging
  useEffect(() => {
    if (DEBUG) console.log('SlateEditor rendered, isFocused:', isFocused);
  });

  // This ensures we don't lose focus when interacting with toolbar buttons
  useEffect(() => {
    // Track if we're interacting with the toolbar
    const handleMouseDown = (e: MouseEvent) => {
      // Check if user clicked on a toolbar button or the toolbar itself
      const targetEl = e.target as HTMLElement;
      const isToolbarElement = 
        targetEl.closest('.inline-toolbar') || 
        targetEl.getAttribute('data-toolbar-button') === 'true';
      
      if (isToolbarElement) {
        // Important: Check if this toolbar belongs to the current editor
        // Find the editor container that contains this toolbar
        const editorContainer = targetEl.closest('.slate-editor-container') as HTMLElement;
        if (!editorContainer) return;
        
        // Get the editor ID from the container
        const clickedEditorId = editorContainer.getAttribute('data-editor-id');
        
        // Only process the event if it's for this editor instance
        if (clickedEditorId === editorId.current) {
          if (DEBUG) console.log(`Toolbar interaction detected for editor ${editorId.current}`);
          isToolbarInteractionRef.current = true;
          
          // Important: prevent default behavior on toolbar buttons to avoid focus loss
          e.preventDefault();
          
          // Also, save the current selection BEFORE any action is taken
          saveSelection();
        }
      }
    };
    
    // Reset toolbar interaction flag when mouse is released
    const handleMouseUp = () => {
      if (isToolbarInteractionRef.current) {
        if (DEBUG) console.log(`Toolbar interaction complete for editor ${editorId.current}`);
        
        setTimeout(() => {
          try {
            // Only focus and restore if we're the active editor
            if ((window as any)._activeSlateEditor?.id === editorId.current) {
              ReactEditor.focus(editor);
              setIsFocused(true);
              restoreSelection();
            }
          } catch (err) {
            console.error('Error maintaining focus after toolbar interaction', err);
          }
          
          isToolbarInteractionRef.current = false;
        }, 10);
      }
    };
    
    // Add global listeners to track toolbar interactions
    document.addEventListener('mousedown', handleMouseDown, true); // Use capture phase
    document.addEventListener('mouseup', handleMouseUp, true); // Use capture phase
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [editor, saveSelection, restoreSelection]);

  // Ensure we maintain active marks and proper toolbar visibility
  // This is especially important after format operations
  useEffect(() => {
    if (!editor.selection) return;
    
    // Get the current format from the leaf at cursor position
    try {
      const formatState = getCurrentLeafFormat(editor);
      
      // Update our marks tracking with the latest from the actual node
      const updatedMarks = {
        bold: !!formatState.bold,
        italic: !!formatState.italic,
        underline: !!formatState.underline,
        subscript: !!formatState.subscript,
        superscript: !!formatState.superscript,
      };
      
      // Only update if values changed
      if (!isEqual(activeMarksRef.current, updatedMarks)) {
        if (DEBUG) console.log('Updating marks from selection change:', updatedMarks);
        activeMarksRef.current = updatedMarks;
        setActiveMarks(updatedMarks);
      }
      
      // Ensure toolbar is visible when selection is present
      if (!isToolbarVisible && isFocused) {
        setIsToolbarVisible(true);
      }
    } catch (err) {
      console.error('Error in selection effect:', err);
    }
  }, [editor.selection, editor, isToolbarVisible, isFocused]);

  // Update handleChange to include onChange debugging
  const handleChange = useCallback((newValue: Descendant[]) => {
    // Update state through React's state management
    setEditorState(newValue);

    // Track the current selection for mark detection
    const currentSelection = editor.selection;
    
    if (DEBUG) console.log('handleChange - selection:', currentSelection ? Range.isCollapsed(currentSelection) : 'null');

    try {
      // Update toolbar visibility
      const hasActiveSelection = Boolean(currentSelection) || hasSelection;
      setIsToolbarVisible(hasActiveSelection);
      
      // Get formatting state from the current leaf node at cursor
      // This is more reliable than Editor.marks() when selection is collapsed
      if (currentSelection) {
        try {
          // First try to get marks from the current leaf node
          const formatState = getCurrentLeafFormat(editor);
          
          // Then try Editor.marks() as a fallback for expanded selections
          let marks = formatState;
          if (Range.isExpanded(currentSelection)) {
            try {
              const editorMarks = Editor.marks(editor) || {};
              marks = { ...formatState, ...editorMarks };
            } catch (err) {
              // Use leaf format if Editor.marks() fails
              console.error('Error getting marks:', err);
            }
          }
          
          // Create a record of boolean values for each mark type
          const updatedMarks = {
            bold: !!marks.bold,
            italic: !!marks.italic,
            underline: !!marks.underline,
            subscript: !!marks.subscript,
            superscript: !!marks.superscript,
          };
          
          // Only update if values changed
          if (!isEqual(activeMarksRef.current, updatedMarks)) {
            if (DEBUG) console.log('Updating marks from selection change:', updatedMarks);
            activeMarksRef.current = updatedMarks;
            setActiveMarks(updatedMarks);
          }
        } catch (err) {
          console.error('Error updating marks:', err);
        }
      }
      
      // Convert to HTML and update parent
    const html = serialize(newValue);
      if (DEBUG) console.log('Sending onChange to parent with HTML:', html, 'HTML length:', html.length);
      onChange(html);
    } catch (err) {
      console.error('Error in handleChange:', err);
    }
  }, [editor, hasSelection, onChange]);

  // Update handleFocus to restore selection
  const handleFocus = useCallback(() => {
    if (DEBUG) console.log(`Editor ${editorId.current} focused`);
    
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    setIsFocused(true);
    
    // Save this editor as the active one
    if (typeof window !== 'undefined') {
      (window as any)._activeSlateEditor = {
        id: editorId.current,
        selection: editor.selection,
        timestamp: Date.now()
      };
    }
    
    // Save current selection as last selection
    saveSelection();
    
    // Try to restore the selection from last time this editor was active
    restoreSelection();
  }, [editor, saveSelection, restoreSelection]);

  // Update handleBlur to prevent selection loss
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (DEBUG) console.log(`Editor ${editorId.current} blurred`);
    
    // Store the current selection on blur
    saveSelection();
    
    // Don't immediately set unfocused if we're interacting with toolbar
    if (isToolbarInteractionRef.current) {
      if (DEBUG) console.log('Ignoring blur during toolbar interaction');
      return; // Don't change focus state during toolbar interaction
    }
    
    // Use a small timeout to prevent rapid focus/blur cycles
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    
    blurTimeoutRef.current = setTimeout(() => {
      // Only change focus state if we're not in toolbar interaction
      if (!isToolbarInteractionRef.current) {
        setIsFocused(false);
      } else if (DEBUG) {
        console.log('Prevented blur state change due to toolbar interaction');
      }
      blurTimeoutRef.current = null;
    }, 50);
  }, [saveSelection]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (DEBUG) console.log('Key pressed:', event.key);
    
    // Check if modifier key is pressed
    const isMod = (event.metaKey || event.ctrlKey);
    
    // Implement standard formatting keyboard shortcuts
    if (isMod) {
      switch (event.key) {
        case 'b': {
          event.preventDefault();
          const format = 'bold';
          const isActive = activeMarks[format] || !!Editor.marks(editor)?.[format];
          
          if (isActive) {
            Editor.removeMark(editor, format);
            activeMarksRef.current.bold = false;
          } else {
            Editor.addMark(editor, format, true);
            activeMarksRef.current.bold = true;
          }
          
          setActiveMarks({...activeMarksRef.current});
          break;
        }
        case 'i': {
          event.preventDefault();
          const format = 'italic';
          const isActive = activeMarks[format] || !!Editor.marks(editor)?.[format];
          
          if (isActive) {
            Editor.removeMark(editor, format);
            activeMarksRef.current.italic = false;
          } else {
            Editor.addMark(editor, format, true);
            activeMarksRef.current.italic = true;
          }
          
          setActiveMarks({...activeMarksRef.current});
          break;
        }
        case 'u': {
          event.preventDefault();
          const format = 'underline';
          const isActive = activeMarks[format] || !!Editor.marks(editor)?.[format];
          
          if (isActive) {
            Editor.removeMark(editor, format);
            activeMarksRef.current.underline = false;
          } else {
            Editor.addMark(editor, format, true);
            activeMarksRef.current.underline = true;
          }
          
          setActiveMarks({...activeMarksRef.current});
          break;
        }
      }
    }
    
    // Force selection to be preserved during typing
    if (lastSelectionRef.current) {
      setTimeout(() => {
        if (!editor.selection && isFocused) {
          try {
            if (DEBUG) console.log('Restoring selection after keypress');
            Transforms.select(editor, lastSelectionRef.current);
          } catch (e) {
            console.error('Failed to restore selection after keypress:', e);
          }
        }
      }, 0);
    }
  }, [editor, activeMarks, isFocused]);

  // First, declare the ref at the component level
  const editorRef = useRef(editor);

  // Then update the useEffect for selection changes
  useEffect(() => {
    // Update the ref's current value on each render
    editorRef.current = editor;
    
    // Add observer for cursor position changes
    const handleSelectionChange = () => {
      if (editor.selection) {
        try {
          // Update last selection ref for restoration
          lastSelectionRef.current = editor.selection;
          
          // Update formatting marks based on current position
          const formatState = getCurrentLeafFormat(editor);
          const updatedMarks = {
            bold: !!formatState.bold,
            italic: !!formatState.italic,
            underline: !!formatState.underline,
            subscript: !!formatState.subscript,
            superscript: !!formatState.superscript,
          };
          
          if (!isEqual(activeMarksRef.current, updatedMarks)) {
            activeMarksRef.current = updatedMarks;
            setActiveMarks(updatedMarks);
          }
        } catch (err) {
          console.error('Error updating selection state:', err);
        }
      }
      console.log('Selection at capture:', JSON.stringify(editor.selection));

    };
    
    // Watch for selection changes
    const observer = new MutationObserver(() => {
      if (editorRef.current.selection) {
        handleSelectionChange();
      }
    });
    
    // Try to get the editable DOM node
    try {
      const editorEl = ReactEditor.toDOMNode(editor, editor);
      observer.observe(editorEl, { 
        subtree: true, 
        characterData: true,
        childList: true 
      });
    } catch (err) {
      console.error('Could not observe editor DOM:', err);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [editor]);

  return (
    <div 
      className={`slate-editor-container ${compact ? 'compact' : ''} ${className}`}
      ref={domRef}
      data-focused={isFocused || isToolbarInteractionRef.current}
      data-editor-id={editorId.current}
    >
      <Slate 
        editor={editor} 
        initialValue={editorState} 
        onChange={handleChange}
        onSelectionChange={(selection) => {
          if (DEBUG) console.log('Selection changed:', selection);
        }}
      >
        <div className="slate-editor-with-toolbar">
          <Editable
            className="slate-editor"
            placeholder={placeholder}
            renderLeaf={(props) => <Leaf {...props} />}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus={false}
          />
          {showToolbar && (
            <div className="inline-toolbar always-visible">
              <MarkButton format="bold" icon={<BiBold size={16} />} toolbarRef={isToolbarInteractionRef} activeMarks={activeMarks} lastSelectionRef={lastSelectionRef} activeMarksRef={activeMarksRef} setActiveMarks={setActiveMarks} setIsFocused={setIsFocused} isFocused={isFocused} />
              <MarkButton format="italic" icon={<BiItalic size={16} />} toolbarRef={isToolbarInteractionRef} activeMarks={activeMarks} lastSelectionRef={lastSelectionRef} activeMarksRef={activeMarksRef} setActiveMarks={setActiveMarks} setIsFocused={setIsFocused} isFocused={isFocused} />
              <MarkButton format="underline" icon={<BiUnderline size={16} />} toolbarRef={isToolbarInteractionRef} activeMarks={activeMarks} lastSelectionRef={lastSelectionRef} activeMarksRef={activeMarksRef} setActiveMarks={setActiveMarks} setIsFocused={setIsFocused} isFocused={isFocused} />
              <MarkButton format="subscript" icon={<MdSubscript size={16} />} toolbarRef={isToolbarInteractionRef} activeMarks={activeMarks} lastSelectionRef={lastSelectionRef} activeMarksRef={activeMarksRef} setActiveMarks={setActiveMarks} setIsFocused={setIsFocused} isFocused={isFocused} />
              <MarkButton format="superscript" icon={<MdSuperscript size={16} />} toolbarRef={isToolbarInteractionRef} activeMarks={activeMarks} lastSelectionRef={lastSelectionRef} activeMarksRef={activeMarksRef} setActiveMarks={setActiveMarks} setIsFocused={setIsFocused} isFocused={isFocused} />
            </div>
          )}
        </div>
      </Slate>
    </div>
  );
});

// Format button
const MarkButton = ({ 
  format, 
  icon, 
  toolbarRef,
  activeMarks,
  lastSelectionRef,
  activeMarksRef,
  setActiveMarks,
  setIsFocused,
  isFocused
}: { 
  format: keyof Omit<CustomText, 'text'>; 
  icon: React.ReactNode;
  toolbarRef: React.MutableRefObject<boolean>;
  activeMarks: Record<string, boolean>;
  lastSelectionRef: React.MutableRefObject<any>;
  activeMarksRef: React.MutableRefObject<Record<string, boolean>>;
  setActiveMarks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
  isFocused: boolean;
}) => {
  const editor = useSlate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Track if this button is being actively used for an operation
  const isActiveOperation = useRef(false);
  
  // Ensure isFocused is correctly referenced in the toggleFormat function
  const toggleFormat = (e: React.MouseEvent, format: string) => {
    e.preventDefault();
    e.stopPropagation();

    isActiveOperation.current = true;
    toolbarRef.current = true;

    try {
      applyMarkSafely(
        editor,
        format,
        lastSelectionRef,
        activeMarksRef,
        setActiveMarks,
        setIsFocused
      );
    } catch (err) {
      console.error('Error during format operation:', err);
    } finally {
      setTimeout(() => {
        isActiveOperation.current = false;
        toolbarRef.current = false;
      }, 100);
    }
  };
  
  // Handle when mouse enters the button
  const handleMouseEnter = () => {
    if (DEBUG) console.log(`Mouse entered ${format} button`);
    toolbarRef.current = true;
  };
  
  // Handle when mouse leaves the button
  const handleMouseLeave = () => {
    if (DEBUG) console.log(`Mouse left ${format} button`);
    
    // Only reset if not in active operation
    if (!isActiveOperation.current) {
      toolbarRef.current = false;
    }
  };
  
  // Ensure the button doesn't steal focus by preventing default on mousedown
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Save the current selection for safe restoration
    if (editor.selection) {
      lastSelectionRef.current = editor.selection;
      if (DEBUG) console.log('Saved selection in button mousedown');
    }
  };

  // Replace the MarkButton's onClick handler with a more direct onMouseDown handler
  // that applies the formatting immediately
  const applyFormatting = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default to avoid focus loss
    e.stopPropagation(); // Stop event from reaching document handlers
    
    // Apply the formatting synchronously during the mousedown event
    // This happens before the editor can lose focus
    toggleFormat(e, format);
  };

  return (
    <SimpleTooltip title={`${format.charAt(0).toUpperCase() + format.slice(1)}`}>
      <SimpleIconButton
        ref={buttonRef}
        onMouseDown={applyFormatting}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        active={activeMarks[format]}
        aria-label={format}
        data-toolbar-button="true" 
        data-button-format={format}
      >
        {icon}
      </SimpleIconButton>
    </SimpleTooltip>
  );
};

// Convert HTML to Slate nodes - Add debugging
const deserialize = (html: any): Descendant[] => {
  if (DEBUG) console.log('Deserializing HTML:', html);
  
  // Handle empty, non-string, or undefined input
  if (!html || typeof html !== 'string') {
    console.log('Received non-string value for HTML deserialization:', html);
    return [{ type: 'paragraph', children: [{ text: '' }] } as CustomElement];
  }
  
  if (html.trim() === '') {
    return [{ type: 'paragraph', children: [{ text: '' }] } as CustomElement];
  }
  
  // Handle HTML entities and tags correctly
  try {
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Add content to a wrapper paragraph if not already wrapped
    if (div.childNodes.length > 0 && 
       (div.childNodes[0].nodeType === 3 || // 3 is TEXT_NODE
        (div.childNodes[0].nodeType === 1 && // 1 is ELEMENT_NODE
         !['P', 'DIV'].includes((div.childNodes[0] as HTMLElement).tagName)))) {
      // Wrap all content in a single paragraph
      const content = div.innerHTML;
      div.innerHTML = `<p>${content}</p>`;
    }

    // Function to recursively convert DOM nodes to Slate nodes
    const convertDOMNode = (domNode: globalThis.Node): Descendant | Descendant[] | null => {
      // Handle text nodes
      if (domNode.nodeType === domNode.TEXT_NODE) {
        return { text: domNode.textContent || '' } as CustomText;
      }
      
      // Skip non-element nodes that aren't text
      if (domNode.nodeType !== domNode.ELEMENT_NODE) {
        return null;
      }
      
      const element = domNode as HTMLElement;
      
      // Process formatting elements
      if (['STRONG', 'B', 'EM', 'I', 'U', 'SUB', 'SUP'].includes(element.tagName)) {
        // Get the formatting applied by this element
        const formattingProps: Partial<CustomText> = {};
        
        if (element.tagName === 'STRONG' || element.tagName === 'B') formattingProps.bold = true;
        if (element.tagName === 'EM' || element.tagName === 'I') formattingProps.italic = true;
        if (element.tagName === 'U') formattingProps.underline = true;
        if (element.tagName === 'SUB') formattingProps.subscript = true;
        if (element.tagName === 'SUP') formattingProps.superscript = true;
        
        // Process children to get the combined formatting
        const children: Descendant[] = [];
        
        Array.from(element.childNodes).forEach(childNode => {
          const childResult = convertDOMNode(childNode);
          
          if (childResult) {
            if (Array.isArray(childResult)) {
              // For array results, apply formatting to each text node
              childResult.forEach(node => {
                if (Text.isText(node)) {
                  children.push({
                    ...node,
                    ...formattingProps
                  } as CustomText);
                } else {
                  children.push(node);
                }
              });
            } else if (Text.isText(childResult)) {
              // Apply the current formatting to this text node
              children.push({
                ...childResult,
                ...formattingProps
              } as CustomText);
            } else {
              children.push(childResult);
            }
          }
        });
        
        // If no children processed but we have text directly inside the formatting tag
        if (children.length === 0 && element.textContent) {
          return {
            text: element.textContent,
            ...formattingProps
          } as CustomText;
        }
        
        // Return the children with proper formatting
        return children.length > 0 ? children : null;
      }
      
      // Handle paragraph or div elements
      if (element.tagName === 'P' || element.tagName === 'DIV') {
        const children: CustomText[] = [];
        
        // Process each child node
        Array.from(element.childNodes).forEach(childNode => {
          const result = convertDOMNode(childNode);
          
          if (result) {
            if (Array.isArray(result)) {
              // If result is an array (from nested formatting), extend children
              result.forEach(node => {
                if (Text.isText(node)) {
                  children.push(node as CustomText);
                } else {
                  // Handle element nodes by extracting their text
                  const elementNode = node as CustomElement;
                  if (elementNode.children && elementNode.children.length > 0) {
                    children.push(...elementNode.children as CustomText[]);
                  }
                }
              });
            } else if (Text.isText(result)) {
              children.push(result as CustomText);
            } else {
              const elementNode = result as CustomElement;
              if (elementNode.children && elementNode.children.length > 0) {
                children.push(...elementNode.children as CustomText[]);
              }
            }
          }
        });
        
        // If no children processed but we have text directly inside the p/div
        if (children.length === 0 && element.textContent) {
          children.push({ text: element.textContent } as CustomText);
        }
        
        // Return a paragraph element with all children
        return {
          type: 'paragraph',
          children: children.length > 0 ? children : [{ text: '' } as CustomText]
        } as CustomElement;
      }
      
      // For any other element, just extract and process its content
      const children: Descendant[] = [];
      Array.from(element.childNodes).forEach(childNode => {
        const result = convertDOMNode(childNode);
        if (result) {
          if (Array.isArray(result)) {
            children.push(...result);
          } else {
            children.push(result);
          }
        }
      });
      
      // If we have no children but have text content, add text node
      if (children.length === 0 && element.textContent) {
        return { text: element.textContent } as CustomText;
      }
      
      // Return children array
      return children.length > 0 ? children : null;
    };
    
    // Convert all root-level DOM nodes to Slate nodes
    const result: Descendant[] = [];
    const intermediateResults: (Descendant | Descendant[] | null)[] = [];
    
    Array.from(div.childNodes).forEach(node => {
      const slateNode = convertDOMNode(node);
      if (slateNode) {
        intermediateResults.push(slateNode);
      }
    });
    
    // Process intermediate results to ensure proper structure
    intermediateResults.forEach(node => {
      if (node === null) return;
      
      if (Array.isArray(node)) {
        // For arrays of nodes, wrap text nodes in paragraphs
        const nodesForResult: Descendant[] = [];
        let currentTexts: CustomText[] = [];
        
        node.forEach(innerNode => {
          if (Text.isText(innerNode)) {
            currentTexts.push(innerNode as CustomText);
          } else if (SlateElement.isElement(innerNode)) {
            // If we have collected texts, add them as a paragraph first
            if (currentTexts.length > 0) {
              nodesForResult.push({
                type: 'paragraph',
                children: [...currentTexts]
              } as CustomElement);
              currentTexts = [];
            }
            nodesForResult.push(innerNode);
          }
        });
        
        // Add any remaining text nodes as a paragraph
        if (currentTexts.length > 0) {
          nodesForResult.push({
            type: 'paragraph',
            children: [...currentTexts]
          } as CustomElement);
        }
        
        result.push(...nodesForResult);
      } else if (SlateElement.isElement(node)) {
        result.push(node);
      } else if (Text.isText(node)) {
        // Wrap standalone text nodes in paragraphs
        result.push({
          type: 'paragraph',
          children: [node]
        } as CustomElement);
      }
    });
    
    // If no nodes were found, return an empty paragraph
    if (result.length === 0) {
      result.push({
        type: 'paragraph',
        children: [{ text: '' } as CustomText]
      } as CustomElement);
    }
    
    if (DEBUG) console.log('Deserialized Slate nodes:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('Error deserializing HTML:', err);
    // Return a fallback empty paragraph on error
    return [{ type: 'paragraph', children: [{ text: '' } as CustomText] } as CustomElement];
  }
};

// Serialize Slate nodes to HTML - Add debugging
const serialize = (nodes: Descendant[]): string => {
  if (DEBUG) console.log('Serializing nodes:', JSON.stringify(nodes));
  
  // First normalize adjacent text nodes with identical formatting
  // This consolidates split nodes that should be merged
  const normalizedNodes = nodes.map(node => {
    if (SlateElement.isElement(node)) {
      // Create a new array for normalized children
      const normalizedChildren: CustomText[] = [];
      
      // Process each child
      node.children.forEach((child, index) => {
        if (!Text.isText(child)) return; // Skip non-text nodes
        
        if (index === 0) {
          // Add the first child as-is
          normalizedChildren.push(child as CustomText);
        } else {
          // For subsequent children, check if we should merge with previous
          const prev = normalizedChildren[normalizedChildren.length - 1];
          const current = child as CustomText;
          
          // Check if the formatting is identical
          const canMerge = 
            prev.bold === current.bold &&
            prev.italic === current.italic &&
            prev.underline === current.underline &&
            prev.subscript === current.subscript &&
            prev.superscript === current.superscript;
          
          if (canMerge) {
            // Merge text content while keeping formatting
            normalizedChildren[normalizedChildren.length - 1] = {
              ...prev,
              text: prev.text + current.text
            };
          } else {
            // Different formatting, add as separate node
            normalizedChildren.push(current);
          }
        }
      });
      
      // Return normalized element
      return {
        ...node,
        children: normalizedChildren
      };
    }
    return node;
  });
  
  if (DEBUG) console.log('Normalized nodes:', JSON.stringify(normalizedNodes));
  
  // Generate HTML from normalized nodes
  let html = '';
  
  // Process each top level paragraph/node
  for (const node of normalizedNodes) {
    if (SlateElement.isElement(node)) {
      let paragraphHtml = '';
      
      // Process each child of this paragraph
      for (const child of node.children) {
        if (!Text.isText(child)) continue; // Skip non-text nodes
        
        // Get the text content, escape HTML entities to prevent injection
        let text = escapeHtml(child.text);
        
        // Apply each format in a specific priority order to avoid nesting issues
        const formats = [];
        
        // Collect formats in priority order
        if (child.bold) formats.push('bold');
        if (child.italic) formats.push('italic');
        if (child.underline) formats.push('underline');
        if (child.subscript) formats.push('subscript');
        if (child.superscript) formats.push('superscript');
        
        // Apply formats in defined order
        // This ensures consistent nesting of tags
        for (const format of formats) {
          switch (format) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'subscript':
              text = `<sub>${text}</sub>`;
              break;
            case 'superscript':
              text = `<sup>${text}</sup>`;
              break;
          }
        }
        
        paragraphHtml += text;
      }
      
      // Add paragraph content to final HTML
      html += paragraphHtml;
    }
  }
  
  if (DEBUG) console.log('Serialized HTML:', html);
  return html;
};

// Utility to escape HTML entities
const escapeHtml = (text: string): string => {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (match) => htmlEscapeMap[match] || match);
};

// Export the memoized component
export default React.memo(SlateEditor, (prevProps, nextProps) => {
  return (
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.className === nextProps.className &&
    prevProps.compact === nextProps.compact &&
    prevProps.showToolbar === nextProps.showToolbar &&
    true
  );
});