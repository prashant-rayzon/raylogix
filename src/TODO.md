# TODO

- [x] Update `ChatFilterSidebar.tsx` to normalize conversation documents into the chat-card model used by `ChatFilterSidebar` + `ChatListItem`.
- [x] Replace filtering/sorting to use normalized fields (especially date: `lastMessageAt` -> `lastMessage.timestamp`).
- [x] Ensure available filter options (status/material/route) are derived from normalized data.
- [x] Quick sanity check: types compile + no runtime undefined access.

