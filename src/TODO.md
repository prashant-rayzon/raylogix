# TODO

- [ ] Update `ChatFilterSidebar.tsx` to normalize conversation documents into the chat-card model used by `ChatFilterSidebar` + `ChatListItem`.
- [ ] Replace filtering/sorting to use normalized fields (especially date: `lastMessageAt` -> `lastMessage.timestamp`).
- [ ] Ensure available filter options (status/material/route) are derived from normalized data.
- [ ] Quick sanity check: types compile + no runtime undefined access.

