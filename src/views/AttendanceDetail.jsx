import { useEffect, useState } from "react";
import { Calendar, Filter } from "lucide-react";

const AttendanceMobile = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

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

  const monthlyHolidayConfig = {
    0: 7, // January: 4 Sundays + 2 Saturdays + 1 festival = 7 paid holidays
    1: 6, // February: 4 Sundays + 2 Saturdays = 6 paid holidays
    2: 7, // March: 4 Sundays + 2 Saturdays + 1 festival = 7 paid holidays
    3: 6, // April: 4 Sundays + 2 Saturdays = 6 paid holidays
    4: 6, // May: 4 Sundays + 2 Saturdays = 6 paid holidays
    5: 6, // June: 4 Sundays + 2 Saturdays = 6 paid holidays
    6: 6, // July: 4 Sundays + 2 Saturdays = 6 paid holidays
    7: 8, // August: 4 Sundays + 2 Saturdays + 2 festivals = 8 paid holidays
    8: 6, // September: 4 Sundays + 2 Saturdays = 6 paid holidays
    9: 9, // October: 4 Sundays + 2 Saturdays + 3 festivals = 9 paid holidays
    10: 6, // November: 4 Sundays + 2 Saturdays = 6 paid holidays
    11: 7, // December: 4 Sundays + 2 Saturdays + 1 festival = 7 paid holidays
  };

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

  const generateMockAttendance = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      month === today.getMonth() && year === today.getFullYear();
    const data = [];

    let totalPaidLeaveUsed = 0; // Track paid leave used across all months up to current month

    // Calculate paid leave used in previous months (mock calculation)
    for (let m = 0; m < month; m++) {
      const prevMonthDays = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= prevMonthDays; d++) {
        const date = new Date(year, m, d);
        if (!isWeekendOrHoliday(date) && d % 8 === 0) {
          // Mock: every 8th working day is leave
          totalPaidLeaveUsed++;
        }
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];

      // Skip future dates in current month
      if (isCurrentMonth && date > today) break;

      // Skip weekends and holidays
      if (isWeekendOrHoliday(date)) continue;

      let status,
        punchIn = null,
        punchOut = null,
        leaveType = null;

      // Generate mock attendance pattern
      if (day % 8 === 0) {
        // Leave every 8th working day
        if (totalPaidLeaveUsed < 14) {
          status = "Absent";
          leaveType = "Paid";
          totalPaidLeaveUsed++;
        } else {
          status = "Absent";
          leaveType = "Unpaid";
        }
      } else if (day % 5 === 0) {
        // Half day every 5th working day
        status = "Halfday";
        punchIn = "10:05";
        punchOut = ["02:30", "03:00", "03:30"][Math.floor(Math.random() * 3)];
      } else {
        status = "Present";
        punchIn = "10:05";
        punchOut = "06:30";
      }

      data.push({
        date: dateStr,
        status,
        punchIn,
        punchOut,
        leaveType,
        day: date.getDate(),
        weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
      });
    }

    return { data: data.reverse(), totalPaidLeaveUsed };
  };

  useEffect(() => {
    const { data: mockData, totalPaidLeaveUsed } = generateMockAttendance(
      selectedYear,
      selectedMonth
    );

    const present = mockData.filter((d) => d.status === "Present").length;
    const halfday = mockData.filter((d) => d.status === "Halfday").length;
    const absentEntries = mockData.filter((d) => d.status === "Absent");
    const paidLeaves = absentEntries.filter(
      (d) => d.leaveType === "Paid"
    ).length;
    const unpaidLeaves = absentEntries.filter(
      (d) => d.leaveType === "Unpaid"
    ).length;
    const medical = Math.floor(paidLeaves * 0.3); // Mock: 30% of paid leaves are medical

    const availableLeave = Math.max(0, 14 - totalPaidLeaveUsed);

    setMonthlyAttendance(mockData);
    setAttendanceSummary({
      present,
      halfday,
      absent: absentEntries.length,
      medical,
      leaveUsed: totalPaidLeaveUsed,
      availableLeave,
      unpaidLeave: unpaidLeaves,
    });
  }, [selectedMonth, selectedYear]);

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
        return "text-green-600 bg-green-50";
      case "Absent":
        return "text-red-500 bg-red-50";
      case "Halfday":
        return "text-orange-500 bg-orange-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  const getOutTimeText = (entry) => {
    if (entry.status === "Present" || entry.status === "Halfday") {
      return `${entry.punchIn} am - ${entry.punchOut} pm`;
    } else {
      return "00:00 am - 00:00 pm";
    }
  };

  const filteredAttendance = monthlyAttendance.filter((entry) => {
    if (fromDate && new Date(entry.date) < new Date(fromDate)) return false;
    if (toDate && new Date(entry.date) > new Date(toDate)) return false;
    return true;
  });

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

      {/* Attendance List */}
      <div className="space-y-3">
        {filteredAttendance.map((entry, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">
                {new Date(entry.date).getDate()}{" "}
                {monthNames[new Date(entry.date).getMonth()]}{" "}
                {new Date(entry.date).getFullYear()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{entry.weekday}</p>
              <p className="text-xs text-gray-600 mt-1">
                {getOutTimeText(entry)}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  entry.status
                )}`}
              >
                {entry.status}
              </span>
              {entry.status === "Absent" && entry.leaveType && (
                <span className="text-xs text-gray-500 mt-1">
                  {/* ({entry.leaveType}) */}
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredAttendance.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No attendance records found for the selected period.
          </div>
        )}
      </div>
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

// import { useEffect, useState } from "react";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";

// const AttendanceMobile = () => {
//   const [showCalendar, setShowCalendar] = useState(false);
//   const [dateRange, setDateRange] = useState(null);

//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [attendanceSummary, setAttendanceSummary] = useState({
//     present: 0,
//     absent: 0,
//     halfday: 0,
//     leaveUsed: 0,
//     availableLeave: 0,
//     medical: 0,
//   });
//   const [monthlyAttendance, setMonthlyAttendance] = useState([]);

//   const holidayList = [
//     "2025-01-01",
//     "2025-01-26",
//     "2025-03-14",
//     "2025-08-09",
//     "2025-08-15",
//     "2025-08-16",
//     "2025-10-02",
//     "2025-10-20",
//     "2025-10-21",
//     "2025-10-22",
//     "2025-12-25",
//   ];

//   const generateMockAttendance = (year, month) => {
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const today = new Date();
//     const isCurrentMonth =
//       month === today.getMonth() && year === today.getFullYear();
//     const data = [];
//     let saturdayCount = 0;

//     for (let day = 1; day <= daysInMonth; day++) {
//       const date = new Date(year, month, day);
//       const dateStr = date.toISOString().split("T")[0];
//       const dayOfWeek = date.getDay();

//       if (isCurrentMonth && date > today) break;
//       if (dayOfWeek === 0) continue;
//       if (dayOfWeek === 6) {
//         saturdayCount++;
//         if (saturdayCount <= 2) continue;
//       }
//       if (holidayList.includes(dateStr)) continue;

//       let status,
//         punchIn = null,
//         punchOut = null;
//       if (day % 5 === 0) {
//         status = "Absent";
//       } else if (day % 3 === 0) {
//         status = "Halfday";
//         punchIn = "10:05";
//         punchOut = ["02:30", "03:00", "03:30"][Math.floor(Math.random() * 3)];
//       } else {
//         status = "Present";
//         punchIn = "10:05";
//         punchOut = "06:30";
//       }

//       data.push({ date: dateStr, status, punchIn, punchOut });
//     }

//     return data;
//   };

//   useEffect(() => {
//     const currentYear = new Date().getFullYear();
//     const mockData = generateMockAttendance(currentYear, selectedMonth);

//     const present = mockData.filter((d) => d.status === "Present").length;
//     const halfday = mockData.filter((d) => d.status === "Halfday").length;
//     const absentEntries = mockData.filter((d) => d.status === "Absent");
//     const leaveUsed = absentEntries.length;
//     const medical = absentEntries.filter((d) =>
//       holidayList.includes(d.date)
//     ).length;

//     const availableLeave = Math.max(0, 14 - leaveUsed);

//     setMonthlyAttendance(mockData.reverse());
//     setAttendanceSummary({
//       present,
//       halfday,
//       absent: leaveUsed,
//       medical,
//       leaveUsed,
//       availableLeave,
//     });
//   }, [selectedMonth]);

//   const monthNames = [
//     "January",
//     "February",
//     "March",
//     "April",
//     "May",
//     "June",
//     "July",
//     "August",
//     "September",
//     "October",
//     "November",
//     "December",
//   ];

//   const formatDate = (dateStr) => {
//     const date = new Date(dateStr);
//     return date.toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "long",
//       year: "numeric",
//     });
//   };

//   const getWeekday = (dateStr) => {
//     const date = new Date(dateStr);
//     return date.toLocaleDateString("en-US", { weekday: "long" });
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "Present":
//         return "text-green-600";
//       case "Absent":
//         return "text-red-500";
//       case "Halfday":
//         return "text-yellow-500";
//       default:
//         return "text-gray-500";
//     }
//   };

//   const getOutTimeText = (entry) => {
//     if (entry.status === "Present" || entry.status === "Halfday") {
//       return `${entry.punchIn} am - ${entry.punchOut} pm`;
//     } else {
//       return "00:00";
//     }
//   };

//   const filteredAttendance = monthlyAttendance.filter((entry) => {
//     if (fromDate && new Date(entry.date) < new Date(fromDate)) return false;
//     if (toDate && new Date(entry.date) > new Date(toDate)) return false;
//     return true;
//   });

//   return (
//     <div className="max-w-sm mx-auto bg-white min-h-screen">
//       {/* Header with Month Picker */}
//       <div className="flex items-center justify-between mb-4 gap-2">
//         <h1 className="text-lg font-bold">Your attendance</h1>
//         <select
//           className="border rounded px-2 py-1 text-sm"
//           value={selectedMonth}
//           onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
//         >
//           {monthNames.map((m, i) => (
//             <option value={i} key={i}>
//               {m}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-3 gap-3 mb-4">
//         <SummaryCard
//           label="Present"
//           value={attendanceSummary.present}
//           color="green"
//         />
//         <SummaryCard
//           label="Absent"
//           value={attendanceSummary.absent}
//           color="red"
//         />
//         <SummaryCard
//           label="Leave Used"
//           value={attendanceSummary.leaveUsed}
//           color="yellow"
//         />
//         <SummaryCard
//           label="Halfday"
//           value={attendanceSummary.halfday}
//           color="orange"
//         />
//         <SummaryCard
//           label="Medical"
//           value={attendanceSummary.medical}
//           color="blue"
//         />
//         <SummaryCard
//           label="Available Leave"
//           value={attendanceSummary.availableLeave}
//           color="gray"
//         />
//       </div>

//       {/* Attendance List */}
//       <div className="mb-2">
//         <h2 className="font-semibold text-md">
//           Attendance Records ({filteredAttendance.length})
//         </h2>
//       </div>

//       {/* Date Range Filter */}
//       <div className="flex gap-2 mb-4">
//         <input
//           type="date"
//           className="border px-2 py-1 rounded text-sm w-full"
//           value={fromDate}
//           onChange={(e) => setFromDate(e.target.value)}
//         />
//         <input
//           type="date"
//           className="border px-2 py-1 rounded text-sm w-full"
//           value={toDate}
//           onChange={(e) => setToDate(e.target.value)}
//         />
//       </div>

//       <div className="space-y-2">
//         {filteredAttendance.map((entry, idx) => (
//           <div
//             key={idx}
//             className="flex justify-between items-center bg-gray-100 p-3 rounded-xl"
//           >
//             <div>
//               <p className="text-sm font-bold">{formatDate(entry.date)}</p>
//               <p className="text-xs text-gray-600">
//                 {getWeekday(entry.date)}
//                 <br />
//                 {getOutTimeText(entry)}
//               </p>
//             </div>
//             <span className={`font-medium ${getStatusColor(entry.status)}`}>
//               {entry.status}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// const SummaryCard = ({ label, value, color }) => {
//   const bgMap = {
//     green: "bg-green-100 text-green-600",
//     red: "bg-red-100 text-red-600",
//     yellow: "bg-yellow-100 text-yellow-600",
//     orange: "bg-orange-100 text-orange-500",
//     blue: "bg-blue-100 text-blue-600",
//     gray: "bg-gray-100 text-gray-700",
//   };

//   return (
//     <div className={`p-3 rounded-xl text-center ${bgMap[color]}`}>
//       <p className="text-sm font-semibold">{label}</p>
//       <p className="text-xl font-bold">{value}</p>
//     </div>
//   );
// };

// export default AttendanceMobile;
