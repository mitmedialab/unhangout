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

TARSNAP_BIN = "{{tarsnap_bin}}"
PG_DUMP_BIN = "{{tarsnap_pg_dump_path}}"
MYSQLDUMP_BIN = "{{tarsnap_mysqldump_path}}"
PSQL_BIN = "{{tarsnap_psql_path}}"
MYSQL_BIN = "{{tarsnap_mysql_path}}"

DIRS = [{% for dir in tarsnap_dirs %}'{{ dir }}',{% endfor %}]

POSTGRES_DATABASES = [{% for db in tarsnap_postgres_databases %}'{{ db }}',{% endfor %}]
MYSQL_DATABASES = [{% for db in tarsnap_mysql_databases %}'{{ db }}',{% endfor %}]
POSTGRES_USER = "{{tarsnap_postgres_user}}"
MYSQL_USER = "{{tarsnap_mysql_user}}"
POSTGRES_TMP_DIR = "{{tarsnap_postgres_tmp_dir}}"
MYSQL_TMP_DIR = "{{tarsnap_mysql_tmp_dir}}"

EXTRA_FLAGS = [{% for flag in tarsnap_extra_flags %}'{{ flag }}',{% endfor %}]
PG_DUMP_EXTRA_FLAGS = [{% for flag in tarsnap_pg_dump_extra_flags %}'{{ flag }}',{% endfor %}]

NUM_DAILY = {{tarsnap_num_daily}}
NUM_WEEKLY = {{tarsnap_num_weekly}}
NUM_MONTHLY = {{tarsnap_num_monthly}}
WEEKLY_DAY = {{tarsnap_weekly_day}}
MONTHLY_DAY = {{tarsnap_monthly_day}}

COMMON_FLAGS = [
    "--cachedir", "{{tarsnap_cache}}",
    "--exclude", "{{tarsnap_cache}}",
    "--keyfile", "{{tarsnap_key_path}}",
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
    os.chmod(path, 0700)

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
    if MYSQL_DATABASES:
        dirs.append(MYSQL_TMP_DIR[1:])
    return dirs

def list_archives():
    archives_raw = subprocess.check_output(
        [TARSNAP_BIN] + COMMON_FLAGS + ["--list-archives"]
    )
    archives = [a.strip() for a in archives_raw.split("\n")]
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
                "-f", os.path.join(POSTGRES_TMP_DIR, "{}.sql".format(db))
            ] + PG_DUMP_EXTRA_FLAGS, preexec_fn=setuid, env=env, cwd=cwd)

    if MYSQL_DATABASES:
        _mkdir(MYSQL_TMP_DIR, MYSQL_USER)
        setuid, env = _demote(MYSQL_USER)
        cwd = env['PWD'] = env['HOME']
        for db in MYSQL_DATABASES:
            with open(os.path.join(MYSQL_TMP_DIR, "{}.sql".format(db)), 'wb') as fh:
                subprocess.check_call(
                    [MYSQLDUMP_BIN, db],
                    preexec_fn=setuid,
                    env=env,
                    cwd=cwd,
                    stdin=subprocess.PIPE,
                    stdout=fh)

    # Run tarsnap
    for directory in dirs:
        filename = "{}-{}".format(backup_name, directory)
        subprocess.check_call([
            TARSNAP_BIN, "-C", "/",
        ] + COMMON_FLAGS + EXTRA_FLAGS + [
            "-c", "-f", filename, directory
        ])

    # Clean database dumps
    if POSTGRES_DATABASES:
        shutil.rmtree(POSTGRES_TMP_DIR)
    if MYSQL_DATABASES:
        shutil.rmtree(MYSQL_TMP_DIR)

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
        if not restore_files and directory not in [POSTGRES_TMP_DIR[1:], MYSQL_TMP_DIR[1:]]:
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
        if MYSQL_DATABASES:
            setuid, env = _demote(MYSQL_USER)
            cwd = env['PWD'] = env['HOME']
            for db in MYSQL_DATABASES:
                path = os.path.join(dest, MYSQL_TMP_DIR[1:], "{}.sql".format(db))
                with open(path) as fh:
                    proc = subprocess.check_call([MYSQL_BIN, db],
                        stdin=fh,
                        stdout=subprocess.PIPE,
                        preexec_fn=setuid,
                        env=env,
                        cwd=cwd
                    )

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
