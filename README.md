# SoxHub - Audit Control Management MVP

A modern audit control management system demonstrating multi-framework control mapping, where one control can satisfy SOX, SOC 2, and ISO 27001 simultaneously.

## Key Features

### 1. Multi-Framework Control Mapping
- Map controls to multiple frameworks (SOX, SOC2, ISO27001)
- View framework coverage at a glance with color-coded badges
- Add/remove framework mappings with interactive modal
- See how one control satisfies multiple compliance requirements

### 2. Coverage Dashboard
- Framework coverage metrics (SOX 82%, SOC2 68%, ISO 45%)
- Testing efficiency metrics (reusability ratio, hours saved, cost savings)
- Financial statement line item coverage visualization
- Real-time calculations from control and test data

### 3. Test Management
- Complete test procedures and see multi-framework credit
- Visual confirmation showing all requirements satisfied
- Efficiency metrics: "1 Test = X Requirements = Y Hours Saved"
- Demonstrates core value proposition

### 4. Issue Impact Analysis
- Automatic cascade analysis when controls fail
- Direct impact: affected systems, exposed risks
- Cascade impact: related controls, impacted frameworks, FS items at risk
- Suggested remediation actions

### 5. Financial Statement Drill-Down
- Complete visibility from FS line items to controls
- Coverage metrics by process
- Tabbed interface showing controls, processes, systems, and risks
- Click-through navigation for detailed analysis

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (grayscale theme, square corners)
- **Routing:** React Router v6
- **UI Components:** Custom shadcn/ui-style components
- **Icons:** Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aahelicopter/wireframe.git
cd wireframe
```

2. Switch to the feature branch:
```bash
git checkout claude/soxhub-control-mapping-71NwN
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to:
```
http://localhost:5173
```

## Project Structure

```
src/
├── components/
│   ├── controls/
│   │   ├── ControlDetailModal.tsx
│   │   └── FrameworkMappingModal.tsx
│   ├── issues/
│   │   └── ImpactAnalysisPanel.tsx
│   ├── tests/
│   │   └── TestCompleteModal.tsx
│   ├── ui/
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── tabs.tsx
│   └── Layout.tsx
├── data/
│   ├── mockControls.ts
│   ├── mockFrameworkRequirements.ts
│   ├── mockFSLineItems.ts
│   ├── mockIssues.ts
│   ├── mockProcesses.ts
│   ├── mockRisks.ts
│   ├── mockSystems.ts
│   └── mockTests.ts
├── pages/
│   ├── ControlsPage.tsx
│   ├── CoverageDashboardPage.tsx
│   ├── FSLineItemDetailPage.tsx
│   ├── FSLineItemsPage.tsx
│   ├── IssuesPage.tsx
│   └── TestsPage.tsx
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Design Philosophy

- **Grayscale Only:** Professional, distraction-free interface
- **Square Corners:** borderRadius: 0 globally for sharp, clean look
- **Minimal UI:** Focus on data and relationships
- **Progressive Disclosure:** Details revealed on interaction
- **Multi-Framework First:** Every feature emphasizes cross-framework value

## Key Workflows

### 1. Add Framework Mapping to Control
1. Navigate to Controls page
2. Click any control row
3. Click "Map to Additional Frameworks"
4. Select/deselect framework requirements
5. Click "Save Mappings"
6. See updated badges immediately

### 2. Complete Test and See Multi-Framework Credit
1. Navigate to Tests page
2. Find an "In Progress" test
3. Click "Mark Complete"
4. View success modal showing all frameworks satisfied
5. See efficiency metrics

### 3. Analyze Issue Impact
1. Navigate to Issues page
2. Click any issue row
3. View cascade analysis:
   - Direct impact (control, risks, systems)
   - Cascade impact (related controls, frameworks, FS items)
   - Suggested actions

### 4. Drill Down from Financial Statement
1. Navigate to Financial Statements
2. Click "Revenue" (or any line item)
3. View summary cards
4. Explore tabs: Controls, Processes, Systems, Risks
5. See complete control coverage

## Mock Data

The application includes comprehensive mock data:
- **20 Controls** with multi-framework mappings
- **30 Framework Requirements** (10 SOX, 10 SOC2, 10 ISO27001)
- **30 Test Procedures** (20 pass, 5 fail, 5 in progress)
- **5 Issues** (1 critical, 2 high, 2 medium)
- **8 FS Line Items** (Revenue, Cash, AR, etc.)
- **10 Systems** (SAP, Salesforce, Workday, etc.)
- **8 Processes** (Access Management, Revenue Recognition, etc.)
- **15 Risks** (5 high, 7 medium, 3 low)

## Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

## License

MIT

## Session

Built with Claude Code
Session: https://claude.ai/code/session_01JtmnQigH2voVKT6igsW7MF
