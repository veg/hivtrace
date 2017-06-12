#!/usr/bin/env python3

import argparse
import subprocess
from subprocess import PIPE
import shutil
import os
import gzip
import sys

from Bio import SeqIO
import csv
from itertools import chain
from itertools import groupby
import json
import logging
import tempfile
import hivtrace.strip_drams as sd

class status:
    PENDING   = 1
    RUNNING   = 2
    COMPLETED = 3

# List phases
class phases:
    ALIGNING                     = (0, "Aligning")
    BAM_FASTA_CONVERSION         = (1, "BAM to FASTA conversion")
    FILTER_CONTAMINANTS          = (2, "Screening contaminants")
    COMPUTE_TN93_DISTANCE        = (3, "Computing pairwise TN93 distances")
    INFERRING_NETWORK            = (4, "Inferring, filtering, and analyzing molecular transmission network")
    PUBLIC_COMPUTE_TN93_DISTANCE = (5, "Computing pairwise TN93 distances against a public database")
    PUBLIC_INFERRING_CONNECTIONS = (6, "Inferring connections to sequences in a public database")

def update_status(id, phase, status, msg = ""):

    msg = {
      'type'   : 'status update',
      'index'  : phase[0],
      'title'  : phase[1],
      'status' : status,
      'msg'    : msg
    }

    logging.info(json.dumps(msg))

def fasta_iter(fasta_name):
    """
    Iterate through fasta file
    """
    fh = open(fasta_name)
    faiter = (x[1] for x in groupby(fh, lambda line: line[0] == ">"))
    for header in faiter:
        header = header.__next__()[1:].strip()
        seq = "".join(s.strip() for s in faiter.__next__())
        yield header, seq

def gunzip_file(zip_file, out_file):
    with gzip.open(zip_file, 'rb') as f_in:
        with open(out_file, 'wb') as f_out:
            f_out.writelines(f_in)

def rename_duplicates(fasta_fn, delimiter):
    """
    Renames duplicate ids in the user supplied FASTA file by appending a
    counter after the duplicate id
    """

    # Create a tmp file
    copy_fn = fasta_fn + '.tmp'

    with open(copy_fn, 'w') as copy_f:
        with open(fasta_fn) as fasta_f:

            #Create a counter dictionary
            lines = fasta_f.readlines()
            ids = filter(lambda x: x.startswith('>'), lines)
            id_dict = {}
            [id_dict.update({id.strip() : 0}) for id in ids]
            ids = id_dict

            #Change names based on counter
            for line in lines:
                line = line.strip()
                if line.startswith('>'):
                    if line in ids.keys():
                        ids[line] += 1
                        if ids[line] > 1:
                            line = line + delimiter + 'DUPLICATE ' + str(ids[line])
                copy_f.write(line + '\n')

    #Overwrite existing file
    shutil.move(copy_fn, fasta_fn)

def concatenate_data(output, reference_fn, pairwise_fn, user_fn):
    """
    Concatenates data from the output of
    1) The user tn93 analysis output
    2) The lanl file tn93 output
    3) The lanl file with user as a reference tn93 output
    """

    #cp LANL_TN93OUTPUT_CSV USER_LANL_TN93OUTPUT
    shutil.copyfile(reference_fn, output)

    with open(output, 'a') as f:
        fwriter = csv.writer(f, delimiter=',')

        for file in (pairwise_fn, user_fn):
            with open(file) as pairwise_f:
                preader = csv.reader(pairwise_f, delimiter=',')
                next(preader)
                fwriter.writerows([row[0:3] for row in preader])



def create_filter_list(tn93_fn, filter_list_fn):
    """
    Creates a CSV filter list that hivclustercsv will use to only return
    clusters that contain ids from the user supplied FASTA file
    """

    # tail -n+2 OUTPUT_TN93_FN | awk -F , '{print 1"\n"2}' | sort -u >
    # USER_FILTER_LIST
    with open(filter_list_fn, 'w') as f:

        ids = lambda x : [x[0], x[1]]

        with open(tn93_fn) as tn93_f:
            tn93reader = csv.reader(tn93_f, delimiter=',', quotechar='|')
            tn93reader.__next__()
            rows = [ids(row) for row in tn93reader]
            #Flatten list
            rows = list(set(list(chain.from_iterable(rows))))
            [f.write(row + '\n') for row in rows]


def id_to_attributes(csv_fn, attribute_map, delimiter):
    '''
    Parse attributes from id and return them in a dictionary format
    '''

    id_dict={}

    # Create a tmp file
    copy_fn = csv_fn + '.tmp'

    # The attribute filed in hivclustercsv is unsatisfactory
    # Create dictionary from ids
    # [{'id': {'a1': '', 'a2': '', ... , 'a3': ''}}, ...]
    with open(csv_fn) as csv_f:
        preader = csv.reader(csv_f, delimiter=',', quotechar='|')
        next(preader)
        rows = set([item for row in preader for item in row[:2]])
        #Create unique id list from rows
        for id in rows:
            #Parse just the filename from fasta_fn
            source=os.path.basename(csv_fn)
            attr = [source]
            attr.extend(id.split(delimiter))

            #Check for malformed id
            #if(len(attr) < len(attribute_map)):
            #    return ValueError('Malformed id in FASTA file ID: ' + id)

            id_dict.update({id : dict(zip(attribute_map, attr))})

    return id_dict

def annotate_attributes(trace_json_fn, attributes):
    '''
    Annotate attributes created from id_to_attributes to hivclustercsv results
    for easy parsing in JavaScript
    '''

    trace_json_cp_fn = trace_json_fn + '.tmp'

    with open(trace_json_fn) as json_fh:
        trace_json = json.loads(json_fh.read())
        nodes = trace_json.get('Nodes')
        try:
          [node.update({'attributes' : attributes[node['id']]}) for node in nodes]
          #TODO Raise error if cannot annotate
          with open(trace_json_cp_fn, 'w') as copy_f:
              json.dump(trace_json, copy_f)
        except: # pragma: no cover
          return

    shutil.move(trace_json_cp_fn, trace_json_fn)

    return

def annotate_lanl(trace_json_fn, lanl_file):
    '''
    Annotate attributes created from id_to_attributes to hivclustercsv results
    for easy parsing in JavaScript
    '''

    trace_json_cp_fn = trace_json_fn + '.tmp'
    lanl = SeqIO.parse(open(lanl_file, 'r'), 'fasta')
    lanl_ids = set([r.id for r in lanl])

    with open(trace_json_fn) as json_fh:
        trace_json = json.loads(json_fh.read())
        nodes = trace_json.get('Nodes')
        node_ids = set([n["id"] for n in nodes])

        try:
          lanl_hits = node_ids.intersection(lanl_ids)
          [node.update({'is_lanl' : str(node["id"] in lanl_hits).lower() }) for node in nodes]
          with open(trace_json_cp_fn, 'w') as copy_f:
              json.dump(trace_json, copy_f)
        except: #pragma: no cover
          return

    shutil.move(trace_json_cp_fn, trace_json_fn)
    return

def get_singleton_nodes(nodes_in_results, original_fn):

    seqs = list(map(lambda x: x[0], fasta_iter(original_fn)))
    node_names = list(map(lambda x: x['id'], nodes_in_results))
    singletons = list(filter(lambda x: x not in node_names, seqs))
    node_objects = [{'edi': None, 'attributes': [], 'cluster': None, 'id': node_name, 'baseline': None} for node_name in singletons]

    return node_objects

def hivtrace(id, input, reference, ambiguities, threshold, min_overlap,
             compare_to_lanl, fraction, strip_drams_flag = False, filter_edges = "no",
             handle_contaminants = "remove", skip_alignment = False):

    """
    PHASE 1)  Pad sequence alignment to HXB2 length with bealign
    PHASE 2)  Convert resulting bam file back to FASTA format
    PHASE 2b) Rename any duplicates in FASTA file
    PHASE 3)  Strip DRAMs if requested
    PHASE 3b) Filtering contaminants before TN93 run if requested
    PHASE 4)  TN93 analysis on the supplied FASTA file alone
    PHASE 5)  Run hivclustercsv to return clustering information in JSON format
    PHASE 5b) Attribute annotations to results from (4)
    PHASE 6)  Run tn93 against LANL if user elects to
    PHASE 6b) Concatenate results from pre-run LANL tn93, user tn93, and (5) analyses
    PHASE 6c) Flag any potential HXB2 sequences
    PHASE 7)  Run hivclustercsv to return clustering information in json format
    """

    results_json = {}

    # Declare reference file
    resource_dir =  os.path.join(os.path.dirname(os.path.realpath(__file__)), 'rsrc')


    #These should be defined in the user's environment
    env_dir = os.path.dirname(sys.executable)
    PYTHON=sys.executable
    BEALIGN=os.path.join(env_dir, 'bealign')
    BAM2MSA=os.path.join(env_dir, 'bam2msa')
    TN93DIST='tn93'
    HIVNETWORKCSV=os.path.join(env_dir, 'hivnetworkcsv')

    # This will have to be another parameter
    LANL_FASTA = os.path.join(resource_dir, 'LANL.FASTA')
    LANL_TN93OUTPUT_CSV = os.path.join(resource_dir, 'LANL.TN93OUTPUT.csv')
    DEFAULT_DELIMITER='|'

    # Check if LANL files exists. If not, then check if zip file exists,
    # otherwise throw error
    try :
        if not os.path.isfile(LANL_FASTA):
            lanl_zip = os.path.join(resource_dir, 'LANL.FASTA.gz')
            gunzip_file(lanl_zip, LANL_FASTA)

        if not os.path.isfile(LANL_TN93OUTPUT_CSV):
            lanl_tn93output_zip = os.path.join(resource_dir, 'LANL.TN93OUTPUT.csv.gz')
            gunzip_file(lanl_tn93output_zip, LANL_TN93OUTPUT_CSV)
    except e: # pragma: no cover
        print("Oops, missing a resource file")
        raise


    # Python Parameters
    SCORE_MATRIX='HIV_BETWEEN_F'
    OUTPUT_FORMAT='csv'
    SEQUENCE_ID_FORMAT='plain'

    # Intermediate filenames
    tmp_path = tempfile.mkdtemp(prefix='hivtrace-')
    basename = os.path.basename(input)

    BAM_FN                        = os.path.join(tmp_path, basename+'_output.bam')
    OUTPUT_FASTA_FN               = input+'_output.fasta'
    OUTPUT_TN93_FN                = os.path.join(tmp_path, basename+'_user.tn93output.csv')
    OUTPUT_TN93_CONTAM_FN         = os.path.join(tmp_path, basename+'_contam.tn93output.csv')
    DEST_TN93_FN                  = input+'_user.tn93output.csv'
    JSON_TN93_FN                  = os.path.join(tmp_path, basename+'_user.tn93output.json')
    JSON_TN93_CONTAM_FN           = os.path.join(tmp_path, basename+'_contam.tn93output.json')
    OUTPUT_COMBINED_SEQUENCE_FILE = os.path.join(tmp_path, basename+"_combined_user_lanl.fasta")
    OUTPUT_CLUSTER_JSON           = os.path.join(tmp_path, basename+'_user.trace.json')
    LANL_OUTPUT_CLUSTER_JSON      = os.path.join(tmp_path, basename+'_lanl_user.trace.json')
    OUTPUT_USERTOLANL_TN93_FN     = os.path.join(tmp_path, basename+'_usertolanl.tn93output.csv')
    USER_LANL_TN93OUTPUT          = os.path.join(tmp_path, basename+'_userlanl.tn93output.csv')
    USER_FILTER_LIST              = os.path.join(tmp_path, basename+'_user_filter.csv')
    CONTAMINANT_ID_LIST           = os.path.join(tmp_path, basename+'_contaminants.csv')

    # File handler for output we don't care about
    DEVNULL = open(os.devnull, 'w')

    EXCLUSION_LIST = None

    # Check for incompatible statements

    if skip_alignment and compare_to_lanl:
        raise Exception("You have passed arguments that are incompatible! You cannot compare to the public database if you elect to submit a pre-made alignment! Please consider the issue before trying again.")

    if skip_alignment:

        # Check for equal length in all sequences
        seqs = fasta_iter(input)
        seq_length = len(seqs.__next__()[1])

        if(any(len(seq[1]) != seq_length for seq in seqs)):
            raise Exception("Not all input sequences have the same length!")

        # copy input file to output fasta file
        shutil.copyfile(input, OUTPUT_FASTA_FN)

    else:
        # PHASE 1
        update_status(id, phases.ALIGNING, status.RUNNING)

        if handle_contaminants is None:
            handle_contaminants  = 'no'

        bealign_process = [BEALIGN, '-q', '-r', reference , '-m', SCORE_MATRIX, '-R', input, BAM_FN]

        if handle_contaminants != 'no':
            bealign_process.insert (-3, '-K')

        logging.debug(' '.join(bealign_process))
        subprocess.check_call(bealign_process, stdout=DEVNULL)
        update_status(id, phases.ALIGNING, status.COMPLETED)

        # PHASE 2
        update_status(id, phases.BAM_FASTA_CONVERSION, status.RUNNING)
        bam_process = [BAM2MSA, BAM_FN, OUTPUT_FASTA_FN]
        logging.debug(' '.join(bam_process))
        subprocess.check_call(bam_process, stdout=DEVNULL)
        update_status(id, phases.BAM_FASTA_CONVERSION, status.COMPLETED)

    if handle_contaminants != 'no':
        with (open (OUTPUT_FASTA_FN, 'r')) as msa:
            reference_name = next (SeqIO.parse (msa, 'fasta')).id
            logging.debug ('Reference name set to %s' % reference_name)
            with open (CONTAMINANT_ID_LIST, 'w') as contaminants:
                print (reference_name, file = contaminants)


    # Ensure unique ids
    # Warn of duplicates by annotating with an attribute
    rename_duplicates(OUTPUT_FASTA_FN, DEFAULT_DELIMITER)
    attribute_map = ('SOURCE', 'SUBTYPE', 'COUNTRY', 'ACCESSION_NUMBER', 'YEAR_OF_SAMPLING')

    # PHASE 3
    # Strip DRAMS
    if strip_drams_flag:
        OUTPUT_FASTA_FN_TMP = OUTPUT_FASTA_FN + ".spool"
        with open (str(OUTPUT_FASTA_FN_TMP),'w') as output_file:
            for (seq_id, data) in sd.strip_drams (OUTPUT_FASTA_FN, strip_drams_flag):
                print (">%s\n%s" % (seq_id, data), file = output_file)
        shutil.move (OUTPUT_FASTA_FN_TMP, OUTPUT_FASTA_FN)

    # PHASE 3b Filter contaminants
    if handle_contaminants == 'separately':

        update_status(id, phases.FILTER_CONTAMINANTS, status.RUNNING)

        with open(JSON_TN93_CONTAM_FN, 'w') as tn93_contam_fh:
            tn93_contam_process = [ TN93DIST,
                            '-q',
                            '-o', OUTPUT_TN93_CONTAM_FN,
                            '-t', '0.015',
                            '-a', 'resolve',
                            '-l', min_overlap,
                            '-g', '1.0',
                            '-s', reference,
                            '-f', OUTPUT_FORMAT,
                            OUTPUT_FASTA_FN ]

            print(' '.join(tn93_contam_process))
            logging.debug(' '.join(tn93_contam_process))
            subprocess.check_call(tn93_contam_process,stdout=tn93_contam_fh,stderr=tn93_contam_fh)
            # shutil.copyfile(OUTPUT_TN93_FN, DEST_TN93_FN)
            update_status(id, phases.FILTER_CONTAMINANTS, status.COMPLETED)

        # Process output for contaminants and remove them from the file
        # Store the contaminants for reporting later
        with open(OUTPUT_TN93_CONTAM_FN, 'r') as tn93_contam_fh:
            tn93reader = csv.reader(tn93_contam_fh, delimiter=',', quotechar='|')
            tn93reader.__next__()
            contams = [row[0] for row in tn93reader]

            OUTPUT_FASTA_FN_TMP = OUTPUT_FASTA_FN + ".contam.tmp"

            # Remove contams from FASTA file
            with (open (OUTPUT_FASTA_FN, 'r')) as msa_fn:
                msa = SeqIO.parse (msa_fn, 'fasta')
                filtered_msa = filter(lambda x: x.id not in contams, msa)
                # Write to new TMP file
                with open(OUTPUT_FASTA_FN_TMP, "w") as output_handle:
                        SeqIO.write(filtered_msa, output_handle, "fasta")

            shutil.move (OUTPUT_FASTA_FN_TMP, OUTPUT_FASTA_FN)

    # PHASE 4
    update_status(id, phases.COMPUTE_TN93_DISTANCE, status.RUNNING)

    with open(JSON_TN93_FN, 'w') as tn93_fh:
        tn93_process = [TN93DIST, '-q', '-o', OUTPUT_TN93_FN, '-t',
                               threshold, '-a', ambiguities, '-l',
                               min_overlap, '-g', fraction if ambiguities == 'resolve' else '1.0', '-f', OUTPUT_FORMAT, OUTPUT_FASTA_FN]

        logging.debug(' '.join(tn93_process))
        subprocess.check_call(tn93_process,stdout=tn93_fh,stderr=tn93_fh)
        shutil.copyfile(OUTPUT_TN93_FN, DEST_TN93_FN)
        update_status(id, phases.COMPUTE_TN93_DISTANCE, status.COMPLETED)

    # send contents of tn93 to status page

    id_dict = id_to_attributes(OUTPUT_TN93_FN, attribute_map, DEFAULT_DELIMITER)
    if type(id_dict) is ValueError:
        update_status(id, "Error: " + id_dict.args[0])
        raise id_dict

    # PHASE 5
    update_status(id, phases.INFERRING_NETWORK, status.RUNNING)

    output_cluster_json_fh = open(OUTPUT_CLUSTER_JSON, 'w')

    hivnetworkcsv_process = [HIVNETWORKCSV, '-i', OUTPUT_TN93_FN, '-t',
                                   threshold, '-f', SEQUENCE_ID_FORMAT, '-j', '-o']

    if filter_edges and filter_edges != 'no':
        hivnetworkcsv_process.extend (['-n',filter_edges, '-s', OUTPUT_FASTA_FN])

    if handle_contaminants != 'no' and handle_contaminants != 'separately':
        hivnetworkcsv_process.extend (['-C', handle_contaminants, '-F', CONTAMINANT_ID_LIST])

    # hivclustercsv uses stderr for status updates
    complete_stderr = ''
    returncode = None

    logging.debug(' '.join(hivnetworkcsv_process))

    with subprocess.Popen(hivnetworkcsv_process, stdout=output_cluster_json_fh, stderr=PIPE, bufsize=1, universal_newlines=True) as p:
        for line in p.stderr:
            complete_stderr += line
            update_status(id, phases.INFERRING_NETWORK, status.RUNNING, complete_stderr)
        p.wait()

    if p.returncode != 0:
        raise subprocess.CalledProcessError(returncode, ' '.join(hivnetworkcsv_process), complete_stderr)

    update_status(id, phases.INFERRING_NETWORK, status.COMPLETED, complete_stderr)
    output_cluster_json_fh.close()

    # Read and print output_cluster_json
    results_json["trace_results"] = json.loads(open(OUTPUT_CLUSTER_JSON, 'r').read())

    # Get singletons
    singletons = get_singleton_nodes(results_json['trace_results']['Nodes'], input)

    results_json['trace_results']['Singletons'] = singletons

    # Place singleton count in Network Summary
    results_json['trace_results']['Network Summary']['Singletons'] = len(singletons)

    # Place contaminant nodes in Network Summary
    if handle_contaminants == 'separately':
        results_json['trace_results']['Network Summary']['contaminant_sequences'] = contams

    if not compare_to_lanl:
        return results_json

    if compare_to_lanl:

      # PHASE 6
      update_status(id, phases.PUBLIC_COMPUTE_TN93_DISTANCE, status.RUNNING)
      lanl_tn93_process = ''

      if ambiguities != 'resolve':
          lanl_tn93_process = [TN93DIST, '-q', '-o', OUTPUT_USERTOLANL_TN93_FN, '-t',
                                 threshold, '-a', ambiguities,
                                 '-f', OUTPUT_FORMAT, '-l', min_overlap, '-s',
                                 LANL_FASTA, OUTPUT_FASTA_FN]
      else:
          lanl_tn93_process = [TN93DIST, '-q', '-o', OUTPUT_USERTOLANL_TN93_FN, '-t',
                               threshold, '-a', ambiguities,
                               '-f', OUTPUT_FORMAT, '-g', fraction, '-l',
                               min_overlap, '-s', LANL_FASTA,
                               OUTPUT_FASTA_FN]


      logging.debug(' '.join(lanl_tn93_process))
      subprocess.check_call(lanl_tn93_process, stdout=DEVNULL)
      update_status(id, phases.PUBLIC_COMPUTE_TN93_DISTANCE, status.COMPLETED)

      # send contents of tn93 to status page

      # PHASE 6b
      # Perform concatenation
      # This is where reference annotation becomes an issue
      concatenate_data(USER_LANL_TN93OUTPUT, LANL_TN93OUTPUT_CSV,
                       OUTPUT_USERTOLANL_TN93_FN, OUTPUT_TN93_FN)


      lanl_id_dict = id_to_attributes(OUTPUT_TN93_FN, attribute_map, DEFAULT_DELIMITER)

      # Create a list from TN93 csv for hivnetworkcsv filter
      create_filter_list(OUTPUT_TN93_FN, USER_FILTER_LIST)


      # PHASE 7
      update_status(id,phases.PUBLIC_INFERRING_CONNECTIONS, status.RUNNING)
      lanl_output_cluster_json_fh = open(LANL_OUTPUT_CLUSTER_JSON, 'w')


      if filter_edges and filter_edges != 'no':
         with open (OUTPUT_COMBINED_SEQUENCE_FILE, 'w') as combined_fasta:
            for f_path in (LANL_FASTA, OUTPUT_FASTA_FN):
                with open (f_path) as src_file:
                    shutil.copyfileobj (src_file,combined_fasta)
                    print ("\n", file = combined_fasta)

         lanl_hivnetworkcsv_process = [PYTHON, HIVNETWORKCSV, '-i', USER_LANL_TN93OUTPUT, '-t',
                                        threshold, '-f', SEQUENCE_ID_FORMAT, '-j', '-k', USER_FILTER_LIST,
                                        '-n', filter_edges, '-s', OUTPUT_COMBINED_SEQUENCE_FILE
                                        ]

      else:
          lanl_hivnetworkcsv_process = [PYTHON, HIVNETWORKCSV, '-i', USER_LANL_TN93OUTPUT, '-t',
                                        threshold, '-f', SEQUENCE_ID_FORMAT, '-j', '-k', USER_FILTER_LIST]

      if handle_contaminants != 'no':
          lanl_hivnetworkcsv_process.extend (['-C', handle_contaminants, '-F', CONTAMINANT_ID_LIST])

      logging.debug(' '.join(lanl_hivnetworkcsv_process))

      # hivclustercsv uses stderr for status updates
      complete_stderr = ''
      with subprocess.Popen(lanl_hivnetworkcsv_process, stdout=lanl_output_cluster_json_fh, stderr=PIPE, bufsize=1, universal_newlines=True) as p:
          for line in p.stderr:
              complete_stderr += line
              update_status(id, phases.PUBLIC_INFERRING_CONNECTIONS, status.RUNNING, complete_stderr)
          p.wait()

      if p.returncode != 0:
        raise subprocess.CalledProcessError(returncode, ' '.join(lanl_hivnetworkcsv_process), complete_stderr)


      lanl_output_cluster_json_fh.close()

      update_status(id, phases.PUBLIC_INFERRING_CONNECTIONS, status.COMPLETED)

      #Annotate LANL nodes with id
      json_info = open(LANL_OUTPUT_CLUSTER_JSON, 'r').read()

      if json_info:
        # Only include clusters that are connected to supplied nodes
        annotate_lanl(LANL_OUTPUT_CLUSTER_JSON, LANL_FASTA)
        lanl_trace_results = json.loads(json_info)
        results_json['lanl_trace_results'] = lanl_trace_results
      else:
        logging.debug('no lanl results!')


    DEVNULL.close()
    return results_json

def main():

    parser = argparse.ArgumentParser(description='HIV TRACE')
    parser.add_argument('-i', '--input', help='FASTA file', required=True)
    parser.add_argument('-a', '--ambiguities', help='handle ambiguous nucleotides using the specified strategy', required=True)
    parser.add_argument('-r', '--reference', help='reference to align to', required=True)
    parser.add_argument('-t', '--threshold', help='Only count edges where the distance is less than this threshold', required=True)
    parser.add_argument('-m', '--minoverlap', help='Minimum Overlap', required=True)
    parser.add_argument('-g', '--fraction', help='Fraction', required=True)
    parser.add_argument('-u', '--curate', help='Filter contaminants')
    parser.add_argument('-f', '--filter', help='Edge filtering option', default = "no", type = str)
    parser.add_argument('-s', '--strip_drams', help="Read in an aligned Fasta file (HIV prot/rt sequences) and remove \
                                                     DRAM (drug resistance associated mutation) codon sites. It will output a new alignment \
                                                     with these sites removed. It requires input/output file names along with the list of \
                                                     DRAM sites to remove: 'lewis' or 'wheeler'.")
    parser.add_argument('-c', '--compare', help='Compare to supplied FASTA file', action='store_true')
    parser.add_argument('--skip-alignment', help='Skip alignment', action='store_true')
    parser.add_argument('--log', help='Write logs to specified directory')


    args = parser.parse_args()

    if args.log:
        log_fn = args.log
    else:
        log_fn = "hivtrace.log"

    logging.basicConfig (filename = log_fn, level=logging.DEBUG)

    FN=args.input
    ID=os.path.basename(FN)
    REFERENCE = args.reference
    AMBIGUITY_HANDLING=args.ambiguities.lower()
    DISTANCE_THRESHOLD=args.threshold
    MIN_OVERLAP=args.minoverlap
    COMPARE_TO_LANL=args.compare
    FRACTION=args.fraction
    STRIP_DRAMS = args.strip_drams

    if STRIP_DRAMS != 'wheeler' and STRIP_DRAMS != 'lewis':
        STRIP_DRAMS = False

    results = hivtrace(ID, FN, REFERENCE, AMBIGUITY_HANDLING, DISTANCE_THRESHOLD, MIN_OVERLAP, COMPARE_TO_LANL, FRACTION, strip_drams_flag =STRIP_DRAMS, filter_edges = args.filter, handle_contaminants = args.curate, skip_alignment=args.skip_alignment)
    print(json.dumps(results))


if __name__ == "__main__":
    main()
