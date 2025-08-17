from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "task-flow-secret-key-change-in-production"
ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define role hierarchy
ROLE_HIERARCHY = {
    "senior_manager": 8,
    "manager": 7,
    "team_lead": 6,
    "senior_architect": 5,
    "architect": 4,
    "senior_developer": 3,
    "developer": 2,
    "intern": 1
}

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    name: str
    role: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    role_level: int
    created_at: datetime

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    assigned_by: str  # user id
    assigned_to: str  # user id
    status: str = "assigned"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    comments: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(BaseModel):
    title: str
    description: str
    assigned_to: str
    priority: str = "medium"
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    author: str  # user id
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CommentCreate(BaseModel):
    text: str

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def can_assign_task(assigner_role: str, assignee_role: str) -> bool:
    """Check if assigner can assign task to assignee based on hierarchy"""
    assigner_level = ROLE_HIERARCHY.get(assigner_role, 0)
    assignee_level = ROLE_HIERARCHY.get(assignee_role, 0)
    
    # Seniors can assign to juniors, or same level (peer approval)
    return assigner_level >= assignee_level

# Authentication routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if user_data.role not in ROLE_HIERARCHY:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        password_hash=hash_password(user_data.password)
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            role_level=ROLE_HIERARCHY[user.role],
            created_at=user.created_at
        )
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            role_level=ROLE_HIERARCHY[user["role"]],
            created_at=user["created_at"]
        )
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        role_level=ROLE_HIERARCHY[current_user["role"]],
        created_at=current_user["created_at"]
    )

# User management routes
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find().to_list(1000)
    return [
        UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            role_level=ROLE_HIERARCHY[user["role"]],
            created_at=user["created_at"]
        ) for user in users
    ]

# Task management routes
@api_router.post("/tasks")
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    # Get assignee user to check if assignment is allowed
    assignee = await db.users.find_one({"id": task_data.assigned_to})
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    # Check if current user can assign to this person
    if not can_assign_task(current_user["role"], assignee["role"]):
        raise HTTPException(status_code=403, detail="Cannot assign task to this user based on role hierarchy")
    
    task = Task(
        title=task_data.title,
        description=task_data.description,
        assigned_by=current_user["id"],
        assigned_to=task_data.assigned_to,
        priority=task_data.priority,
        due_date=task_data.due_date
    )
    
    await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    # Get tasks assigned to current user or assigned by current user
    tasks = await db.tasks.find({
        "$or": [
            {"assigned_to": current_user["id"]},
            {"assigned_by": current_user["id"]}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Populate user info
    for task in tasks:
        assigned_by_user = await db.users.find_one({"id": task["assigned_by"]}, {"_id": 0})
        assigned_to_user = await db.users.find_one({"id": task["assigned_to"]}, {"_id": 0})
        
        task["assigned_by_user"] = {
            "id": assigned_by_user["id"],
            "name": assigned_by_user["name"],
            "role": assigned_by_user["role"]
        } if assigned_by_user else None
        
        task["assigned_to_user"] = {
            "id": assigned_to_user["id"],
            "name": assigned_to_user["name"],
            "role": assigned_to_user["role"]
        } if assigned_to_user else None
    
    return tasks

@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user has access to this task
    if task["assigned_to"] != current_user["id"] and task["assigned_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Populate user info
    assigned_by_user = await db.users.find_one({"id": task["assigned_by"]}, {"_id": 0})
    assigned_to_user = await db.users.find_one({"id": task["assigned_to"]}, {"_id": 0})
    
    task["assigned_by_user"] = {
        "id": assigned_by_user["id"],
        "name": assigned_by_user["name"],
        "role": assigned_by_user["role"]
    } if assigned_by_user else None
    
    task["assigned_to_user"] = {
        "id": assigned_to_user["id"],
        "name": assigned_to_user["name"],
        "role": assigned_to_user["role"]
    } if assigned_to_user else None
    
    return task

@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user has access to update this task
    if task["assigned_to"] != current_user["id"] and task["assigned_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task

@api_router.post("/tasks/{task_id}/comments")
async def add_comment(task_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user has access to this task
    if task["assigned_to"] != current_user["id"] and task["assigned_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    comment = Comment(
        text=comment_data.text,
        author=current_user["id"]
    )
    
    await db.tasks.update_one(
        {"id": task_id},
        {
            "$push": {"comments": comment.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return comment

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()