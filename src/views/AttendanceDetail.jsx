import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Add this

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0]; // 'YYYY-MM-DD'
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getStatusClass = (timeStamp) => {
  const punchTime = new Date(timeStamp).getHours();
  return punchTime <= 9 ? "text-green-500" : "text-red-500";
};

const AttendanceTable = () => {
  const [filteredData, setFilteredData] = useState([]);
  const [paginatedData, setPaginatedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchDate, setSearchDate] = useState(getTodayDate());
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;
  const navigate = useNavigate();

  const goBack = () => {
    navigate("/");
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authorization token missing");

      const response = await fetch(
        "https://attendancebackends.onrender.com/data",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Fetch failed: ${response.status} - ${errorMessage}`);
      }

      const result = await response.json();
      const punchData = Array.isArray(result.punchData) ? result.punchData : [];

      // Add date property derived from timeStamp
      const processed = punchData.map((item) => ({
        ...item,
        date: item.timeStamp.split("T")[0],
      }));

      setFilteredData(processed);

      // Filter today's records by default
      const todayFiltered = processed.filter(
        (emp) => emp.date === getTodayDate()
      );
      setPaginatedData(todayFiltered.slice(0, perPage));
    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const getCurrentFiltered = () =>
    filteredData.filter((emp) => emp.date === searchDate);

  const filterByDate = () => {
    const filtered = getCurrentFiltered();
    setCurrentPage(1);
    setPaginatedData(filtered.slice(0, perPage));
  };

  const resetFilter = () => {
    const today = getTodayDate();
    setSearchDate(today);
    const todayFiltered = filteredData.filter((emp) => emp.date === today);
    setCurrentPage(1);
    setPaginatedData(todayFiltered.slice(0, perPage));
  };

  const prevPage = () => {
    const currentFiltered = getCurrentFiltered();
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      setPaginatedData(
        currentFiltered.slice((newPage - 1) * perPage, newPage * perPage)
      );
    }
  };

  const nextPage = () => {
    const currentFiltered = getCurrentFiltered();
    const maxPage = Math.ceil(currentFiltered.length / perPage);
    if (currentPage < maxPage) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      setPaginatedData(
        currentFiltered.slice((newPage - 1) * perPage, newPage * perPage)
      );
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Attendance Records</h2>
        <button
          onClick={goBack}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back
        </button>
      </div>
      <div className="flex gap-4 mb-4">
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={filterByDate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Search
        </button>
        <button
          onClick={resetFilter}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : paginatedData.length === 0 ? (
        <p>No records found.</p>
      ) : (
        <table className="min-w-full table-auto border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Location</th>
              <th className="border px-4 py-2">Time</th>
              <th className="border px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="border px-4 py-2">{item.userName}</td>
                <td className="border px-4 py-2">
                  {item.locationName || "Office"}
                </td>
                <td className="border px-4 py-2">
                  {formatDate(item.timeStamp)}
                </td>
                <td
                  className={`border px-4 py-2 font-semibold ${getStatusClass(
                    item.timeStamp
                  )}`}
                >
                  {getStatusClass(item.timeStamp) === "text-green-500"
                    ? "On Time"
                    : "Late"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex justify-between">
        <button
          onClick={prevPage}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="self-center">
          Page {currentPage} of{" "}
          {Math.ceil(getCurrentFiltered().length / perPage) || 1}
        </span>
        <button
          onClick={nextPage}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={
            currentPage === Math.ceil(getCurrentFiltered().length / perPage)
          }
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AttendanceTable;
