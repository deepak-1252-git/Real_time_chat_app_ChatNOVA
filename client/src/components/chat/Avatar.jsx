import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

function Avatar({
    src,
    name = "User",
    size = 44,
    className = "",
    title,
    isOnline = false
}) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [src]);

    const showImage = typeof src === "string" && src.trim() !== "" && !imageFailed;

    return (
        <div
            className={`avatar-root ${className}`.trim()}
            style={{ width: size, height: size, minWidth: size, minHeight: size }}
            role="img"
            aria-label={`${name || "User"} avatar${isOnline ? ", online" : ""}`}
            title={title || name}
        >
            {showImage ? (
                <img
                    src={src}
                    alt=""
                    className="avatar-image"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span className="avatar-fallback" aria-hidden="true">
                    <UserRound size={size * 0.55} />
                </span>
            )}
            <span
                className={`status-dot ${isOnline ? "online" : "offline"}`}
                aria-label={isOnline ? "Online" : "Offline"}
                title={isOnline ? "Online" : "Offline"}
                style={{
                    position: "absolute",
                    right: 0,
                    bottom: 1,
                    width: 11,
                    height: 11,
                    border: "2px solid var(--chat-panel, #fff)",
                    borderRadius: "50%",
                    margin: 0
                }}
            />

        </div>
    );
}

export default Avatar;
