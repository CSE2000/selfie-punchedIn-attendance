import React from "react";

const LogoutModal = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 text-center">
        <h2 className="text-xl font-semibold mb-1 text-gray-800">
          See you soon!
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          You're about to log out. Come back anytime.
        </p>
        <div className="flex justify-between gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-[#6E62FF] text-white rounded-lg hover:bg-indigo-700"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
