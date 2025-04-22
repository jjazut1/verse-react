import React from 'react';

// Define the CustomText type for the component
export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  subscript?: boolean;
  superscript?: boolean;
};

// Define the props for the Leaf component
export interface LeafProps {
  attributes: React.HTMLAttributes<HTMLSpanElement> & {
    'data-slate-leaf'?: true;
  };
  children: React.ReactNode;
  leaf: CustomText;
}

/**
 * Leaf component for rendering formatted text in the Slate editor
 * This component handles the visual representation of text formatting marks
 */
export const Leaf: React.FC<LeafProps> = ({ attributes, children, leaf }) => {
  // Apply each formatting mark by wrapping the children in the appropriate element
  // The order matters for nested elements
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;
  if (leaf.subscript) children = <sub>{children}</sub>;
  if (leaf.superscript) children = <sup>{children}</sup>;
  
  // Return the formatted children within a span
  return <span {...attributes}>{children}</span>;
};

export default Leaf; 