import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AttendanceDetails from "./views/AttendanceDetail";
import SelfieLocationPunchIn from "./views/SelfieLocationPunchedIn";
import Profile from "./views/Profile";
import BankDetails from "./views/BankDetails";
import EmployeeInfo from "./views/EmployeeInfo";
import ViewFileDetail from "./views/ViewFileDetails";
import PersonalInfo from "./views/PersonalInfo";
import Document from "./views/Document";
import LeaveRequest from "./views/LeaveRequest";
import Salary from "./views/Salary";
import Topbar from "./views/Topbar";
import Holiday from "./views/Holiday";
import NotificationPage from "./views/NotificationPage";
import LoginPage from "./views/LoginPage";
import HomePage from "./views/HomePage";
import SelfiePunchedIn from "./views/SelfiePunchedIn";
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/" element={<SelfiePunchedIn />} />
          <Route path="/attendance-details" element={<AttendanceDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bank-details" element={<BankDetails />} />
          <Route path="/employee-info" element={<EmployeeInfo />} />
          <Route path="/view-file" element={<ViewFileDetail />} />
          <Route path="/personal-info" element={<PersonalInfo />} />
          <Route path="/document-center" element={<Document />} />
          <Route path="/leave" element={<LeaveRequest />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/holiday" element={<Holiday />} />
          <Route path="/notification" element={<NotificationPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
