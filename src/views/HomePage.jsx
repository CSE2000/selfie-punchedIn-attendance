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

  // Update current time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Function to simulate punch in from camera component
  const simulatePunchIn = () => {
    const now = new Date();
    const punchInTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Create today's attendance entry
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

    const attendanceEntry = {
      date: todayStr,
      status: "Present",
      punchIn: punchInTime.split(":")[0] + ":" + punchInTime.split(":")[1],
      punchOut: "Out Pending",
    };

    setTodayAttendance(attendanceEntry);
    setIsPunchedIn(true);
    setPunchInTime(now);
  };

  // Function to update today's attendance on punch out
  const updateTodayAttendance = (punchOutTime) => {
    if (todayAttendance) {
      const punchInHour = parseInt(todayAttendance.punchIn.split(":")[0]);
      const punchInMinute = parseInt(todayAttendance.punchIn.split(":")[1]);
      const punchOutHour = parseInt(punchOutTime.split(":")[0]);
      const punchOutMinute = parseInt(punchOutTime.split(":")[1]);

      // Company rules: 10:05 AM to 18:30 (6:30 PM)
      const expectedPunchIn = { hour: 10, minute: 5 };
      const expectedPunchOut = { hour: 18, minute: 30 };

      let status = "Present";

      // Check if late punch in (after 10:06)
      if (punchInHour > 10 || (punchInHour === 10 && punchInMinute > 6)) {
        status = "Late";
      }

      // Check if early punch out (before 18:30)
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

  // Check if user came from camera component (simulate punch in)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("punched") === "in") {
      simulatePunchIn();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePunch = () => {
    if (!isPunchedIn) {
      // Navigate to camera for punch in
      window.location.href = "/";
    } else {
      // Punching out
      const now = new Date();
      const punchOutTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Update today's attendance
      updateTodayAttendance(punchOutTime);

      setIsPunchedIn(false);
      setPunchInTime(null);
      alert(`You have punched out at ${now.toLocaleTimeString()}`);
    }
  };

  const generateMockAttendance = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      month === today.getMonth() && year === today.getFullYear();

    const data = [];
    let saturdayCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

      // Don't show future dates for current month
      if (isCurrentMonth && date > today) break;

      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      // Skip Sundays
      if (dayOfWeek === 0) continue;

      // Skip first two Saturdays (assuming they're off days)
      if (dayOfWeek === 6) {
        saturdayCount++;
        if (saturdayCount <= 2) continue;
      }

      let status,
        punchIn = null,
        punchOut = null;

      // Generate realistic attendance patterns
      if (day % 5 === 0) {
        status = "Absent";
      } else if (day % 3 === 0) {
        status = "Halfday";
        punchIn = "10:05";
        punchOut = ["02:30", "03:00", "03:30"][Math.floor(Math.random() * 3)];
      } else {
        status = "Present";
        punchIn = "10:05";
        punchOut = "06:30";
      }

      data.push({ date: dateStr, status, punchIn, punchOut });
    }

    return data;
  };

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const mockData = generateMockAttendance(currentYear, selectedMonth);

    // Add today's attendance if it exists
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

    let finalData = mockData;
    if (todayAttendance && selectedMonth === today.getMonth()) {
      // Remove existing today entry and add updated one
      finalData = mockData.filter((entry) => entry.date !== todayStr);
      finalData.unshift(todayAttendance); // Add to beginning
    }

    const summary = {
      present: finalData.filter(
        (d) => d.status === "Present" || d.status === "Late"
      ).length,
      leave: finalData.filter((d) => d.status === "Halfday").length,
      absent: finalData.filter((d) => d.status === "Absent").length,
    };

    // Reverse to show most recent dates first (but today should already be first)
    setMonthlyAttendance(finalData);
    setAttendanceSummary(summary);
  }, [selectedMonth, todayAttendance]);

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

      {/* Demo: Simulate Camera Punch In */}
      {!isPunchedIn && (
        <div className="bg-blue-50 p-4 rounded-xl mb-4 text-center">
          <p className="text-sm text-blue-800 mb-2">
            Demo: Simulate camera punch-in process
          </p>
          <button
            onClick={simulatePunchIn}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Simulate Camera Punch In
          </button>
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
        <h2 className="font-semibold text-md mb-2">This Month's Attendance</h2>
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

      <div className="space-y-2 mb-24">
        {monthlyAttendance
          .filter((entry) =>
            selectedStatus === "All" ? true : entry.status === selectedStatus
          )
          .map((entry, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-gray-100 p-3 rounded-xl"
            >
              <div>
                <p className="text-sm font-bold">{formatDate(entry.date)}</p>
                <p className="text-xs text-gray-600">
                  {getWeekday(entry.date)}
                  <br />
                  {getOutTimeText(entry)}
                </p>
              </div>
              <span className={`font-medium ${getStatusColor(entry.status)}`}>
                {entry.status}
              </span>
            </div>
          ))}
      </div>

      {/* Punch In/Out Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-16">
        <button
          className={`w-full max-w-sm mx-auto block py-3 rounded-xl shadow-md text-lg font-semibold ${
            isPunchedIn
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
          onClick={handlePunch}
        >
          {isPunchedIn ? "Punch Out" : "Punch In"}
        </button>
      </div>
    </div>
  );
};

export default HomePage;

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// const HomePage = () => {
//   const navigate = useNavigate();
//   const [selectedStatus, setSelectedStatus] = useState("All");
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
//   const [attendanceSummary, setAttendanceSummary] = useState({
//     present: 0,
//     leave: 0,
//     absent: 0,
//   });
//   const [monthlyAttendance, setMonthlyAttendance] = useState([]);

//   const [isPunchedIn, setIsPunchedIn] = useState(() => {
//     // load initial state from localStorage
//     return localStorage.getItem("isPunchedIn") === "true";
//   });

//   // Save to localStorage when state changes
//   useEffect(() => {
//     localStorage.setItem("isPunchedIn", isPunchedIn.toString());
//   }, [isPunchedIn]);

//   const handlePunch = () => {
//     if (!isPunchedIn) {
//       // navigate to Punch In page
//       navigate("/");
//     } else {
//       // user is punching out
//       setIsPunchedIn(false);
//       alert("You have punched out!");
//     }
//   };

//   // Simulate that user punched in on selfie page
//   useEffect(() => {
//     const url = window.location.pathname;
//     if (url === "/") {
//       setIsPunchedIn(true);
//     }
//   }, []);

//   const generateMockAttendance = (year, month) => {
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const today = new Date();
//     const isCurrentMonth =
//       month === today.getMonth() && year === today.getFullYear();

//     const data = [];
//     let saturdayCount = 0;

//     for (let day = 1; day <= daysInMonth; day++) {
//       const date = new Date(year, month, day);
//       const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

//       if (isCurrentMonth && date > today) break;

//       const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day
//         .toString()
//         .padStart(2, "0")}`;

//       if (dayOfWeek === 0) continue;
//       if (dayOfWeek === 6) {
//         saturdayCount++;
//         if (saturdayCount <= 2) continue;
//       }

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

//     const summary = {
//       present: mockData.filter((d) => d.status === "Present").length,
//       leave: mockData.filter((d) => d.status === "Halfday").length,
//       absent: mockData.filter((d) => d.status === "Absent").length,
//     };

//     setMonthlyAttendance(mockData.reverse());
//     setAttendanceSummary(summary);
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
//   const statusOptions = ["All", "Present", "Absent", "Halfday"];

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

//   return (
//     <div className="max-w-sm mx-auto bg-white min-h-screen">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-4">
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
//       <div className="flex justify-between gap-2 mb-4">
//         <div className="flex-1 bg-green-100 p-4 rounded-xl text-center">
//           <p className="text-sm font-semibold">Present</p>
//           <p className="text-xl font-bold text-green-600">
//             {attendanceSummary.present}
//           </p>
//         </div>
//         <div className="flex-1 bg-red-100 p-4 rounded-xl text-center">
//           <p className="text-sm font-semibold">Absent</p>
//           <p className="text-xl font-bold text-red-600">
//             {attendanceSummary.absent}
//           </p>
//         </div>
//         <div className="flex-1 bg-yellow-100 p-4 rounded-xl text-center">
//           <p className="text-sm font-semibold">Leave</p>
//           <p className="text-xl font-bold text-yellow-600">
//             {attendanceSummary.leave}
//           </p>
//         </div>
//       </div>

//       {/* Attendance List */}
//       <div className="flex items-center justify-between mb-2">
//         <h2 className="font-semibold text-md mb-2">This Month's Attendance</h2>
//         <select
//           className="border rounded px-2 py-1 text-sm"
//           value={selectedStatus}
//           onChange={(e) => setSelectedStatus(e.target.value)}
//         >
//           {statusOptions.map((status, i) => (
//             <option key={i} value={status}>
//               {status}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="space-y-2">
//         {monthlyAttendance
//           .filter((entry) =>
//             selectedStatus === "All" ? true : entry.status === selectedStatus
//           )
//           .map((entry, idx) => (
//             <div
//               key={idx}
//               className="flex justify-between items-center bg-gray-100 p-3 rounded-xl"
//             >
//               <div>
//                 <p className="text-sm font-bold">{formatDate(entry.date)}</p>
//                 <p className="text-xs text-gray-600">
//                   {getWeekday(entry.date)}
//                   <br />
//                   {getOutTimeText(entry)}
//                 </p>
//               </div>
//               <span className={`font-medium ${getStatusColor(entry.status)}`}>
//                 {entry.status}
//               </span>
//             </div>
//           ))}
//       </div>

//       {/* Punch In/Out Button */}
//       <button
//         className="w-full mt-6 bg-indigo-600 text-white py-3 mb-14 rounded-xl shadow-md text-lg font-semibold sticky bottom-20"
//         onClick={handlePunch}
//       >
//         {isPunchedIn ? "Punch Out" : "Punch In"}
//       </button>
//     </div>
//   );
// };

// export default HomePage;
