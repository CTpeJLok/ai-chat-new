import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "core.asgi:application",
        port=8080,
        reload=True,
        log_level="info",
    )
