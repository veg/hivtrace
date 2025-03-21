#! /usr/bin/env python3
"""
True Append for HIV-TRACE
"""

import argparse

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

# constants
HIVTRACE_TRUE_APPEND_VERSION = "0.0.2"
DEFAULT_TN93_ARGS = "-q"
DEFAULT_TN93_PATH = "tn93"
MIN_TN93_VERSION = "1.0.14"
DEFAULT_TN93_JSON = "tn93.json"
STDIO = {"stderr": stderr, "stdin": stdin, "stdout": stdout}


# check TN93 version
def check_tn93_version(tn93_path):
    A, B, C = [int(v) for v in MIN_TN93_VERSION.split(".")]
    user_version = (
        run([tn93_path, "--version"], capture_output=True)
        .stderr.decode()
        .strip()
        .lstrip("v")
    )
    a, b, c = [int(v) for v in user_version.split(".")]
    if (a < A) or (a == A and b < B) or (a == A and b == B and c < C):
        raise ValueError(
            "Installed tn93 version (%s) is below the minimum required version (%s)"
            % (user_version, MIN_TN93_VERSION)
        )


# return the current time as a string
def get_time():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# print to log (prefixed by current time)
def print_log(s="", end="\n"):
    print("[%s] %s" % (get_time(), s), file=stderr, end=end)
    stderr.flush()


# open file and return file object
def open_file(fn, mode="r", text=True):
    if fn in STDIO:
        return STDIO[fn]
    elif fn.lower().endswith(".gz"):
        if mode == "a":
            raise NotImplementedError("Cannot append to gzip file")
        if text:
            mode += "t"
        return gopen(fn, mode)
    else:
        return open(fn, mode)


# create and yield a temporary FIFO as a context manager: https://stackoverflow.com/a/54895027/2134991
@contextmanager
def create_fifo():
    tmp_d = mkdtemp()
    tmp_fn = "%s/fifo" % tmp_d
    mkfifo(tmp_fn)
    try:
        yield tmp_fn
    finally:
        unlink(tmp_fn)
        rmdir(tmp_d)


# parse user args
def parse_args():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "-it",
        "--input_user_table",
        required=True,
        type=str,
        help="Input: User table (CSV)",
    )
    parser.add_argument(
        "-iT",
        "--input_old_table",
        required=True,
        type=str,
        help="Input: Old table (CSV)",
    )
    parser.add_argument(
        "-iD",
        "--input_old_dists",
        required=True,
        type=str,
        help="Input: Old TN93 distances (CSV)",
    )
    parser.add_argument(
        "-oD",
        "--output_dists",
        required=False,
        type=str,
        default="stdout",
        help="Output: Updated TN93 distances (CSV)",
    )
    parser.add_argument(
        "--tn93_args",
        required=False,
        type=str,
        default=DEFAULT_TN93_ARGS,
        help="Optional tn93 arguments",
    )
    parser.add_argument(
        "--tn93_path",
        required=False,
        type=str,
        default=DEFAULT_TN93_PATH,
        help="Path to tn93 executable",
    )
    args = parser.parse_args()
    for fn in [args.input_user_table, args.input_old_table, args.input_old_dists]:
        if not isfile(fn) and not fn.startswith("/dev/fd"):
            raise ValueError("File not found: %s" % fn)
    for fn in [args.output_dists]:
        if fn.lower().endswith(".gz"):
            raise ValueError(
                "Cannot directly write to gzip output file. To gzip the output, specify 'stdout' as the output file, and then pipe to gzip."
            )
        if isfile(fn):
            raise ValueError("File exists: %s" % fn)
    return args


# parse input table
# Argument: `input_table` = path to input table CSV
# Return: `dict` in which keys are EHARS UIDs and values are clean_seqs
def parse_table(input_table_fn):
    # set things up
    header_row = None
    col2ind = None
    seqs = dict()
    infile = open_file(input_table_fn)

    # load sequences from table (and potentially write output FASTA)
    for row in reader(infile):
        # parse header row
        if header_row is None:
            header_row = row
            col2ind = {k: i for i, k in enumerate(header_row)}
            for k in ["ehars_uid", "clean_seq"]:
                if k not in col2ind:
                    raise ValueError(
                        "Column '%s' missing from input user table: %s"
                        % (k, input_user_table)
                    )

        # parse sequence row
        else:
            ehars_uid = row[col2ind["ehars_uid"]].strip()
            clean_seq = row[col2ind["clean_seq"]].strip().upper()
            if ehars_uid in seqs:
                raise ValueError(
                    "Duplicate EHARS UID (%s) in file: %s" % (ehars_uid, input_table)
                )
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
    to_add = set()
    to_replace = set()
    to_delete = set(seqs_old.keys())
    to_keep = set()
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
        row = [v.strip() for v in line.split(",")]
        if (row_num == 0 and not remove_header) or (
            row_num != 0 and row[0] in to_keep and row[1] in to_keep
        ):
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
def run_tn93(
    seqs_new,
    seqs_old,
    out_dists_file,
    to_add,
    to_replace,
    to_keep,
    remove_header=True,
    tn93_args=DEFAULT_TN93_ARGS,
    tn93_path=DEFAULT_TN93_PATH,
    tn93_stdout=DEFAULT_TN93_JSON,
):
    # set things up
    from subprocess import DEVNULL, PIPE, CompletedProcess, CalledProcessError
    import subprocess
    import tempfile
    import os
    import csv
    import io
    
    # Parse tn93 arguments
    if isinstance(tn93_args, str):
        tn93_base_command = [tn93_path] + [v.strip() for v in tn93_args.split()]
    else:
        tn93_base_command = [tn93_path] + tn93_args
    
    modified_seqs = to_add | to_replace
    
    # If we have no new sequences, there's nothing to compute
    if len(modified_seqs) == 0:
        return
        
    # Create temporary files for new sequences
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='_new.fasta') as new_fasta:
        for seq_id in modified_seqs:
            new_fasta.write(f">{seq_id}\n{seqs_new[seq_id]}\n")
        new_fasta_path = new_fasta.name
    
    # Create a temporary file to store intermediate output
    temp_output_path = None
    
    try:
        # We'll write the header manually
        out_file = out_dists_file if isinstance(out_dists_file, str) else out_dists_file.name
        with open(out_file, 'w') as header_file:
            header_file.write("ID1,ID2,Distance\n")
        
        # NOTE: We no longer need to manually generate diagonal entries
        # because we're using the -0 flag with tn93 which does this automatically
        
        # First compute distances between new sequences (new-new)
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='_temp.csv') as temp_output:
            temp_output_path = temp_output.name
        
        # Run tn93 for new-new distances - make sure -0 flag is included exactly once
        tn93_new_new_cmd = list(tn93_base_command)
        
        # Remove any existing -0 flags to prevent duplicates
        if '-0' in tn93_new_new_cmd:
            tn93_new_new_cmd.remove('-0')
            
        # Add required flags
        tn93_new_new_cmd.extend(['-0', '-n', '-o', temp_output_path, new_fasta_path])
        print_log(f"Running tn93 for new-new distances: {' '.join(tn93_new_new_cmd)}")
        
        # Run the command with proper error handling
        try:
            completed_process = run(tn93_new_new_cmd, stdout=DEVNULL, stderr=PIPE, check=True, text=True)
        except subprocess.CalledProcessError as e:
            print_log(f"Error running tn93 for new-new distances: {e}")
            print_log(f"Error output: {e.stderr}")
            raise
        
        # Append the output to our result file (skipping header)
        with open(temp_output_path, 'r') as temp_input:
            # Check if file has content before trying to skip header
            first_line = temp_input.readline()
            if first_line:  # If file is not empty
                # If this is the header line (it should be), don't write it
                if not first_line.startswith("ID1,ID2,Distance"):
                    with open(out_file, 'a') as main_out:
                        main_out.write(first_line)
                
                # Write the rest of the file
                with open(out_file, 'a') as main_out:
                    main_out.write(temp_input.read())
        
        # Now compute distances between new and old sequences (new-old)
        if len(to_keep) > 0:
            # Create a temporary file for old sequences
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='_old.fasta') as old_fasta:
                for seq_id in to_keep:
                    old_fasta.write(f">{seq_id}\n{seqs_old[seq_id]}\n")
                old_fasta_path = old_fasta.name
            
            try:
                # Run tn93 for new-old distances
                # Clear the temp output file
                open(temp_output_path, 'w').close()
                
                tn93_new_old_cmd = list(tn93_base_command)
                
                # Remove any existing -0 flags to prevent duplicates
                if '-0' in tn93_new_old_cmd:
                    tn93_new_old_cmd.remove('-0')
                    
                # Add required flags
                tn93_new_old_cmd.extend(['-0', '-n', '-o', temp_output_path, '-s', new_fasta_path, old_fasta_path])
                print_log(f"Running tn93 for new-old distances: {' '.join(tn93_new_old_cmd)}")
                
                # Run the command with proper error handling
                try:
                    completed_process = run(tn93_new_old_cmd, stdout=DEVNULL, stderr=PIPE, check=True, text=True)
                except subprocess.CalledProcessError as e:
                    print_log(f"Error running tn93 for new-old distances: {e}")
                    print_log(f"Error output: {e.stderr}")
                    raise
                
                # Append the new-old distances to our result file (skipping header)
                with open(temp_output_path, 'r') as temp_file:
                    # Check if file has content before trying to skip header
                    first_line = temp_file.readline()
                    if first_line:  # If file is not empty
                        # If this is the header line (it should be), don't write it
                        if not first_line.startswith("ID1,ID2,Distance"):
                            with open(out_file, 'a') as main_out:
                                main_out.write(first_line)
                        
                        # Write the rest of the file
                        with open(out_file, 'a') as main_out:
                            main_out.write(temp_file.read())
            finally:
                # Clean up the old sequences file
                try:
                    os.unlink(old_fasta_path)
                except:
                    pass
    
    finally:
        # Clean up temporary files
        try:
            if temp_output_path:
                os.unlink(temp_output_path)
            os.unlink(new_fasta_path)
        except:
            pass


# main True Append program
def true_append(
    seqs_new=None,
    seqs_old=None,
    input_old_dists=None,
    output_dists=None,
    tn93_args=DEFAULT_TN93_ARGS,
    tn93_path=DEFAULT_TN93_PATH,
    tn93_stdout=DEFAULT_TN93_JSON,
):
    print_log("Running HIV-TRACE True Append v%s" % HIVTRACE_TRUE_APPEND_VERSION)
    if seqs_new is None:  # args not provided, so parse from command line
        args = parse_args()
        print_log("Command: %s" % " ".join(argv))
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
    # print_log("Creating output TN93 distances CSV: %s" % output_dists)
    output_dists_file = open_file(output_dists, "w")
    print_log("Copying old TN93 distances from: %s" % input_old_dists)
    remove_IDs_tn93(input_old_dists, output_dists_file, to_keep, remove_header=False)
    print_log("Calculating all new pairwise TN93 distances...")
    run_tn93(
        seqs_new,
        seqs_old,
        output_dists_file,
        to_add,
        to_replace,
        to_keep,
        remove_header=True,
        tn93_args=tn93_args,
        tn93_path=tn93_path,
        tn93_stdout=tn93_stdout,
    )


# run main program
if __name__ == "__main__":
    true_append()  # running with default args will use argparse
