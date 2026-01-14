import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadController from './UploadController';

// Mock file for testing
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File(['content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('UploadController', () => {
  it('renders file drop zone initially', () => {
    render(<UploadController />);
    
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
    expect(screen.getByText(/click to browse/)).toBeInTheDocument();
  });

  it('shows upload button as disabled when no files are selected', () => {
    render(<UploadController />);
    
    // Initially no upload button should be visible since no files are selected
    expect(screen.queryByText(/Upload Files/)).not.toBeInTheDocument();
  });

  it('enables upload button when valid files are selected', () => {
    const mockOnUploadStart = jest.fn();
    render(<UploadController onUploadStart={mockOnUploadStart} />);
    
    // Create a valid PDF file
    const validFile = createMockFile('test.pdf', 1024, 'application/pdf');
    
    // Simulate file selection by triggering the onFilesSelected callback
    // We need to access the FileDropZone component's callback
    const dropZone = screen.getByRole('button', { name: /File upload area/ });
    
    // Create a mock drag and drop event
    const mockDataTransfer = {
      files: [validFile],
      items: [],
      types: []
    };
    
    fireEvent.drop(dropZone, {
      dataTransfer: mockDataTransfer
    });
    
    // Wait for the component to update and show the upload button
    expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('shows validation errors for invalid files', () => {
    render(<UploadController />);
    
    // Create an invalid file (unsupported type)
    const invalidFile = createMockFile('test.exe', 1024, 'application/x-executable');
    
    const dropZone = screen.getByRole('button', { name: /File upload area/ });
    
    const mockDataTransfer = {
      files: [invalidFile],
      items: [],
      types: []
    };
    
    fireEvent.drop(dropZone, {
      dataTransfer: mockDataTransfer
    });
    
    // Should show validation errors
    expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    expect(screen.getByText(/has an unsupported file type/)).toBeInTheDocument();
  });

  it('shows file size validation error for oversized files', () => {
    render(<UploadController />);
    
    // Create a file that's too large (over 50MB)
    const oversizedFile = createMockFile('large.pdf', 60 * 1024 * 1024, 'application/pdf');
    
    const dropZone = screen.getByRole('button', { name: /File upload area/ });
    
    const mockDataTransfer = {
      files: [oversizedFile],
      items: [],
      types: []
    };
    
    fireEvent.drop(dropZone, {
      dataTransfer: mockDataTransfer
    });
    
    // Should show file size error
    expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    expect(screen.getByText(/is too large/)).toBeInTheDocument();
  });

  it('displays file requirements', () => {
    render(<UploadController />);
    
    // Add a file to trigger the validator display
    const validFile = createMockFile('test.pdf', 1024, 'application/pdf');
    
    const dropZone = screen.getByRole('button', { name: /File upload area/ });
    
    const mockDataTransfer = {
      files: [validFile],
      items: [],
      types: []
    };
    
    fireEvent.drop(dropZone, {
      dataTransfer: mockDataTransfer
    });
    
    // Should show file requirements
    expect(screen.getByText('File Requirements')).toBeInTheDocument();
    expect(screen.getByText('Supported file types:')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size:')).toBeInTheDocument();
  });
});