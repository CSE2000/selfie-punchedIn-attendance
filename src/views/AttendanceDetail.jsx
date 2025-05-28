import { useEffect, useState } from "react";
import { Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

const AttendanceMobile = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    absent: 0,
    halfday: 0,
    leaveUsed: 0,
    availableLeave: 14,
    medical: 0,
    unpaidLeave: 0,
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  // Company holidays data
  const companyHolidays = [
    "2025-01-01", // New Year
    "2025-01-26", // Republic Day
    "2025-03-14", // Holi
    "2025-08-09", // Raksha Bandhan
    "2025-08-15", // Independence Day
    "2025-08-16", // Janmashtami
    "2025-10-02", // Gandhi Jayanti
    "2025-10-20", // Karva Chauth
    "2025-10-21", // Diwali
    "2025-10-22", // Bhai Dooj
    "2025-12-25", // Christmas
  ];

  const isWeekendOrHoliday = (date) => {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];

    // Sunday is always holiday
    if (dayOfWeek === 0) return true;

    // First and second Saturday of the month
    if (dayOfWeek === 6) {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstSaturday = 7 - firstDay.getDay() || 7;
      const dateOfMonth = date.getDate();

      if (dateOfMonth === firstSaturday || dateOfMonth === firstSaturday + 7) {
        return true;
      }
    }

    // Company holidays (festivals)
    if (companyHolidays.includes(dateStr)) return true;

    return false;
  };

  // Format time from ISO string to readable format
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getOutTimeText = (entry) => {
    const isPresent =
      entry.status?.toLowerCase() === "present" ||
      entry.status?.toLowerCase() === "halfday";

    if (isPresent) {
      const punchInTime = formatTime(entry.punchIn);
      const punchOutTime = formatTime(entry.punchOut);

      if (punchInTime && punchOutTime) {
        return `${punchInTime} - ${punchOutTime}`;
      } else if (punchInTime) {
        return `${punchInTime} - Still Working`;
      }
      return entry.timeRange || "";
    }
    return "00:00 - 00:00";
  };

  // Fetch attendance data with pagination
  const fetchAttendanceData = async (page = 1, limit = 10) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found in localStorage");
        return { data: [], totalPages: 0, totalItems: 0 };
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add month/year filters if not "All"
      if (selectedMonth !== 12) {
        params.append("month", (selectedMonth + 1).toString());
      }
      params.append("year", selectedYear.toString());

      // Add date range filters if set
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      const response = await axios.get(
        `https://attendancebackends.onrender.com/data?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Attendance API Response:", response.data);

      // Handle different response formats - FIXED TO HANDLE punchData
      if (response.data && response.data.punchData) {
        return {
          data: response.data.punchData,
          totalPages: response.data.totalPages || 1,
          totalItems:
            response.data.totalItems || response.data.punchData.length,
          currentPage: response.data.currentPage || page,
        };
      } else if (response.data && response.data.data) {
        return {
          data: response.data.data,
          totalPages: response.data.totalPages || 1,
          totalItems: response.data.totalItems || response.data.data.length,
          currentPage: response.data.currentPage || page,
        };
      } else if (Array.isArray(response.data)) {
        return {
          data: response.data,
          totalPages: 1,
          totalItems: response.data.length,
          currentPage: 1,
        };
      } else if (response.data && response.data.attendanceData) {
        return {
          data: response.data.attendanceData,
          totalPages: response.data.totalPages || 1,
          totalItems:
            response.data.totalItems || response.data.attendanceData.length,
          currentPage: response.data.currentPage || page,
        };
      }

      return { data: [], totalPages: 0, totalItems: 0 };
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      return { data: [], totalPages: 0, totalItems: 0 };
    }
  };

  // Fetch leave data
  const fetchLeaveData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found in localStorage");
        return [];
      }

      const response = await axios.get(
        "https://attendancebackends.onrender.com/userleave",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Leave API Response:", response.data);

      // Handle different response formats
      if (response.data && response.data.leaveData) {
        return response.data.leaveData;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("Error fetching leave data:", error);
      return [];
    }
  };

  // Calculate leave statistics
  const calculateLeaveStats = (leaveData, year, month = null) => {
    let totalLeaveUsed = 0;
    let medicalLeave = 0;
    let unpaidLeave = 0;

    leaveData.forEach((leave) => {
      const leaveFromDate = new Date(leave.from);
      const leaveYear = leaveFromDate.getFullYear();
      const leaveMonth = leaveFromDate.getMonth();

      // Filter by year and month if specified
      if (year && leaveYear !== year) return;
      if (month !== null && leaveMonth !== month) return;

      // Only count approved leaves
      if (leave.status === "approved" || leave.status === "Approved") {
        const days = leave.totaldays || 1;
        totalLeaveUsed += days;

        if (leave.leaveType === "Medical" || leave.leaveType === "medical") {
          medicalLeave += days;
        }

        if (leave.type === "unpaid") {
          unpaidLeave += days;
        }
      }
    });

    return {
      totalLeaveUsed,
      medicalLeave,
      unpaidLeave,
      availableLeave: Math.max(0, 14 - totalLeaveUsed),
    };
  };

  // Calculate attendance statistics (for summary) - FIXED
  const calculateAttendanceStats = (attendanceData, year, month = null) => {
    let present = 0;
    let absent = 0;
    let halfday = 0;

    // Group by date to handle multiple punch entries for same date
    const dateGroups = {};

    attendanceData.forEach((record) => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();
      const dateKey = record.date;

      // Filter by year and month if specified
      if (year && recordYear !== year) return;
      if (month !== null && recordMonth !== month) return;

      // Skip weekends and holidays for absence calculation
      if (!isWeekendOrHoliday(recordDate)) {
        // Keep the latest status for the date (or you can implement your own logic)
        if (
          !dateGroups[dateKey] ||
          new Date(record.punchIn) > new Date(dateGroups[dateKey].punchIn)
        ) {
          dateGroups[dateKey] = record;
        }
      }
    });

    // Count statistics from grouped data
    Object.values(dateGroups).forEach((record) => {
      const status = record.status.toLowerCase();
      switch (status) {
        case "present":
          present++;
          break;
        case "absent":
          absent++;
          break;
        case "halfday":
          halfday++;
          break;
      }
    });

    return { present, absent, halfday };
  };

  // Process attendance data for display - FIXED
  const processAttendanceData = (attendanceData) => {
    return attendanceData.map((record) => ({
      ...record,
      weekday: new Date(record.date).toLocaleDateString("en-US", {
        weekday: "long",
      }),
      // Normalize status for consistent display
      status:
        record.status.charAt(0).toUpperCase() +
        record.status.slice(1).toLowerCase(),
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, fromDate, toDate]);

  // Main data fetching and processing
  useEffect(() => {
    const fetchAndProcessData = async () => {
      setLoading(true);
      try {
        // Fetch paginated attendance data
        const attendanceResult = await fetchAttendanceData(
          currentPage,
          itemsPerPage
        );

        // Fetch leave data (not paginated as it's used for summary)
        const leaveData = await fetchLeaveData();

        console.log("Fetched attendance result:", attendanceResult);
        console.log("Fetched leave data:", leaveData);

        // Update pagination state
        setTotalPages(attendanceResult.totalPages);
        setTotalItems(attendanceResult.totalItems);

        // Determine filter parameters for summary calculations
        const filterYear = selectedYear;
        const filterMonth = selectedMonth === 12 ? null : selectedMonth;

        // Calculate leave statistics
        const leaveStats = calculateLeaveStats(
          leaveData,
          filterYear,
          filterMonth
        );
        const allAttendanceResult = await fetchAttendanceData(1, 1000);
        const attendanceStats = calculateAttendanceStats(
          allAttendanceResult.data,
          filterYear,
          filterMonth
        );

        // Update summary
        setAttendanceSummary({
          present: attendanceStats.present,
          absent: attendanceStats.absent,
          halfday: attendanceStats.halfday,
          leaveUsed: leaveStats.totalLeaveUsed,
          availableLeave: leaveStats.availableLeave,
          medical: leaveStats.medicalLeave,
          unpaidLeave: leaveStats.unpaidLeave,
        });

        // Process attendance data for display
        const processedAttendance = processAttendanceData(
          attendanceResult.data
        );
        setMonthlyAttendance(processedAttendance);
      } catch (error) {
        console.error("Error processing data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessData();
  }, [selectedMonth, selectedYear, currentPage, fromDate, toDate]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "All",
  ];

  const getStatusColor = (status) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case "present":
        return "text-green-600 bg-green-50";
      case "absent":
        return "text-red-500 bg-red-50";
      case "halfday":
        return "text-orange-500 bg-orange-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-gray-50 min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Your attendance</h1>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
        >
          {monthNames.map((m, i) => (
            <option value={i} key={i}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryCard
          label="Present"
          value={attendanceSummary.present}
          bgColor="bg-green-100"
          textColor="text-green-600"
        />
        <SummaryCard
          label="Absent"
          value={attendanceSummary.absent}
          bgColor="bg-red-100"
          textColor="text-red-600"
        />
        <SummaryCard
          label="Leave Used"
          value={attendanceSummary.leaveUsed}
          bgColor="bg-yellow-100"
          textColor="text-yellow-600"
        />
        <SummaryCard
          label="Halfday"
          value={attendanceSummary.halfday}
          bgColor="bg-orange-100"
          textColor="text-orange-500"
        />
        <SummaryCard
          label="Medical"
          value={attendanceSummary.medical}
          bgColor="bg-blue-100"
          textColor="text-blue-600"
        />
        <SummaryCard
          label="Available Leave"
          value={attendanceSummary.availableLeave}
          bgColor="bg-gray-100"
          textColor="text-gray-700"
        />
      </div>

      {/* Attendance Overview Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg text-gray-800">
          Attendance Overview
        </h2>
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="flex items-center gap-2 text-purple-600 text-sm font-medium"
        >
          <Filter size={16} />
          Select Date
        </button>
      </div>

      {/* Date Range Filter */}
      {showDateFilter && (
        <div className="flex gap-2 mb-4 p-3 bg-white rounded-lg border">
          <input
            type="date"
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm flex-1"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm flex-1"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="To"
          />
        </div>
      )}

      {/* Items count info */}
      {totalItems > 0 && (
        <div className="text-sm text-gray-600 mb-3">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
          records
        </div>
      )}

      {/* Attendance List */}
      <div className="space-y-3 mb-6">
        {monthlyAttendance.map((entry, idx) => (
          <div
            key={entry._id || idx}
            className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">
                {new Date(entry.date).getDate()}{" "}
                {monthNames[new Date(entry.date).getMonth()]}{" "}
                {new Date(entry.date).getFullYear()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{entry.weekday}</p>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  entry.status
                )}`}
              >
                {entry.status}
              </span>
              {getOutTimeText(entry) && (
                <p className="text-xs text-gray-600 mt-1">
                  {getOutTimeText(entry)}
                </p>
              )}
              {entry.status === "Absent" && entry.leaveType && (
                <span className="text-xs text-gray-500 mt-1">
                  ({entry.leaveType})
                </span>
              )}
            </div>
          </div>
        ))}

        {monthlyAttendance.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No attendance records found for the selected period.
          </div>
        )}
      </div>

      {/* Pagination Section */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200"
            }`}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pageNum === currentPage
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200"
            }`}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, bgColor, textColor }) => {
  return (
    <div
      className={`p-4 rounded-xl text-center ${bgColor} border border-gray-200`}
    >
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
};

export default AttendanceMobile;