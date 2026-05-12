# WORKNET Project Workflow Diagram

This document provides a comprehensive overview of the **WORKNET** platform's workflows, covering user onboarding, networking, job management, and recruiter operations.

## 1. High-Level System Architecture

The project follows a modern MERN stack architecture with additional integrations for AI and media management.

```mermaid
graph TD
    subgraph Frontend
        React[React.js Web App]
        RQ[React Query - State Management]
        Axios[Axios - API Client]
        SocketFE[Socket.io - Real-time]
    end

    subgraph Backend
        Express[Express.js Server]
        Auth[JWT Auth Middleware]
        SocketBE[Socket.io - Real-time]
        Multer[Multer - File Upload]
    end

    subgraph Database_and_Cloud
        MongoDB[(MongoDB - Atlas)]
        Cloudinary[Cloudinary - Images]
        GeminiAI[Gemini AI - Content Gen]
        Nodemailer[Nodemailer - OTP/Emails]
    end

    React --> Axios
    Axios --> Auth
    Auth --> Express
    Express --> MongoDB
    Express --> Cloudinary
    Express --> GeminiAI
    Express --> Nodemailer
    SocketFE <--> SocketBE
```

---

## 2. Authentication & User Onboarding

Users can join as either a **Candidate (User)** or a **Recruiter**.

```mermaid
sequenceDiagram
    participant U as User/Recruiter
    participant F as Frontend
    participant B as Backend
    participant E as Email Service / Google

    U->>F: Enter Email (Sign Up)
    F->>B: POST /auth/send-otp
    B->>E: Send OTP Email
    E-->>U: Receive OTP
    U->>F: Enter OTP
    F->>B: POST /auth/verify-otp
    B-->>F: OTP Verified

    U->>F: Complete Registration (Password, Role, Basic Info)
    F->>B: POST /auth/signup
    B->>B: Hash Password & Save User
    B-->>F: Set JWT Cookie & Return User Data
    F-->>U: Redirect to Home/Dashboard
```

---

## 3. Professional Networking Workflow

The core social loop of the platform.

```mermaid
graph LR
    User -->|Creates| Post[Post: Text + Image]
    Post -->|Stored in| DB[(MongoDB)]
    DB -->|Fetched by| Feed[Home Feed]
    
    Feed -->|Interactions| Like[Like Post]
    Feed -->|Interactions| Comment[Comment on Post]
    Feed -->|Interactions| Share[Share Post Link]
    
    Like -->|Triggers| Notify[Notification Service]
    Comment -->|Triggers| Notify
    
    User1 -->|Sends Request| User2[Connection Request]
    User2 -->|Accepts| Connection[Mutual Connection]
    Connection -->|Enables| Messaging[Direct Messaging]
```

---

## 4. Job Management Workflow (Recruiter Side)

Recruiters have advanced tools for posting and managing jobs.

```mermaid
graph TD
    Recruiter -->|Option 1| ManualPost[Manual Job Form]
    Recruiter -->|Option 2| ExcelUpload[Excel Bulk Upload]
    
    ExcelUpload -->|Processes| Parse[Parse Rows]
    Parse -->|AI Enhancement| Gemini[Gemini AI: Generate Descriptions]
    Gemini -->|Returns| Drafts[Job Drafts Preview]
    
    Drafts -->|Confirm| Publish[Publish Jobs]
    ManualPost --> Publish
    
    Publish -->|Targeting| Targeted[Public or Targeted to College/City]
    Targeted -->|Notifies| MatchingUsers[Qualified Candidates]
    
    Publish -->|Manage| Applicants[Review Applicants]
    Applicants -->|Update Status| Status[Applied -> Reviewing -> Shortlisted -> Hired/Rejected]
    Status -->|Triggers| JobNotify[Application Status Notification]
```

---

## 5. Job Application Workflow (Candidate Side)

Candidates search for jobs and track their applications.

```mermaid
graph TD
    Candidate -->|Search| Jobs[Job Listings]
    Jobs -->|Filter| Criteria[Location, Skills, Job Type]
    
    Candidate -->|Views| JobDetail[Job Details]
    JobDetail -->|System Logic| MatchScore[AI Match Score %]
    
    MatchScore -->|High Match| Apply[Apply for Job]
    Apply -->|Saves| AppData[(Application Record)]
    
    AppData -->|Recruiter Action| Feedback[Status Update Notification]
    Feedback -->|View| MyApps[My Applications Page]
```

---

## 6. Real-time Notifications & Messaging

```mermaid
graph TD
    Event[Action: Like/Comment/Connect/App Status] -->|Backend| Socket[Socket.io Engine]
    Socket -->|Push| Frontend[Real-time Alert]
    Socket -->|Persistent| DBNotify[Database Notification Record]
    
    Msg[New Message] -->|Backend| Socket
    Socket -->|Direct Push| Recipient[Recipient Chat Window]
```
