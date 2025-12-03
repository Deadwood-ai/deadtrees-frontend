import { Slider } from "antd";

const YearSelectionButtons = ({
  year,
  setSelectedYear,
}: {
  year: string;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const years = ["2016", "2017", "2018", "2019", "2022", "2023", "2024", "2025"];

  const handleSliderChange = (value: number) => {
    setSelectedYear(years[value]);
  };

  const marks = {
    0: "2016",
    1: "2017",
    2: "2018",
    3: "2019",
    4: "2022",
    5: "2023",
    6: "2024",
    7: "2025",
  };

  return (
    <div className="flex flex-col">
      {/* <p className="text-md m-0 pb-2 text-gray-600">Year</p> */}
      <Slider
        style={{
          marginLeft: "24px",
          marginRight: "24px",
        }}
        min={0}
        max={7}
        value={years.indexOf(year)}
        onChange={handleSliderChange}
        marks={marks}
        autoFocus={true}
        included={false}
        step={1}
        tooltip={{
          formatter: (value) => years[value as number],
        }}
        // dotSize={{
        //   width: 12,
        //   height: 12,
        //   borderRadius: "50%",
        //   border: "2px solid #d9d9d9",
        //   backgroundColor: "#fff",
        // }}
        // activeDotStyle={{
        //   width: 12,
        //   height: 12,
        //   borderRadius: "50%",
        //   border: "2px solid #1677ff",
        //   backgroundColor: "#fff",
        // }}
      />
    </div>
  );
};

export default YearSelectionButtons;
