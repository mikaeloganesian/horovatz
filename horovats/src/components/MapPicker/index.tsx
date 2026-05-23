import { type FC, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { loadYandexMaps, reverseGeocode } from '../../utils/loadYandexMaps';
import './MapPicker.css';

/** Район ресторана — ул. Сергия Радонежского */
const DEFAULT_CENTER: [number, number] = [55.748, 37.6745];

interface MapPickerProps {
  onAddressSelect: (address: string) => void;
  initialAddress?: string;
  onClose: () => void;
}

const MapPicker: FC<MapPickerProps> = ({ onAddressSelect, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ymaps.IMap | null>(null);
  const placemarkRef = useRef<ymaps.IGeoObject | null>(null);

  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setPlacemark = (ymapsApi: typeof ymaps, coords: number[]) => {
      const map = mapRef.current;
      if (!map) return;

      if (placemarkRef.current) {
        map.geoObjects.remove(placemarkRef.current);
      }

      const placemark = ymapsApi.Placemark(coords, {}, { preset: 'islands#redDotIcon' });
      map.geoObjects.add(placemark);
      placemarkRef.current = placemark;
    };

    loadYandexMaps()
      .then((ymapsApi) => {
        if (cancelled || !mapContainerRef.current) return;

        const map = ymapsApi.Map(
          mapContainerRef.current,
          {
            center: DEFAULT_CENTER,
            zoom: 15,
            controls: ['zoomControl', 'geolocationControl'],
          },
          { suppressMapOpenBlock: true },
        );

        mapRef.current = map;

        map.events.add('click', (event) => {
          const coords = event.get('coords') as number[];
          setPlacemark(ymapsApi, coords);
          void reverseGeocode(coords)
            .then((line) => setAddress(line))
            .catch(() => setAddress(''));
        });

        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить Яндекс.Карты. Проверьте ключ API (VITE_YANDEX_MAPS_API_KEY).');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      placemarkRef.current = null;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  const handleConfirm = () => {
    if (address) {
      onAddressSelect(address);
      onClose();
    }
  };

  const mapContent = (
    <div className="map-picker-overlay" onClick={onClose}>
      <div className="map-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-picker-header">
          <h3>Выберите адрес на карте</h3>
          <button type="button" className="map-picker-close" onClick={onClose} aria-label="Закрыть">
            &times;
          </button>
        </div>

        {error ? (
          <div className="map-picker-map map-picker-map--error">{error}</div>
        ) : (
          <div ref={mapContainerRef} className="map-picker-map" aria-busy={loading} />
        )}

        <div className="map-picker-footer">
          <p className="map-picker-address">
            Выбранный адрес:{' '}
            <span className={address ? '' : 'is-empty'}>{address || 'Нажмите на карту'}</span>
          </p>
          <div className="map-picker-actions">
            <button type="button" className="map-picker-btn map-picker-btn--cancel" onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className="map-picker-btn map-picker-btn--confirm"
              onClick={handleConfirm}
              disabled={!address}
            >
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(mapContent, document.body);
};

export default MapPicker;
