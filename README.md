Enterprise Digital Survey & Kiosk Feedback Platform
===================================================

A full-stack survey and customer feedback platform built with Svelte, Node.js, Express, and MongoDB. The system runs on a dual-engine architecture: dedicated Enterprise Kiosk terminals with device-level authorization and PIN pairing, and a Web QR Hub for mobile browser feedback.


CORE FEATURES
-------------

1. Dual Operating Engines
- Enterprise Kiosk Mode: Deploy surveys to registered terminal hardware with 6-character PIN protection, offline tolerance, custom auto-refresh timers, and device-level scoping.
- Web QR Hub Mode: Create scannable QR codes for public mobile surveys or site-restricted submissions managed by Site Leaders.
- Quick Mode Switch: Toggle between Kiosk and QR engines using the Ctrl + M shortcut or the header control.

2. Drag-and-Drop Form Builder & Logic Engine
- Supported question types: Smiley Matrix (CSAT), Star Scales (1-5), Multiple Choice (with multi-select and option images), Dropdown Select, Numeric Inputs, Date Pickers, and Short Answer text fields.
- Branching & Skip Logic: Configure option-level jump rules to bypass questions or immediately submit the form.
- Custom Assets: Upload image attachments for question headers and individual choice buttons.
- Custom End Screens: Set unique thank-you messages and automatic reset countdowns per survey.

3. Role-Based Access Control (RBAC)
- Admin: Full access to the form builder, survey deployment, aggregated analytics, data exports, user permissions, and device registration.
- Kiosk Operator: View and inspect submissions strictly originating from their assigned physical tablets.
- Site Leader: View survey schemas and response logs scoped to their assigned sites.

4. Analytics & Incident Alert Engine
- Visual Breakdowns: Real-time SVG pie charts and percentage breakdown bars with hover metrics.
- Low-Score Incident Alerts: Instantly flags dissatisfied ratings (Sad/Angry smileys, 1-2 stars, or custom negative choices) in an expandable drawer for quick inspection.
- Unified Log Matrix: Consolidates matching question fields across multiple surveys into a single clean table.
- Data Export: Download filtered response matrices and single-field reports directly to Excel (.xls) or CSV.

5. UI & State Persistence
- Preserves selected survey filters in session storage and retains sidebar toggle preferences in local storage across page refreshes.
- Custom high-contrast theme supporting clean light and dark modes with dedicated SVG iconography.


TECH STACK
----------

- Frontend: Svelte, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT (JSON Web Tokens) with role-based route middleware


PROJECT STRUCTURE
-----------------

backend/
  models/
    Device.js           Device registration and pairing schema
    Response.js         Survey answer log schema
    Survey.js           Form structure, questions, and logic schema
    User.js             User accounts, credentials, and roles
  routes/
    authRoutes.js       Authentication and profile endpoints
    deviceRoutes.js     Device pairing and authorization rules
    responseRoutes.js   Submission and data matrix endpoints
    surveyRoutes.js     Form CRUD operations and schemas
  server.js             Express server entry point

src/
  components/
    Answers.svelte          Analytics dashboards, log matrix, and incident logs
    Dashboard.svelte        Form library, sharing hubs, and survey status
    DeviceManagement.svelte Device pairing and authorized form rules
    FormBuilder.svelte      Survey schema designer, branching, and asset upload
    Kiosk.svelte            Respondent survey interface and terminal view
    Login.svelte            Role-based login gateway
    UserManagement.svelte   User role assignment and scoping
  App.svelte                Root component, routing, theming, and layout state
  main.js                   Frontend entry point


GETTING STARTED
---------------

Prerequisites:
- Node.js (v18+ recommended)
- MongoDB instance (local or Atlas)

Installation Steps:

1. Clone the repository:
   git clone https://github.com/your-username/digital-survey-platform.git
   cd digital-survey-platform

2. Install dependencies:
   npm install

3. Configure Environment Variables:
   Create a .env file in the project root:
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key

4. Run the project:
   npm run dev


SHORTCUTS
---------

Shortcut: Ctrl + M (or Cmd + M)
Action: Toggle between Enterprise Kiosk and Web QR Hub modes
Access: Admin only


LICENSE
-------

Distributed under the MIT License.
