import { useEffect, useState } from "react";

const DEFAULT_SETTINGS = {
    theme: "light",
    notificationSound: true,
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
                localStorage.setItem("chatnova_show_online_status", String(next.showOnlineStatus));
            } catch (loadError) {
                if (active) {
                    const savedTheme = localStorage.getItem("chatnova_theme") || "light";
                    const savedSound = localStorage.getItem("chatnova_notification_sound") !== "false";
                    const savedOnline = localStorage.getItem("chatnova_show_online_status") !== "false";
                    setSettings({ theme: savedTheme, notificationSound: savedSound, showOnlineStatus: savedOnline });
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
    }, [onClose, savingKey]);

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
                            <select aria-label="Theme" value={settings.theme} disabled={Boolean(savingKey)} onChange={(event) => updateSetting("theme", event.target.value)}>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>

                        <div className="settings-option">
                            <div><strong>Notification sound</strong><span>Play a sound when a new message arrives outside the open chat.</span></div>
                            <button type="button" role="switch" aria-checked={settings.notificationSound} aria-label="Notification sound" className={`settings-switch ${settings.notificationSound ? "is-on" : ""}`} disabled={Boolean(savingKey)} onClick={() => updateSetting("notificationSound", !settings.notificationSound)}><span /></button>
                        </div>

                        <div className="settings-option">
                            <div><strong>Show online status</strong><span>When off, other users won't see you in their online users list.</span></div>
                            <button type="button" role="switch" aria-checked={settings.showOnlineStatus} aria-label="Show online status" className={`settings-switch ${settings.showOnlineStatus ? "is-on" : ""}`} disabled={Boolean(savingKey)} onClick={() => updateSetting("showOnlineStatus", !settings.showOnlineStatus)}><span /></button>
                        </div>
                    </div>
                )}
                {savingKey && <p className="settings-saving">Saving...</p>}
                {error && <p className="profile-modal-error" role="alert">{error}</p>}
                {notice && !error && <p className="settings-success" role="status">{notice}</p>}
            </section>
        </div>
    );
}

export default SettingsModal;
