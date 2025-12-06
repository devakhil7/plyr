import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, Sparkles, Film } from "lucide-react";

interface AnalysisStatusCardProps {
  status: string;
}

const AnalysisStatusCard = ({ status }: AnalysisStatusCardProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'uploading':
        return {
          icon: Upload,
          title: 'Uploading Video',
          description: 'Preparing your video for analysis...',
          color: 'text-blue-500',
        };
      case 'analyzing':
        return {
          icon: Sparkles,
          title: 'Analyzing Video',
          description: 'AI is detecting goals in your match video...',
          color: 'text-purple-500',
        };
      case 'processing':
        return {
          icon: Film,
          title: 'Processing Highlights',
          description: 'Creating highlight clips from detected goals...',
          color: 'text-green-500',
        };
      default:
        return {
          icon: Loader2,
          title: 'Processing',
          description: 'Please wait...',
          color: 'text-primary',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full bg-background ${statusInfo.color}`}>
            <Icon className="h-6 w-6 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{statusInfo.title}</p>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="mt-6 flex items-center justify-between">
          <Step 
            number={1} 
            label="Upload" 
            active={status === 'uploading'} 
            completed={['analyzing', 'processing'].includes(status)} 
          />
          <div className="flex-1 h-0.5 bg-muted mx-2" />
          <Step 
            number={2} 
            label="Analyze" 
            active={status === 'analyzing'} 
            completed={['processing'].includes(status)} 
          />
          <div className="flex-1 h-0.5 bg-muted mx-2" />
          <Step 
            number={3} 
            label="Process" 
            active={status === 'processing'} 
            completed={false} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

interface StepProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

const Step = ({ number, label, active, completed }: StepProps) => (
  <div className="flex flex-col items-center">
    <div 
      className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${completed ? 'bg-primary text-primary-foreground' : 
          active ? 'bg-primary/20 text-primary border-2 border-primary' : 
          'bg-muted text-muted-foreground'}
      `}
    >
      {completed ? '✓' : number}
    </div>
    <span className={`text-xs mt-1 ${active || completed ? 'text-foreground' : 'text-muted-foreground'}`}>
      {label}
    </span>
  </div>
);

export default AnalysisStatusCard;
