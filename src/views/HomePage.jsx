import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const HomePage = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    leave: 0,
    absent: 0,
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [allMonthlyAttendance, setAllMonthlyAttendance] = useState([]); // New state for all monthly data
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchInTime, setPunchInTime] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState("checking");

  // New state for leave data
  const [leaveData, setLeaveData] = useState([]);
  const [leaveTaken, setLeaveTaken] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 5;

  // Update current time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check token validity
  const checkToken = () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setTokenStatus("missing");
        return null;
      }

      // Basic JWT validation - check if it has 3 parts separated by dots
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        setTokenStatus("invalid");
        return null;
      }

      // Check if token is expired (if it contains expiry info)
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          setTokenStatus("expired");
          return null;
        }
      } catch (e) {
        console.warn("Could not decode token payload:", e);
      }

      setTokenStatus("valid");
      return token;
    } catch (error) {
      console.error("Token validation error:", error);
      setTokenStatus("invalid");
      return null;
    }
  };

  const handleTokenIssue = () => {
    localStorage.removeItem("token");
    setTokenStatus("missing");
    setError("Authentication required. Please log in again.");
  };

  const setDemoToken = () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        userId: "demo",
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      })
    );
    const signature = "demo_signature";
    const demoToken = `${header}.${payload}.${signature}`;

    localStorage.setItem("token", demoToken);
    setTokenStatus("valid");
    setError(null);
  };

  const handlePunch = () => {
    if (tokenStatus !== "valid") {
      return;
    }

    // Navigate to SelfiePunchedIn route for both punch in and punch out
    navigate("/");
  };

  // Fetch leave data and calculate leaves taken
  const fetchLeaveData = async () => {
    try {
      const token = checkToken();
      if (!token) {
        handleTokenIssue();
        return;
      }

      const response = await axios.get(
        "https://attendancebackends.onrender.com/userleave",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.leaveData) {
        const leaves = response.data.leaveData;
        setLeaveData(leaves);

        // Calculate total approved leaves for current year
        const currentYear = new Date().getFullYear();
        const currentYearLeaves = leaves.filter((leave) => {
          const leaveYear = new Date(leave.from).getFullYear();
          return leaveYear === currentYear;
        });

        const approvedLeaves = currentYearLeaves.filter(
          (leave) => leave.status === "approved"
        );

        const totalLeaveDays = approvedLeaves.reduce((total, leave) => {
          return total + (leave.totaldays || 1);
        }, 0);

        setLeaveTaken(totalLeaveDays);

        console.log("Leave data fetched successfully:", leaves);
        console.log("Total leave days taken:", totalLeaveDays);
      }
    } catch (err) {
      console.error("Failed to fetch leave data:", err);
      // Don't set error for leave data as it's not critical
    }
  };

  // Fetch all attendance data for the month (for summary calculation)
  const fetchAllMonthlyAttendance = async () => {
    try {
      const token = checkToken();
      if (!token) {
        return [];
      }

      // Fetch all data for the month without pagination
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "1000", // Large limit to get all records
        month: (selectedMonth + 1).toString(),
        year: new Date().getFullYear().toString(),
      });

      console.log(
        "Fetching all monthly data with params:",
        queryParams.toString()
      );

      const response = await fetch(
        `https://attendancebackends.onrender.com/data?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = await response.json();
      console.log("All monthly attendance data:", apiResponse);

      // Transform the data
      let transformedData = [];
      if (apiResponse.punchData && apiResponse.punchData.length > 0) {
        transformedData = apiResponse.punchData.map((entry) => {
          const formatTime = (isoString) => {
            if (!isoString) return "00:00";
            const date = new Date(isoString);
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          };

          let displayStatus = "Present";
          switch (entry.status) {
            case "present":
              displayStatus = "Present";
              break;
            case "absent":
              displayStatus = "Absent";
              break;
            case "halfday":
              displayStatus = "Halfday";
              break;
            default:
              displayStatus = "Present";
          }

          const today = new Date().toISOString().slice(0, 10);
          const isToday = entry.date === today;
          const hasPunchOut = entry.punchOut && entry.punchOut !== "";

          if (isToday && !hasPunchOut) {
            setIsPunchedIn(true);
            setPunchInTime(new Date(entry.punchIn));

            if (entry.entryTime === "late") {
              displayStatus = "Late";
            } else if (entry.entryTime === "ontime") {
              displayStatus = "On Time";
            }
          } else if (isToday && hasPunchOut) {
            // FIXED: Reset isPunchedIn to false when user has punched out
            setIsPunchedIn(false);
            setPunchInTime(null);

            if (entry.entryTime === "late") {
              displayStatus = "Late";
            } else if (entry.entryTime === "ontime") {
              displayStatus = "On Time";
            }
          }

          return {
            date: entry.date,
            status: displayStatus,
            punchIn: formatTime(entry.punchIn),
            punchOut: hasPunchOut ? formatTime(entry.punchOut) : "Out Pending",
            entryTime: entry.entryTime,
          };
        });
      }

      return transformedData;
    } catch (err) {
      console.error("Failed to fetch all monthly attendance:", err);
      return [];
    }
  };

  // Calculate attendance summary for current month using all monthly data
  const calculateAttendanceSummary = (allAttendanceData) => {
    const currentMonth = selectedMonth;
    const currentYear = new Date().getFullYear();

    // Filter attendance data for current month
    const monthlyData = allAttendanceData.filter((entry) => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      );
    });

    // If no attendance data for the selected month, return zeros
    if (monthlyData.length === 0) {
      return {
        present: 0,
        absent: 0,
        leave: 0,
      };
    }

    // Calculate attendance counts
    const present = monthlyData.filter(
      (d) => d.status === "Present" || d.status === "On Time"
    ).length;

    const absent = monthlyData.filter((d) => d.status === "Absent").length;

    const halfdays = monthlyData.filter((d) => d.status === "Halfday").length;
    const late = monthlyData.filter((d) => d.status === "Late").length;

    // Calculate approved leaves for current month
    const monthlyLeaves = leaveData.filter((leave) => {
      const leaveFromDate = new Date(leave.from);
      const leaveToDate = new Date(leave.to);
      return (
        leave.status === "approved" &&
        ((leaveFromDate.getMonth() === currentMonth &&
          leaveFromDate.getFullYear() === currentYear) ||
          (leaveToDate.getMonth() === currentMonth &&
            leaveToDate.getFullYear() === currentYear))
      );
    });

    const approvedMonthlyLeaves = monthlyLeaves.reduce((total, leave) => {
      return total + (leave.totaldays || 1);
    }, 0);

    return {
      present: present,
      absent: absent,
      leave: halfdays + late + approvedMonthlyLeaves,
    };
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check and get token
        const token = checkToken();

        if (!token) {
          handleTokenIssue();
          setIsLoading(false);
          return;
        }

        // First, fetch all monthly data for summary calculation
        const allMonthlyData = await fetchAllMonthlyAttendance();
        setAllMonthlyAttendance(allMonthlyData);

        // Then fetch paginated data for display
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          month: (selectedMonth + 1).toString(),
          year: new Date().getFullYear().toString(),
        });

        console.log(
          "Query parameters for paginated data:",
          queryParams.toString()
        );

        // Add status filter if not "All"
        if (selectedStatus !== "All") {
          let backendStatus = selectedStatus.toLowerCase();
          if (selectedStatus === "Halfday") {
            backendStatus = "halfday";
          }
          queryParams.append("status", backendStatus);
        }

        const response = await fetch(
          `https://attendancebackends.onrender.com/data?${queryParams}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            handleTokenIssue();
            throw new Error("Authentication failed. Please log in again.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiResponse = await response.json();
        console.log("Fetched paginated attendance data:", apiResponse);

        // Transform the paginated API response
        let transformedData = [];
        if (apiResponse.punchData && apiResponse.punchData.length > 0) {
          transformedData = apiResponse.punchData.map((entry) => {
            const formatTime = (isoString) => {
              if (!isoString) return "00:00";
              const date = new Date(isoString);
              return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            };

            let displayStatus = "Present";
            switch (entry.status) {
              case "present":
                displayStatus = "Present";
                break;
              case "absent":
                displayStatus = "Absent";
                break;
              case "halfday":
                displayStatus = "Halfday";
                break;
              default:
                displayStatus = "Present";
            }

            const today = new Date().toISOString().slice(0, 10);
            const isToday = entry.date === today;
            const hasPunchOut = entry.punchOut && entry.punchOut !== "";

            if (isToday && !hasPunchOut) {
              setIsPunchedIn(true);
              setPunchInTime(new Date(entry.punchIn));

              if (entry.entryTime === "late") {
                displayStatus = "Late";
              } else if (entry.entryTime === "ontime") {
                displayStatus = "On Time";
              }
            } else if (isToday && hasPunchOut) {
              // FIXED: Reset isPunchedIn to false when user has punched out
              setIsPunchedIn(false);
              setPunchInTime(null);

              if (entry.entryTime === "late") {
                displayStatus = "Late";
              } else if (entry.entryTime === "ontime") {
                displayStatus = "On Time";
              }
            }

            return {
              date: entry.date,
              status: displayStatus,
              punchIn: formatTime(entry.punchIn),
              punchOut: hasPunchOut
                ? formatTime(entry.punchOut)
                : "Out Pending",
              entryTime: entry.entryTime,
            };
          });
        }

        console.log("Transformed paginated attendance data:", transformedData);

        // Update pagination info from API response
        const totalPagesFromAPI =
          apiResponse.totalPages ||
          Math.ceil(
            (allMonthlyData.length || apiResponse.totalRecords || 0) /
              itemsPerPage
          );
        const totalRecordsFromAPI =
          allMonthlyData.length || apiResponse.totalRecords || 0;

        setTotalPages(Math.max(1, totalPagesFromAPI));
        setTotalRecords(totalRecordsFromAPI);
        setMonthlyAttendance(transformedData);

        // Fetch leave data
        await fetchLeaveData();

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
        setError(err.message || "Something went wrong");
        setMonthlyAttendance([]);
        setAllMonthlyAttendance([]);
        setAttendanceSummary({
          present: 0,
          absent: 0,
          leave: 0,
        });
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedMonth, selectedStatus, currentPage]);

  // Calculate summary when all monthly data or leave data changes
  useEffect(() => {
    if (allMonthlyAttendance.length > 0 || leaveData.length > 0) {
      const updatedSummary = calculateAttendanceSummary(allMonthlyAttendance);
      setAttendanceSummary(updatedSummary);
      console.log("Updated attendance summary:", updatedSummary);
    } else {
      setAttendanceSummary({
        present: 0,
        absent: 0,
        leave: 0,
      });
    }
  }, [allMonthlyAttendance, leaveData, selectedMonth]);

  // Reset to first page when month or status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedStatus]);

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
  ];

  const statusOptions = ["All", "Present", "Absent", "Halfday", "Late"];

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getWeekday = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
      case "On Time":
        return "text-green-600";
      case "Absent":
        return "text-red-500";
      case "Halfday":
        return "text-yellow-500";
      case "Late":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  const getOutTimeText = (entry) => {
    if (entry.status === "Absent") {
      return "00:00";
    }

    if (entry.punchOut === "Out Pending") {
      return `${entry.punchIn} - Out Pending`;
    }
    return `${entry.punchIn} - ${entry.punchOut}`;
  };

  // Pagination controls
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Your attendance</h1>
        <select
          className="border rounded px-2 py-1 text-sm"
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

      {/* Summary Cards */}
      <div className="flex justify-between gap-2 mb-4">
        <div className="flex-1 bg-green-100 p-4 rounded-xl text-center">
          <p className="text-sm font-semibold">Present</p>
          <p className="text-xl font-bold text-green-600">
            {attendanceSummary.present}
          </p>
        </div>
        <div className="flex-1 bg-red-100 p-4 rounded-xl text-center">
          <p className="text-sm font-semibold">Absent</p>
          <p className="text-xl font-bold text-red-600">
            {attendanceSummary.absent}
          </p>
        </div>
        <div className="flex-1 bg-yellow-100 p-4 rounded-xl text-center">
          <p className="text-sm font-semibold">Leave</p>
          <p className="text-xl font-bold text-yellow-600">
            {attendanceSummary.leave}
          </p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-md mb-2 text-[#344054]">
          This Month's Attendance
        </h2>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {statusOptions.map((status, i) => (
            <option key={i} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 mb-4">
        {monthlyAttendance.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>No attendance records found for {monthNames[selectedMonth]}</p>
            <p className="text-sm mt-2">
              {tokenStatus !== "valid"
                ? "Please authenticate to view attendance data"
                : "Try selecting a different month or check your API connection"}
            </p>
          </div>
        ) : (
          monthlyAttendance.map((entry, idx) => (
            <div
              key={`${entry.date}-${idx}`}
              className="flex justify-between items-center bg-gray-100 p-3 rounded-xl"
            >
              {/* Left side: Date + Weekday */}
              <div>
                <p className="text-sm font-bold">{formatDate(entry.date)}</p>
                <p className="text-xs text-gray-600">
                  {getWeekday(entry.date)}
                </p>
              </div>

              {/* Right side: Status on top, OutTime below */}
              <div className="flex flex-col items-end text-right space-y-1">
                <span className={`font-medium ${getStatusColor(entry.status)}`}>
                  {entry.status}
                </span>
                <span className="text-xs text-gray-600">
                  {getOutTimeText(entry)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Section */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-100 px-2 py-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center space-x-1">
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
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200"
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Punch In/Out Button - Fixed above menu bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white p-2">
        <div className="max-w-sm mx-auto">
          <button
            className={`w-full py-3 rounded-xl shadow-md text-lg font-semibold ${
              isPunchedIn
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            } ${
              tokenStatus !== "valid" ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handlePunch}
            disabled={tokenStatus !== "valid"}
          >
            {isPunchedIn ? "Punch Out" : "Punch In"}
          </button>
          {tokenStatus !== "valid" && (
            <p className="text-center text-xs text-gray-500 mt-2">
              Authentication required to punch in/out
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
