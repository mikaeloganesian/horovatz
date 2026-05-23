declare namespace ymaps {
  interface IMap {
    geoObjects: ICollection;
    events: IEventManager;
    destroy(): void;
  }

  interface ICollection {
    add(object: IGeoObject): ICollection;
    remove(object: IGeoObject): ICollection;
    removeAll(): ICollection;
  }

  interface IGeoObject {
    geometry: { getCoordinates(): number[] };
  }

  interface IEventManager {
    add(type: string, callback: (event: IEvent) => void): void;
  }

  interface IEvent {
    get(name: string): unknown;
  }

  interface IGeocodeResult {
    geoObjects: {
      get(index: number): IGeoObject & { getAddressLine(): string } | null;
    };
  }

  interface IGeocodePromise {
    then(
      onfulfilled?: (result: IGeocodeResult) => void,
      onrejected?: (reason: unknown) => void,
    ): IGeocodePromise;
  }

  function ready(callback: () => void): void;

  function Map(
    element: HTMLElement | string,
    state: { center: number[]; zoom: number; controls?: string[] },
    options?: Record<string, unknown>,
  ): IMap;

  function Placemark(
    coordinates: number[],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): IGeoObject;

  function geocode(query: number[] | string): IGeocodePromise;
}

interface Window {
  ymaps: typeof ymaps;
}
