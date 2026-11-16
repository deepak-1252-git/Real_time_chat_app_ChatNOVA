import { useEffect, useState } from "react";
import { UserRound } from 'lucide-react';

function Avatar({
    src,
    name = "User",
    size = 44,
    className = "",
    title
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
            aria-label={`${name || "User"} avatar`}
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
        </div>
    );
}

export default Avatar;
