import { useState } from "react";
import { FiUser, FiCalendar, FiCheckCircle, FiArrowLeft } from "react-icons/fi";
import Image from "../assets/Group (1).svg";

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Late Entry Notification",
      message:
        "You’ve punched in late today. Please inform your manager if needed.",
      icon: <FiUser size={20} />,
      time: "20m",
    },
    {
      id: 2,
      title: "Leave Approved",
      message: "Your leave for May 25 has been approved.",
      icon: <FiCalendar size={20} />,
      time: "20m",
    },
    {
      id: 3,
      title: "App/System Notifications",
      message: "PIN Changed Successfully",
      icon: <FiCheckCircle size={20} />,
      time: "20m",
    },
  ]);

  const markAsRead = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  return (
    <div className="max-w-md mx-auto">
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-white shadow-sm"
            >
              <div className="text-purple-600">{note.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{note.title}</p>
                <p className="text-sm text-gray-600">{note.message}</p>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <span>{note.time}</span>
                  <button
                    onClick={() => markAsRead(note.id)}
                    className="ml-4 text-purple-600 hover:underline"
                  >
                    Mark as Read
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state
        <div className="flex flex-col items-center justify-center mt-20 text-center text-gray-600">
          <img src={Image} alt="No notifications" className="w-32 h-32 mb-4" />
          <p className="font-semibold text-lg">You're all caught up!</p>
          <p className="text-sm">No new notifications at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
