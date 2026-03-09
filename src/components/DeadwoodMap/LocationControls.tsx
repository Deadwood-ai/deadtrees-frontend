import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from "@geoapify/react-geocoder-autocomplete";
import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "../DeadwoodMap/geocoder.css";

interface LocationControlsProps {
  onPlaceSelect: React.Dispatch<React.SetStateAction<number[]>>;
}

const LocationControls = ({ onPlaceSelect }: LocationControlsProps) => {
  return (
    <div className="flex min-w-72 flex-col gap-2 rounded-2xl border border-gray-200/60 bg-white/95 p-4 shadow-xl backdrop-blur-sm pointer-events-auto">
      {/* Address Search */}
      <div className="text-xs font-medium text-gray-500">Location</div>
      <GeoapifyContext apiKey={import.meta.env.VITE_GEOPIFY_KEY}>
        <GeoapifyGeocoderAutocomplete
          placeholder="Search location..."
          placeSelect={(place) => place?.bbox && onPlaceSelect(place.bbox)}
        />
      </GeoapifyContext>
    </div>
  );
};

export default LocationControls;
