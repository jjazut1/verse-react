import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import SortCategoriesEggConfig from '../SortCategoriesEggConfig';
import { AuthContext } from '../../../contexts/AuthContext';
import { MAX_ITEMS_PER_CATEGORY, MIN_ITEMS_PER_CATEGORY, MAX_CATEGORIES, MIN_CATEGORIES } from '../../../constants/game';
import '@testing-library/jest-dom';

// Create mock toast function
const mockToast = vi.fn();

// Mock Chakra UI hooks and components
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => mockToast,
    NumberInput: ({ value, onChange, children, min, max }: { value: number; onChange: (value: number) => void; children?: React.ReactNode; min?: number; max?: number }) => (
      <div data-testid="number-input">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          data-testid="number-input-field"
        />
        {children}
      </div>
    ),
    NumberInputField: () => null,
    NumberInputStepper: () => null,
    NumberIncrementStepper: () => null,
    NumberDecrementStepper: () => null,
    IconButton: ({ 'aria-label': ariaLabel, onClick, icon }: any) => (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid={`icon-button-${ariaLabel.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {icon}
      </button>
    ),
    VStack: ({ children }: any) => <div data-testid="vstack">{children}</div>,
    Box: ({ children }: any) => <div data-testid="box">{children}</div>,
    FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
    FormLabel: ({ children }: any) => <div data-testid="form-label">{children}</div>,
    FormHelperText: ({ children }: any) => <div data-testid="form-helper-text">{children}</div>,
    Input: ({ value, onChange, placeholder }: any) => (
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-testid="chakra-input"
      />
    ),
    Button: ({ children, onClick }: any) => (
      <button onClick={onClick} data-testid="chakra-button">
        {children}
      </button>
    ),
    Heading: ({ children }: any) => <h2 data-testid="heading">{children}</h2>,
    Divider: () => <hr data-testid="divider" />,
    HStack: ({ children }: any) => <div data-testid="hstack">{children}</div>,
    Flex: ({ children }: any) => <div data-testid="flex">{children}</div>,
    Text: ({ children }: any) => <span data-testid="text">{children}</span>,
    Switch: ({ isChecked, onChange }: any) => (
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        data-testid="chakra-switch"
      />
    ),
    Select: ({ children, value, onChange }: any) => (
      <select
        value={value}
        onChange={onChange}
        data-testid="chakra-select"
      >
        {children}
      </select>
    )
  };
});

// Mock useOutletContext
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({ onError: vi.fn() }),
    useParams: () => ({}),
    useNavigate: () => vi.fn()
  };
});

// Mock Firebase config
vi.mock('../../../config/firebase', () => ({
  db: {},
  auth: {}
}));

// Mock Firebase functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  serverTimestamp: vi.fn(),
  getFirestore: vi.fn()
}));

// Mock SlateEditor component
vi.mock('../../../components/SlateEditor', () => ({
  default: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
    <div data-testid="slate-editor" className="slate-editor">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid="slate-editor-input"
      />
    </div>
  )
}));

// Mock AuthContext value
const mockAuthContextValue = {
  currentUser: {
    uid: 'test-uid',
    email: 'test@example.com'
  },
  login: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  signup: vi.fn()
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider>
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContextValue}>
        {children}
      </AuthContext.Provider>
    </BrowserRouter>
  </ChakraProvider>
);

describe('SortCategoriesEggConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  describe('Item Management', () => {
    test('should add new item to a category when Add Item button is clicked', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Find the first Add Item button
      const addItemButton = screen.getByText('Add Item');
      
      // Get initial items count
      const initialItems = screen.getAllByTestId('slate-editor').length;
      
      // Click Add Item
      fireEvent.click(addItemButton);
      
      // Verify new item input was added
      await waitFor(() => {
        const newItems = screen.getAllByTestId('slate-editor').length;
        expect(newItems).toBe(initialItems + 1);
      });
    });

    test('should delete specific item when Delete button is clicked', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Add some test items
      const addItemButton = screen.getByText('Add Item');
      fireEvent.click(addItemButton);
      fireEvent.click(addItemButton);

      // Get all delete buttons
      const deleteButtons = screen.getAllByTestId(/icon-button-delete-item-#\d+/);
      
      // Get initial items
      const initialItems = screen.getAllByTestId('slate-editor');
      
      // Set values for items
      fireEvent.change(initialItems[0], { target: { value: 'First' } });
      fireEvent.change(initialItems[1], { target: { value: 'Second' } });
      fireEvent.change(initialItems[2], { target: { value: 'Third' } });
      
      // Click delete on second item
      fireEvent.click(deleteButtons[1]);
      
      // Verify specific item was deleted
      await waitFor(() => {
        const remainingItems = screen.getAllByTestId('slate-editor');
        const remainingValues = remainingItems.map(item => (item as HTMLInputElement).value);
        expect(remainingValues).toEqual(['First', 'Third']);
        expect(remainingItems.length).toBe(initialItems.length - 1);
      });
    });

    test('should move item up when Move Up button is clicked', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Add test items and set their values
      const addItemButton = screen.getByText('Add Item');
      fireEvent.click(addItemButton);
      
      const items = screen.getAllByTestId('slate-editor-input');
      
      // Set initial values
      fireEvent.change(items[0], { target: { value: 'First' } });
      fireEvent.change(items[1], { target: { value: 'Second' } });

      // Click move up on second item
      const moveUpButtons = screen.getAllByTestId('icon-button-move-item-up');
      fireEvent.click(moveUpButtons[1]);

      // Verify order changed
      await waitFor(() => {
        const updatedItems = screen.getAllByTestId('slate-editor-input');
        expect(updatedItems[0]).toHaveValue('Second');
        expect(updatedItems[1]).toHaveValue('First');
      });
    });

    test('should move item down when Move Down button is clicked', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Add test items and set their values
      const addItemButton = screen.getByText('Add Item');
      fireEvent.click(addItemButton);
      
      const items = screen.getAllByTestId('slate-editor');
      fireEvent.change(items[0], { target: { value: 'First' } });
      fireEvent.change(items[1], { target: { value: 'Second' } });

      // Click move down on first item
      const moveDownButtons = screen.getAllByTestId('icon-button-move-item-down');
      fireEvent.click(moveDownButtons[0]);

      // Verify order changed
      await waitFor(() => {
        const updatedItems = screen.getAllByTestId('slate-editor');
        expect((updatedItems[0] as HTMLInputElement).value).toBe('Second');
        expect((updatedItems[1] as HTMLInputElement).value).toBe('First');
      });
    });

    test('should handle invalid index gracefully when deleting items', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Add some items
      const addItemButton = screen.getByText('Add Item');
      fireEvent.click(addItemButton);
      fireEvent.click(addItemButton);

      // Get initial items count
      const initialItems = screen.getAllByTestId('slate-editor').length;

      // Try to delete item with invalid index (simulate invalid state)
      const deleteButtons = screen.getAllByTestId(/icon-button-delete-item-#\d+/);
      fireEvent.click(deleteButtons[deleteButtons.length - 1]); // Last item
      fireEvent.click(deleteButtons[deleteButtons.length - 1]); // Try to delete same index again

      // Verify no errors occurred and items state is still valid
      await waitFor(() => {
        const remainingItems = screen.getAllByTestId('slate-editor');
        expect(remainingItems.length).toBe(Math.max(1, initialItems - 1)); // Should never be less than 1
      });
    });

    test('should maintain at least one item in category', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Try to delete the only item
      const deleteButton = screen.getByTestId('icon-button-delete-item-#1');
      fireEvent.click(deleteButton);

      // Verify at least one item input remains
      await waitFor(() => {
        const items = screen.getAllByTestId('slate-editor');
        expect(items.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('should enforce maximum items limit', async () => {
      render(<SortCategoriesEggConfig />, { wrapper: TestWrapper });

      // Add maximum number of items
      const addItemButton = screen.getByText('Add Item');
      for (let i = 0; i < MAX_ITEMS_PER_CATEGORY + 1; i++) {
        fireEvent.click(addItemButton);
      }

      // Verify warning toast was called
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Maximum items reached',
          description: `You can only add up to ${MAX_ITEMS_PER_CATEGORY} items per category.`,
          status: 'warning',
          duration: 3000,
          isClosable: true,
        }));
      });
    });
  });
}); 