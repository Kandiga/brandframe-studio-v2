import React from 'react';

interface WizardStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isActive: boolean;
}

const WizardStep: React.FC<WizardStepProps> = ({ title, description, children, isActive }) => {
  if (!isActive) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          {description && (
            <p className="text-base text-gray-600">{description}</p>
          )}
        </div>
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default WizardStep;
