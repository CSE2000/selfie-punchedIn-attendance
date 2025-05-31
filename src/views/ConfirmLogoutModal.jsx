// import React, { useState } from "react";
// import axios from "axios";

// const ConfirmLogoutModal = ({
//   isOpen,
//   onCancel,
//   onNext,
//   punchOutTime,
//   onPunchOutSuccess,
//   onPunchOutError,
// }) => {
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   if (!isOpen) return null;

//   const handlePunchOut = async () => {
//     const token = localStorage.getItem("token");
//     const punchInId = localStorage.getItem("punchInId");

//     if (!punchInId) {
//       if (onPunchOutError) {
//         onPunchOutError("Punch in ID not found. You need to punch in first.");
//       } else {
//         alert("Punch in ID not found. You need to punch in first.");
//       }
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const punchOutTime = new Date().toISOString();

//       console.log("Submitting punch-out data:", {
//         punchInId,
//         punchOut: punchOutTime,
//       });
//       const response = await axios.put(
//         `https://attendancebackends.onrender.com/${punchInId}`,
//         { punchOut: punchOutTime },
//         {
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch out API response:", response.data);

//       if (response.status === 200) {
//         const punchOutTimeFormatted = new Date(punchOutTime).toLocaleString();
//         localStorage.removeItem("punchInId");

//         console.log("Punch out recorded successfully:", response.data);

//         if (onPunchOutSuccess) {
//           onPunchOutSuccess({
//             success: true,
//             message: `✅ PUNCHED OUT SUCCESSFULLY on ${punchOutTimeFormatted}`,
//             data: response.data.updatedData || response.data,
//           });
//         }
//         if (onNext) {
//           onNext();
//         }
//       } else {
//         const errorMessage =
//           response.data.message || "❌ Punch Out Failed. Try again.";

//         if (onPunchOutError) {
//           onPunchOutError(errorMessage);
//         } else {
//           alert(errorMessage);
//         }
//       }
//     } catch (error) {
//       console.error("Error during punch out:", error);

//       let errorMessage = "Error punching out. Please try again.";
//       if (error.response) {
//         if (error.response.status === 404) {
//           errorMessage = "Punch in record not found. Please punch in first.";
//         } else if (error.response.status === 405) {
//           errorMessage = "Method not allowed. Please contact support.";
//         } else {
//           errorMessage = error?.response?.data?.message || errorMessage;
//         }
//       } else {
//         errorMessage =
//           "Network error. Please check your connection and try again.";
//       }

//       if (onPunchOutError) {
//         onPunchOutError(errorMessage);
//       } else {
//         alert(errorMessage);
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
//       <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 text-center">
//         <div className="mb-4">
//           <div className="inline-block bg-gray-100 text-gray-800 rounded-lg px-4 py-1 text-xs font-medium">
//             Punch out time
//           </div>
//           <div className="mt-1 text-2xl font-bold text-[#6E62FF]">
//             {punchOutTime ||
//               new Date().toLocaleTimeString([], {
//                 hour: "2-digit",
//                 minute: "2-digit",
//               })}
//           </div>
//         </div>
//         <h2 className="text-lg font-semibold mb-2 text-gray-800">
//           You're about to punch out.
//         </h2>
//         <p className="text-sm text-gray-500 mb-6">
//           Make sure you've completed all tasks for the day.
//         </p>
//         <div className="flex justify-between gap-4">
//           <button
//             onClick={onCancel}
//             disabled={isSubmitting}
//             className="flex-1 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handlePunchOut}
//             disabled={isSubmitting}
//             className="flex-1 py-2 bg-[#6E62FF] text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {isSubmitting ? "Punching Out..." : "Punch Out"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ConfirmLogoutModal;

import React from "react";

const ConfirmLogoutModal = ({ isOpen, onCancel, onNext, punchOutTime }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 text-center">
        <div className="mb-4">
          <div className="inline-block bg-gray-100 text-gray-800 rounded-lg px-4 py-1 text-xs font-medium">
            Punch out time
          </div>
          <div className="mt-1 text-2xl font-bold text-[#6E62FF]">
            {punchOutTime || "06:30 PM"}
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-2 text-gray-800">
          You're about to punch out.
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Make sure you've completed all tasks for the day.
        </p>
        <div className="flex justify-between gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onNext}
            className="flex-1 py-2 bg-[#6E62FF] text-white rounded-lg hover:bg-indigo-700"
          >
            Punch Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLogoutModal;
