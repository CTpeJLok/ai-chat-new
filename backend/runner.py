import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "core.asgi:application",
        host="192.168.10.160",
        port=8080,
        reload=True,
        log_level="info",
    )
