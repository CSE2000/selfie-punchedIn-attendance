export const handleLogout = (navigate, setIsMenuOpen = () => {}) => {
  localStorage.removeItem("authState");
  localStorage.removeItem("token");

  setIsMenuOpen(false);
  navigate("/login", { replace: true });
};
