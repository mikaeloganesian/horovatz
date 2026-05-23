const SCRIPT_ID = 'yandex-maps-api';

let loadPromise: Promise<typeof ymaps> | null = null;

export function loadYandexMaps(): Promise<typeof ymaps> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const ready = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };

    if (window.ymaps) {
      ready();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', ready, { once: true });
      existing.addEventListener('error', () => reject(new Error('Yandex Maps script failed')), { once: true });
      return;
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim() ?? '';
    const params = new URLSearchParams({ lang: 'ru_RU' });
    if (apiKey) {
      params.set('apikey', apiKey);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.onload = ready;
    script.onerror = () => reject(new Error('Yandex Maps script failed'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function reverseGeocode(coords: number[]): Promise<string> {
  const ymaps = await loadYandexMaps();
  const result = await new Promise<ymaps.IGeocodeResult>((resolve, reject) => {
    ymaps.geocode(coords).then(resolve, reject);
  });
  const geoObject = result.geoObjects.get(0);
  return geoObject?.getAddressLine() ?? '';
}
