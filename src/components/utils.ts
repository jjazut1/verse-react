import { Editor, Transforms, Node, Range, Path, Point, Text, Element } from 'slate';
import { ReactEditor } from 'slate-react';
import { MutableRefObject, Dispatch, SetStateAction } from 'react';

/**
 * Applies a mark to the current selection safely, using last known selection as fallback.
 * Properly handles selections that may span across multiple text nodes.
 * @param editor Slate editor instance
 * @param format Mark format string (e.g., 'bold', 'italic')
 * @param lastSelectionRef MutableRefObject holding the last valid selection
 * @param activeMarksRef MutableRefObject holding the active marks state
 * @param setActiveMarks Setter for updating active marks
 * @param setIsFocused Setter for updating focus state
 */
export function applyMarkSafely(
  editor: Editor,
  format: string,
  lastSelectionRef: MutableRefObject<any>,
  activeMarksRef: MutableRefObject<Record<string, boolean>>,
  setActiveMarks: Dispatch<SetStateAction<Record<string, boolean>>>,
  setIsFocused: Dispatch<SetStateAction<boolean>>
) {
  try {
    const DEBUG = true;
    let selection = editor.selection;

    // Try to use the lastSelectionRef if no current selection
    if (!selection && lastSelectionRef.current) {
      try {
        Transforms.select(editor, lastSelectionRef.current);
        selection = lastSelectionRef.current;
        ReactEditor.focus(editor);
        if (DEBUG) console.log('Restored selection from lastSelectionRef');
      } catch (selError) {
        console.error('Failed to restore selection from ref:', selError);
      }
    }

    if (!selection) {
      console.warn('applyMarkSafely: No valid selection. Aborting.');
      return;
    }

    // Safe to log now that we've verified selection exists
    if (DEBUG) console.log('Using selection:', JSON.stringify(selection));

    // Check if the selection is collapsed (just a cursor)
    const isCollapsed = Range.isCollapsed(selection);
    if (isCollapsed) {
      if (DEBUG) console.log('Selection is collapsed - attempting to expand');
      
      // INTENTIONAL BEHAVIOR: When user just has a cursor position and clicks a format button,
      // we automatically select the whole word they're in. This matches the behavior of most
      // rich text editors (Google Docs, Microsoft Word, etc.) and provides a more intuitive UX.
      // Without this, clicking bold with just a cursor would only apply to text typed afterward.
      try {
        const [node, path] = Editor.node(editor, selection.anchor.path);
        if (Text.isText(node) && node.text.length > 0) {
          // If in a word, select the word
          const textBeforeCursor = node.text.substring(0, selection.anchor.offset);
          const textAfterCursor = node.text.substring(selection.anchor.offset);

          // Check if we're inside a word
          const nonWordPattern = /\s/;
          const isInWord =
            (textBeforeCursor.length > 0 && !nonWordPattern.test(textBeforeCursor.charAt(textBeforeCursor.length - 1))) ||
            (textAfterCursor.length > 0 && !nonWordPattern.test(textAfterCursor.charAt(0)));

          if (isInWord) {
            // Find word boundaries
            let startOffset = selection.anchor.offset;
            let endOffset = selection.anchor.offset;

            // Look backward for word start
            while (startOffset > 0 && !nonWordPattern.test(node.text.charAt(startOffset - 1))) {
              startOffset--;
            }

            // Look forward for word end
            while (endOffset < node.text.length && !nonWordPattern.test(node.text.charAt(endOffset))) {
              endOffset++;
            }

            // Create a new selection for the word
            const newSelection = {
              anchor: { path: selection.anchor.path, offset: startOffset },
              focus: { path: selection.anchor.path, offset: endOffset }
            };

            if (DEBUG) console.log('Expanded selection to word:', JSON.stringify(newSelection));
            Transforms.select(editor, newSelection);
            selection = newSelection;
          } else if (node.text.length > 0) {
            // Not in a word, but there's text - select at least one character if possible
            let startOffset = Math.max(0, selection.anchor.offset - 1);
            let endOffset = Math.min(node.text.length, selection.anchor.offset + 1);

            // Ensure we have at least one character selected
            if (startOffset === endOffset) {
              if (startOffset > 0) startOffset--;
              else if (endOffset < node.text.length) endOffset++;
            }

            const newSelection = {
              anchor: { path: selection.anchor.path, offset: startOffset },
              focus: { path: selection.anchor.path, offset: endOffset }
            };

            if (DEBUG) console.log('Expanded selection to nearby chars:', JSON.stringify(newSelection));
            Transforms.select(editor, newSelection);
            selection = newSelection;
          }
        }
      } catch (expandErr) {
        console.error('Failed to expand collapsed selection:', expandErr);
      }
    }

    // Save selection details
    const isForward = Range.isForward(selection);
    const range = { ...selection };
    const selectionStart = Range.start(selection);
    const selectionEnd = Range.end(selection);
    const startPath = [...selectionStart.path];
    const startOffset = selectionStart.offset;
    const endPath = [...selectionEnd.path];
    const endOffset = selectionEnd.offset;

    // Find the parent paragraph (or block element)
    const blockPath = Path.parent(startPath);

    // Check the format status of the current selection
    let isActive = false;
    try {
      // We'll use an array to gather all nodes in the selection
      const nodesInSelection: [Node, Path][] = [];

      // Get all text nodes within the selection range
      for (const [node, path] of Editor.nodes(editor, {
        at: selection,
        match: Text.isText,
      })) {
        nodesInSelection.push([node, path]);

        // Check if this node has the format
        if ((node as Record<string, any>)[format]) {
          isActive = true;
          break; // If any node has format, we'll consider it active
        }
      }

      if (DEBUG) console.log(`Format ${format} isActive:`, isActive);
    } catch (err) {
      console.error('Error checking format status:', err);
    }

    try {
      // Apply the formatting change
      if (isActive) {
        Editor.removeMark(editor, format);
        if (DEBUG) console.log(`Removed ${format} mark`);
      } else {
        Editor.addMark(editor, format, true);
        if (DEBUG) console.log(`Added ${format} mark`);
      }

      // Update the formatting state
      const updatedMarks = {
        ...activeMarksRef.current,
        [format]: !isActive,
      };
      activeMarksRef.current = updatedMarks;
      setActiveMarks(updatedMarks);

      // Debugging: Get the updated paragraph structure
      try {
        const paragraphNode = Node.get(editor, blockPath);
        if (!Element.isElement(paragraphNode)) {
          throw new Error('Expected paragraph to be an Element');
        }

        if (DEBUG) console.log(`Node structure after format:`, JSON.stringify(paragraphNode));

        // Count how many text nodes are in the paragraph now
        const textNodes = paragraphNode.children.filter((n: any) => Text.isText(n));
        if (DEBUG) console.log(`Paragraph now has ${textNodes.length} text nodes`);
      } catch (err) {
        console.error('Error getting paragraph structure:', err);
      }

      // Restore focus
      ReactEditor.focus(editor);
      setIsFocused(true);

      // Restore selection with special handling for split nodes
      setTimeout(() => {
        try {
          // First, figure out where our selection points are now
          // This is tricky after node splits
          let newStartPath: Path = [...blockPath, 0]; // Default fallback
          let newEndPath: Path = [...blockPath, 0];   // Default fallback
          let newStartOffset = startOffset;
          let newEndOffset = endOffset;

          // Get the paragraph after formatting
          const paragraphNode = Node.get(editor, blockPath);
          if (!Element.isElement(paragraphNode)) {
            throw new Error('Expected paragraph to be an Element');
          }

          const children = paragraphNode.children;

          if (DEBUG) console.log(`Searching for new selection in ${children.length} children nodes`);

          // We need to find where our selection points are now in the potentially
          // modified node structure
          let currentOffset = 0;
          let foundStart = false;
          let foundEnd = false;

          // Loop through child nodes to find where our selection points now live
          for (let i = 0; i < children.length; i++) {
            const child = children[i] as Text;
            if (!Text.isText(child)) continue;

            const childPath = [...blockPath, i];
            const length = child.text.length;
            const nodeEndOffset = currentOffset + length;

            // Check if this node contains our start point
            if (!foundStart && currentOffset <= startOffset && startOffset <= nodeEndOffset) {
              newStartPath = childPath;
              newStartOffset = startOffset - currentOffset;
              foundStart = true;
              if (DEBUG) console.log(`Found start point in node ${i}, offset ${newStartOffset}`);
            }

            // Check if this node contains our end point
            if (!foundEnd && currentOffset <= endOffset && endOffset <= nodeEndOffset) {
              newEndPath = childPath;
              newEndOffset = endOffset - currentOffset;
              foundEnd = true;
              if (DEBUG) console.log(`Found end point in node ${i}, offset ${newEndOffset}`);
            }

            // If we found both points, we can stop
            if (foundStart && foundEnd) break;

            // Move to next node
            currentOffset += length;
          }

          // If we couldn't find our selection points, use fallbacks
          if (!foundStart) {
            newStartPath = [...blockPath, 0];
            newStartOffset = 0;
            if (DEBUG) console.log(`Using fallback for start point`);
          }

          if (!foundEnd) {
            // If we have start but not end, put end at same position
            if (foundStart) {
              newEndPath = newStartPath;
              newEndOffset = newStartOffset;
            } else {
              const lastIndex = children.length - 1;
              newEndPath = [...blockPath, lastIndex];
              const lastNode = children[lastIndex];
              newEndOffset = Text.isText(lastNode) ? lastNode.text.length : 0;
            }
            if (DEBUG) console.log(`Using fallback for end point`);
          }

          // Now create a proper selection object
          const newRange = {
            anchor: { path: isForward ? newStartPath : newEndPath, offset: isForward ? newStartOffset : newEndOffset },
            focus: { path: isForward ? newEndPath : newStartPath, offset: isForward ? newEndOffset : newStartOffset }
          };

          // Apply the selection
          try {
            Transforms.select(editor, newRange);
            if (DEBUG) console.log(`Selection restored at:`, JSON.stringify(newRange));

            // Save this as the last selection
            lastSelectionRef.current = editor.selection;
          } catch (selectErr) {
            console.error('Error restoring selection:', selectErr);

            // Last resort fallback - just select start of paragraph
            try {
              const start = Editor.start(editor, blockPath);
              Transforms.select(editor, start);
              if (DEBUG) console.log('Used paragraph start as fallback selection');
            } catch (fallbackErr) {
              console.error('Failed to set fallback selection:', fallbackErr);
            }
          }
        } catch (err) {
          console.error('Error in selection restoration:', err);
        }
      }, 10);
    } catch (err) {
      console.error('Error applying format:', err);
    }
  } catch (error) {
    console.error('applyMarkSafely error:', error);
  }
}
