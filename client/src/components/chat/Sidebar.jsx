import ProfileMenu from "./ProfileMenu";
import UserSearch from "./UserSearch";
import UserList from "./UserList";

const TABS = ["online", "meet", "discover", "requests"];

function Sidebar({
    user,activeTab,setActiveTab,users,selectedUser,
    onSelectUser,searchText,setSearchText,lastMessages,unreadCounts,
    typingUsers,onAction,onScrollEnd,loading,error,pendingCount
}) {
    return (
        <aside className="chat-sidebar">

            <ProfileMenu
                user={user}
            />

            <div className="connection-tabs" role="tablist" aria-label="People">
                {TABS.map((tab) =>
                    <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`connection-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                        {tab === "requests" && pendingCount > 0 && <span className="request-tab-badge">{pendingCount > 99 ? "99+" : pendingCount}</span>}
                        {tab === "meet" ? "Meet" : tab[0].toUpperCase() + tab.slice(1)}
                    </button>)}
            </div>

            {activeTab === "discover" &&
                <UserSearch
                    searchText={searchText}
                    setSearchText={setSearchText}
                />}

            <UserList
                users={users}
                tab={activeTab}
                selectedUser={selectedUser}
                onSelectUser={onSelectUser}
                lastMessages={lastMessages}
                unreadCounts={unreadCounts}
                typingUsers={typingUsers}
                onAction={onAction}
                onScrollEnd={onScrollEnd}
                loading={loading}
                error={error}
            />
        </aside>
    );
}

export default Sidebar;