# Getting Started

Welcome to **Email Automator**. This guide will help you set up the application on your local machine.

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v20 or higher)
*   **Git**
*   **Docker** (Required for running a local Supabase instance)
*   **Supabase CLI** (Recommended for managing your database)

## 🚀 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/therealtimex/email-automator.git
    cd email-automator
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Local Database**:
    Make sure Docker is running, then initialize and start Supabase:
    ```bash
    npx supabase start
    ```

## 🏃 Running the Application

Email Automator can be run as a **Unified Server** that hosts both the API and the User Interface on a single port.

1.  **Build the Frontend**:
    ```bash
    npm run build
    ```

2.  **Start the Server**:
    ```bash
    # Runs on default port 3004 and automatically opens your browser
    npm run serve
    ```

### CLI Options
You can customize the startup behavior using command-line arguments:

```bash
# Run on a custom port without automatically opening the browser
node bin/email-automator.js --port 3008 --no-ui
```

---

## 🔑 Initial Setup (The Wizard)

When you first open the application (default: `http://localhost:3004`), you will be greeted by the **Setup Wizard**.

1.  **Database Connection**: Provide your Supabase Project URL and Anon Key.
2.  **Admin Account**: Create your first local admin account.
3.  **Login**: Sign in to access your dashboard.

Next step: [**Configuration**](./CONFIGURATION.md)
