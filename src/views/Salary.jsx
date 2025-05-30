import { useState, useEffect } from "react";
import { Download, ChevronRight, Loader2 } from "lucide-react";

const Salary = () => {
  const [salaryData, setSalaryData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(0);

  // Calculate working days in a month (excluding Sundays and 1st/2nd Saturdays)
  const getWorkingDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    let saturdayCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      // Skip Sundays (0)
      if (dayOfWeek === 0) continue;

      // Count Saturdays and skip 1st and 2nd Saturday
      if (dayOfWeek === 6) {
        saturdayCount++;
        if (saturdayCount <= 2) continue;
      }

      workingDays++;
    }

    return workingDays;
  };

  // Calculate attendance for a specific month/year
  const calculateAttendance = (salaryRecord, leaves) => {
    const recordDate = new Date(salaryRecord.createdAt);
    const year = recordDate.getFullYear();
    const month = recordDate.getMonth();

    // Filter leaves for the specific month and year that are approved
    const monthLeaves = leaves.filter((leave) => {
      const leaveFromDate = new Date(leave.from);
      const leaveToDate = new Date(leave.to);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Only count approved leaves for the specific month
      return (
        leave.status === "approved" &&
        leaveFromDate <= monthEnd &&
        leaveToDate >= monthStart
      );
    });

    let paidLeave = 0;
    let sickLeave = 0;
    let unpaidLeave = 0;

    // Calculate leave days based on actual API structure
    monthLeaves.forEach((leave) => {
      const totalDays = leave.totaldays || 1;

      // Count Medical leaves as sick leave
      if (leave.leaveType === "Medical") {
        sickLeave += totalDays;
      }

      // Count by payment type
      if (leave.type === "paid") {
        paidLeave += totalDays;
      } else if (leave.type === "unpaid") {
        unpaidLeave += totalDays;
      }
    });

    // Get total working days for the month
    const totalWorkingDays = getWorkingDaysInMonth(year, month);

    // Calculate present days (using salary data if available, otherwise calculate)
    const presentDays =
      salaryRecord.present || totalWorkingDays - paidLeave - unpaidLeave;

    return {
      present: presentDays,
      paidleave: paidLeave,
      sickleave: sickLeave,
      unpaidleave: unpaidLeave,
    };
  };

  // Fetch both salary and leave data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get token from localStorage
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("accessToken");

        if (!token) {
          throw new Error("No authentication token found. Please login again.");
        }

        // Validate token format
        if (token.trim() === "" || token === "undefined" || token === "null") {
          throw new Error("Invalid authentication token. Please login again.");
        }

        // Fetch salary data
        const salaryResponse = await fetch(
          "https://attendancebackends.onrender.com/admin/salarydetails/user",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (salaryResponse.status === 401) {
          throw new Error("Authentication failed. Please login again.");
        }

        if (!salaryResponse.ok) {
          throw new Error(`Salary API error! status: ${salaryResponse.status}`);
        }

        const salaryResult = await salaryResponse.json();

        // Fetch leave data
        const leaveResponse = await fetch(
          "https://attendancebackends.onrender.com/userleave",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (leaveResponse.status === 401) {
          throw new Error("Authentication failed. Please login again.");
        }

        if (!leaveResponse.ok) {
          throw new Error(`Leave API error! status: ${leaveResponse.status}`);
        }

        const leaveResult = await leaveResponse.json();

        // Process salary data
        if (
          salaryResult.message === "Fetched successfully" &&
          salaryResult.data
        ) {
          const sortedSalaryData = salaryResult.data.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setSalaryData(sortedSalaryData);
        } else {
          setSalaryData([]);
        }

        // Process leave data
        if (leaveResult.leaveData) {
          setLeaveData(leaveResult.leaveData);
        } else {
          setLeaveData([]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format month and year from date
  const formatMonthYear = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "approved":
        return "text-green-600 bg-green-50 border-green-200";
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <span className="text-sm text-gray-600">Loading salary data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-400 mb-2">⚠️</div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Error Loading Data
          </h3>
          <p className="text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!salaryData.length) {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-gray-400 mb-2">📊</div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            No Salary Data
          </h3>
          <p className="text-xs text-gray-600">No salary records found</p>
        </div>
      </div>
    );
  }

  const currentRecord = salaryData[selectedRecord];
  const attendanceData = calculateAttendance(currentRecord, leaveData);

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="pb-20">
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Salary Details
            </h3>
            <select
              value={selectedRecord}
              onChange={(e) => setSelectedRecord(parseInt(e.target.value))}
              className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-medium"
            >
              {salaryData.map((record, index) => (
                <option key={record._id} value={index}>
                  {new Date(record.createdAt).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Info */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Present Days</span>
              <span className="font-medium text-green-600">
                {attendanceData.present}
              </span>
            </div>
            {attendanceData.paidleave > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid Leave</span>
                <span className="font-medium text-blue-600">
                  {attendanceData.paidleave}
                </span>
              </div>
            )}
            {attendanceData.sickleave > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sick Leave</span>
                <span className="font-medium text-orange-600">
                  {attendanceData.sickleave}
                </span>
              </div>
            )}
            {attendanceData.unpaidleave > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unpaid Leave</span>
                <span className="font-medium text-red-600">
                  {attendanceData.unpaidleave}
                </span>
              </div>
            )}
          </div>

          {/* Salary Breakdown */}
          <div className="space-y-2 mb-4">
            {(currentRecord.addOnAmount || currentRecord.addOn) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Add-on ({currentRecord.addOnType || "bonus"})
                </span>
                <span className="font-medium text-green-600">
                  +₹{currentRecord.addOnAmount || currentRecord.addOn || 0}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-800">
                Payable Salary
              </span>
              <span className="text-lg font-bold text-gray-900">
                ₹{currentRecord.payable || 0}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Download Invoice</span>
            <button className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-200 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors">
              <span>Download</span>
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* Salary History */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Salary History
          </h3>
          <div className="space-y-2 pb-4">
            {salaryData.map((record, index) => (
              <div
                key={record._id}
                onClick={() => setSelectedRecord(index)}
                className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                  selectedRecord === index
                    ? "bg-purple-50 border-purple-200"
                    : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                }`}
              >
                <span className="text-sm font-medium text-gray-800">
                  {new Date(record.createdAt).toLocaleString("default", {
                    month: "long",
                  })}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  ₹{(record.payable || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Salary;

// import { useState, useEffect } from "react";
// import { Download, ChevronRight, Loader2 } from "lucide-react";

// const Salary = () => {
//   const [salaryData, setSalaryData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [selectedRecord, setSelectedRecord] = useState(0);

//   // Fetch salary data from API
//   useEffect(() => {
//     const fetchSalaryData = async () => {
//       try {
//         setLoading(true);

//         // Get token from localStorage
//         const token =
//           localStorage.getItem("token") ||
//           localStorage.getItem("authToken") ||
//           localStorage.getItem("accessToken");

//         if (!token) {
//           throw new Error("No authentication token found. Please login again.");
//         }

//         const response = await fetch(
//           "https://attendancebackends.onrender.com/admin/salarydetails/user",
//           {
//             method: "GET",
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/json",
//             },
//           }
//         );

//         if (response.status === 401) {
//           throw new Error("Authentication failed. Please login again.");
//         }

//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }

//         const result = await response.json();

//         if (result.message === "Fetched successfully" && result.data) {
//           // Sort by creation date (newest first)
//           const sortedData = result.data.sort(
//             (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//           );
//           setSalaryData(sortedData);
//         } else {
//           setSalaryData([]);
//         }
//       } catch (err) {
//         console.error("Error fetching salary data:", err);
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSalaryData();
//   }, []);

//   // Format date to readable format
//   const formatDate = (dateString) => {
//     if (!dateString) return "";
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-IN", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });
//   };

//   // Format month and year from date
//   const formatMonthYear = (dateString) => {
//     if (!dateString) return "";
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-IN", {
//       year: "numeric",
//       month: "long",
//     });
//   };

//   // Get status color
//   const getStatusColor = (status) => {
//     switch (status?.toLowerCase()) {
//       case "pending":
//         return "text-orange-600 bg-orange-50 border-orange-200";
//       case "approved":
//         return "text-green-600 bg-green-50 border-green-200";
//       case "rejected":
//         return "text-red-600 bg-red-50 border-red-200";
//       default:
//         return "text-gray-600 bg-gray-50 border-gray-200";
//     }
//   };

//   if (loading) {
//     return (
//       <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
//         <div className="flex flex-col items-center gap-3">
//           <Loader2 className="animate-spin text-purple-600" size={32} />
//           <span className="text-sm text-gray-600">Loading salary data...</span>
//         </div>
//       </div>
//     );
//   }

//   if (!salaryData.length) {
//     return (
//       <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
//         <div className="text-center p-6">
//           <div className="text-gray-400 mb-2">📊</div>
//           <h3 className="text-sm font-semibold text-gray-800 mb-2">
//             No Salary Data
//           </h3>
//           <p className="text-xs text-gray-600">No salary records found</p>
//         </div>
//       </div>
//     );
//   }

//   const currentRecord = salaryData[selectedRecord];

//   return (
//     <div className="max-w-sm mx-auto bg-white min-h-screen">
//       {/* Header */}
//       <div className="pb-20">
//         <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
//           <div className="flex justify-between items-center mb-4">
//             <h3 className="text-sm font-semibold text-gray-700">
//               Salary Details
//             </h3>
//             <select
//               value={selectedRecord}
//               onChange={(e) => setSelectedRecord(parseInt(e.target.value))}
//               className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-medium"
//             >
//               {salaryData.map((record, index) => (
//                 <option key={record._id} value={index}>
//                   {new Date(record.createdAt).toLocaleString("default", {
//                     month: "long",
//                   })}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Employee Info */}
//           <div className="space-y-2 mb-4">
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">Present</span>
//               <span className="font-medium text-gray-800">
//                 {currentRecord.present || "N/A"}
//               </span>
//             </div>
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">Piad Leave</span>
//               <span className="font-medium text-gray-800">
//                 {currentRecord.paidleave || "N/A"}
//               </span>
//             </div>
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">Sick Levae</span>
//               <span className="font-medium text-gray-800 capitalize">
//                 {currentRecord.sickleave || "N/A"}
//               </span>
//             </div>
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">Unpaid Leave</span>
//               <span className="font-medium text-gray-800 capitalize">
//                 {currentRecord.unpiadleave || "N/A"}
//               </span>
//             </div>
//           </div>

//           {/* Salary Breakdown */}
//           <div className="space-y-2 mb-4">
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">Base Salary</span>
//               <span className="font-medium text-gray-800">
//                 ₹{currentRecord.actualSalary || 0}
//               </span>
//             </div>
//             {(currentRecord.addOnAmount || currentRecord.addOn) && (
//               <div className="flex justify-between text-sm">
//                 <span className="text-gray-600">
//                   Add-on ({currentRecord.addOnType || "bonus"})
//                 </span>
//                 <span className="font-medium text-green-600">
//                   +₹{currentRecord.addOnAmount || currentRecord.addOn || 0}
//                 </span>
//               </div>
//             )}
//           </div>

//           <div className="border-t border-gray-200 pt-3 mb-4">
//             <div className="flex justify-between items-center mb-2">
//               <span className="text-sm font-semibold text-gray-800">
//                 Payable Salary
//               </span>
//               <span className="text-lg font-bold text-gray-900">
//                 ₹{currentRecord.payable || 0}
//               </span>
//             </div>
//           </div>

//           <div className="flex justify-between items-center">
//             <span className="text-xs text-gray-500">Download Invoice</span>
//             <button className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-200 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors">
//               <span>Download</span>
//               <Download size={12} />
//             </button>
//           </div>
//         </div>

//         {/* Salary History */}
//         <div className="mb-8">
//           <h3 className="text-sm font-semibold text-gray-700 mb-3">
//             Salary History
//           </h3>
//           <div className="space-y-2 pb-4">
//             {salaryData.map((record, index) => (
//               <div
//                 key={record._id}
//                 onClick={() => setSelectedRecord(index)}
//                 className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
//                   selectedRecord === index
//                     ? "bg-purple-50 border-purple-200"
//                     : "bg-gray-50 border-gray-100 hover:bg-gray-100"
//                 }`}
//               >
//                 <span className="text-sm font-medium text-gray-800">
//                   {new Date(record.createdAt).toLocaleString("default", {
//                     month: "long",
//                   })}
//                 </span>
//                 <span className="text-sm font-bold text-gray-900">
//                   ₹{(record.payable || 0).toLocaleString()}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Salary;
