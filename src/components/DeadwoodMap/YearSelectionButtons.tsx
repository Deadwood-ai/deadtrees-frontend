import { Radio } from "antd";

const YearSelectionButtons = ({
  year,
  setSelectedYear,
}: {
  year: string;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-md m-0 pb-2 text-gray-600">Year</p>
      <Radio.Group className="pb-2" value={year} onChange={(e) => setSelectedYear(e.target.value)}>
        <Radio.Button value="2018">2018</Radio.Button>
        <Radio.Button value="2019">2019</Radio.Button>
        <Radio.Button value="2020">2020</Radio.Button>
        <Radio.Button value="2021">2021</Radio.Button>
      </Radio.Group>
    </div>
  );
};

export default YearSelectionButtons;
