import { useEffect, useState } from "react";
import { MoonIcon, SunDimIcon } from 'lucide-react';
import { NOTIFICATION_SOUND_OPTIONS, playNotificationSound } from "../../utils/notificationSounds";
import ChangePasswordModal from './ChangePasswordModal';
import DeleteAccountModal from "./DeleteAccountModal";

const DEFAULT_SETTINGS = {
    theme: "light",
    notificationSound: true,
    notificationSoundType: "default",
    showOnlineStatus: true
};

function applyTheme(theme) {
    document.body.setAttribute("data-chatnova-theme", theme);
    localStorage.setItem("chatnova_theme", theme);
    window.dispatchEvent(new CustomEvent("chatnova:theme-changed", { detail: { theme } }));
}

function SettingsModal({ onClose }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        let active = true;
        const loadSettings = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Unable to load settings");
                const next = { ...DEFAULT_SETTINGS, ...(data.user?.preferences || {}) };
                if (!active) return;
                setSettings(next);
                applyTheme(next.theme);
                localStorage.setItem("chatnova_notification_sound", String(next.notificationSound));
                localStorage.setItem("chatnova_notification_sound_type", next.notificationSoundType || "default");
                localStorage.setItem("chatnova_show_online_status", String(next.showOnlineStatus));
            } catch (loadError) {
                if (active) {
                    const savedTheme = localStorage.getItem("chatnova_theme") || "light";
                    const savedSound = localStorage.getItem("chatnova_notification_sound") !== "false";
                    const savedOnline = localStorage.getItem("chatnova_show_online_status") !== "false";
                    const savedSoundType = localStorage.getItem("chatnova_notification_sound_type") || "default";
                    setSettings({ ...DEFAULT_SETTINGS, theme: savedTheme, notificationSound: savedSound, notificationSoundType: savedSoundType, showOnlineStatus: savedOnline });
                    applyTheme(savedTheme);
                    setError(loadError.message || "Could not load saved settings. Local preferences are shown.");
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        loadSettings();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !savingKey) onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose, savingKey, showPasswordModal]);

    const updateSetting = async (key, value) => {
        setError("");
        setNotice("");
        setSavingKey(key);
        const previous = settings;
        const next = { ...settings, [key]: value };
        setSettings(next);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/settings`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ [key]: value })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to save setting");

            setSettings({ ...DEFAULT_SETTINGS, ...(data.preferences || next) });
            if (key === "theme") applyTheme(value);
            if (key === "notificationSound") localStorage.setItem("chatnova_notification_sound", String(value));
            if (key === "notificationSoundType") localStorage.setItem("chatnova_notification_sound_type", value);
            if (key === "showOnlineStatus") localStorage.setItem("chatnova_show_online_status", String(value));
            setNotice("Setting saved.");
        } catch (saveError) {
            setSettings(previous);
            if (key === "theme") applyTheme(previous.theme);
            setError(saveError.message || "Unable to save setting");
        } finally {
            setSavingKey("");
        }
    };

    return (
        <div className="profile-modal-backdrop settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingKey) onClose(); }}>
            <section className="profile-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
                <div className="profile-modal-heading">
                    <h2 id="settings-modal-title">Settings</h2>
                    <button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close settings" disabled={Boolean(savingKey)}>×</button>
                </div>

                {loading ? <p className="profile-modal-message">Loading settings...</p> : (
                    <div className="settings-options">
                        <div className="settings-option">
                            <div><strong>Appearance</strong><span>Choose light or dark mode.</span></div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={settings.theme}
                                aria-label="Toggle dark mode"
                                className={`settings-switch ${settings.theme === "dark" ? "is-on" : ""}`}
                                disabled={Boolean(savingKey)}
                                onClick={() =>
                                    updateSetting(
                                        "theme",
                                        settings.theme === "light" ? "dark" : "light"
                                    )
                                }
                            >
                                <span>
                                    {settings.theme === "light" ? <SunDimIcon /> : <MoonIcon />}
                                </span>

                            </button>
                        </div>

                        <div className="settings-option">
                            <div><strong>Notification sound</strong><span>Play a sound when a new message arrives outside the open chat.</span></div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={settings.notificationSound}
                                aria-label="Notification sound"
                                className={`settings-switch ${settings.notificationSound ? "is-on" : ""}`}
                                disabled={Boolean(savingKey)}
                                onClick={() => updateSetting("notificationSound", !settings.notificationSound)}
                            ><span /></button>
                        </div>

                        <div className="settings-option settings-sound-option">
                            <div><strong>Notification tone</strong><span>Choose a sound and preview it before saving.</span></div>
                            <div className="settings-sound-controls">
                                <select
                                    aria-label="Notification tone"
                                    value={settings.notificationSoundType || "default"}
                                    disabled={Boolean(savingKey)}
                                    onChange={(event) => updateSetting("notificationSoundType", event.target.value)}
                                >
                                    {NOTIFICATION_SOUND_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="settings-preview-button"
                                    onClick={() => playNotificationSound(settings.notificationSoundType)}
                                    aria-label="Preview selected notification tone"
                                >
                                    ▶ Preview
                                </button>
                            </div>
                        </div>

                        <div className="settings-option">
                            <div><strong>Show online status</strong><span>When off, other users won't see you in their online users list.</span></div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={settings.showOnlineStatus}
                                aria-label="Show online status"
                                className={`settings-switch ${settings.showOnlineStatus ? "is-on" : ""}`}
                                disabled={Boolean(savingKey)}
                                onClick={() => updateSetting("showOnlineStatus", !settings.showOnlineStatus)}
                            ><span /></button>
                        </div>

                        <section className="settings-security-section" aria-labelledby="settings-security-title">
                            <div className="settings-password-heading">
                                <strong id="settings-security-title">Security</strong>
                                <span>Manage your account password and sign-in security.</span>
                            </div>
                            <div className="settings-password-card">
                                <div className="settings-password-card-copy">
                                    <strong>Change password</strong>
                                </div>
                                <button type="button" className="settings-password-open" onClick={() => setShowPasswordModal(true)} disabled={loading || Boolean(savingKey)}>Change password</button>
                            </div>
                            <div className="settings-password-card">
                                <div className="settings-password-card-copy">
                                    <strong>Delete account</strong>
                                </div>
                                <button type="button" className="settings-delete-open" onClick={() => setShowDeleteModal(true)} disabled={loading || Boolean(savingKey)}>Delete account</button>
                            </div>
                        </section>
                    </div>
                )}
                {savingKey && <p className="settings-saving">Saving...</p>}
                {error && <p className="profile-modal-error" role="alert">{error}</p>}
                {notice && !error && <p className="settings-success" role="status">{notice}</p>}
            </section>
            {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
            {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
        </div>
    );
}

export default SettingsModal;
