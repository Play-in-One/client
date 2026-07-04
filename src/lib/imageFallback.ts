// Rate-limit image load failures by tracking broken URLs and applying one-shot guards
const failedUrls = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 60 seconds

export function handleImageError(fallbackSrc: string) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const originalSrc = img.src;

    // One-shot guard: if we already applied a fallback to this element, hide it instead of retrying
    if (img.dataset.fallbackApplied === 'true') {
      img.style.display = 'none';
      return;
    }

    // Rate-limit: check if this URL failed recently
    const lastFailTime = failedUrls.get(originalSrc);
    const now = Date.now();
    if (lastFailTime && now - lastFailTime < COOLDOWN_MS) {
      // Still in cooldown; hide instead of fetching the fallback again
      img.style.display = 'none';
      return;
    }

    // Record this failure and apply the fallback
    failedUrls.set(originalSrc, now);
    img.dataset.fallbackApplied = 'true';
    img.src = fallbackSrc;
  };
}
