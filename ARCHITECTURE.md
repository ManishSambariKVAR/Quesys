# Backend Modular Architecture Proposal

To transition from the current monolithic `main.js` to a clean, scalable API, we will implement the **Controller-Service-Route** pattern. This separates concerns, making the codebase easier to test, maintain, and expand, while cleanly separating it from the new React frontend.

## Proposed Folder Structure
```text
/
├── src/
│   ├── app.js               # Express application setup, global middlewares, and CORS
│   ├── server.js            # Entry point: starts HTTP/HTTPS servers and connects to the database
│   ├── config/              # Configuration files (DB connection, environment variables)
│   │   └── database.js
│   ├── routes/              # Express routers defining API endpoints
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── admin.routes.js
│   │   └── kiosk.routes.js
│   ├── controllers/         # Handles HTTP requests/responses, coordinates execution
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── admin.controller.js
│   │   └── kiosk.controller.js
│   ├── services/            # Core business logic and database interactions
│   │   ├── auth.service.js
│   │   ├── users.service.js
│   │   ├── admin.service.js
│   │   └── kiosk.service.js
│   ├── middlewares/         # Custom middlewares
│   │   └── auth.middleware.js # JWT validation
│   └── utils/               # Helper functions and utilities
│       ├── stackManager.js  # The in-memory token stacks
│       └── helpers.js       # Date formatting, padded numbers, etc.
```

## Layers Explained
1. **Routes:** Map HTTP verbs and paths to the corresponding Controller methods. They apply middlewares like authentication (JWT).
2. **Controllers:** Extract data from the request (`req.body`, `req.params`), vialidate basic nput, pass it to the Service layer, and format the JSON HTTP response. They contain NO business logic or direct DB calls.
3. **Services:** The core of the application. They handle complex business rules, data transformation, and execute database queries using `pg`.

## Current State & Next Steps
- **React Integration:** Your Vite frontend is already correctly configured to proxy to the backend (`http://localhost:4001/api`), and CORS in `main.js` is accepting Vite's port (5173).
- **Cleanup:** We have created a `temp_old/` folder and safely moved the unused EJS templates, legacy frontend scripts (`src/js`), and vendor assets.
- **Refactoring:** The next step is to progressively carve out the monolithic `main.js` into these modular files without breaking existing API routes.