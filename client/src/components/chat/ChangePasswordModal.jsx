import { useEffect, useRef, useState } from "react";

function ChangePasswordModal({ onClose }) {
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPasswords, setShowPasswords] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const currentPasswordRef = useRef(null);

    useEffect(() => {
        currentPasswordRef.current?.focus();
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !busy) {
                event.stopPropagation();
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [onClose, busy]);

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");

        if (form.newPassword.length < 8) {
            setError("New password must be at least 8 characters long.");
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }
        if (form.currentPassword === form.newPassword) {
            setError("Your new password must be different from your current password.");
            return;
        }

        setBusy(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Unable to change password.");

            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setNotice(data.message || "Password changed successfully.");
        } catch (submitError) {
            setError(submitError.message || "Unable to change password.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="profile-modal-backdrop change-password-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) onClose();
            }}
        >
            <section className="profile-modal change-password-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
                <div className="profile-modal-heading">
                    <div>
                        <h2 id="change-password-title">Change password</h2>
                        <p className="change-password-subtitle">Choose a strong password with at least 8 characters.</p>
                    </div>
                    <button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close change password" disabled={busy}>×</button>
                </div>

                <form className="change-password-form" onSubmit={handleSubmit}>
                    <label>
                        <span>Current password</span>
                        <input ref={currentPasswordRef} type={showPasswords ? "text" : "password"} name="currentPassword" autoComplete="current-password" value={form.currentPassword} onChange={updateField} required disabled={busy} />
                    </label>
                    <label>
                        <span>New password</span>
                        <input type={showPasswords ? "text" : "password"} name="newPassword" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={updateField} required disabled={busy} />
                    </label>
                    <label>
                        <span>Confirm new password</span>
                        <input type={showPasswords ? "text" : "password"} name="confirmPassword" autoComplete="new-password" minLength={8} value={form.confirmPassword} onChange={updateField} required disabled={busy} />
                    </label>
                    <label className="change-password-show-toggle">
                        <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} disabled={busy} />
                        <span>Show passwords</span>
                    </label>

                    {error && <p className="settings-password-error" role="alert">{error}</p>}
                    {notice && <p className="settings-success" role="status">{notice}</p>}

                    <div className="change-password-actions">
                        <button type="button" className="change-password-cancel" onClick={onClose} disabled={busy}>Cancel</button>
                        <button type="submit" className="settings-password-submit" disabled={busy}>
                            {busy ? "Updating..." : "Update password"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default ChangePasswordModal;
