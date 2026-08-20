function EmptyChat() {
    return (
        <div className="empty-chat">

            <div className="auth-logo">
                <img src="favicon.jpg" alt="favicon" className="logo-img" />
            </div>

            <h2>
                Welcome to ChatNOVA
            </h2>

            <p>
                Select a user to start chatting
            </p>

        </div>
    );
}

export default EmptyChat;