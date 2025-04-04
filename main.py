import os
import subprocess


def start_backend():
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    env = os.environ.copy()
    env["PYTHONPATH"] = backend_dir + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.Popen(["python", os.path.join(backend_dir, "src", "main.py")], env=env)


def start_client():
    client_dir = os.path.join(os.path.dirname(__file__), "client")
    env = os.environ.copy()
    env["PYTHONPATH"] = client_dir + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.Popen(["python", os.path.join(client_dir, "src", "client.py")], env=env)


if __name__ == "__main__":
    backend_process = start_backend()
    client_process = start_client()

    # Keep the main script running
    try:
        input("Press Enter to terminate...\n")
    except KeyboardInterrupt:
        print("Shutting down Guitool")
    finally:
        # Terminate the backend process
        client_process.terminate()
        client_process.wait()

        backend_process.terminate()
        backend_process.wait()

    print("Guitool stopped.")
