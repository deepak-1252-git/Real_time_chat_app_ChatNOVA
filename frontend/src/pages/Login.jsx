import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

function Login() {

    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="body-container">
                <div className="container">

                    <div className="sign-in-section">
                        <div className="brand-header">
                            <span>!</span> ChatNOVA
                        </div>

                        <div className="form-wrapper">
                            <h1 className="title">Sign into Account</h1>
                            <div className="divider"></div>

                            <p className="subtitle">use your registered email</p>

                            <form onSubmit={handleLogin} className="form">
                                <div className="input-box active-field">
                                    <label for="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter email"
                                        required
                                    />
                                </div>


                                <div className="input-box">
                                    <label>Password</label>

                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>


                                <div className="form-options">
                                    <label className="remember-me">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        Remember me
                                    </label>
                                    <a href="#" className="forgot-link">Forgot Password?</a>
                                </div>

                                {error && (
                                    <p className="auth-error">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={loading}>
                                    {loading ? (
                                        <span className="button-spinner"></span>
                                    ) : (
                                        "Login"
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="footer-links">
                            <a href="#">Privacy Policy</a> &nbsp;•&nbsp; <a href="#">Terms &amp; Condtions</a>
                        </div>
                    </div>


                    <div className="welcome-section">
                        <div className="shape-triangle-left"></div>
                        <div className="shape-triangle-bottom"></div>

                        <div className="auth-logo">
                            <img src="favicon.jpg" alt="favicon" className="logo-img" />
                        </div>

                        <h2 className="welcome-title">Hello,Friend!</h2>
                        <div className="welcome-divider"></div>
                        <p className="welcome-text">
                            Fill up personal information and start journey with us.
                        </p>
                        <button
                            className="btn-signup-outline"
                            type="button"
                            onClick={() => navigate("/register")}
                        >
                            Register
                        </button>
                    </div>
                </div >
            </div >
        </>
    );
}

export default Login;