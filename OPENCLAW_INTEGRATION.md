# OpenClaw Bot Integration Guide

This document covers the error reporting and bot integration setup for Noodle Quest v2.

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│   Frontend   │────▶│   Convex    │────▶│  Linear  │     │ OpenClaw│
│  (React app) │     │  (Backend)  │     │ (Issues) │◀────│  Bot    │
└──────────────┘     └─────────────┘     └──────────┘     └─────────┘
                          │                                    │
                          ▼                                    │
                   ┌─────────────┐                            │
                   │   Webhook   │◀───────────────────────────┘
                   │   Endpoint  │
                   └─────────────┘
```

## Setup Steps

### 1. Environment Variables

Add these to your Convex deployment (both dev and prod):

```bash
npx convex env set LINEAR_API_KEY "lin_api_..."
npx convex env set LINEAR_TEAM_ID "your-team-id"
npx convex env set LINEAR_WEBHOOK_SECRET "optional-secret"
```

### 2. Deploy Convex Functions

```bash
cd noodle-quest-v2
npm run convex:deploy
```

This deploys:
- `convex/reports.ts` - Report CRUD operations
- `convex/webhooks.ts` - Webhook endpoints

### 3. Webhook URLs

After deployment, your webhook endpoints will be:
- **Error Reports:** `https://your-deployment.convex.site/webhook/report`
- **Linear Updates:** `https://your-deployment.convex.site/webhook/linear`

### 4. OpenClaw Bot Configuration

Configure your OpenClaw bot to:

1. **Monitor the webhook endpoint** for new error reports
2. **Analyze errors** using the context and stack traces
3. **Fix issues** in the codebase
4. **Call `reports:resolveReport`** mutation after fixing
5. **Post updates** to the user via the feed

Example OpenClaw workflow:

```yaml
name: fix-noodle-errors
trigger: webhook
endpoint: /webhook/report
steps:
  - analyze: error_report
  - locate: source_code
  - fix: bug
  - test: changes
  - call: reports:resolveReport
    args:
      errorId: "{{errorId}}"
      resolvedBy: "openclaw-bot"
      resolutionNote: "Fixed {{errorType}} in {{gameId}}"
  - notify: user_via_feed
```

### 5. Client-Side Error Reporting

Import and use the error reporter in your components:

```tsx
import { useReportError } from "@/lib/errorReporter";

function MyGame() {
  const reportError = useReportError();

  const handleError = (error: Error) => {
    reportError({
      gameId: "copy-cat",
      errorType: "runtime",
      severity: "high",
      message: error.message,
      stackTrace: error.stack,
      context: { gameState: currentState },
    });
  };

  // ... rest of component
}
```

### 6. Linear Integration

When a report is created:
1. A Linear issue is automatically created in your team
2. The issue includes full error details, stack traces, and context
3. Issue status syncs back to the report status
4. When the bot resolves the issue, it updates both Linear and Convex

### 7. Testing the Integration

Test report creation:

```bash
curl -X POST https://your-deployment.convex.site/webhook/report \
  -H "Content-Type: application/json" \
  -d '{
    "errorId": "test-123",
    "gameId": "copy-cat",
    "errorType": "runtime",
    "severity": "medium",
    "message": "Test error report",
    "stackTrace": "Error: Test\n  at test.ts:10",
    "context": {"action": "button_click"}
  }'
```

Verify the report was created:

```bash
npx convex run reports:getRecentReports
```

### 8. Monitoring

View open reports in your app by querying:

```tsx
const openReports = useQuery(api.reports.getOpenReports);
const recentReports = useQuery(api.reports.getRecentReports, { limit: 20 });
```

## API Reference

### Convex Mutations

- `reports.createReport` - Create a new error report
- `reports.resolveReport` - Mark a report as resolved
- `reports.updateReportWithLinear` - Link a report to a Linear issue

### Convex Queries

- `reports.getOpenReports` - Get all open reports
- `reports.getGameReports` - Get reports for a specific game
- `reports.getRecentReports` - Get recent reports (paginated)

### Webhook Endpoints

- `POST /webhook/report` - Submit an error report
- `POST /webhook/linear` - Receive Linear status updates (optional)

## Troubleshooting

### Reports not appearing
1. Check Convex logs: `npx convex logs`
2. Verify webhook URL is correct
3. Ensure environment variables are set

### Linear issues not created
1. Verify `LINEAR_API_KEY` and `LINEAR_TEAM_ID` are set
2. Check Convex logs for API errors
3. Ensure your Linear API key has issue creation permissions

### Bot not responding
1. Verify OpenClaw is monitoring the webhook
2. Check bot configuration for correct mutation names
3. Ensure bot has write access to the repository
