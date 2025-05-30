import React, { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";

const Holiday = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("No token found. Please login.");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          "https://attendancebackends.onrender.com/admin/holiday/user",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 200 && Array.isArray(response.data?.data)) {
          setHolidays(response.data.data);
          console.log("Fetched holidays:", response.data.data);
        } else {
          setError("Unexpected response format.");
        }
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to load holidays. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md text-sm max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Holiday List</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : holidays.length === 0 ? (
        <p className="text-gray-500">No holidays found.</p>
      ) : (
        holidays.map((holiday, index) => {
          const dateObj = new Date(holiday.date);
          return (
            <div
              key={holiday._id || index}
              className="border-b last:border-none border-gray-200 py-3"
            >
              <div className="flex justify-between text-gray-700 font-medium">
                {format(dateObj, "MMMM d, yyyy")}
                <span className="text-[#344054] font-semibold">
                  {holiday.holidayName}
                </span>
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {format(dateObj, "EEEE")}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Holiday;
