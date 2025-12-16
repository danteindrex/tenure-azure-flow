'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface StepIndicatorProps {
  currentStep: number; // 1 = Document Upload, 2 = Liveness Check
  totalSteps?: number;
}

export function StepIndicator({ currentStep, totalSteps = 2 }: StepIndicatorProps) {
  const steps = [
    { id: 1, label: 'Document Upload', description: 'Upload ID documents' },
    { id: 2, label: 'Liveness Check', description: 'Verify identity with camera' },
  ];

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : step.id}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-5 left-full w-full h-0.5 -translate-y-1/2 transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    style={{ width: 'calc(100vw / 4)' }} // Responsive connector
                  />
                )}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <div className={`text-sm font-medium ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 mt-1 max-w-24">
                  {step.description}
                </div>
                {isCurrent && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    In Progress
                  </Badge>
                )}
                {isCompleted && (
                  <Badge variant="secondary" className="mt-2 text-xs bg-green-100 text-green-700">
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}