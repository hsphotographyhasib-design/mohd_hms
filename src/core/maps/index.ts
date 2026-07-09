// Maps barrel export

// Maps context & loader
export { useMapsContext, MapsProvider } from './maps/maps-context';
export { useMapsLoader } from './maps/maps-loader';

// Maps types
export { type LocationData, createEmptyLocationData } from './maps/types';

// Map components
export { default as ComplaintMapView } from './maps/components/complaint-map-view';
export type { ComplaintMapData } from './maps/components/complaint-map-view';

export { default as ComplaintsMapDashboard } from './maps/components/complaints-map-dashboard';
export type { DashboardComplaint } from './maps/components/complaints-map-dashboard';

export { default as GoogleMapWrapper } from './maps/components/google-map';
export type { MapMarker, GoogleMapWrapperProps } from './maps/components/google-map';

export { default as LocationPicker } from './maps/components/location-picker';