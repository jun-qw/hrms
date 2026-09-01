'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStepperProps {
  steps: string[];
  currentStep: number;
  selectedStep: number;
  onStepClick: (index: number) => void;
  status: string;
}

export default function WorkflowStepper({
  steps,
  currentStep,
  selectedStep,
  onStepClick,
  status,
}: WorkflowStepperProps) {
  const isCompleted = status === 'completed';

  return (
    <div className="flex items-center w-full overflow-x-auto py-4">
      {steps.map((step, index) => {
        const isStepCompleted = isCompleted ? true : index < currentStep;
        const isCurrent = !isCompleted && index === currentStep;
        const isSelected = index === selectedStep;

        return (
          <div key={index} className="flex items-center flex-1 min-w-0 last:flex-none">
            <button
              onClick={() => onStepClick(index)}
              className="flex flex-col items-center gap-1.5 min-w-0 group"
            >
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium transition-all shrink-0',
                  isStepCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground',
                  isSelected && !isStepCompleted && !isCurrent && 'border-primary/50',
                  'group-hover:scale-110'
                )}
              >
                {isStepCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-xs text-center truncate max-w-[80px]',
                  isStepCompleted
                    ? 'text-green-600 font-medium'
                    : isCurrent
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground',
                  isSelected && 'underline'
                )}
              >
                {step}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 min-w-[24px]',
                  isStepCompleted ? 'bg-green-500' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
