import { useCallback, useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function useDiscoverUsers(query) {
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const requestRef = useRef(0);

    const load = useCallback(async ({ reset = false } = {}) => {
        const requestId = ++requestRef.current;
        const targetPage = reset ? 1 : page;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({ page: String(targetPage), limit: "20", q: query.trim() });
            const response = await fetch(`${API}/api/users/discover?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Could not discover users");
            if (requestId !== requestRef.current) return;
            setUsers((current) => reset ? (data.users || []) : [...current, ...(data.users || [])]);
            setPage(targetPage + 1);
            setHasMore(Boolean(data.pagination?.hasMore));
        } catch (err) {
            if (requestId === requestRef.current) setError(err.message || "Could not discover users");
        } finally {
            if (requestId === requestRef.current) setLoading(false);
        }
    }, [page, query]);

    useEffect(() => {
        const timer = setTimeout(() => { setPage(1); load({ reset: true }); }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) load({ reset: false });
    }, [hasMore, loading, load]);

    const updateRelation = (userId, relation) => setUsers((items) => items.map((item) => String(item.userId) === String(userId) ? { ...item, relation } : item));
    return { users, loading, hasMore, error, loadMore, refresh: () => { setPage(1); load({ reset: true }); }, updateRelation };
}
