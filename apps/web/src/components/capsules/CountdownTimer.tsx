"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetTime: number;
  currentTime: number;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  targetTime,
  currentTime,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const remaining = Math.max(0, targetTime - currentTime);

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    setTimeRemaining({ days, hours, minutes, seconds });
  }, [targetTime, currentTime]);

  if (targetTime <= currentTime) {
    return <div className="text-green-600 font-medium"></div>;
  }

  const formatTimeUnit = (value: number, unit: string) => {
    if (value === 0) return null;
    return `${value}${unit}`;
  };

  const timeUnits = [
    formatTimeUnit(timeRemaining.days, "d"),
    formatTimeUnit(timeRemaining.hours, "h"),
    formatTimeUnit(timeRemaining.minutes, "m"),
    formatTimeUnit(timeRemaining.seconds, "s"),
  ].filter(Boolean);

  // Show only the two most significant units
  const displayUnits = timeUnits.slice(0, 2);

  return (
    <div className="space-y-1">
      <div className="text-orange-600 font-medium">
        ⏳ {displayUnits.join(" ") || "0s"}
      </div>
      <div className="text-xs text-gray-500">until unlock</div>
    </div>
  );
}
