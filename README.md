HIV Trace is an application that identifies potential transmission
clusters within a supplied FASTA file with an option to find
potential links against the Los Alamos HIV Sequence Database. 

# Installation

HIV Trace requires [tn93](https://github.com/veg/tn93) be installed.

`pip install git+git://github.com/veg/hivtrace.git@master`

# Example
`hivtrace -i ./INPUT.FASTA -a 500 -r HXB2_prrt -t .015 -m 500 -g .05 -c`

# Options Summary

## -i --input

A FASTA file, with **nucleotide** sequences to be analyzed. Each sequence will
be aligned to the chosen reference sequence prior to network inference.
Sequence names may include munged attributes, 
e.g. ISOLATE_XYZ|2005|SAN DIEGO|MSM

## -a --ambiguities
* Resolve - count any resolutions that match as a perfect match
* Average - average all possible resolutions
* Skip - skip all positions with ambiguities
* GAPMM - Count character-gap positions as 4-way mismatches, otherwise same as average

## -r --reference

The sequence that will be used to align everything else to. It is assumed that
the input sequences are in fact homologous to the reference and do not have too
much indel variation.

## -t --threshold

Two sequences will be connected with a putative link (subject to filtering, see
below), if and only if their pairwise distance does not exceed this threshold.

## -m --minoverlap

Only sequences who overlap by at least this many non-gap characters will be
included in distance calculations. Be sure to adjust this based on the length
of the input sequences. You should aim to have at least 2/(distance threshold)
aligned characters.

## -f --fraction

Affects _only_ the **Resolve** option for handling ambiguities 
Any sequence with no more than the selected proportion [0 - 1] will have its
ambiguities resovled (if possible), and ambiguities in sequences with higher
fractions of them will be averaged. This mitigates spurious linkages due to
highly ambiguous sequences.

## -u --curate

## -f --filter

Use a phylogenetic test of conditional independence on each triangle in the
network to remove spurious _transitive_ connections which make
A->B->C chains look like A-B-C triangles. 

## -s --strip_drams
Mask (with ---) the list of codon sites defined in [Lewis et al](http://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0050050)
 
## -c --compare
Compare uploaded sequences to the all of the public sequences, retrieved
periodically from (http://hiv.lanl.gov)


