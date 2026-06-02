---
'@mastra/core': minor
---

Added the `systemActor` option to agent `generate()` and `stream()` invocations so trusted background work can run without a JWT or human membership.

```ts
const requestContext = new RequestContext();
requestContext.set('organizationId', 'org_123');

await agent.generate('Process daily report', {
  requestContext,
  systemActor: { actorKind: 'system', sourceWorkflow: 'daily-report-cron' },
});
```

Mastra denies system-actor FGA checks when the request context does not include an `organizationId`.
