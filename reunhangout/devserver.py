#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse

BASE = os.path.abspath(os.path.dirname(__file__))
PATH = os.environ.get('PATH',
    "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin")

parser = argparse.ArgumentParser()
parser.add_argument('--flamegraph', action='store_true')
parser.add_argument("--flamegraph-output", type=str,
        default=os.path.join(BASE, "..", "logs", "perf.log"))


def venv_bin(arg):
    return os.path.join(BASE, "..", "venv", "bin", arg)

def main():
    args = parser.parse_args()
    if args.flamegraph:
        try:
            import flamegraph
        except ImportError:
            print("Install python-flamegraph first. "
                  "https://github.com/evanhempel/python-flamegraph")
            sys.exit(1)
        else:
            print("Writing performance log to %s" % args.flamegraph_output)
            print("Generate a flamegraph svg using https://github.com/brendangregg/FlameGraph")
            print()
            runserver = [venv_bin("python"), "-m", "flamegraph",
                "-o", args.flamegraph_output,
                os.path.join(BASE, "manage.py"), "runserver"]
    else:
        runserver = [venv_bin("python"), os.path.join(BASE, "manage.py"), "runserver"]

    try:
        procs = [
            # ASGI devserver
            subprocess.Popen(runserver, cwd=BASE, env={'PATH': PATH}),
            # Celery worker with embedded beat
            subprocess.Popen(
                [venv_bin("celery"), "-A", "reunhangout", "worker", "-B", "-l", "warning"],
                cwd=BASE,
                env={'PATH': PATH}
            ),
            # webpack devserver
            subprocess.Popen(
                ["node", os.path.join(BASE, "webpack", "devserver.js")],
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
