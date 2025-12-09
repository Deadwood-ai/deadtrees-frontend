import { Segmented } from "antd";
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from "@geoapify/react-geocoder-autocomplete";
import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "../DeadwoodMap/geocoder.css";

interface LocationControlsProps {
  selectedSite: string;
  onSiteChange: (site: string) => void;
  onPlaceSelect: React.Dispatch<React.SetStateAction<number[]>>;
}

const LocationControls = ({ selectedSite, onSiteChange, onPlaceSelect }: LocationControlsProps) => {
  // Use null when no site selected - Segmented won't highlight any option
  const segmentedValue = selectedSite || null;

  return (
    <div className="flex w-72 flex-col gap-2 rounded-lg bg-white p-3 shadow-lg">
      {/* Address Search */}
      <div className="text-xs font-medium text-gray-500">Location</div>
      <GeoapifyContext apiKey={import.meta.env.VITE_GEOPIFY_KEY}>
        <GeoapifyGeocoderAutocomplete
          placeholder="Search location..."
          filterByCountryCode={["de"]}
          placeSelect={(place) => place?.bbox && onPlaceSelect(place.bbox)}
        />
      </GeoapifyContext>

      {/* Site Quick Select */}
      <div className="text-xs font-medium text-gray-500">Quick Access</div>
      <Segmented
        size="small"
        block
        value={segmentedValue as string}
        onChange={(value) => onSiteChange(value as string)}
        options={[
          { value: "Harz", label: "Harz" },
          { value: "Waldshut", label: "Waldshut" },
          { value: "Bayern", label: "Bavaria" },
        ]}
      />
    </div>
  );
};

export default LocationControls;
