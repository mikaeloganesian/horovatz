import { lazy, Suspense } from 'react';
import type { MapPickerProps } from './index';
import './MapPicker.css';

const MapPicker = lazy(() => import('./index'));

export default function LazyMapPicker(props: MapPickerProps) {
  return (
    <Suspense fallback={
      <div className="map-picker-overlay">
        <div className="map-picker-modal">
          <div className="map-picker-header">
            <h3 role="status">Загрузка карты…</h3>
            <button type="button" className="map-picker-close" onClick={props.onClose} aria-label="Закрыть">&times;</button>
          </div>
        </div>
      </div>
    }>
      <MapPicker {...props} />
    </Suspense>
  );
}
