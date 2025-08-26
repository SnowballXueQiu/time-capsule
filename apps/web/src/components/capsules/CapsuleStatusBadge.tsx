interface CapsuleStatusBadgeProps {
  unlocked: boolean;
  canUnlock: boolean;
}

export function CapsuleStatusBadge({
  unlocked,
  canUnlock,
}: CapsuleStatusBadgeProps) {
  if (unlocked) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
        <span className="mr-1">🔓</span>
        Unlocked
      </span>
    );
  }

  if (canUnlock) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
      <span className="mr-1">🔒</span>
      Locked
    </span>
  );
}
