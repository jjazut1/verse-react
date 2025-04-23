import React from 'react';
import renderer from 'react-test-renderer';
import { Leaf, LeafProps } from '../Leaf';

const renderLeaf = (leafProps: Partial<LeafProps>) => {
  const defaultProps: LeafProps = {
    attributes: { 'data-slate-leaf': true },
    children: 'Text',
    leaf: { text: '' }
  };
  
  return renderer.create(
    <Leaf {...defaultProps} {...leafProps} />
  ).toJSON();
};

describe('Leaf Component', () => {
  it('renders plain text correctly', () => {
    const tree = renderLeaf({ leaf: { text: 'Plain text' } });
    expect(tree).toMatchSnapshot();
  });

  it('renders bold text correctly', () => {
    const tree = renderLeaf({ leaf: { text: 'Bold text', bold: true } });
    expect(tree).toMatchSnapshot();
  });

  it('renders italic text correctly', () => {
    const tree = renderLeaf({ leaf: { text: 'Italic text', italic: true } });
    expect(tree).toMatchSnapshot();
  });

  it('renders underline text correctly', () => {
    const tree = renderLeaf({ leaf: { text: 'Underlined text', underline: true } });
    expect(tree).toMatchSnapshot();
  });

  it('renders subscript text correctly', () => {
    const tree = renderLeaf({ leaf: { text: 'Subscript text', subscript: true } });
    expect(tree).toMatchSnapshot();
  });

  it('renders superscript text correctly', () => {
    const tree = renderLeaf({ leaf: { text: 'Superscript text', superscript: true } });
    expect(tree).toMatchSnapshot();
  });

  it('renders combined marks correctly', () => {
    const tree = renderLeaf({
      leaf: { 
        text: 'Combined formatting',
        bold: true, 
        italic: true, 
        underline: true 
      }
    });
    expect(tree).toMatchSnapshot();
  });

  it('renders all formatting combinations correctly', () => {
    const tree = renderLeaf({
      leaf: { 
        text: 'All formatting',
        bold: true, 
        italic: true, 
        underline: true, 
        subscript: true, 
        superscript: true 
      }
    });
    expect(tree).toMatchSnapshot();
  });
  
  // Test to visually inspect the DOM structure
  it('has correct DOM structure for bold text', () => {
    const component = renderer.create(
      <Leaf 
        attributes={{ 'data-slate-leaf': true }} 
        children="Bold text" 
        leaf={{ text: 'Bold text', bold: true }} 
      />
    );
    const tree = component.toJSON();
    console.log('Bold text DOM structure:', JSON.stringify(tree, null, 2));
    
    // Add proper type guards
    expect(tree).not.toBeNull();
    if (tree && !Array.isArray(tree)) {
      expect(tree.type).toBe('span');
      expect(tree.children).not.toBeNull();
      if (tree.children && tree.children.length > 0) {
        const strongElement = tree.children[0] as renderer.ReactTestRendererJSON;
        expect(strongElement.type).toBe('strong');
        expect(strongElement.children).not.toBeNull();
        if (strongElement.children && strongElement.children.length > 0) {
          expect(strongElement.children[0]).toBe('Bold text');
        }
      }
    }
  });
}); 