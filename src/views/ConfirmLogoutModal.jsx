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
            {punchOutTime || "05:45 PM"}
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
