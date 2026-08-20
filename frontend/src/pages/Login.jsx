import { useState } from "react";
import { Link , useNavigate } from "react-router-dom";
import "../styles/auth.css";

function Login() {

    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                localStorage.setItem(
                    "token",
                    data.token
                );
                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

                navigate("/chat");
            } else {
                setError(data.message || "Login failed");
            }

        } catch (error) {
            console.error("Login Error:", error);
            setError("Server error. Please try again.");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/favicon.jpg" alt="favicon" className="logo-img" />
                </div>

                <h1>Welcome Back</h1>

                <p className="auth-subtitle">
                    Login to continue to ChatNOVA
                </p>

                <form onSubmit={handleLogin}>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email"
                        />
                    </div>


                    <div className="form-group">
                        <label>Password</label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter password"
                        />
                    </div>

                    {error && (
                        <p className="auth-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="auth-button"
                    >
                        Login
                    </button>

                </form>


                <p className="auth-switch">
                    Don't have an account?

                    <button
                        type="button"
                        onClick={() => navigate("/register")}
                    >
                        Register
                    </button>
                </p>

            </div>

        </div>
    );
}

export default Login;