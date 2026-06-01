---
'@mastra/core': minor
---

Added harness events for session lifecycle updates, mode changes, model changes, cloned threads, and agent lifecycle runs.

Users can now subscribe to harness events to observe harness activity, send messages through a session with `session.sendMessage()`, and enqueue sequential work with `session.queueMessage()`.

**Example**

```ts
const unsubscribe = harness.subscribe(event => {
  console.log(event.id, event.type);
});
```
