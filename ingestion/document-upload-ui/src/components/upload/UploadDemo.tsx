import React from 'react';
import UploadController from './UploadController';

/**
 * Demo component showing how to use the UploadController
 * This demonstrates the complete file validation system in action
 */
const UploadDemo: React.FC = () => {
  const handleUploadStart = (validFiles: File[]) => {
    console.log('Starting upload for files:', validFiles.map(f => f.name));
    // Here you would typically:
    // 1. Create FormData with the files
    // 2. Add metadata
    // 3. Send to your backend API
    // 4. Show progress tracking
    
    alert(`Upload started for ${validFiles.length} file(s): ${validFiles.map(f => f.name).join(', ')}`);
  };

  const handleFilesChange = (files: File[]) => {
    console.log('Files changed:', files.map(f => f.name));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Document Upload Demo</h1>
      <p>
        This demo shows the complete file validation system. Try uploading different file types
        and sizes to see the validation in action.
      </p>
      
      <UploadController
        onUploadStart={handleUploadStart}
        onFilesChange={handleFilesChange}
        maxFiles={10}
      />
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <h3>Features Demonstrated:</h3>
        <ul>
          <li>✅ File type validation (PDF, DOC, DOCX, HTML, TXT, PPTX)</li>
          <li>✅ File size validation (50MB limit)</li>
          <li>✅ Drag and drop support</li>
          <li>✅ Click to browse files</li>
          <li>✅ Multiple file selection</li>
          <li>✅ File display with icons and sizes</li>
          <li>✅ Remove individual files</li>
          <li>✅ Clear validation error messages</li>
          <li>✅ Upload button state management</li>
          <li>✅ Requirements display</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadDemo;