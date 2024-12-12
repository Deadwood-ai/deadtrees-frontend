import { Slider } from "antd";
import YearSelectionButtons from "./YearSelectionButtons";

// const DeadwoodCard = (year: string, sliderValue: number) => {
const DeadwoodCard = ({
  year,
  sliderValue,
  setSliderValue,
  setSelectedYear,
}: {
  year: string;
  sliderValue: number;
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <div>
      <div className="flex w-80 flex-col justify-center rounded-md bg-white px-3 py-1">
        <p className="m-0 py-2 text-lg text-gray-800"> Deadwood for {year}</p>
        <div className="mb-2 flex w-full items-end ">
          <p className="m-0 w-full text-xs text-gray-600">Satellite-based prediction</p>
          <div className="w-2/3">
            <p className="m-0 w-full text-xs text-gray-600">opacity</p>
            <Slider
              className="m-0 w-full"
              defaultValue={1}
              step={0.01}
              max={1}
              value={sliderValue}
              onChange={(value) => setSliderValue(value as number)}
              min={0}
            />
          </div>
        </div>
        <div className="mb-4 flex items-center space-x-2">
          <p className="m-0 text-xs text-gray-800">Method prototype by:</p>
          <a
            className="m-0 italic underline"
            href="https://www.sciencedirect.com/science/article/pii/S2667393223000054?via%3Dihub"
          >
            Schiefer et al., 2023
          </a>
        </div>
        <YearSelectionButtons year={year} setSelectedYear={setSelectedYear} />
      </div>
    </div>
  );
};

export default DeadwoodCard;
