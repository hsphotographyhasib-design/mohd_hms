// Maps barrel export

// Maps context & loader
export { useMapsContext, MapsProvider } from './maps-context';
export { useMapsLoader } from './maps-loader';

// Maps types
export { type LocationData, createEmptyLocationData } from './types';

// Map components
export { default as ComplaintMapView } from './components/complaint-map-view';
export type { ComplaintMapData } from './components/complaint-map-view';

export { default as ComplaintsMapDashboard } from './components/complaints-map-dashboard';
export type { DashboardComplaint } from './components/complaints-map-dashboard';

export { default as GoogleMapWrapper } from './components/google-map';
export type { MapMarker, GoogleMapWrapperProps } from './components/google-map';

export { default as LocationPicker } from './components/location-picker';