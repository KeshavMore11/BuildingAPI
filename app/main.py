from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routes.auth_routes import router as auth_router
from app.routes.complaint_routes import router as complaint_router
from app.routes.proposal_routes import router as proposal_router
from app.routes.poll_routes import router as poll_router
from app.routes.admin_routes import router as admin_router

app = FastAPI(
    title="Society Complaint & Request Management System API",
    description="""
    Backend system for managing society complaints (leaks, repairs) and proposal workflows (CCTV, upgrades) 
    featuring integrated user registration, JWT authentication, role-based guard permissions, 
    Supabase Storage image uploads, and society proposal polling votes.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(complaint_router)
app.include_router(proposal_router)
app.include_router(poll_router)
app.include_router(admin_router)

app.mount("/portal", StaticFiles(directory="frontend", html=True), name="frontend")

@app.get("/", include_in_schema=False)
def root_redirect():
    """
    Redirect root index page requests directly to the Gokuldham Resident Portal UI.
    """
    return RedirectResponse(url="/portal")


html_404_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Not Found - Gokuldham Society</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #F8FAFC;
            --card-bg: #FFFFFF;
            --primary: #2563EB;
            --primary-hover: #1D4ED8;
            --text-main: #0F172A;
            --text-muted: #64748B;
            --border-color: #E2E8F0;
            --radius-md: 12px;
            --radius-lg: 16px;
            --shadow-lg: 0 12px 28px rgba(15, 23, 42, 0.12);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .error-card {
            background-color: var(--card-bg);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
            width: 100%;
            max-width: 480px;
            padding: 40px;
            text-align: center;
            animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .error-logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%);
            border-radius: var(--radius-md);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 2.2rem;
            font-weight: 800;
            font-family: 'Outfit', sans-serif;
            margin-bottom: 24px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.25rem;
            font-weight: 800;
            margin-bottom: 12px;
            color: var(--primary);
        }

        h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--text-main);
        }

        p {
            color: var(--text-muted);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }

        .bhide-quote {
            font-style: italic;
            background-color: #F1F5F9;
            border-left: 4px solid var(--primary);
            padding: 12px 16px;
            border-radius: 6px;
            text-align: left;
            margin-bottom: 30px;
            font-size: 0.9rem;
            color: #475569;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            font-size: 0.95rem;
            font-weight: 700;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
            background-color: var(--primary);
            color: #FFFFFF;
            width: 100%;
        }

        .btn:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <div class="error-card">
        <div class="error-logo">G</div>
        <h1>404</h1>
        <h2>Room / Page Not Found</h2>
        <p>The page you are trying to visit does not exist in Gokuldham Co-operative Housing Society.</p>
        
        <div class="bhide-quote">
            "Aatmaram Tukaram Bhide (Secretary) says: This route is not written in our society's official register! Please go back to the lobby."
        </div>

        <a href="/portal" class="btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 4px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Back to Resident Portal
        </a>
    </div>
</body>
</html>
"""

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        accept = request.headers.get("accept", "")
        if "text/html" in accept:
            return HTMLResponse(content=html_404_content, status_code=404)
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
