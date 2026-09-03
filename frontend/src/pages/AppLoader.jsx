import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import "../styles/appLoader.css";

function AppLoader({ children }) {
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/users/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          const storedUser =
            localStorage.getItem("user");
          let user = {};
          if (storedUser) {
            try {
              user = JSON.parse(storedUser);
            } catch (error) {
              console.error(
                "Failed to parse stored user:",
                error
              );
            }
          }
          user.id = data.userId;
          localStorage.setItem(
            "user",
            JSON.stringify(user)
          );
          setIsAuthenticated(true);

        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (checkingAuth) {
    return (
      <div className="app-loader">
        <div className="loader-content">
          <div className="auth--logo">
            <img src="/favicon.jpg" alt="ChatNOVA" className="logo--img" />
          </div>
          <h2>ChatNOVA</h2>

          <div className="loader-stage">
            <div className="center-pin"></div>
            <div className="loader-spinner"></div>
            <div className="rope-arm">
              <div className="loader-logo">
                <img src="/favicon.jpg" alt="ChatNOVA" className="loader-img" />
              </div>
            </div>
          </div>
          <p>Loading...</p>
        </div>
      </div >
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default AppLoader;