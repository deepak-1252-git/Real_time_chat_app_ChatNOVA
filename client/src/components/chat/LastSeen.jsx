function FormatLastSeen (value) {
    if (!value) return "Last seen unavailable";

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Last seen unavailable";

    const diff = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Last seen just now";
    if (minutes < 60) return `Last seen ${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "Last seen yesterday";
    if (days < 7) return `Last seen ${days}d ago`;

    return `Last seen ${new Date(value).toLocaleDateString([], {
        day: "numeric",
        month: "short"
    })}`;
}

export default FormatLastSeen;