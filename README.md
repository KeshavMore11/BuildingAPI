# Society Complaint & Request Management System Backend

A modern, robust, and clean FastAPI backend for managing a residential housing society's complaints and improvement proposals. 

## Features

- **JWT Authentication**: User registration and login flow with encrypted passwords via `bcrypt` and signed tokens (`HS256`).
- **Role-Based Access Control (RBAC)**: Distinct permissions for **Members** (raise complaints, submit proposals, vote) and **Admins/Secretaries** (assign technicians, update status, approve proposals, view dashboard stats).
- **Complaints Module**: Submit complaints with optional picture uploads, view personal history, list all issues, allocate technicians, and resolve statuses.
- **Proposals Module**: Create proposals with optional attachments. Launch automatic polls on creation.
- **Voting/Polling Module**: Cast votes (Favor/Against) with checking to guarantee one vote per user per poll, and check results dynamically.
- **Admin Dashboard**: View summary metrics like total complaints, pending complaints, in-progress complaints, completed complaints, total proposals, and approved proposals.
- **Supabase Integration**: Stores application relational data in Supabase PostgreSQL and handles media files using Supabase Storage.

---

## Tech Stack

- **Python 3.12+**
- **FastAPI**: Main web framework
- **Supabase Python Client**: Communication with PostgreSQL and Supabase Storage
- **python-jose**: JWT encryption and signature checking
- **passlib[bcrypt]**: Secure password hashing
- **Pydantic V2**: Robust request and response parsing and validation
- **pydantic-settings**: Dotenv config resolution

---

## Folder Structure

```text
society-management/
│
├── app/
│   ├── main.py               # Main app initializer & middleware setups
│   │
│   ├── config/
│   │   ├── settings.py       # Configuration settings parser via pydantic-settings
│   │   └── supabase_client.py# Supabase Client connection wrapper
│   │
│   ├── models/
│   │   ├── auth_models.py    # JWT structure validators
│   │   ├── complaint_models.py# Complaint and Technician validation schemas
│   │   ├── proposal_models.py # Proposals input/output schemas
│   │   ├── poll_models.py     # Vote and results schemas
│   │   └── user_models.py     # Register and Login schemas
│   │
│   ├── routes/
│   │   ├── auth_routes.py     # Login and Register endpoints
│   │   ├── complaint_routes.py# Complaint raise, listing, and updates
│   │   ├── proposal_routes.py # Proposal creation and details
│   │   ├── poll_routes.py     # Vote submission and results aggregation
│   │   └── admin_routes.py    # Admin stats dashboard and technician creation
│   │
│   ├── services/
│   │   ├── auth_service.py    # Hashing, authentication & user inserts
│   │   ├── complaint_service.py# Complaints queries & file uploads
│   │   ├── proposal_service.py # Proposals insertion & auto poll launching
│   │   ├── poll_service.py     # Double-vote checks & polling arithmetic
│   │   └── admin_service.py    # Dashboard data computation & technician inserts
│   │
│   ├── dependencies/
│   │   ├── auth_dependency.py # Injects decoded current user object
│   │   └── role_dependency.py # Multi-role verification guard wrapper
│   │
│   └── utils/
│       ├── jwt_handler.py     # Access tokens signing & decoding utilities
│       └── image_upload.py    # Bucket verification & Supabase storage image upload helper
│
├── .env                       # Local secrets configuration (ignored in git)
├── schema.sql                 # SQL script to initialize database tables
├── requirements.txt           # Python dependency lists
├── postman_collection.json    # Pre-built collection to import directly into Postman
└── README.md                  # Project manual
```

---

## Getting Started

### 1. Prerequisite: Database setup on Supabase
1. Create a free project on [Supabase](https://supabase.com/).
2. In the Supabase dashboard, navigate to the **SQL Editor**.
3. Open a new query, copy the contents of the `schema.sql` file in this repository, paste it into the editor, and click **Run**. This will create the required tables (`users`, `technicians`, `complaints`, `proposals`, `polls`, `votes`) along with indexes and constraints.

### 2. Setting up the Local Environment
Clone the project, navigate into the directory, and set up a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Environment Variables (.env)
Edit the `.env` file at the root of the project with your Supabase credentials:

```ini
SUPABASE_URL=https://your-supabase-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-key  # Service role key is recommended for backend operations
JWT_SECRET=a_very_long_secure_random_string_for_jwt_signing
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
SUPABASE_BUCKET_NAME=society-media
```

*Note: The application will automatically create the `society-media` public bucket in Supabase Storage during the first image upload if it does not exist.*

---

## Running the Application

Start the FastAPI application locally using Uvicorn:

```bash
uvicorn app.main:app --reload
```

The application will start on: `http://127.0.0.1:8000`

---

## Testing the APIs

### Option A: Swagger UI (Recommended)
FastAPI auto-generates comprehensive interactive documentation. Open your browser and head to:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

1. Register an account using `/auth/register`. Set `"role": "admin"` or `"role": "member"`.
2. Login using `/auth/login` to receive an `access_token`.
3. Copy the token. Click the **Authorize** button at the top-right of the Swagger page and paste the token (`bearer <token>` style, though Swagger usually prefixes `bearer` automatically).
4. Run requests against protected endpoints!

### Option B: Postman
1. Open Postman.
2. Click **Import** and select the [postman_collection.json](file:///c:/Users/Keshav/Desktop/Service%20Application/postman_collection.json) file.
3. The collection has a variable named `base_url` pointing to `http://127.0.0.1:8000` by default.
4. Run **Login User** (or Register) first. A test script in the Login request automatically extracts the `access_token` and sets it as a collection environment variable (`{{jwt_token}}`), which is automatically injected into the Authorization headers of all subsequent requests!
