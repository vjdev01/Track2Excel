import { activityDeadline } from './activityTimer';
import { useVisibleNow } from './useVisibleNow';

export default function ActivityTimer({ startTime, formatDuration }: {
  startTime: string;
  formatDuration: (ms: number) => string;
}) {
  const now = useVisibleNow(1000);
  const elapsed = Math.max(0, Math.min(now, activityDeadline(startTime)) - new Date(startTime).getTime());
  return <span className="timer-display">{formatDuration(elapsed)}</span>;
}