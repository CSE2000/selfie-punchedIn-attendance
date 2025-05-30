// // socket.js
// import { io } from "socket.io-client";
// import axios from "axios";

// let socket = null;

// export const connectSocketWithUserId = async () => {
//   try {
//     const token = localStorage.getItem("token");

//     const res = await axios.get("https://attendancebackends.onrender.com/data", {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     const userId = res.data.empId;

//     socket = io("http://192.168.1.8:8000", {
//       auth: {
//         userId: userId,
//       },
//     });

//     socket.on("connect", () => {
//       console.log("✅ Connected to Socket.IO as", userId);
//     });

//     socket.on("notification", (data) => {
//       console.log("📩 Notification received:", data);
//       // You can update your notification state here
//     });

//     socket.on("disconnect", () => {
//       console.log("🔌 Disconnected from Socket.IO");
//     });
//   } catch (error) {
//     console.error("❌ Error connecting to socket:", error.message);
//   }
// };

// export const getSocket = () => socket;
