import { useEffect, useState } from "react";
import Avatar from "./Avatar";

function ProfileModal({ onClose, user: fallbackUser, onProfileUpdated }) {
    const [profile, setProfile] = useState(fallbackUser || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [username, setUsername] = useState(fallbackUser?.username || "");
    const [saving, setSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const loadProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/users/me`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: controller.signal
                    }
                );
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Unable to load profile");
                }

                setProfile(data.user);
                setUsername(data.user.username || "");
                localStorage.setItem("user", JSON.stringify(data.user));
                onProfileUpdated?.(data.user);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message || "Unable to load profile");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        loadProfile();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleUsernameSave = async (event) => {
        event.preventDefault();
        const trimmedUsername = username.trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(trimmedUsername)) {
            setError("Username must be 3–20 characters and contain only letters, numbers, or underscores.");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ username: trimmedUsername })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to update username");
            }
            setProfile(data.user);
            setUsername(data.user.username);
            localStorage.setItem("user", JSON.stringify(data.user));
            onProfileUpdated?.(data.user);
            setEditing(false);
        } catch (err) {
            setError(err.message || "Unable to update username");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setError("Please select a JPG, PNG, or WEBP image.");
            event.target.value = "";
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be 2 MB or smaller.");
            event.target.value = "";
            return;
        }
        setError("");
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) return;
        setUploadingAvatar(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("avatar", avatarFile);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/avatar`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Unable to upload profile picture");
            setProfile(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            onProfileUpdated?.(data.user);
            setAvatarFile(null);
            setAvatarPreview("");
        } catch (err) {
            setError(err.message || "Unable to upload profile picture");
        } finally {
            setUploadingAvatar(false);
        }
    };

    useEffect(() => {
        return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
    }, [avatarPreview]);

    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric"
        })
        : "Not available";

    return (
        <div className="profile-modal-backdrop" onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
                <div className="profile-modal-heading">
                    <h2 id="profile-modal-title">Your Profile</h2>
                    <button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close profile">×</button>
                </div>

                {loading ? (
                    <p className="profile-modal-message">Loading profile...</p>
                ) : !profile ? (
                    <p className="profile-modal-error" role="alert">{error || "Unable to load profile"}</p>
                ) : (
                    <>
                        <div className="profile-modal-user">
                            <Avatar
                                src={avatarPreview || profile?.profilePicture}
                                name={profile?.username || "Your profile"}
                                className="profile-modal-avatar"
                                size={84}
                            />
                            <label className="profile-avatar-change">
                                {avatarFile ? "Choose a different image" : "Change profile picture"}
                                <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handleAvatarSelect} disabled={uploadingAvatar} aria-label="Choose profile picture" />
                            </label>
                            {avatarFile && (
                                <div className="profile-avatar-actions">
                                    {/* <span>{avatarFile.name}</span> */}
                                    <button type="button" onClick={handleAvatarUpload} disabled={uploadingAvatar}>{uploadingAvatar ? "Uploading..." : "Upload picture"}</button>
                                    <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(""); setError(""); }} disabled={uploadingAvatar}>Cancel</button>
                                </div>
                            )}
                            <h3>{profile?.username || "User"}</h3>
                            <span className={`profile-status ${profile?.status === "online" ? "is-online" : ""}`}>
                                {profile?.status || "offline"}
                            </span>
                        </div>
                        <div className="profile-details">
                            <div><span>Email</span><strong>{profile?.email || "Not available"}</strong></div>
                            <div className="profile-username-row">
                                <span>Username</span>
                                {editing ? (
                                    <form className="profile-edit-form" onSubmit={handleUsernameSave}>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(event) => setUsername(event.target.value)}
                                            minLength={3}
                                            maxLength={20}
                                            autoComplete="username"
                                            aria-label="New username"
                                            disabled={saving}
                                        />
                                        <div className="profile-edit-actions">
                                            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                                            <button type="button" onClick={() => { setEditing(false); setUsername(profile?.username || ""); setError(""); }} disabled={saving}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="profile-username-value">
                                        <strong>{profile?.username || "Not available"}</strong>
                                        <button type="button" onClick={() => { setEditing(true); setError(""); }}>Edit</button>
                                    </div>
                                )}
                            </div>
                            <div><span>Member since</span><strong>{memberSince}</strong></div>
                        </div>
                        {error && <p className="profile-modal-error" role="alert">{error}</p>}
                    </>
                )}
            </section>
        </div>
    );
}

export default ProfileModal;