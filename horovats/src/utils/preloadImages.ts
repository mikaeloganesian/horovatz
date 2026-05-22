function preloadOne(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Preloads images; broken URLs and slow loads do not block forever. */
export async function preloadImages(urls: string[], maxWaitMs = 20000): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return;

  await Promise.race([Promise.all(unique.map(preloadOne)), delay(maxWaitMs)]);
}
