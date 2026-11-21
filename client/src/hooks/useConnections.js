import { useCallback, useEffect, useState } from "react";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function useConnections({ onRequestReceived, onConnectionRemoved } = {}) {
    const [connections, setConnections] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        if (!localStorage.getItem("token")) return;
        setLoading(true);
        setError("");
        try {
            const [connectionResponse, requestResponse] = await Promise.all([
                fetch(`${API}/api/connections`, { headers: authHeaders() }),
                fetch(`${API}/api/connections/requests`, { headers: authHeaders() })
            ]);
            const connectionData = await connectionResponse.json();
            const requestData = await requestResponse.json();
            if (!connectionResponse.ok || !connectionData.success) throw new Error(connectionData.message || "Could not load connections");
            if (!requestResponse.ok || !requestData.success) throw new Error(requestData.message || "Could not load requests");
            setConnections(connectionData.connections || []);
            setIncoming(requestData.incoming || []);
            setOutgoing(requestData.outgoing || []);
        } catch (err) {
            setError(err.message || "Could not load connections");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const onRequest = (payload) => { onRequestReceived?.(payload); refresh(); };
        const onAccepted = () => refresh();
        const onRemoved = (payload) => { onConnectionRemoved?.(payload); refresh(); };
        socket.on("connectionRequestReceived", onRequest);
        socket.on("connectionAccepted", onAccepted);
        socket.on("connectionRemoved", onRemoved);
        return () => {
            socket.off("connectionRequestReceived", onRequest);
            socket.off("connectionAccepted", onAccepted);
            socket.off("connectionRemoved", onRemoved);
        };
    }, [refresh, onRequestReceived, onConnectionRemoved]);

    const request = async (userId) => {
        const response = await fetch(`${API}/api/connections/request/${userId}`, { method: "POST", headers: authHeaders() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Request failed");
        await refresh();
        return data;
    };
    const accept = async (connectionId) => {
        const response = await fetch(`${API}/api/connections/${connectionId}/accept`, { method: "PUT", headers: authHeaders() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Accept failed");
        await refresh();
    };
    const reject = async (connectionId) => {
        const response = await fetch(`${API}/api/connections/${connectionId}/reject`, { method: "PUT", headers: authHeaders() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Reject failed");
        await refresh();
    };
    const remove = async (connectionId) => {
        const response = await fetch(`${API}/api/connections/${connectionId}`, { method: "DELETE", headers: authHeaders() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Remove failed");
        await refresh();
    };

    return { connections, incoming, outgoing, pendingCount: incoming.length, loading, error, refresh, request, accept, reject, remove };
}
