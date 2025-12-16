type TimerRingProps = {
  seconds: number;
  totalSeconds: number;
  urgent?: boolean;
};

export default function TimerRing({ seconds, totalSeconds, urgent = false }: TimerRingProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? (seconds / totalSeconds) : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="timerWrapper">
      <div className="timerRing">
        <svg viewBox="0 0 90 90">
          <circle className="timerBg" cx="45" cy="45" r={radius} />
          <circle
            className={`timerProgress ${urgent ? 'urgent' : ''}`}
            cx="45"
            cy="45"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={`timerValue ${urgent ? 'urgent' : ''}`}>
          {seconds}
        </div>
      </div>
    </div>
  );
}
