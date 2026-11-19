import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../socket";

function DeleteAccountModal({ onClose }) {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [loading, onClose]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        if (!password.trim()) {
            setError("Enter your current password to continue.");
            return;
        }

        const confirmed = window.confirm("This permanently deletes your ChatNOVA account and all messages. This action cannot be undone. Continue?");
        if (!confirmed) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Unable to delete account");

            socket.disconnect();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("chatnova_theme");
            localStorage.removeItem("chatnova_notification_sound");
            localStorage.removeItem("chatnova_notification_sound_type");
            localStorage.removeItem("chatnova_show_online_status");
            navigate("/login", { replace: true, state: { message: "Your account has been deleted." } });
        } catch (requestError) {
            setError(requestError.message || "Unable to delete account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-modal-backdrop delete-account-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
            <section className="profile-modal delete-account-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
                <div className="profile-modal-heading">
                    <h2 id="delete-account-title">Delete account</h2>
                    <button type="button" className="profile-modal-close" onClick={onClose} disabled={loading} aria-label="Close delete account dialog">×</button>
                </div>
                <div className="delete-account-warning" role="alert">
                    <strong>This action is permanent.</strong> Your account and all messages sent or received by this account will be deleted. You cannot undo this.
                </div>
                <form className="change-password-form" onSubmit={handleSubmit}>
                    <label>
                        <span>current password</span>
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={loading} autoFocus />
                    </label>
                    <label className="change-password-show-toggle">
                        <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} disabled={loading} />
                        <span>Show password</span>
                    </label>
                    {error && <p className="profile-modal-error" role="alert">{error}</p>}
                    <div className="change-password-actions">
                        <button type="button" className="change-password-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="delete-account-submit" disabled={loading || !password.trim()}>{loading ? "Deleting..." : "Permanently delete"}</button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default DeleteAccountModal;
