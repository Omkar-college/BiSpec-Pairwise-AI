import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("STARTING BISPEC PAIRWISE AI APPLICATION")
    print("=" * 70)
    print("Web Dashboard URL: http://127.0.0.1:8000")
    print("Interactive API Docs: http://127.0.0.1:8000/docs")
    print("Press CTRL+C to stop the server.")
    print("=" * 70)
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
