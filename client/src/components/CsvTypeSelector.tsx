import React from 'react';
import './CsvTypeSelector.css';
type CsvType = 'strings' | 'classifications' | 'auto';
interface CsvTypeSelectorProps {
  isOpen: boolean;
  onSelect: (type: CsvType) => void;
  onClose: () => void;
}
export function CsvTypeSelector({ isOpen, onSelect, onClose }: CsvTypeSelectorProps) {
  if (!isOpen) return null;
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h3>Select CSV Type</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-content">
          <p>How would you like to process this CSV file?</p>
          
          <div className="option-cards">
            <div className="option-card" onClick={() => onSelect('strings')}>
              <h4>Strings CSV</h4>
              <p>For files containing strings data with columns like Tier, Industry, Topic, etc.</p>
            </div>
            
            <div className="option-card" onClick={() => onSelect('classifications')}>
              <h4>Classifications CSV</h4>
              <p>For files containing classification data with Topic, Subtopic, Industry, and Classification columns.</p>
            </div>
            
            <div className="option-card" onClick={() => onSelect('auto')}>
              <h4>Auto-detect</h4>
              <p>Let the system try to detect the CSV type based on the headers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
