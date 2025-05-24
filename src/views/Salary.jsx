import { useState } from "react";
import { Download, ChevronRight } from "lucide-react";

const SalaryInfo = () => {
  const [selectedMonth, setSelectedMonth] = useState(4); // May (0-indexed)

  // Base salary configuration
  const baseSalary = 30000;
  const yearlyPaidLeave = 14;

  // Company holidays for the year (festivals, national holidays)
  const companyHolidays = [
    "2025-01-01",
    "2025-01-26",
    "2025-03-14",
    "2025-08-09",
    "2025-08-15",
    "2025-08-16",
    "2025-10-02",
    "2025-10-20",
    "2025-10-21",
    "2025-10-22",
    "2025-12-25",
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

  const generateMonthlyAttendance = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      month === today.getMonth() && year === today.getFullYear();

    let workingDays = 0;
    let presentDays = 0;
    let paidLeaveDays = 0;
    let sickLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let totalPaidLeaveUsed = 0;

    // Calculate paid leave used in previous months
    for (let m = 0; m < month; m++) {
      const prevMonthDays = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= prevMonthDays; d++) {
        const date = new Date(year, m, d);
        if (!isWeekendOrHoliday(date) && d % 8 === 0) {
          totalPaidLeaveUsed++;
        }
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);

      // Skip future dates in current month
      if (isCurrentMonth && date > today) break;

      // Skip weekends and holidays (these don't count as working days)
      if (isWeekendOrHoliday(date)) continue;

      workingDays++;

      // Generate attendance pattern
      if (day % 8 === 0) {
        // Leave every 8th working day
        if (totalPaidLeaveUsed < yearlyPaidLeave) {
          if (Math.random() > 0.7) {
            // 30% chance it's sick leave
            sickLeaveDays++;
          } else {
            paidLeaveDays++;
          }
          totalPaidLeaveUsed++;
        } else {
          unpaidLeaveDays++;
        }
      } else if (day % 5 === 0) {
        // Half day counts as 0.5 present day
        presentDays += 0.5;
      } else {
        presentDays++;
      }
    }

    return {
      workingDays,
      presentDays: Math.round(presentDays),
      paidLeaveDays,
      sickLeaveDays,
      unpaidLeaveDays,
      totalPaidLeaveUsed,
    };
  };

  const generateMonthlyData = () => {
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

    const currentYear = 2025;
    const data = [];

    for (let month = 0; month <= 4; month++) {
      // January to May
      const attendance = generateMonthlyAttendance(currentYear, month);
      const totalDaysInMonth = new Date(currentYear, month + 1, 0).getDate();

      // Calculate salary
      const paidDays =
        attendance.presentDays +
        attendance.paidLeaveDays +
        attendance.sickLeaveDays;
      const perDaySalary = baseSalary / attendance.workingDays;
      const payableSalary = Math.round(perDaySalary * paidDays);

      data.push({
        month: monthNames[month],
        monthIndex: month,
        totalDays: totalDaysInMonth,
        workingDays: attendance.workingDays,
        present: attendance.presentDays,
        paidLeave: attendance.paidLeaveDays,
        sickLeave: attendance.sickLeaveDays,
        unpaidLeave: attendance.unpaidLeaveDays,
        baseSalary,
        payableSalary,
        perDaySalary: Math.round(perDaySalary),
      });
    }

    return data;
  };

  const monthlyData = generateMonthlyData();
  const currentMonthData = monthlyData.find(
    (item) => item.monthIndex === selectedMonth
  );

  if (!currentMonthData) return <div>Loading...</div>;

  const {
    month,
    totalDays,
    workingDays,
    present,
    paidLeave,
    sickLeave,
    unpaidLeave,
    payableSalary,
    perDaySalary,
  } = currentMonthData;

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="pb-20">
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              This Month's Salary
            </h3>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-medium"
            >
              {monthlyData.map((item) => (
                <option key={item.monthIndex} value={item.monthIndex}>
                  {item.month}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Present</span>
              <span className="font-medium text-gray-800">{present} Days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid leaves</span>
              <span className="font-medium text-gray-800">
                {paidLeave} days
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sick leaves</span>
              <span className="font-medium text-gray-800">
                {sickLeave} days
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unpaid leaves</span>
              <span className="font-medium text-gray-800">
                {unpaidLeave} days
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">
                Payable salary
              </span>
              <span className="text-lg font-bold text-gray-900">
                ₹{payableSalary}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Download info</span>
            <button className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-200 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors">
              <span>Download</span>
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* Salary Breakdown */}
        {/* <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Salary Breakdown
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Salary</span>
              <span className="font-medium text-gray-800">
                ₹{baseSalary.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Working Days</span>
              <span className="font-medium text-gray-800">
                {workingDays} days
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Per Day Salary</span>
              <span className="font-medium text-gray-800">₹{perDaySalary}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Days</span>
              <span className="font-medium text-gray-800">
                {present + paidLeave + sickLeave} days
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-800">Final Amount</span>
                <span className="text-gray-900">
                  ₹{payableSalary.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div> */}

        {/* Salary History */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Salary History
          </h3>
          <div className="space-y-2 pb-4">
            {monthlyData.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {item.month}
                  </span>
                  <p className="text-xs text-gray-500">
                    {item.present + item.paidLeave + item.sickLeave}/
                    {item.workingDays} paid days
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    ₹{item.payableSalary.toLocaleString()}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryInfo;

// import { useState } from "react";
// import { FiDownload, FiChevronRight } from "react-icons/fi";

// const SalaryInfo = () => {
//   const monthlyData = [
//     {
//       month: "January",
//       totalDays: 31,
//       present: 22,
//       paidLeave: 4,
//       sickLeave: 2,
//       unpaidLeave: 3,
//       baseSalary: 30000,
//     },
//     {
//       month: "February",
//       totalDays: 29,
//       present: 20,
//       paidLeave: 5,
//       sickLeave: 1,
//       unpaidLeave: 3,
//       baseSalary: 30000,
//     },
//     {
//       month: "March",
//       totalDays: 31,
//       present: 21,
//       paidLeave: 6,
//       sickLeave: 2,
//       unpaidLeave: 2,
//       baseSalary: 30000,
//     },
//     {
//       month: "April",
//       totalDays: 30,
//       present: 23,
//       paidLeave: 2,
//       sickLeave: 1,
//       unpaidLeave: 4,
//       baseSalary: 30000,
//     },
//     {
//       month: "May",
//       totalDays: 31,
//       present: 23,
//       paidLeave: 5,
//       sickLeave: 1,
//       unpaidLeave: 1,
//       baseSalary: 30000,
//     },
//   ];

//   const [selectedMonth, setSelectedMonth] = useState("May");

//   const currentMonthData = monthlyData.find(
//     (item) => item.month === selectedMonth
//   );

//   const { totalDays, present, paidLeave, sickLeave, unpaidLeave, baseSalary } =
//     currentMonthData;

//   const paidDays = present + paidLeave + sickLeave;
//   const perDaySalary = baseSalary / totalDays;
//   const payableSalary = Math.round(perDaySalary * paidDays);

//   return (
//     <div className="max-w-sm mx-auto bg-white rounded-xl shadow-md">
//       {/* This Month's Salary Box */}
//       <div className="bg-gray-100 rounded-lg p-2 mb-4">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-sm font-semibold text-gray-700">
//             This Month’s Salary
//           </h3>
//           <select
//             value={selectedMonth}
//             onChange={(e) => setSelectedMonth(e.target.value)}
//             className="text-sm bg-white border border-gray-300 rounded px-2 py-1"
//           >
//             {monthlyData.map((item) => (
//               <option key={item.month} value={item.month}>
//                 {item.month}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="text-xs text-gray-600 space-y-1 mb-3">
//           <div className="flex justify-between">
//             <span>Present</span>
//             <span>{present} Days</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Paid leaves</span>
//             <span>{paidLeave} days</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Sick leaves</span>
//             <span>{sickLeave} days</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Unpaid leaves</span>
//             <span>{unpaidLeave} days</span>
//           </div>
//         </div>

//         <div className="flex justify-between items-center border-t pt-2 text-sm font-semibold text-gray-800">
//           <span>Payable salary</span>
//           <span className="text-black">₹{payableSalary}</span>
//         </div>

//         <div className="mt-2 flex justify-between items-center text-xs">
//           <span className="text-gray-500">Download info</span>
//           <button className="flex items-center gap-1 text-xs text-purple-600 border border-purple-500 px-2 py-1 rounded-full">
//             Download <FiDownload size={14} />
//           </button>
//         </div>
//       </div>

//       {/* Salary History List */}
//       <div className="space-y-2">
//         {monthlyData.map((item, i) => {
//           const daysPaid = item.present + item.paidLeave + item.sickLeave;
//           const amount = Math.round(
//             (item.baseSalary / item.totalDays) * daysPaid
//           );
//           return (
//             <div
//               key={i}
//               className="flex justify-between items-center px-2 py-2 rounded-lg bg-gray-50 shadow-sm text-sm"
//             >
//               <span>{item.month}</span>
//               <span className="font-semibold flex items-center gap-1">
//                 ₹{amount}
//                 <FiChevronRight size={14} />
//               </span>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default SalaryInfo;
