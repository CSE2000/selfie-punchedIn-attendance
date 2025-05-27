import { useEffect, useState } from "react";

const HomePage = () => {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    leave: 0,
    absent: 0,
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchInTime, setPunchInTime] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState("checking");

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

  const simulatePunchIn = () => {
    const now = new Date();
    const punchInTimeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

    const attendanceEntry = {
      date: todayStr,
      status: "Present",
      punchIn:
        punchInTimeStr.split(":")[0] + ":" + punchInTimeStr.split(":")[1],
      punchOut: "Out Pending",
    };

    setTodayAttendance(attendanceEntry);
    setIsPunchedIn(true);
    setPunchInTime(now);
  };

  const updateTodayAttendance = (punchOutTime) => {
    if (todayAttendance) {
      const punchInHour = parseInt(todayAttendance.punchIn.split(":")[0]);
      const punchInMinute = parseInt(todayAttendance.punchIn.split(":")[1]);
      const punchOutHour = parseInt(punchOutTime.split(":")[0]);
      const punchOutMinute = parseInt(punchOutTime.split(":")[1]);

      const expectedPunchIn = { hour: 10, minute: 5 };
      const expectedPunchOut = { hour: 18, minute: 30 };

      let status = "Present";

      if (punchInHour > 10 || (punchInHour === 10 && punchInMinute > 6)) {
        status = "Late";
      }

      if (punchOutHour < 18 || (punchOutHour === 18 && punchOutMinute < 30)) {
        status = "Halfday";
      }

      const updatedAttendance = {
        ...todayAttendance,
        status: status,
        punchOut: punchOutTime.split(":")[0] + ":" + punchOutTime.split(":")[1],
      };

      setTodayAttendance(updatedAttendance);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("punched") === "in") {
      simulatePunchIn();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePunch = () => {
    if (!isPunchedIn) {
      window.location.href = "/";
    } else {
      const now = new Date();
      const punchOutTimeStr = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      updateTodayAttendance(punchOutTimeStr);

      setIsPunchedIn(false);
      setPunchInTime(null);
      alert(`You have punched out at ${now.toLocaleTimeString()}`);
    }
  };

  // Replace the fetchAttendance useEffect with this fixed version

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

        // Build query parameters for pagination and filtering
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          month: (selectedMonth + 1).toString(), // Backend expects 1-12, frontend uses 0-11
        });

        // Add status filter if not "All" - map frontend status to backend status
        if (selectedStatus !== "All") {
          let backendStatus = selectedStatus.toLowerCase();
          // Map frontend status names to backend expected values
          if (selectedStatus === "Halfday") {
            backendStatus = "halfday";
          } else if (selectedStatus === "Late") {
            backendStatus = "late";
          } else if (selectedStatus === "Present") {
            backendStatus = "present";
          } else if (selectedStatus === "Absent") {
            backendStatus = "absent";
          }
          queryParams.append("status", backendStatus);
        }

        const response = await fetch(
          `http://192.168.1.8:8000/data?${queryParams}`,
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
            // Token is invalid or expired
            handleTokenIssue();
            throw new Error("Authentication failed. Please log in again.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiResponse = await response.json();
        console.log("Fetched attendance data:", apiResponse);

        // Transform the API response to match your UI expectations
        const transformedData = apiResponse.punchData.map((entry) => {
          // Convert ISO date strings to time format (HH:MM)
          const formatTime = (isoString) => {
            if (!isoString) return "00:00";
            const date = new Date(isoString);
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          };

          // Determine status based on your business logic
          let displayStatus = "Present";
          if (entry.status === "absent") {
            displayStatus = "Absent";
          } else if (entry.status === "present") {
            // Check if it's late based on punch in time
            const punchInDate = new Date(entry.punchIn);
            const punchInHour = punchInDate.getHours();
            const punchInMinute = punchInDate.getMinutes();

            // If punched in after 10:06, mark as Late
            if (punchInHour > 10 || (punchInHour === 10 && punchInMinute > 6)) {
              displayStatus = "Late";
            }

            // If punched out early (before 18:30), mark as Halfday
            if (entry.punchOut) {
              const punchOutDate = new Date(entry.punchOut);
              const punchOutHour = punchOutDate.getHours();
              const punchOutMinute = punchOutDate.getMinutes();

              if (
                punchOutHour < 18 ||
                (punchOutHour === 18 && punchOutMinute < 30)
              ) {
                displayStatus = "Halfday";
              }
            }
          } else if (entry.status === "late") {
            displayStatus = "Late";
          } else if (entry.status === "halfday") {
            displayStatus = "Halfday";
          }

          return {
            date: entry.date,
            status: displayStatus,
            punchIn: formatTime(entry.punchIn),
            punchOut: entry.punchOut
              ? formatTime(entry.punchOut)
              : "Out Pending",
          };
        });

        console.log("Transformed attendance data:", transformedData);

        // Apply client-side filtering if backend doesn't handle it properly
        let filteredData = transformedData;
        if (selectedStatus !== "All") {
          filteredData = transformedData.filter(
            (entry) => entry.status === selectedStatus
          );
        }

        // Handle today's attendance if it exists
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

        let finalData = filteredData;
        if (
          todayAttendance &&
          selectedMonth === today.getMonth() &&
          currentPage === 1 &&
          (selectedStatus === "All" ||
            todayAttendance.status === selectedStatus)
        ) {
          // Only add today's attendance on the first page and if it matches the filter
          finalData = filteredData.filter((entry) => entry.date !== todayStr);
          finalData.unshift(todayAttendance);
        }

        // Update pagination info from API response
        setTotalPages(
          apiResponse.totalPages ||
            Math.ceil(apiResponse.totalRecords / itemsPerPage)
        );
        setTotalRecords(apiResponse.totalRecords || 0);

        // Calculate summary from API response if provided, otherwise calculate from current page
        if (apiResponse.summary) {
          setAttendanceSummary({
            present: apiResponse.summary.present || 0,
            leave:
              (apiResponse.summary.halfday || 0) +
              (apiResponse.summary.late || 0),
            absent: apiResponse.summary.absent || 0,
          });
        } else {
          // Fallback: calculate from current page data
          const summary = {
            present: finalData.filter((d) => d.status === "Present").length,
            leave: finalData.filter(
              (d) => d.status === "Halfday" || d.status === "Late"
            ).length,
            absent: finalData.filter((d) => d.status === "Absent").length,
          };
          setAttendanceSummary(summary);
        }

        setMonthlyAttendance(finalData);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
        setError(err.message || "Something went wrong");
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedMonth, selectedStatus, currentPage, todayAttendance]);

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
    if (
      entry.status === "Present" ||
      entry.status === "Halfday" ||
      entry.status === "Late"
    ) {
      if (entry.punchOut === "Out Pending") {
        return `${entry.punchIn} - Out Pending`;
      }
      return `${entry.punchIn} - ${entry.punchOut}`;
    } else {
      return "00:00";
    }
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Pagination controls
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
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

      {/* {tokenStatus !== "valid" && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-4">
          <p className="text-orange-800 text-sm font-semibold">
            🔐 Authentication Issue
          </p>
          <p className="text-orange-700 text-xs mt-1">
            {tokenStatus === "missing" && "No authentication token found"}
            {tokenStatus === "invalid" && "Invalid authentication token"}
            {tokenStatus === "expired" && "Authentication token has expired"}
          </p>
          <button
            onClick={setDemoToken}
            className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs"
          >
            Set Demo Token
          </button>
        </div>
      )} */}

      {/* API Status Indicator */}
      {/* {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
          <p className="text-red-800 text-sm">⚠️ {error}</p>
          {!error.includes("Authentication") && (
            <p className="text-red-600 text-xs mt-1">Wait for sometime!</p>
          )}
        </div>
      )} */}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      )}

      {/* Current Status */}
      {isPunchedIn && (
        <div className="bg-blue-100 p-4 rounded-xl mb-4 text-center">
          <p className="text-sm font-semibold text-blue-800">
            Currently Punched In
          </p>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrentTime()}
          </p>
          {punchInTime && (
            <p className="text-xs text-blue-600 mt-1">
              Punched in at: {punchInTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

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
          <div className="flex justify-between items-center mb-3"></div>
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
              {totalPages <= 5 ? (
                Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                        page === currentPage
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )
              ) : (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                      1 === currentPage
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    1
                  </button>
                  {currentPage > 3 && (
                    <span className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm">
                      ...
                    </span>
                  )}
                  {currentPage > 2 && currentPage < totalPages - 1 && (
                    <button
                      onClick={() => handlePageChange(currentPage)}
                      className="w-10 h-10 rounded-lg text-sm font-medium bg-indigo-600 text-white shadow-md"
                    >
                      {currentPage}
                    </button>
                  )}
                  {currentPage < totalPages - 2 && (
                    <span className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm">
                      ...
                    </span>
                  )}
                  {totalPages > 1 && (
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                        totalPages === currentPage
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                </>
              )}
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
          {totalPages > 8 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs text-gray-500">Jump to:</span>
                <select
                  value={currentPage}
                  onChange={(e) => handlePageChange(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-16">
        <button
          className={`w-full max-w-sm mx-auto block py-3 rounded-xl shadow-md text-lg font-semibold ${
            isPunchedIn
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          } ${tokenStatus !== "valid" ? "opacity-50 cursor-not-allowed" : ""}`}
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
  );
};

export default HomePage;
