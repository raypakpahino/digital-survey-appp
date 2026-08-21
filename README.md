Enterprise Digital Survey & Kiosk Feedback PlatformA full-stack, dual-engine survey and feedback collection platform built with Svelte, Node.js/Express, and MongoDB. The application supports two distinct operational models: Enterprise Kiosk Terminal Mode (for dedicated on-site hardware with device-level authorization and PIN pairing) and Web QR Hub Mode (for public or site-scoped mobile feedback).  Key Features1. Dual Operational EnginesEnterprise Kiosk Terminal Engine: Deploy survey forms to registered terminal hardware with 6-character access PINs, offline tolerance, auto-refresh countdowns, and strict device-level scoping.  Web QR Hub Engine: Generate scannable QR codes for public mobile browser feedback or site-restricted submissions managed by Site Leaders.  Hot-Switch Mode: Seamlessly toggle engines using Ctrl + M or the top navigation bar.  2. Visual Form Builder & Logic EngineComponent Library: Drag-and-drop form building featuring Smiley Matrix (CSAT), Star Scales (1–5), Multiple Choice (with optional image options and multi-select), Dropdown Select, Numeric Inputs, Date Pickers, and Open Text Short Answers.  Skip & Branching Logic: Configure jump logic at the individual choice level to bypass sections or trigger immediate form submission (jumpToIndex / END).  Asset Support: Image attachments for both question headers and individual multiple-choice options.  Custom Ending Pages: Configure custom thank-you messages and submission reset timers per survey.  3. Role-Based Access Control (RBAC) & ScopingAdmin: Full access to form designing, response matrices, raw data exports, user access control, and device registration rules.  Kiosk Operator: Strictly scoped access limited to submission logs originating from their assigned terminal devices.  Site Leader: Scoped access to QR survey schemas and response data assigned to specific geographical or organizational sites.  4. Analytics, Incident Detection & ReportingInteractive Visualizations: Dynamic SVG pie charts and percentage breakdown bars with hover metrics.  Low-Rating Incident Alarm: Real-time flagging of dissatisfied feedback (ANGRY, SAD, 1–2 Stars, or custom negative choices) with an expandable inspection drawer.  Consolidated Log Matrix: Aggregates identical question fields across multiple forms into a unified table layout.  Excel / CSV Exporting: Export aggregated response matrices or single-field reports with formatted values and submission timestamps.  5. UI/UX & Workflow PersistenceState Preservation: Uses sessionStorage and localStorage to preserve active form selection filters and sidebar toggle states across page reloads.  Theming & Accessibility: High-contrast light and dark modes with SVG iconography and responsive resizable sidebars.  Tech StackFrontend: Svelte, Tailwind CSS  Backend: Node.js, Express.js  Database: MongoDB (Mongoose ODM)  Authentication: JWT (JSON Web Tokens) with role-based middleware  
Project Structure
├── backend/
│   ├── models/
│   │   ├── Device.js          # Device registration and pairing schema[cite: 1]
│   │   ├── Response.js        # Survey answer log schema
│   │   ├── Survey.js          # Form structure, questions, and logic schema
│   │   └── User.js            # User accounts, credentials, and roles
│   ├── routes/
│   │   ├── authRoutes.js      # Authentication and profile endpoints
│   │   ├── deviceRoutes.js    # Device pairing and authorization rules[cite: 1]
│   │   ├── responseRoutes.js  # Submission and data matrix endpoints
│   │   └── surveyRoutes.js    # Form CRUD operations and schemas
│   └── server.js              # Express server setup and MongoDB connection
│
├── src/
│   ├── components/
│   │   ├── Answers.svelte          # Analytics dashboards, log matrix, and incident logs[cite: 4]
│   │   ├── Dashboard.svelte        # Form library, sharing hubs, and survey status
│   │   ├── DeviceManagement.svelte # Device pairing and authorized form rules[cite: 2]
│   │   ├── FormBuilder.svelte      # Survey schema designer, branching, and asset upload[cite: 7]
│   │   ├── Kiosk.svelte            # Respondent survey interface and terminal view
│   │   ├── Login.svelte            # Role-based login gateway
│   │   └── UserManagement.svelte   # User role assignment and scoping
│   ├── App.svelte                  # Root component, routing, theming, and layout state
│   └── main.js                     # Application entry point
│
├── package.json
└── README.md

Getting Started
Prerequisites
Node.js (v18+ recommended)

MongoDB instance (local or Atlas)

InstallationClone the repository:Bashgit clone https://github.com/your-username/digital-survey-platform.git
cd digital-survey-platform
Install dependencies:Bashnpm install
Configure Environment Variables:Create a .env file in the root directory:Code snippetPORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
Run the development servers:Bash# Run frontend and backend concurrently
npm run dev
Default Keyboard ShortcutsShortcutActionScopeCtrl + M / Cmd + MToggle between Enterprise Kiosk and Web QR Hub engines  Admin only[cite: 6]LicenseThis project is licensed under the MIT License.
