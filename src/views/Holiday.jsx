import React from "react";
import { format } from "date-fns";
import Menu from "./Menu";

const holidays = [
  {
    date: "2026-01-26",
    title: "Holi",
  },
  {
    date: "2026-08-15",
    title: "Independence Day",
  },
  {
    date: "2026-10-02",
    title: "Gandhi Jayanti",
  },
  {
    date: "2026-01-26",
    title: "Holi",
  },
  {
    date: "2026-08-15",
    title: "Independence Day",
  },
  {
    date: "2026-10-02",
    title: "Gandhi Jayanti",
  },
];

const HolidayList = () => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md text-sm max-w-md mx-auto">
      {holidays.map((holiday, index) => {
        const dateObj = new Date(holiday.date);
        return (
          <div
            key={index}
            className="border-b last:border-none border-gray-200 py-3"
          >
            <div className="flex justify-between text-gray-700 font-medium">
              {format(dateObj, "MMMM d, yyyy")}{" "}
              <span className="text-gray-400 font-normal"></span>{" "}
              <span className="text-[#344054] font-semibold">
                {holiday.title}
              </span>
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {format(dateObj, "EEEE")}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HolidayList;
