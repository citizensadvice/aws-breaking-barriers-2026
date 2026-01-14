import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileDisplay from './FileDisplay';

describe('FileDisplay', () => {
  const mockOnRemoveFile = jest.fn();

  beforeEach(() => {
    mockOnRemoveFile.mockClear();
  });

  test('renders nothing when no files are provided', () => {
    const { container } = render(<FileDisplay files={[]} onRemoveFile={mockOnRemoveFile} />);
    expect(container.firstChild).toBeNull();
  });

  test('displays files with names and sizes', () => {
    const files = [
      new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
      new File(['test content 2'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    ];

    render(<FileDisplay files={files} onRemoveFile={mockOnRemoveFile} />);
    
    expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('document.docx')).toBeInTheDocument();
    expect(screen.getByText(/Total size:/)).toBeInTheDocument();
  });

  test('calls onRemoveFile when remove button is clicked', () => {
    const files = [
      new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    ];

    render(<FileDisplay files={files} onRemoveFile={mockOnRemoveFile} />);
    
    const removeButton = screen.getByRole('button', { name: /remove test.pdf/i });
    fireEvent.click(removeButton);
    
    expect(mockOnRemoveFile).toHaveBeenCalledWith(0);
  });

  test('displays correct file icons for different file types', () => {
    const files = [
      new File(['pdf content'], 'test.pdf', { type: 'application/pdf' }),
      new File(['doc content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      new File(['text content'], 'test.txt', { type: 'text/plain' })
    ];

    render(<FileDisplay files={files} onRemoveFile={mockOnRemoveFile} />);
    
    // Check that file icons are rendered (they should have the file-icon class)
    const fileIcons = document.querySelectorAll('.file-icon');
    expect(fileIcons).toHaveLength(3);
  });

  test('formats file sizes correctly', () => {
    const largeFile = new File([new ArrayBuffer(1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    
    render(<FileDisplay files={[largeFile]} onRemoveFile={mockOnRemoveFile} />);
    
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });
});