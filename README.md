# SE 2 FrontEnd - Secure Submission Form


This is the frontend application for the submission form project, built with React and Vite. It provides an interactive, multi-step form that supports dynamic questions, file uploads to a MinIO bucket, and email verification.

## Prerequisites

Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* npm (comes with Node.js)

## Getting Started

Follow these steps to run the application locally:

**1. Clone the repository**
```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

**2. Navigate to the frontend directory**
```bash
cd subm-form
```

**3. Install dependencies**
```bash
npm install
```

**4. Configure Environment Variables**
Create a `.env` file in the root of the `subm-form` directory. This file is required to configure the endpoint for file uploads.
```env
VITE_MINIO_UPLOAD_URL=http://localhost:3000/upload
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_MINIO_UPLOAD_URL` | **Required.** The full URL endpoint where the frontend should send files for upload to the MinIO server. | `http://localhost:3000/upload` |

*(Note: The `vite.config.js` is set up to verify these variables on startup and will warn you in the terminal if any required variables are missing.)*

**5. Start the development server**
```bash
npm run dev
```
*(Note: If your `package.json` uses `npm start` as an alias for Vite, that will work too, but `npm run dev` is the standard Vite command).*

The application should now be running on `http://localhost:5173` (or whichever port Vite assigns).

## Backend Integration Note
This frontend relies on a backend API for:
* Fetching campaign data (`/api/webhook/get-campaign`)
* Email verification (`/api/webhook/semail-verif`, `/api/webhook/semail-get-token`)
* Final form submission (`/api/webhook/ssubmit-form`)
* Linking uploaded files to submissions (`/api/webhook/files-link-upload`)

These endpoints are configured in `vite.config.js` to proxy requests starting with `/api` to `http://10.150.0.101:5678`. Ensure that backend server is accessible for the form to function correctly.
```