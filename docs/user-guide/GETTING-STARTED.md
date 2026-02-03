# Getting Started

Welcome to **Email Automator**. The easiest way to get started is via the RealTimeX Marketplace, which handles installation and cloud provisioning for you.

## 🚀 One-Click Installation (Recommended)

1.  **Open RealTimeX Desktop**: Launch your RealTimeX Desktop application.
2.  **Go to Marketplace**: Navigate to the "Marketplace" tab.
3.  **Find the App**: Search for "Email Automator".
4.  **Install**: Click the **Install** button. The system will automatically:
    *   Download the application bundle.
    *   **Provision Cloud Resources**: Automatically set up your private Supabase project (Zero-Config).
    *   Configure secure authentication.
5.  **Launch**: Once installed, click **Open** to launch the email automator.

## ☁️ Zero-Config Cloud Provisioning

Email Automator utilizes RealTimeX's **Zero-Config Cloud Provisioning**. You do not need to manually create a database or configure API keys. The installer automatically provisions a free-tier Supabase project for you, ensuring you own your data without the setup hassle.

---

## 🛠️ Manual Installation (Advanced)

If you are a developer or prefer to run from source, you can install manually.

### Prerequisites

*   **Node.js** (v20 or higher)
*   **Git**
*   **Docker** (Required for local database)
*   **Supabase CLI**

### Steps

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/therealtimex/email-automator.git
    cd email-automator
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start Local Database**:
    ```bash
    npx supabase start
    ```

    ```bash
    npm run dev
    ```

## 🔍 Finding your Supabase Credentials

If you are installing manually, you will need to find your project keys to complete the **Setup Wizard**.

1.  **Go to Supabase**: Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  **Select Project**: Open the project you want to connect to.
3.  **Go to Settings**: Click the **Settings** (cog icon) in the bottom of the sidebar.
4.  **Open API config**: Select **API** from the settings menu.
5.  **Copy URL**: Find "Project URL" and copy it.
6.  **Copy Key**: Find "Project API keys". Copy the key labeled `anon` (public).
    > [!WARNING]
    > **Do NOT** use the `service_role` key. It has full admin access and is not safe for the client application.

## 🔑 Initial Setup (The Wizard)

When you launch the app for the first time, the **Setup Wizard** will guide you through the process.

1.  **Database Connection**:
    *   **Marketplace Users**: This is pre-filled automatically by the zero-config provisioner.
    *   **Manual Install**: Enter your Supabase URL and Anon Key.
2.  **Admin Account**:
    *   Create your local admin account. This email/password is used to log in to the dashboard and is stored securely in your Supabase Auth user table.
3.  **Login**:
    *   Sign in with your new credentials to access the main dashboard.

Next step: [**Configuration**](./CONFIGURATION.md)
