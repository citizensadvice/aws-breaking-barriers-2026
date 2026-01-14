import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileDropZone from './FileDropZone';

describe('FileDropZone', () => {
  const mockOnFilesSelected = jest.fn();

  beforeEach(() => {
    mockOnFilesSelected.mockClear();
  });

  test('renders drop zone with correct text', () => {
    render(<FileDropZone onFilesSelected={mockOnFilesSelected} />);
    
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
    expect(screen.getByText(/click to browse/)).toBeInTheDocument();
  });

  test('calls onFilesSelected when files are dropped', () => {
    render(<FileDropZone onFilesSelected={mockOnFilesSelected} />);
    
    const dropZone = screen.getByRole('button');
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file]
      }
    });
    
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
  });

  test('shows disabled state when disabled prop is true', () => {
    render(<FileDropZone onFilesSelected={mockOnFilesSelected} disabled={true} />);
    
    const dropZone = screen.getByRole('button');
    expect(dropZone).toHaveAttribute('tabIndex', '-1');
  });

  test('limits files when maxFiles is specified', () => {
    render(<FileDropZone onFilesSelected={mockOnFilesSelected} maxFiles={2} />);
    
    const dropZone = screen.getByRole('button');
    const files = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      new File(['test3'], 'test3.pdf', { type: 'application/pdf' })
    ];
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: files
      }
    });
    
    expect(mockOnFilesSelected).toHaveBeenCalledWith([files[0], files[1]]);
  });
});