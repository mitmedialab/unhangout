#!/usr/bin/env python3
import os
import subprocess

BASE = os.path.abspath(os.path.dirname(__file__))
PATH = os.environ.get('PATH',
    "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin")

def venv_bin(arg):
    return os.path.join(BASE, "..", "venv", "bin", arg)

def main():
    try:
        procs = [
            # ASGI devserver
            subprocess.Popen(
                [venv_bin("python"), os.path.join(BASE, "manage.py"), "runserver"],
                cwd=BASE,
                env={'PATH': PATH}
            ),
            # Celery worker with embedded beat
            subprocess.Popen(
                [venv_bin("celery"), "-A", "reunhangout", "worker", "-B", "-l", "warning"],
                cwd=BASE,
                env={'PATH': PATH}
            ),
            # webpack devserver
            subprocess.Popen(
                ["node", os.path.join(BASE, "reunhangout", "webpack", "devserver.js")],
                cwd=BASE, env={'PATH': PATH}
            ),

        ]
        [proc.wait() for proc in procs]
    except Exception:
        for proc in procs:
            proc.kill()
        try:
            raise
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
