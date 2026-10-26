from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.controllers import auth, orders, products, reports, stock, users
from app.database import SessionLocal
from app.dependencies import business_error
from app.services.seed import seed_data

API_PREFIX = "/api/v1"
ALLOWED_MUTATION_ORIGINS = {settings.frontend_origin.rstrip("/")}
if settings.app_env == "development":
    ALLOWED_MUTATION_ORIGINS.update({"http://127.0.0.1:8000", "http://localhost:8000"})


@asynccontextmanager
async def lifespan(_: FastAPI):
    with SessionLocal() as db:
        seed_data(db)
    yield


app = FastAPI(title="Cupcake Store API", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def validate_mutation_origin(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if origin is None or origin.rstrip("/") not in ALLOWED_MUTATION_ORIGINS:
            exc = business_error(
                status.HTTP_403_FORBIDDEN,
                "INVALID_ORIGIN",
                "A origem desta solicitação não é permitida.",
            )
            return JSONResponse(
                status_code=exc.status_code, content={"detail": exc.detail}
            )
    response = await call_next(request)
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    fields = [
        {
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "message": error["msg"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": {
                "code": "VALIDATION_ERROR",
                "message": "Revise os campos informados.",
                "details": {"fields": fields},
            }
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok"}


for controller in (auth, users, products, orders, stock, reports):
    app.include_router(controller.router, prefix=API_PREFIX)
