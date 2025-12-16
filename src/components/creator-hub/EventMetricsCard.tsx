import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Crosshair, ArrowRightLeft } from "lucide-react";

interface EventMetricsCardProps {
  goalsCount: number;
  shotsCount: number;
  passesCount: number;
  isLoading?: boolean;
}

const EventMetricsCard = ({ 
  goalsCount, 
  shotsCount, 
  passesCount,
  isLoading 
}: EventMetricsCardProps) => {
  const metrics = [
    {
      label: "Goals",
      count: goalsCount,
      icon: Target,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      label: "Shots",
      count: shotsCount,
      icon: Crosshair,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      label: "Passes",
      count: passesCount,
      icon: ArrowRightLeft,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    }
  ];

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          AI Event Detection Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div 
              key={metric.label}
              className={`${metric.bgColor} rounded-lg p-4 text-center transition-all hover:scale-105`}
            >
              <metric.icon className={`h-6 w-6 ${metric.color} mx-auto mb-2`} />
              <div className={`text-3xl font-bold ${metric.color}`}>
                {isLoading ? "—" : metric.count}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
        
        {!isLoading && (goalsCount > 0 || shotsCount > 0 || passesCount > 0) && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Events detected using AI video analysis on extracted frames
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EventMetricsCard;