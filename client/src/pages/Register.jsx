import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

function Register() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            navigate("/login");

        } catch (error) {
            console.error("Registration Error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="body-container">
                <div className="container">
                    <div className="welcome-section">
                        <div className="shape-triangle-right"></div>
                        <div className="shape-triangle-bottom"></div>

                        <div className="auth-logo">
                            <img src="favicon.jpg" alt="favicon" className="logo-img" />
                        </div>

                        <h2 className="welcome-title">Welcome Back!</h2>
                        <div className="welcome-divider"></div>
                        <p className="welcome-text">
                            To keep connected with us please login with your personal info.
                        </p>
                        <button
                            className="btn-signup-outline"
                            type="button"
                            onClick={() => navigate("/login")}
                        >
                            Login
                        </button>
                    </div>

                    <div className="sign-in-section">
                    
                        <div className="form-wrapper">
                            <h1 className="title">Create Account</h1>
                            <div className="divider"></div>

                            <p className="subtitle">use your email for registration</p>

                            <form onSubmit={handleRegister} className="form">
                                <div className="input-box active-field">
                                    <label for="name">Username</label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Deepak"
                                    />
                                </div>
                                <div className="input-box">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                    />
                                </div>
                                <div className="input-box">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a password"
                                    />
                                </div>
                                <div className="input-box">
                                    <label>Confirm Password</label>
                                    <input
                                        type="password"
                                        id="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                    />
                                </div>
                                {error && (
                                    <p className="auth-error">
                                        {error}
                                    </p>
                                )}
                                <div className="form-options">
                                    <label className="remember-me">
                                        <input type="checkbox" required />
                                        <span>I agree to the <a href="#">Terms &amp; Conditions</a></span>
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={loading}>
                                    {loading ? (
                                        <span className="button-spinner"></span>
                                    ) : (
                                        "Register"
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="footer-links">
                            <a href="#">Privacy Policy</a> &nbsp;•&nbsp; <a href="#">Terms &amp; Condtions</a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
export default Register;