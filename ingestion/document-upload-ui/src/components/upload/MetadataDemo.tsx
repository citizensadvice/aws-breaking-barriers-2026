import React, { useState } from 'react';
import MetadataManager from './MetadataManager';
import { DocumentMetadata } from '../../types/metadata';

const MetadataDemo: React.FC = () => {
  const [files] = useState<File[]>([
    new File(['content1'], 'document1.pdf', { type: 'application/pdf' }),
    new File(['content2'], 'document2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    new File(['content3'], 'document3.txt', { type: 'text/plain' })
  ]);

  const [metadata, setMetadata] = useState<DocumentMetadata | DocumentMetadata[]>();
  const [isValid, setIsValid] = useState(false);

  const handleMetadataChange = (newMetadata: DocumentMetadata | DocumentMetadata[]) => {
    setMetadata(newMetadata);
    console.log('Metadata changed:', newMetadata);
  };

  const handleValidationChange = (valid: boolean) => {
    setIsValid(valid);
    console.log('Validation changed:', valid);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Metadata Form Demo</h2>
      <p>This demo shows the metadata form with {files.length} sample files.</p>
      
      <MetadataManager
        files={files}
        onMetadataChange={handleMetadataChange}
        onValidationChange={handleValidationChange}
      />
      
      <div style={{ marginTop: '20px', padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
        <h3>Current State:</h3>
        <p><strong>Valid:</strong> {isValid ? 'Yes' : 'No'}</p>
        <p><strong>Metadata:</strong></p>
        <pre style={{ background: '#ffffff', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default MetadataDemo;