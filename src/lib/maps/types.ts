export interface LocationData {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  fullAddress: string | null
  googlePlaceId: string | null
  building: string
  floor: string
  unit: string
  address: string
  district: string
  postalCode: string
}

export function createEmptyLocationData(): LocationData {
  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    fullAddress: null,
    googlePlaceId: null,
    building: '',
    floor: '',
    unit: '',
    address: '',
    district: '',
    postalCode: '',
  }
}