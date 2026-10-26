import uvicorn

from app.config import settings

uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
