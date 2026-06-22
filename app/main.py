from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

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
