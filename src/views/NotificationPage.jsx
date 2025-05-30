import React, { useEffect, useState } from "react";
import { FiUser, FiCalendar, FiCheckCircle } from "react-icons/fi";
import { io } from "socket.io-client";
import axios from "axios";
import Image from "../assets/Group (1).svg";

const Notification = () => {
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Initialize socket only once
  useEffect(() => {
    const newSocket = io("https://attendancebackends.onrender.com/", {
      autoConnect: false,
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);
    return () => {
      console.log("🧹 Cleaning up socket connection");
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        console.log("🔍 Fetching userId...");
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("❌ No token found in localStorage.");
          return;
        }

        const response = await axios.get(
          "https://attendancebackends.onrender.com/data",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("📊 Full user data response:", response.data);

        // Check for userID inside punchData if not found at top level
        const id =
          response?.data?.userID ||
          response?.data?.userId ||
          response?.data?.id ||
          response?.data?.punchData?.[0]?.userID ||
          response?.data?.data?.userID; // Additional check

        if (id) {
          setUserId(id);
          console.log("✅ Fetched userId:", id);
        } else {
          console.error(
            "❌ userId not found in response. Available keys:",
            Object.keys(response.data)
          );
          // Fallback - try to extract from any nested object
          const extractUserId = (obj) => {
            for (const key in obj) {
              if (
                key.toLowerCase().includes("userid") ||
                key.toLowerCase().includes("user_id")
              ) {
                return obj[key];
              }
              if (typeof obj[key] === "object" && obj[key] !== null) {
                const nested = extractUserId(obj[key]);
                if (nested) return nested;
              }
            }
            return null;
          };

          const extractedId = extractUserId(response.data);
          if (extractedId) {
            setUserId(extractedId);
            console.log("✅ Extracted userId:", extractedId);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching userId:", error);
      }
    };

    fetchUserId();
  }, []);

  // Handle socket connection and events
  useEffect(() => {
    if (!socket || !userId) {
      console.log("⏳ Waiting for socket or userId...", {
        socket: !!socket,
        userId,
      });
      return;
    }

    console.log("🚀 Setting up socket connection for userId:", userId);

    // Connection event handlers
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setConnectionStatus("connected");

      // Register the user
      console.log("📝 Registering user:", userId);
      socket.emit("register", userId);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setConnectionStatus("error");
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      setConnectionStatus("connected");
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error);
    });

    // Notification handler
    socket.on("notification", (message) => {
      console.log("📩 New Notification received:", message);

      let icon = <FiUser size={20} />;
      let title = "New Notification";

      if (message.toLowerCase().includes("leave")) {
        icon = <FiCalendar size={20} />;
        title = "Leave Notification";
      } else if (
        message.toLowerCase().includes("pin") ||
        message.toLowerCase().includes("system")
      ) {
        icon = <FiCheckCircle size={20} />;
        title = "System Notification";
      }

      const newNotification = {
        id: Date.now(),
        title,
        message:
          typeof message === "string" ? message : JSON.stringify(message),
        icon,
        time: new Date().toLocaleTimeString(),
      };

      console.log("➕ Adding notification:", newNotification);
      setNotifications((prev) => [newNotification, ...prev]);
    });

    // Test notification handler (for debugging)
    socket.on("test-notification", (data) => {
      console.log("🧪 Test notification received:", data);
    });

    // Connect the socket
    socket.connect();

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket event listeners");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("reconnect_error");
      socket.off("notification");
      socket.off("test-notification");
    };
  }, [socket, userId]);

  const markAsRead = (id) => {
    console.log("✅ Marking notification as read:", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Test function to simulate notification
  const testNotification = () => {
    const testNote = {
      id: Date.now(),
      title: "Test Notification",
      message: "This is a test notification to verify the system is working",
      icon: <FiCheckCircle size={20} />,
      time: new Date().toLocaleTimeString(),
    };
    setNotifications((prev) => [testNote, ...prev]);
    console.log("🧪 Test notification added");
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
        <div className="flex flex-col items-center justify-center mt-20 text-center text-gray-600">
          <img src={Image} alt="No notifications" className="w-32 h-32 mb-4" />
          <p className="font-semibold text-lg">You're all caught up!</p>
          <p className="text-sm">No new notifications at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default Notification;
