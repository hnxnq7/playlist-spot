export function timelinePercent(elapsed, clipDuration, timelineDuration) {
  if (!(timelineDuration > 0)) return 0;
  return Math.max(0, Math.min(elapsed, clipDuration, timelineDuration)) / timelineDuration * 100;
}
