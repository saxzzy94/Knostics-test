import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EditableTable from './EditableTable';

const getInputByValue = (value: string) => {
  return screen.getByDisplayValue(value);
};

const getRowInputs = (rowIndex: number) => {
  const rows = screen.getAllByRole('row');
  const row = rows[rowIndex + 1];
  return row ? Array.from(row.querySelectorAll('input[type="text"]')) : [];
};

describe('EditableTable', () => {
  const mockHeaders = ['Name', 'Age', 'City'];
  let mockRows = [
    ['Alice', '30', 'New York'],
    ['Bob', '25', 'Los Angeles']
  ];
  let mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockRows = [
      ['Alice', '30', 'New York'],
      ['Bob', '25', 'Los Angeles']
    ];
  });

  it('renders with title and headers', () => {
    render(
      <EditableTable 
        title="Test Table"
        headers={mockHeaders}
        rows={mockRows}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Test Table')).toBeInTheDocument();
    mockHeaders.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument();
    });
  });

  it('renders all rows and cells', () => {
    render(
      <EditableTable 
        headers={mockHeaders}
        rows={mockRows}
        onChange={mockOnChange}
      />
    );

    mockRows.flat().forEach(cellValue => {
      expect(getInputByValue(cellValue)).toBeInTheDocument();
    });
  });

  it('appends new characters to the cell value when edited', async () => {
    const user = userEvent.setup();
    const testRows = [['Test', '30', 'City']];
    
    render(
      <EditableTable 
        headers={mockHeaders}
        rows={testRows}
        onChange={mockOnChange}
      />
    );
    
    const input = getInputByValue('Test');
    await user.clear(input);
    await user.type(input, 'NewValue');
    
    const calls = mockOnChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const lastCall = calls[calls.length - 1];
    const updatedRows = lastCall[0];
    
    expect(updatedRows[0][0]).not.toBe('Test');
    expect(updatedRows[0][1]).toBe('30');
    expect(updatedRows[0][2]).toBe('City');
  });


  it('adds a new empty row when Add Row is clicked', async () => {
    const user = userEvent.setup();
    const testRows = [['First', '1', 'One']];
    
    render(
      <EditableTable 
        headers={mockHeaders}
        rows={testRows}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /add row/i });
    await user.click(addButton);
    
    const newRow = mockHeaders.map(() => '');
    expect(mockOnChange).toHaveBeenCalledWith([...testRows, newRow]);
  });

  it('highlights invalid rows', () => {
    const testRows = [
      ['First', '1', 'One'],
      ['Second', '2', 'Two']
    ];
    
    render(
      <EditableTable 
        headers={mockHeaders}
        rows={testRows}
        onChange={mockOnChange}
        invalidRowIndices={[0]}
      />
    );

    const rows = screen.getAllByRole('row').slice(1);
    
    expect(rows[0]).toHaveClass('invalid');
    expect(rows[1]).not.toHaveClass('invalid');
  });
});
