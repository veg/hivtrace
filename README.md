HIV-TRACE
==========

[![Build Status](https://travis-ci.org/veg/hivtrace.svg)](https://travis-ci.org/veg/hivtrace)
[![Coverage Status](https://coveralls.io/repos/veg/hivtrace/badge.png?branch=master)](https://coveralls.io/r/veg/hivtrace)

HIV TRACE is an application that identifies potential transmission
clusters within a supplied FASTA file with an option to find
potential links against the Los Alamos HIV Sequence Database. 

# Installation

## System Dependencies

HIV Trace requires [tn93](https://github.com/veg/tn93) be installed.
## Install using pip

`pip install numpy`

`pip install biopython`

`pip install https://github.com/veg/hivtrace.git --process-dependency-links`

# Example Usage

`hivtrace -i ./INPUT.FASTA -a 500 -r HXB2_prrt -t .015 -m 500 -g .05 -c`

# Options Summary

## -i --input

A FASTA file, with **nucleotide** sequences to be analyzed. Each sequence will
be aligned to the chosen reference sequence prior to network inference.
Sequence names may include munged attributes, 
e.g. ISOLATE_XYZ|2005|SAN DIEGO|MSM

## -a --ambiguities

Handle ambiguious nucleotides using one of the following specified strategies.

| Option    | Description                                                                  |
| --------- | --------------                                                               |
| resolve   | count any resolutions that match as a perfect match                          |
| average   | average all possible resolutions                                             |
| skip      | skip all positions with ambiguities                                          |
| gapmm     | count character-gap positions as 4-way mismatches, otherwise same as average |

For more details, please see the the [MBE paper](http://mbe.oxfordjournals.org/content/22/5/1208.short).

## -r --reference

The sequence that will be used to align everything else to. It is assumed that
the input sequences are in fact homologous to the reference and do not have too
much indel variation.

| Option               | Description                     |
| ---------            | --------------                  |
| HXB2_vif             |                                 |
| HXB2_vpu             |                                 |
| HXB2_int             |                                 |
| HXB2_vpr             |                                 |
| HXB2_pr              |                                 |
| HXB2_pol             |                                 |
| HXB2_tat             |                                 |
| HXB2_rt              |                                 |
| NL4-3_prrt           |                                 |
| HXB2_prrt            |                                 |
| HXB2_nef             |                                 |
| HXB2_gag             |                                 |
| HXB2_env             |                                 |
| HXB2_rev             |                                 |
| Path/to/FASTA/file   | Path to a custom reference file |

Please reference the [landmarks of the HIV-1 genome](http://www.hiv.lanl.gov/content/sequence/HIV/MAP/landmark.html) if the presets seem foreign to you.


## -t --threshold

Two sequences will be connected with a putative link (subject to filtering, see
below), if and only if their pairwise distance does not exceed this threshold.

## -m --minoverlap

Only sequences who overlap by at least this many non-gap characters will be
included in distance calculations. Be sure to adjust this based on the length
of the input sequences. You should aim to have at least 2/(distance threshold)
aligned characters.

## -f --fraction

Affects _only_ the **Resolve** option for handling ambiguities.
Any sequence with no more than the selected proportion [0 - 1] will have its
ambiguities resolved (if possible), and ambiguities in sequences with higher
fractions of them will be averaged. This mitigates spurious linkages due to
highly ambiguous sequences.

## -u --curate

Screen for contaminants by marking or removing sequences that cluster with any of the contaminant IDs.

| Option    | Description                                             |
| --------- | --------------                                          |
| remove    | Remove spurious edges from the inferred network         |
| report    | Flag all sequences sharing a cluster with the reference |
| none      | Do nothing                                              |



## -f --filter

Use a phylogenetic test of conditional independence on each triangle in the
network to remove spurious _transitive_ connections which make
A->B->C chains look like A-B-C triangles. 

## -s --strip_drams

| Option    | Description                                                                                                                                      |
| --------- | --------------                                                                                                                                   |
| lewis     | Mask (with ---) the list of codon sites defined in [Lewis et al](http://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0050050). |
| wheeler   | Mask (with ---) the list of codon sites defined in [Wheeler et al](http://www.ncbi.nlm.nih.gov/pubmed/20395786).                                 |

 
## -c --compare
Compare uploaded sequences to all public sequences. 
Retrieved periodically from the [Los Alamos HIV Sequence Database](http://hiv.lanl.gov)


