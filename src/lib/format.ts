export function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function formatCompactPKR(amount: number): string {
  if (amount >= 1_000_000) return `Rs. ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rs. ${(amount / 1_000).toFixed(1)}K`;
  return formatPKR(amount);
}

/** Axis-tick friendly compact number, no currency prefix (avoids clipping in narrow chart gutters). */
export function formatCompactNumber(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
