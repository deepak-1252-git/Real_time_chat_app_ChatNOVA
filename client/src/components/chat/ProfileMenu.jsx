import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileModal from "./ProfileModal";
import SettingsModal from "./SettingsModal";
import Avatar from "./Avatar";
import socket from "../../socket";

function ProfileMenu({ user }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(user);
    const menuRef = useRef(null);

    useEffect(() => { setCurrentUser(user); }, [user]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!menuOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setMenuOpen(false);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
                if (!items?.length) return;
                event.preventDefault();
                const current = Array.from(items).indexOf(document.activeElement);
                const direction = event.key === "ArrowDown" ? 1 : -1;
                const next = (current + direction + items.length) % items.length;
                items[next].focus();
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [menuOpen]);

    const handleLogout = () => {
        socket.disconnect();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setMenuOpen(false);
        navigate("/login", { replace: true });
    };

    const openProfile = () => {
        setMenuOpen(false);
        setProfileOpen(true);
    };

    const openSettings = () => {
        setMenuOpen(false);
        setSettingsOpen(true);
    };

    return (
        <>
            <div className="profile-menu">
                <div className="profile-info">
                    <Avatar
                        src={currentUser?.profilePicture}
                        name={currentUser?.username || "My Account"}
                        className="profile-avatar"
                        size={42}
                    />
                    <div>
                        <h2>{currentUser?.username || "My Account"}</h2>
                        <span>ChatNOVA</span>
                    </div>
                </div>

                <div className="profile-menu-wrapper" ref={menuRef}>
                    <button
                        type="button"
                        className="profile-menu-button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label="Open profile menu"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                    >
                        ⋮
                    </button>

                    {menuOpen && (
                        <div className="profile-dropdown" role="menu" aria-label="Profile options">
                            <button type="button" role="menuitem" onClick={openProfile}>👤 Profile</button>
                            <button type="button" role="menuitem" onClick={openSettings}>⚙️ Settings</button>
                            <button type="button" role="menuitem" className="logout-button" onClick={handleLogout}>🚪 Logout</button>
                        </div>
                    )}
                </div>
            </div>

            {profileOpen && <ProfileModal user={currentUser} onProfileUpdated={setCurrentUser} onClose={() => setProfileOpen(false)} />}
            {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
        </>
    );
}

export default ProfileMenu;
