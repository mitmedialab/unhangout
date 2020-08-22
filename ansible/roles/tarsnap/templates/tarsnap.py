import os
import re
import pwd
import pprint
import shutil
import argparse
import datetime
import subprocess

parser = argparse.ArgumentParser(description="Run and restore tarsnap backups")
parser.add_argument("--fsck", action="store_true")
parser.add_argument("--fsck-prune", action="store_true")
parser.add_argument("--list-latest", action="store_true")
parser.add_argument("--restore", action="store_true",
    help="Execute restore rather than backup. Default action is backup.")
parser.add_argument("--restore-dest", type=str, default="/",
    help="If restoring, root path to restore to. Default '/'")
parser.add_argument("--skip-database-restore", action="store_true",
    help="If restoring, skip restore of database dumps, which potentially overwriting data.")
parser.add_argument("--skip-file-restore", action="store_true",
    help="If true, skip restore of files (only do databases).")

TARSNAP_BIN = "/usr/bin/tarsnap"
PG_DUMP_BIN = "/usr/bin/pg_dump"
PSQL_BIN = "/usr/bin/psql"

DIRS = ["unhangout/media"]

POSTGRES_DATABASES = [{% for db in tarsnap_postgres_databases %}'{{ db }}',{% endfor %}]
POSTGRES_USER = "postgres"
POSTGRES_TMP_DIR = "/unhangout/postgres/"

NUM_DAILY = 7
NUM_WEEKLY = 3
NUM_MONTHLY = 3
WEEKLY_DAY = 5
MONTHLY_DAY = 1

COMMON_FLAGS = [
    "--cachedir", "/tarsnap/cache",
    "--exclude", "/tarsnap/cache",
    "--keyfile", "/root/tarsnap.key",
    "--humanize-numbers",
]

def run_backups():
    now = datetime.datetime.now()
    if now.day == MONTHLY_DAY:
        backup = now.strftime("%Y%m%d-%H%M%S-monthly")
    elif now.weekday() == WEEKLY_DAY:
        backup = now.strftime("%Y%m%d-%H%M%S-weekly")
    else:
        backup = now.strftime("%Y%m%d-%H%M%S-daily")
    run(backup)

def _mkdir(path, owner):
    if not os.path.exists(path):
        os.makedirs(path)
    pw_record = pwd.getpwnam(owner)
    os.chown(path, pw_record.pw_uid, pw_record.pw_gid)
    os.chmod(path, 0o700)

def _demote(username):
    pw_record = pwd.getpwnam(username)
    uid = pw_record.pw_uid
    gid = pw_record.pw_gid
    home = pw_record.pw_dir
    name = pw_record.pw_name

    def setuid():
        os.setgid(gid)
        os.setuid(uid)

    env = os.environ.copy()
    env['HOME'] = home
    env['USER'] = name
    env['LOGNAME'] = name
    env['PWD'] = home
    return setuid, env

def get_dirs():
    dirs = DIRS
    if POSTGRES_DATABASES:
        dirs.append(POSTGRES_TMP_DIR[1:])
    return dirs

def list_archives():
    archives_raw = subprocess.check_output(
        [TARSNAP_BIN] + COMMON_FLAGS + ["--list-archives"]
    )
    archives = [a.strip() for a in archives_raw.decode("utf-8").split("\n")]
    return archives

def run(backup_name):
    dirs = get_dirs()

    # Prepare database dumps
    if POSTGRES_DATABASES:
        _mkdir(POSTGRES_TMP_DIR, POSTGRES_USER)
        setuid, env = _demote(POSTGRES_USER)
        cwd = env['PWD'] = env['HOME']
        for db in POSTGRES_DATABASES:
            subprocess.check_call([
                PG_DUMP_BIN, db, "-c",
                "-h", "postgres",
                "-f", os.path.join(POSTGRES_TMP_DIR, "{}.sql".format(db))
            ], preexec_fn=setuid, env=env, cwd=cwd)

    # Run tarsnap
    for directory in dirs:
        filename = "{}-{}".format(backup_name, directory)
        subprocess.check_call([
            TARSNAP_BIN, "-C", "/",
        ] + COMMON_FLAGS + [
            "-c", "-f", filename, directory
        ])

    # Clean database dumps
    if POSTGRES_DATABASES:
        shutil.rmtree(POSTGRES_TMP_DIR)

    # Purge
    archives = list_archives()
    for directory in dirs:
        for period, limit in [
                ["daily", NUM_DAILY],
                ["weekly", NUM_WEEKLY],
                ["monthly", NUM_MONTHLY]]:
            for path in filter_archives(archives, period, directory)[limit:]:
                subprocess.check_call(
                    [TARSNAP_BIN] + COMMON_FLAGS + ["-d", "-f", path]
                )

def filter_archives(archives, period, directory):
    regex = "^\d{8}-\d{6}-%s-%s$" % (period, re.escape(directory))
    matching = [a for a in archives if re.match(regex, a)]
    matching.sort()
    matching.reverse()
    return matching

def latest_archives():
    dirs = get_dirs()
    archives = list_archives()
    latest = {}
    for directory in dirs:
        latest[directory] = filter_archives(archives, ".*", directory)[0]
    return latest

def restore_latest(dest, restore_files, restore_databases):
    if not os.path.exists(dest):
        os.makedirs(dest)

    for directory, latest in latest_archives().items():
        if not restore_files and directory not in [POSTGRES_TMP_DIR[1:]]:
            continue
        subprocess.check_call(
            [TARSNAP_BIN] + COMMON_FLAGS + ["-x", "-f", latest, "-C", dest],
        )

    if restore_databases:
        if POSTGRES_DATABASES:
            setuid, env = _demote(POSTGRES_USER)
            cwd = env['PWD'] = env['HOME']
            for db in POSTGRES_DATABASES:
                path = os.path.join(dest, POSTGRES_TMP_DIR[1:], "{}.sql".format(db))
                subprocess.check_call(
                        [PSQL_BIN, "-d", db, "-1", "-f", path],
                        preexec_fn=setuid,
                        env=env,
                        cwd=cwd)

def run_fsck():
    subprocess.check_call([TARSNAP_BIN, '--fsck'] + COMMON_FLAGS)

def run_fsck_prune():
    subprocess.check_call([TARSNAP_BIN, '--fsck-prune'] + COMMON_FLAGS)

def print_latest_archives():
    latest = latest_archives()
    pprint.pprint(latest)

if __name__ == "__main__":
    args = parser.parse_args()
    if args.fsck:
        run_fsck()
    elif args.fsck_prune:
        run_fsck_prune()
    elif args.list_latest:
        print_latest_archives()
    elif args.restore:
        restore_latest(args.restore_dest, not args.skip_file_restore,
                not args.skip_database_restore)
    else:
        run_backups()
