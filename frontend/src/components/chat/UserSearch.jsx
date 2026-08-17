function UserSearch({ searchText, setSearchText }) {

    return (
        <div className="user-search">

            <span className="search-icon">
                🔍
            </span>

            <input
                type="text"
                placeholder="Search users..."
                value={searchText}
                onChange={(e) =>
                    setSearchText(e.target.value)
                }
            />

            {searchText && (
                <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="clear-search"
                >
                    ×
                </button>
            )}

        </div>
    );
}

export default UserSearch;