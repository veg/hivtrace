#! /usr/bin/env python3
'''
True Append for HIV-TRACE
'''

# imports
from contextlib import contextmanager
from csv import reader
from datetime import datetime
from gzip import open as gopen
from os import mkfifo, rmdir, unlink
from os.path import isfile
from subprocess import run
from sys import argv, stderr, stdin, stdout
from tempfile import mkdtemp
from threading import Thread
import argparse

# constants
HIVTRACE_TRUE_APPEND_VERSION = '0.0.2'
DEFAULT_TN93_ARGS = ''
DEFAULT_TN93_PATH = 'tn93'
MIN_TN93_VERSION = '1.0.14'
STDIO = {'stderr':stderr, 'stdin':stdin, 'stdout':stdout}

# check TN93 version
def check_tn93_version(tn93_path):
    A, B, C = [int(v) for v in MIN_TN93_VERSION.split('.')]
    user_version = run([tn93_path, '--version'], capture_output=True).stderr.decode().strip().lstrip('v')
    a, b, c = [int(v) for v in user_version.split('.')]
    if (a < A) or (a == A and b < B) or (a == A and b == B and c < C):
        raise ValueError("Installed tn93 version (%s) is below the minimum required version (%s)" % (user_version, MIN_TN93_VERSION))

# return the current time as a string
def get_time():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# print to log (prefixed by current time)
def print_log(s='', end='\n'):
    print("[%s] %s" % (get_time(), s), file=stderr, end=end); stderr.flush()

# open file and return file object
def open_file(fn, mode='r', text=True):
    if fn in STDIO:
        return STDIO[fn]
    elif fn.lower().endswith('.gz'):
        if mode == 'a':
            raise NotImplementedError("Cannot append to gzip file")
        if text:
            mode += 't'
        return gopen(fn, mode)
    else:
        return open(fn, mode)

# create and yield a temporary FIFO as a context manager: https://stackoverflow.com/a/54895027/2134991
@contextmanager
def create_fifo():
    tmp_d = mkdtemp(); tmp_fn = '%s/fifo' % tmp_d; mkfifo(tmp_fn)
    try:
        yield tmp_fn
    finally:
        unlink(tmp_fn); rmdir(tmp_d)

# parse user args
def parse_args():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('-it', '--input_user_table', required=True, type=str, help="Input: User table (CSV)")
    parser.add_argument('-iT', '--input_old_table', required=True, type=str, help="Input: Old table (CSV)")
    parser.add_argument('-iD', '--input_old_dists', required=True, type=str, help="Input: Old TN93 distances (CSV)")
    parser.add_argument('-oD', '--output_dists', required=False, type=str, default='stdout', help="Output: Updated TN93 distances (CSV)")
    parser.add_argument('--tn93_args', required=False, type=str, default=DEFAULT_TN93_ARGS, help="Optional tn93 arguments")
    parser.add_argument('--tn93_path', required=False, type=str, default=DEFAULT_TN93_PATH, help="Path to tn93 executable")
    args = parser.parse_args()
    for fn in [args.input_user_table, args.input_old_table, args.input_old_dists]:
        if not isfile(fn) and not fn.startswith('/dev/fd'):
            raise ValueError("File not found: %s" % fn)
    for fn in [args.output_dists]:
        if fn.lower().endswith('.gz'):
            raise ValueError("Cannot directly write to gzip output file. To gzip the output, specify 'stdout' as the output file, and then pipe to gzip.")
        if isfile(fn):
            raise ValueError("File exists: %s" % fn)
    return args

# parse input table
# Argument: `input_table` = path to input table CSV
# Return: `dict` in which keys are EHARS UIDs and values are clean_seqs
def parse_table(input_table_fn):
    # set things up
    header_row = None; col2ind = None; seqs = dict()
    infile = open_file(input_table_fn)

    # load sequences from table (and potentially write output FASTA)
    for row in reader(infile):
        # parse header row
        if header_row is None:
            header_row = row; col2ind = {k:i for i,k in enumerate(header_row)}
            for k in ['ehars_uid', 'clean_seq']:
                if k not in col2ind:
                    raise ValueError("Column '%s' missing from input user table: %s" % (k, input_user_table))

        # parse sequence row
        else:
            ehars_uid = row[col2ind['ehars_uid']].strip(); clean_seq = row[col2ind['clean_seq']].strip().upper()
            if ehars_uid in seqs:
                raise ValueError("Duplicate EHARS UID (%s) in file: %s" % (ehars_uid, input_table))
            seqs[ehars_uid] = clean_seq

    # clean up and return
    infile.close()
    return seqs

# determine dataset deltas
# Argument: `seqs_new` = `dict` where keys are user-uploaded sequence IDs and values are sequences
# Argument: `seqs_old` = `dict` where keys are existing sequence IDs and values are sequences
# Return: `to_add` = `set` containing IDs in `seqs_new` that need to be added to `seqs_old`
# Return: `to_replace` = `set` containing IDs in `seqs_old` whose sequences need to be updated with those in `seqs_new`
# Return: `to_delete` = `set` containing IDs in `seqs_old` that need to be deleted
# Return: `to_keep` = `set` containing IDs in `seqs_old` that need to be kept as-is
def determine_deltas(seqs_new, seqs_old):
    to_add = set(); to_replace = set(); to_delete = set(seqs_old.keys()); to_keep = set()
    for ID in seqs_new:
        if ID in seqs_old:
            to_delete.remove(ID)
            if seqs_new[ID] == seqs_old[ID]:
                to_keep.add(ID)
            else:
                to_replace.add(ID)
        else:
            to_add.add(ID)
    return to_add, to_replace, to_delete, to_keep

# remove IDs from TN93 distance CSV
# Argument: `in_dists_fn` = path to input old TN93 distances file
# Argument: `out_dists_file` = write/append-mode file object to output TN93 distances file
# Argument: `to_keep` = `set` containing IDs to keep in TN93 distances file
# Argument: `remove_header` = `True` to remove the header in the output file, otherwise `False`
def remove_IDs_tn93(in_dists_fn, out_dists_file, to_keep, remove_header=True):
    infile = open_file(in_dists_fn)
    for row_num, line in enumerate(infile):
        row = [v.strip() for v in line.split(',')]
        if (row_num == 0 and not remove_header) or (row_num != 0 and row[0] in to_keep and row[1] in to_keep):
            out_dists_file.write(line)
    infile.close()

# run tn93 on all new-new and new-old pairs
# Argument: `seqs_new` = `dict` where keys are user-uploaded sequence IDs and values are sequences
# Argument: `seqs_old` = `dict` where keys are existing sequence IDs and values are sequences
# Argument: `out_dists_file` = write/append-mode file object to output TN93 distances file
# Argument: `to_add` = `set` containing IDs to add to TN93 distances file
# Argument: `to_replace` = `set` containing IDs in `seqs_old` whose sequences need to be updated with those in `seqs_new`
# Argument: `to_keep` = `set` containing IDs to keep in TN93 distances file
# Argument: `tn93_args` = string containing optional tn93 arguments
# Argument: `tn93_path` = path to tn93 executable
def run_tn93(seqs_new, seqs_old, out_dists_file, to_add, to_replace, to_keep, remove_header=True, tn93_args=DEFAULT_TN93_ARGS, tn93_path=DEFAULT_TN93_PATH):
    # set things up
    tn93_base_command = [tn93_path] + [v.strip() for v in tn93_args]
    new_fasta_data = ''.join('>%s\n%s\n' % (k,seqs_new[k]) for k in (to_add | to_replace)).encode('utf-8')

    # calculate new-new distances
    if len(new_fasta_data) != 0:
        tn93_command_new_new = list(tn93_base_command)
        if remove_header:
            tn93_command_new_new.append('-n')
        run(tn93_command_new_new, input=new_fasta_data)

    # calculate new-old distances
    if len(new_fasta_data) != 0 and len(to_keep) != 0:
        old_fasta_data = ''.join('>%s\n%s\n' % (k,seqs_old[k]) for k in to_keep).encode('utf-8')
        with create_fifo() as tmp_fifo_fn:
            def write_to_fifo(data):
                with open(tmp_fifo_fn, 'wb') as tmp_fifo:
                    tmp_fifo.write(data)
            write_thread = Thread(target=write_to_fifo, args=(new_fasta_data,))
            write_thread.start()
            tn93_command_new_old = tn93_base_command + ['-n', '-s', tmp_fifo_fn]
            run(tn93_command_new_old, input=old_fasta_data, stdout=out_dists_file)
            write_thread.join()

# main True Append program
def true_append(seqs_new=None, seqs_old=None, input_old_dists=None, output_dists=None, tn93_args=DEFAULT_TN93_ARGS, tn93_path=DEFAULT_TN93_PATH):
    print_log("Running HIV-TRACE True Append v%s" % HIVTRACE_TRUE_APPEND_VERSION)
    if seqs_new is None: # args not provided, so parse from command line
        args = parse_args()
        print_log("Command: %s" % ' '.join(argv))
        print_log("Parsing user table: %s" % args.input_user_table)
        seqs_new = parse_table(args.input_user_table)
        print_log("Parsing old table: %s" % args.input_old_table)
        seqs_old = parse_table(args.input_old_table)
        output_dists = args.output_dists
        input_old_dists = args.input_old_dists
        tn93_args = args.tn93_args
        tn93_path = args.tn93_path
    check_tn93_version(tn93_path)
    print_log("- Num New Sequences: %s" % len(seqs_new))
    print_log("- Num Old Sequences: %s" % (len(seqs_old)))
    print_log("Determining deltas between new seqs and old seqs ...")
    to_add, to_replace, to_delete, to_keep = determine_deltas(seqs_new, seqs_old)
    print_log("- Add: %s" % len(to_add))
    print_log("- Replace: %s" % len(to_replace))
    print_log("- Delete: %s" % len(to_delete))
    print_log("- Do nothing: %s" % (len(to_keep)))
    print_log("Creating output TN93 distances CSV: %s" % output_dists)
    output_dists_file = open_file(output_dists, 'w')
    print_log("Copying old TN93 distances from: %s" % input_old_dists)
    remove_IDs_tn93(input_old_dists, output_dists_file, to_keep, remove_header=False)
    print_log("Calculating all new pairwise TN93 distances...")
    run_tn93(seqs_new, seqs_old, output_dists_file, to_add, to_replace, to_keep, remove_header=True, tn93_args=tn93_args, tn93_path=tn93_path)

# run main program
if __name__ == "__main__":
    true_append() # running with default args will use argparse
