# This PYTHON script will read in an aligned Fasta file (HIV prot/rt sequences) and remove
# DRAM (drug resistance associated mutation) codon sites. It will output a new alignment
# with these sites removed. It requires input/output file names along with the list of
# DRAM sites to remove: 'lewis' or 'wheeler'.

import sys, argparse


def strip_drams(infile, dram_type, rt_only = False):
# take an input file path, and the type of DRAMs
# create a generator which consumes a FASTA file and
# returns (id, stripped_seq) pair

    DRAM_set = set ()


    def local_strip (seq):
        return ''.join ([nuc if i not in DRAM_set else '-' for i,nuc in enumerate (seq) ])

    if dram_type == 'lewis':
        # Protease Set
        PR_set = set([30,32,33,46,47,48,50,54,76,82,84,88,90])
        # Reverse Transcriptase Set
        RT_set = set([41,62,65,67,69,70,74,75,77,100,103,106,108,115,116,151,181,184,188,190,210,215,219,225,236])
    elif dram_type == 'wheeler':
        # Protease Set
        PR_set = set([11,23,24,30,32,46,47,48,50,53,54,58,73,74,76,82,83,84,85,88,90])
        # Reverse Transcriptase Set
        RT_set = set([41,44,62,65,67,69,70,74,75,77,100,101,103,106,115,116,151,179,181,184,188,190,210,215,219,225,230])
    else:
        raise ValueError ("Invalid dram_type '%s'" % dram_type)

    if rt_only:
        for d in PR_set:
            DRAM_set.update ([(d-1)*3 + k for k in range (3)])
        for d in RT_set:
            DRAM_set.update ([294 + d*3 + k for k in range (3)])
    else:
        for d in RT_set:
            DRAM_set.update ([(d-1)*3 + k for k in range (3)])


    # Read in sequence id and entire sequence into dictionary
    seq_data = ''
    with open(str(infile),'r') as fh:
        for line in fh:
            if line.lstrip()[0] == ">":
                if len (seq_data):
                    yield (seq_id, local_strip (seq_data))

                seq_id = line.strip()[1:]
                seq_data = ''
            else:
                seq_data += line.strip()

    if len(seq_data):
        yield (seq_id, local_strip (seq_data))

def main():
    arguments = argparse.ArgumentParser(description='Replace DRAMS with gaps in ALIGNED pol sequences')

    arguments.add_argument('-i', '--input', help = 'The input FASTA file', required = True, type = str)
    arguments.add_argument('-o', '--output', help = 'Output', required = False, default = sys.stdout, type = argparse.FileType('w'))
    arguments.add_argument('-d', '--dram', help = 'Use this list of DRAMs', required = True, choices = ['lewis', 'wheeler'])

    settings    = arguments.parse_args()


    for (id, data) in strip_drams (settings.input, settings.dram):
        print (">%s\n%s" % (id, data), file = settings.output)


if __name__ == '__main__':
    main()

