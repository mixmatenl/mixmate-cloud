import os
import uvicorn

port = int(os.environ.get("PORT", 8000))
print(f"Starting MIXMATE Cloud on port {port}", flush=True)
uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
