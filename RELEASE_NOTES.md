# Release Notes - Noodle Quest v2 (OpenClaw Integration)

## Overview

This release adds automated error detection and bot-driven bug-fixing capabilities through OpenClaw integration, Linear issue tracking, and a complete error reporting system.

## What's New

### 🤖 OpenClaw Bot Integration

The app now supports a full error-to-fix lifecycle:

1. **Error Detection** - Games and components can report errors via the `useReportError()` hook
2. **Report Creation** - Errors are stored in Convex with full context, stack traces, and severity levels
3. **Linear Issue Creation** - Each error automatically creates a Linear issue in your configured team/project
4. **Bot Resolution** - OpenClaw monitors the webhook, analyzes errors, fixes code, and calls `resolveReport`
5. **User Notification** - Players receive feed messages when their bugs are fixed

### 📊 Error Reporting System

New `reports` table tracks the full lifecycle of every bug:

- **Status tracking**: `open` → `investigating` → `resolved` → `dismissed`
- **Deduplication**: Same errors are tracked as updates, not duplicates
- **Rich context**: Game state, user actions, stack traces, and player info
- **Linear integration**: Issue IDs and URLs stored for cross-reference

### 🔗 Webhook Endpoints

Two new Convex HTTP routes:

- **`/webhook/report`** - Primary endpoint for error submissions. Accepts JSON with error details and optionally creates Linear issues.
- **`/webhook/linear`** - Optional endpoint for receiving Linear status updates (future use).

### 🛠️ Developer Tools

**New hook**: `useReportError()`

```tsx
const reportError = useReportError();

reportError({
  gameId: "copy-cat",
  errorType: "runtime",
  severity: "high",
  message: "Grid mismatch detected",
  stackTrace: error.stack,
  context: { playerMove: "click-3-4" },
});
```

**Global error catching**:

```tsx
import { setupGlobalErrorReporting } from "@/lib/errorReporter";

// In your root component
useEffect(() => {
  setupGlobalErrorReporting(reportError);
}, []);
```

## Environment Variables

Add these to your Convex deployment:

```bash
npx convex env set LINEAR_API_KEY "lin_api_..."
npx convex env set LINEAR_TEAM_ID "your-team-id"
npx convex env set LINEAR_PROJECT_ID "your-project-id"  # Optional
```

## Migration Steps

1. **Deploy Convex functions**:
   ```bash
   npm run convex:deploy
   ```

2. **Set Linear credentials** (if using Linear integration):
   - Get API key from Linear → Settings → API
   - Find your Team ID from Linear URL or API
   - Optional: Find Project ID for specific project assignment

3. **Add error reporting to games**:
   - Import `useReportError` in game components
   - Wrap error-prone logic in try/catch with `reportError()`
   - Or use `setupGlobalErrorReporting()` for catch-all coverage

4. **Configure OpenClaw bot** (see `OPENCLAW_INTEGRATION.md`)

## API Reference

### Mutations

| Mutation | Purpose |
|---|---|
| `reports.createReport` | Create new error report |
| `reports.resolveReport` | Mark report as resolved |
| `reports.updateReportWithLinear` | Link report to Linear issue |

### Queries

| Query | Purpose |
|---|---|
| `reports.getOpenReports` | List all open reports |
| `reports.getGameReports` | Reports for a specific game |
| `reports.getRecentReports` | Recent reports (paginated) |

## Testing

Send a test report:

```bash
curl -X POST https://your-deployment.convex.site/webhook/report \
  -H "Content-Type: application/json" \
  -d '{
    "errorId": "test-error",
    "gameId": "copy-cat",
    "errorType": "runtime",
    "severity": "medium",
    "message": "Test error from curl",
    "context": {"source": "manual-test"}
  }'
```

Verify it was created:

```bash
npx convex run reports:getRecentReports
```

## Breaking Changes

None. All additions are backward-compatible.

## Known Issues

- Linear issue creation requires valid API credentials; silently skipped if not configured
- Webhook signature verification for Linear is stubbed (TODO: implement HMAC verification)

## Credits

- Error reporting architecture designed for OpenClaw bot integration
- Linear API integration for issue tracking
- Convex real-time backend for report storage
