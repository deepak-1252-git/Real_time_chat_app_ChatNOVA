import { useState } from "react";
import { useNavigate } from "react-router-dom";

function ProfileMenu({ user }) {

    const [menuOpen, setMenuOpen] =
        useState(false);

    const navigate = useNavigate();

    const handleLogout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setMenuOpen(false);

        navigate("/login", {
            replace: true
        });
    };

    return (
        <div className="profile-menu">

            <div className="profile-info">

                <div className="profile-avatar">
                    👤
                </div>

                <div>
                    <h2>
                        {user?.username || "My Account"}
                    </h2>
                    <span>
                        ChatNOVA
                    </span>
                </div>

            </div>


            <div className="profile-menu-wrapper">

                <button
                    className="profile-menu-button"
                    onClick={() =>
                        setMenuOpen(!menuOpen)
                    }
                >
                    ⋮
                </button>


                {menuOpen && (

                    <div className="profile-dropdown">

                        <button>
                            👤 Profile
                        </button>

                        <button>
                            ⚙️ Settings
                        </button>

                        <button
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            🚪 Logout
                        </button>

                    </div>

                )}

            </div>

        </div>
    );
}

export default ProfileMenu;