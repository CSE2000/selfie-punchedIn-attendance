// MainLayout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopBar from "../views/Topbar";
import Menu from "../views/Menu";

const MainLayout = () => {
  const location = useLocation();
  const path = location.pathname.split("/")[1] || "";

  // Hide menu on these routes
  const hideMenuRoutes = [
    "",
    "personal-info",
    "bank-details",
    "employee-info",
    "document-center",
  ];

  // Hide topbar on these routes
  const hideTopBarRoutes = [
    "",
  ];

  const shouldHideMenu = hideMenuRoutes.includes(path);
  const shouldHideTopBar = hideTopBarRoutes.includes(path);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Show TopBar only if not in the hide routes */}
      {!shouldHideTopBar && <TopBar pageTitle={path} />}

      <main className={`flex-1 p-4 ${shouldHideTopBar ? "pt-4" : ""}`}>
        <Outlet />
      </main>

      {/* Show menu only if not in profile-related routes */}
      {!shouldHideMenu && <Menu />}
    </div>
  );
};

export default MainLayout;

// // MainLayout.jsx
// import React from "react";
// import { Outlet, useLocation } from "react-router-dom";
// import TopBar from "../views/Topbar";
// import Menu from "../views/Menu";

// const MainLayout = () => {
//   const location = useLocation();
//   const path = location.pathname.split("/")[1] || "";

//   // Hide menu on these routes
//   const hideMenuRoutes = [
//     "",
//     "personal-info",
//     "bank-details",
//     "employee-info",
//     "document-center",
//   ];

//   const shouldHideMenu = hideMenuRoutes.includes(path);

//   return (
//     <div className="min-h-screen flex flex-col">
//       <TopBar pageTitle={path} />
//       <main className="flex-1 p-4">
//         <Outlet />
//       </main>
//       {/* Show menu only if not in profile-related routes */}
//       {!shouldHideMenu && <Menu />}
//     </div>
//   );
// };

// export default MainLayout;

// src/layouts/MainLayout.jsx
// import React from "react";
// import { Outlet } from "react-router-dom";
// import TopBar from "../views/Topbar";
// import Menu from "../views/Menu";

// const MainLayout = () => {
//   return (
//     <div className="min-h-screen flex flex-col">
//       <TopBar />
//       <main className="flex-1 p-4">
//         <Outlet />
//       </main>
//       <Menu/>
//     </div>
//   );
// };

// export default MainLayout;
