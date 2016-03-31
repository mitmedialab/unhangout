#!/usr/bin/env python3
import os
import subprocess

BASE = os.path.abspath(os.path.dirname(__file__))
PATH = os.environ.get('PATH',
    "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin")

def main():
    try:
        procs = [
            subprocess.Popen([
                    os.path.join(BASE, "..", "venv", "bin", "python"),
                    os.path.join(BASE, "manage.py"),
                    "runserver"
                ],
                cwd=BASE,
                env={
                    'PATH': PATH
                }
            ),
            subprocess.Popen([
                    "node",
                    os.path.join(BASE, "reunhangout", "webpack", "devserver.js")
                ],
                cwd=BASE,
                env={
                    'PATH': PATH
                }
            )
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
