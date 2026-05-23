import { type FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import './MapPicker.css';

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

/** Район ресторана — ул. Сергия Радонежского */
const DEFAULT_CENTER: [number, number] = [55.748, 37.6745];

/** Carto tiles — без политической символики в атрибуции OSM tile-серверов */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface MapPickerProps {
  onAddressSelect: (address: string) => void;
  initialAddress?: string;
  onClose: () => void;
}

const MapFix: FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const LocationMarker: FC<{
  position: L.LatLng | null;
  onPick: (latlng: L.LatLng, address: string) => void;
}> = ({ position, onPick }) => {
  const map = useMapEvents({
    click(e) {
      map.flyTo(e.latlng, map.getZoom());
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=ru`,
        { headers: { 'Accept-Language': 'ru' } },
      )
        .then((res) => res.json())
        .then((data) => {
          const line = data?.display_name ?? '';
          onPick(e.latlng, line);
        })
        .catch(() => onPick(e.latlng, ''));
    },
  });

  return position === null ? null : <Marker position={position} />;
};

const MapPicker: FC<MapPickerProps> = ({ onAddressSelect, onClose }) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [address, setAddress] = useState('');

  const handlePick = (latlng: L.LatLng, line: string) => {
    setPosition(latlng);
    setAddress(line);
  };

  const handleConfirm = () => {
    if (address) {
      onAddressSelect(address);
      onClose();
    }
  };

  return createPortal(
    <div className="map-picker-overlay" onClick={onClose}>
      <div className="map-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-picker-header">
          <h3>Выберите адрес на карте</h3>
          <button type="button" className="map-picker-close" onClick={onClose} aria-label="Закрыть">
            &times;
          </button>
        </div>

        <div className="map-picker-map map-picker-map--leaflet">
          <MapContainer center={DEFAULT_CENTER} zoom={15} className="map-picker-leaflet">
            <MapFix />
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} subdomains="abcd" maxZoom={20} />
            <LocationMarker position={position} onPick={handlePick} />
          </MapContainer>
        </div>

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
    </div>,
    document.body,
  );
};

export default MapPicker;
