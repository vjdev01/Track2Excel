export const MAX_ACTIVITY_MS = 90 * 60 * 1000;

interface TimedActivity {
  startTime: string;
  endTime?: string;
  duration?: number;
}

export function activityDeadline(startTime: string) {
  const start = new Date(startTime);
  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  return Math.min(start.getTime() + MAX_ACTIVITY_MS, midnight.getTime());
}

export function completeTimedActivity<Activity extends TimedActivity>(activity: Activity, now: number) {
  const start = new Date(activity.startTime).getTime();
  const end = Math.max(start, Math.min(now, activityDeadline(activity.startTime)));
  return {
    ...activity,
    endTime: new Date(end).toISOString(),
    duration: Math.round((end - start) / 60000),
  };
}

export function closeExpiredActivities<Activity extends TimedActivity>(activities: Activity[], now: number): Activity[] {
  return activities.map(activity => !activity.endTime && now >= activityDeadline(activity.startTime)
    ? completeTimedActivity(activity, now)
    : activity);
}