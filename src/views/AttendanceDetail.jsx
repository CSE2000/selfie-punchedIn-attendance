const getOutTimeText = (entry) => {
    if (entry.status === "Present" || entry.status === "Halfday") {
      return `${entry.punchIn} am - ${entry.punchOut} pm`;
    } else {
      return "00:00 am - 00:00 pm";
    }
  };  const companyHolidays = [
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
  };import { useEffect, useState } from "react";
import { Calendar, Filter } from "lucide-react";
import axios from 'axios';

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

  useEffect(() => {
    const fetchUserLeave = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          console.error('No token found in localStorage');
          return;
        }

        const response = await axios.get('http://192.168.1.8:8000/userleave', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('=== API RESPONSE DEBUG ===');
        console.log('Raw API Response:', response);
        console.log('Response Data:', response.data);
        console.log('Response Data Type:', typeof response.data);
        console.log('Is Array:', Array.isArray(response.data));
        
        if (response.data) {
          console.log('Response Data Keys:', Object.keys(response.data));
          console.log('Response Data Values:', Object.values(response.data));
        }
        console.log('=== END API DEBUG ===');
        
        // Process the API response to extract leave data
        if (response.data) {
          const leaveData = response.data;
          
          // Calculate leave used from API data
          let totalLeaveUsed = 0;
          let medicalLeave = 0;
          let unpaidLeave = 0;
          
          console.log('Processing leave data...');
          
          // Check if API returns an array of leave records
          if (Array.isArray(leaveData)) {
            console.log('API returned array with', leaveData.length, 'items');
            leaveData.forEach((leave, index) => {
              console.log(`Leave Record ${index}:`, leave);
              
              if (leave.status === 'approved' || leave.status === 'taken' || leave.status === 'Approved' || leave.status === 'Taken') {
                const days = leave.days || leave.duration || 1;
                totalLeaveUsed += days;
                console.log(`Added ${days} days to total leave`);
                
                if (leave.type === 'medical' || leave.type === 'sick' || leave.leave_type === 'medical' || leave.leave_type === 'sick') {
                  medicalLeave += days;
                }
                
                if (leave.type === 'unpaid' || leave.leave_type === 'unpaid') {
                  unpaidLeave += days;
                }
              }
            });
          } 
          // Check if API returns summary data directly
          else if (typeof leaveData === 'object') {
            console.log('API returned object format');
            
            // Try different possible field names for leave count
            totalLeaveUsed = leaveData.leaveUsed || leaveData.leave_used || 
                           leaveData.totalLeaves || leaveData.total_leaves ||
                           leaveData.usedLeaves || leaveData.used_leaves ||
                           leaveData.count || leaveData.length || 0;
                           
            medicalLeave = leaveData.medicalLeave || leaveData.medical_leave || 
                          leaveData.medicalCount || leaveData.medical_count || 0;
                          
            unpaidLeave = leaveData.unpaidLeave || leaveData.unpaid_leave ||
                         leaveData.unpaidCount || leaveData.unpaid_count || 0;
            
            console.log('Extracted from object - Total:', totalLeaveUsed, 'Medical:', medicalLeave, 'Unpaid:', unpaidLeave);
          }
          // If data is a number directly
          else if (typeof leaveData === 'number') {
            console.log('API returned direct number:', leaveData);
            totalLeaveUsed = leaveData;
          }
          
          console.log('Final calculated values:');
          console.log('Total Leave Used:', totalLeaveUsed);
          console.log('Medical Leave:', medicalLeave);
          console.log('Unpaid Leave:', unpaidLeave);
          console.log('Available Leave:', Math.max(0, 14 - totalLeaveUsed));
          
          // Update attendance summary with real leave data
          setAttendanceSummary(prev => ({
            present: 0,
            absent: 0, 
            halfday: 0,
            leaveUsed: totalLeaveUsed,
            availableLeave: Math.max(0, 14 - totalLeaveUsed),
            medical: medicalLeave,
            unpaidLeave: unpaidLeave,
          }));
          
          console.log('Updated attendance summary with leave data');
        }
        
      } catch (error) {
        console.error('Error fetching user leave:', error);
      }
    };

    fetchUserLeave();
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