import { type FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onAddressSelect: (address: string) => void;
  initialAddress?: string;
  onClose: () => void;
}

const MapFix = () => {
  const map = useMap();
  useEffect(() => {
    // Invalidate size after a short delay to ensure the container is fully rendered and styled
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const LocationMarker: FC<{ setAddress: (address: string) => void, setPosition: (pos: L.LatLng) => void, position: L.LatLng | null }> = ({ setAddress, setPosition, position }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      
      // Reverse geocoding using OpenStreetMap Nominatim
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        })
        .catch(err => console.error('Error fetching address:', err));
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const MapPicker: FC<MapPickerProps> = ({ onAddressSelect, onClose }) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [address, setAddress] = useState<string>('');

  const handleConfirm = () => {
    if (address) {
      onAddressSelect(address);
      onClose();
    }
  };

  const mapContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden',
        width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Выберите адрес на карте</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>
        
        <div style={{ height: '400px', width: '100%', position: 'relative' }}>
          <MapContainer center={[55.7558, 37.6173]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <MapFix />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker setAddress={setAddress} setPosition={setPosition} position={position} />
          </MapContainer>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', zIndex: 1 }}>
          <p style={{ margin: '0 0 15px 0', fontWeight: 'bold' }}>
            Выбранный адрес: <span style={{ fontWeight: 'normal', color: address ? '#333' : '#999' }}>{address || 'Кликните на карту'}</span>
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Отмена</button>
            <button onClick={handleConfirm} disabled={!address} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: address ? 'var(--color-primary)' : '#ccc', color: '#fff', cursor: address ? 'pointer' : 'not-allowed' }}>Подтвердить</button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(mapContent, document.body);
};

export default MapPicker;
