export function canFollow(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;
  return currentUserId !== targetUserId;
}
