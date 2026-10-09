/** Stable hue (0-359) derived from a title, so every movie keeps the same generated poster. */
export function hueOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

export function posterBackground(title: string): string {
  const hue = hueOf(title);
  const hue2 = (hue + 55) % 360;
  return [
    `radial-gradient(120% 75% at 18% 0%, hsl(${hue} 72% 42% / 0.85), transparent 62%)`,
    `radial-gradient(90% 60% at 100% 100%, hsl(${hue2} 70% 30% / 0.55), transparent 70%)`,
    `linear-gradient(165deg, hsl(${hue} 46% 19%), hsl(${hue2} 52% 7%))`,
  ].join(", ");
}

/**
 * Objects in the bucket are addressed differently by MinIO (http://host:9000/<bucket>/encoded/<id>/...) and AWS
 * (https://<bucket>.s3.<region>.amazonaws.com/encoded/<id>/...). Both contain "/encoded/", which is where the
 * object key starts.
 */
export function objectKeyFromUrl(url: string): string | null {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const i = path.indexOf("/encoded/");
    return i >= 0 ? path.slice(i + 1) : null;
  } catch {
    return null;
  }
}
