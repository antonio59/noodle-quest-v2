# Changelog

All notable changes to **Noodle Quest v2** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **OpenClaw Bot Integration** - Automated error detection, reporting, and resolution workflow
- **Error Reporting System** - New `reports` table in Convex schema for tracking bugs with status lifecycle (open → investigating → resolved → dismissed)
- **Linear Issue Integration** - Automatic GitHub Linear issue creation when errors are reported, with project assignment support
- **Webhook Endpoints** - Two new Convex HTTP routes:
  - `POST /webhook/report` - Accept error reports from bots or external monitoring
  - `POST /webhook/linear` - Optional webhook for Linear status sync
- **Client-Side Error Reporting Hook** - `useReportError()` for easy integration in React components
- **Global Error Boundary Setup** - `setupGlobalErrorReporting()` to catch unhandled errors and promise rejections
- **Report Mutations**:
  - `reports.createReport` - Create new error reports with deduplication via errorId
  - `reports.resolveReport` - Mark reports as resolved with optional resolution notes
  - `reports.updateReportWithLinear` - Link reports to Linear issues
- **Report Queries**:
  - `reports.getOpenReports` - List all open reports
  - `reports.getGameReports` - Filter reports by game
  - `reports.getRecentReports` - Get recent reports with pagination
- **Feed Integration** - Automatic user notifications when their reported bugs are fixed
- **Environment Variable Support**:
  - `LINEAR_API_KEY` - Linear API key for issue creation
  - `LINEAR_TEAM_ID` - Linear team to create issues in
  - `LINEAR_PROJECT_ID` - (Optional) Linear project to assign issues to

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Webhook endpoints validate required fields before processing
- Linear API calls fail gracefully without breaking the report flow

---

## [0.1.0] - 2026-04-03

### Added
- Initial release of Noodle Quest v2
- 27 brain and board games (Copy Cat, Focus Frenzy, Tic-Tac-Toe, Chess, etc.)
- Convex backend with real-time database
- Player profiles with PIN-based auth
- Activity feed with chat and reactions
- Player-to-player challenges
- Custom audio synthesis (no external audio files)
- Lo-fi beats and meditation sounds
- Netlify deployment setup
