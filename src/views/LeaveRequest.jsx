import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { differenceInCalendarDays, format } from "date-fns";
import Hr from "../assets/Ellipse 39.svg";

const LeaveRequest = () => {
  const [leaveType, setLeaveType] = useState("Casual");
  const [tab, setTab] = useState("Review");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const dayCount =
    startDate && endDate ? differenceInCalendarDays(endDate, startDate) + 1 : 0;

  const getLeaveRequests = async (page = 1) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("User is not authenticated.");
      return;
    }

    try {
      setLoading(true);
      // Fetch all pages or increase page size to get all data
      const response = await axios.get(
        `https://attendancebackends.onrender.com/userleave?page=${page}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const leaveData =
        response.data.leaveData || response.data.data || response.data || [];

      setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
      setCurrentPage(page);
      if (response.data.totalPages) setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error(
        "API Error:",
        err.response?.status,
        err.response?.data || err.message
      );
      setError(err.response?.data?.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // console.log("Leave Requests:", leaveRequests);

  // Submit leave request (POST)
  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!startDate || !endDate || !reason.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("User is not authenticated.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        leaveType,
        from: format(startDate, "yyyy-MM-dd"),
        to: format(endDate, "yyyy-MM-dd"),
        reason,
      };
      console.log(leaveType);

      console.log("Submitting payload:", payload);

      const response = await axios.post(
        "https://attendancebackends.onrender.com/userleave",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("POST Response:", response.data);
      setSuccess("Leave request submitted successfully!");

      // Clear form
      setStartDate(null);
      setEndDate(null);
      setReason("");

      // Switch to Review tab to see the newly submitted request
      setTab("Review");

      // Refresh data immediately to get the latest request
      await getLeaveRequests(1); // Reset to page 1 after new submission
      setCurrentPage(1);
    } catch (err) {
      console.error("POST Error:", err);
      setError(err.response?.data?.message || "Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLeaveRequests(1);
  }, []);

  // Helper function to get status for filtering
  const getStatusForTab = (tab) => {
    switch (tab) {
      case "Review":
        return ["pending", "review", "submitted"];
      case "Approved":
        return ["approved", "accepted"];
      case "Rejected":
        return ["rejected", "declined"];
      default:
        return [];
    }
  };

  // Filter leave requests based on current tab - Show ALL if Review tab has no pending
  const filteredLeaveRequests = (() => {
    if (tab === "Review") {
      // First check if there are any pending requests
      const pendingRequests = leaveRequests.filter((leave) =>
        ["pending", "review", "submitted"].some(
          (status) => leave.status?.toLowerCase() === status.toLowerCase()
        )
      );

      // If no pending requests found, show all requests in Review tab
      if (pendingRequests.length === 0) {
        return leaveRequests;
      }
      return pendingRequests;
    }

    // For other tabs, filter normally
    const statusOptions = getStatusForTab(tab);
    return leaveRequests.filter((leave) => {
      return statusOptions.some(
        (status) => leave.status?.toLowerCase() === status.toLowerCase()
      );
    });
  })();

  // Handle tab change and reset pagination
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setCurrentPage(1);
    getLeaveRequests(1);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md text-sm p-4">
      <div className="flex justify-between items-center gap-4">
        <div className="w-1/2">
          <label className="text-gray-600 text-xs">Select Date</label>
          <div className="mt-1 border border-gray-300 rounded px-2 py-1 text-gray-700">
            <DatePicker
              selected={startDate}
              onChange={(dates) => {
                const [start, end] = dates;
                setStartDate(start);
                setEndDate(end);
              }}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              placeholderText="Select date range"
              className="w-full bg-transparent focus:outline-none text-sm"
            />
            {startDate && endDate && (
              <div className="text-xs text-gray-500 mt-1">
                {format(startDate, "dd MMM yyyy")} -{" "}
                {format(endDate, "dd MMM yyyy")}
                <span className="text-gray-400">
                  {" "}
                  | {dayCount} Day{dayCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Leave Type Dropdown */}
        <div className="w-1/2">
          <label className="text-gray-600 text-xs">Leave Type</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
          >
            <option>Casual</option>
            <option>Medical</option>
          </select>
        </div>
      </div>

      {/* Reason */}
      <div className="mt-4">
        <label className="text-gray-600 text-xs">Reason for Leaves</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 mt-1 text-sm"
          placeholder="Eg: Attending a function"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-4 bg-[#7A5AF8] text-white py-2 rounded shadow-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-2 text-red-600 text-xs font-semibold">{error}</div>
      )}
      {success && (
        <div className="mt-2 text-green-600 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h2 className="font-semibold text-gray-700 mb-2">My Leave Records</h2>
        <div className="flex space-x-2 text-xs mb-4">
          {["Review", "Approved", "Rejected"].map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-3 py-1 rounded-full border ${
                tab === t
                  ? "bg-purple-600 text-white border-purple-600"
                  : "text-gray-600 border-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
          </div>
        )}

        {/* Leave Cards - Show all filtered requests */}
        {!loading && filteredLeaveRequests.length > 0 ? (
          <>
            {filteredLeaveRequests.map((leave) => {
              const fromDate = new Date(leave.from);
              const toDate = new Date(leave.to);
              const days = differenceInCalendarDays(toDate, fromDate) + 1;

              return (
                <div
                  key={leave._id}
                  className="border border-gray-200 rounded p-3 mb-2 bg-gray-50"
                >
                  <div className="text-xs text-gray-500 mb-1">
                    Requested on{" "}
                    {format(
                      new Date(leave.createdAt || leave.from),
                      "dd MMM yyyy"
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm">Leave Date</div>
                      <div className="text-gray-600 text-xs">
                        {format(fromDate, "dd MMM")} -{" "}
                        {format(toDate, "dd MMM yyyy")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Total Leave</div>
                      <div className="font-semibold text-sm">
                        {days} Day{days > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2 flex justify-between items-center text-xs">
                    <div
                      className={`flex items-center gap-1 ${
                        leave.status?.toLowerCase() === "approved"
                          ? "text-green-600"
                          : leave.status?.toLowerCase() === "rejected"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      <span>
                        {leave.status?.toLowerCase() === "approved"
                          ? "🟢"
                          : leave.status?.toLowerCase() === "rejected"
                          ? "🔴"
                          : "🟡"}
                      </span>
                      <span className="capitalize">
                        {leave.status || "pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={Hr} alt="HR" className="w-6 h-6 rounded-full" />
                      <span className="text-gray-500 text-xs">By Pradip</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-4 gap-2 text-xs">
                <button
                  onClick={() => getLeaveRequests(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => getLeaveRequests(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : !loading && tab === "Review" ? (
          <div className="text-center text-gray-500 text-xs py-4">
            All leave requests are shown above
          </div>
        ) : !loading ? (
          <div className="text-center text-gray-500 text-xs py-4">
            No {tab.toLowerCase()} leave requests found
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LeaveRequest;
