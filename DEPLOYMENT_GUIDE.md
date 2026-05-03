# 🚀 Worknet Deployment Guide

This guide provides step-by-step instructions for deploying the Worknet application (Backend & Frontend) to production.

---

## 📋 Prerequisites

Before you begin, ensure you have accounts/credentials for:
- **MongoDB Atlas**: For the database.
- **Cloudinary**: For image and file uploads.
- **Google Cloud Console**: For Google Authentication.
- **Gmail Account**: For sending notification emails (requires an "App Password").
- **Google AI Studio**: For the Gemini API key (AI features).

---

## 🛠 Environment Variables

Copy the `.env.example` files in both `Backend` and `Frontend` directories and fill in your production values.

### Backend (`Backend/.env`)
| Variable | Description |
| :--- | :--- |
| `PORT` | Port number (default: 5000). |
| `NODE_ENV` | Set to `production`. |
| `MONGO_URI` | Your MongoDB connection string. |
| `JWT_SECRET` | A long, random string for token security. |
| `CLIENT_URL` | The URL of your deployed frontend (used for CORS). |
| `CLOUDINARY_*` | Cloud name, API key, and API secret from Cloudinary dashboard. |
| `SMTP_USER` | Your email address. |
| `SMTP_PASS` | Your Gmail App Password (not your regular password). |
| `GEMINI_API_KEY` | API key from Google AI Studio. |

### Frontend (`Frontend/.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_BACKEND_URL` | The URL of your deployed backend API (e.g., `https://api.worknet.com`). |
| `VITE_APP_GOOGLE_AUTH_KEY` | Google Client ID for OAuth. |

---

## 🚢 Deployment Options

### Option A: Monolithic (Backend serves Frontend)
This is the simplest way to deploy. The backend will serve the frontend's static files.

1. **Build the Frontend**:
   ```bash
   cd Frontend
   npm install
   npm run build
   ```
2. **Directory Check**: Ensure the `dist` folder is created at `Frontend/dist`.
3. **Deploy Backend**: Deploy the `Backend` folder to a service like **Render**, **DigitalOcean**, or **AWS**.
   - Set `NODE_ENV=production`.
   - The server is configured to look for the frontend at `../Frontend/dist`.
4. **Render Setup**: Use the provided `render.yaml` for automated deployment.

### Option B: Decoupled (Vercel/Netlify + Render)
Recommended for better performance and scalability.

1. **Deploy Frontend (Vercel/Netlify)**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: Add `VITE_BACKEND_URL` pointing to your backend.
2. **Deploy Backend (Render/Railway/DO)**:
   - Environment Variables: Add `CLIENT_URL` pointing to your frontend domain.

---

## ☁️ Service Setup Guide

### 1. MongoDB Atlas
1. Create a cluster and a database named `worknet`.
2. Go to **Network Access** and whitelist `0.0.0.0/0` (or your server's IP).
3. Copy the connection string into `MONGO_URI`.

### 2. Cloudinary
1. Create a free account.
2. Copy `Cloud Name`, `API Key`, and `API Secret` from the Dashboard into your Backend env settings.

### 3. Google Authentication
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Configure the **OAuth Consent Screen**.
4. Create **Credentials** -> **OAuth Client ID** (Web application).
5. Add your production domain to **Authorized JavaScript origins** and **Authorized redirect URIs**.
6. Copy the Client ID to `VITE_APP_GOOGLE_AUTH_KEY`.

### 4. Gmail SMTP (for Emails)
1. Enable 2-Factor Authentication on your Gmail account.
2. Search for **"App Passwords"** in your Google Account settings.
3. Generate a new app password for "Mail".
4. Use this 16-character code as `SMTP_PASS`.

---

## ⚠️ Important Considerations

- **Case Sensitivity**: This project has been updated to use PascalCase for components (e.g., `Messages.jsx`). Ensure your deployment environment respects this.
- **Socket.io**: The backend uses WebSockets. Ensure your hosting provider supports sticky sessions or persistent connections (standard on Render/DigitalOcean/AWS, but NOT on Vercel/Netlify Functions).
- **Security**: Never commit `.env` files to Git. Always use the hosting provider's dashboard to set environment variables.

---

## 🔍 Troubleshooting

- **CORS Error**: Ensure `CLIENT_URL` in Backend exactly matches the URL in your browser.
- **White Screen**: Check `VITE_BACKEND_URL` in Frontend. Ensure it includes `https://` and no trailing slash.
- **Auth Fails**: Ensure your production domain is whitelisted in the Google Cloud Console.
