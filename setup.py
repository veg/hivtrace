#!/usr/bin/env python3

#  Datamonkey - An API for comparative analysis of sequence alignments using state-of-the-art statistical models.
#
#  Copyright (C) 2015
#  Sergei L Kosakovsky Pond (spond@ucsd.edu)
#  Steven Weaver (sweaver@ucsd.edu)
#
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the
#  "Software"), to deal in the Software without restriction, including
#  without limitation the rights to use, copy, modify, merge, publish,
#  distribute, sublicense, and/or sell copies of the Software, and to
#  permit persons to whom the Software is furnished to do so, subject to
#  the following conditions:
#
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
#  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
#  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
#  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
#  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
#  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

from setuptools import setup
import os
import gzip

def gunzip_file(zip_file, out_file):
    with gzip.open(zip_file, 'rb') as f_in:
        with open(out_file, 'wb') as f_out:
            f_out.writelines(f_in)



def setup_package():

    # Unzip LANL files
    resource_dir =  os.path.join(os.path.dirname(os.path.realpath(__file__)), 'hivtrace/rsrc')
    lanl_zip = os.path.join(resource_dir, 'LANL.FASTA.gz')
    lanl_tn93output_zip = os.path.join(resource_dir, 'LANL.TN93OUTPUT.csv.gz')
    lanl_outfile = os.path.join(resource_dir, 'LANL.FASTA')
    lanl_tn93output_outfile = os.path.join(resource_dir, 'LANL.TN93OUTPUT.csv')

    gunzip_file(lanl_zip, lanl_outfile)
    gunzip_file(lanl_tn93output_zip, lanl_tn93output_outfile)

    setup(
        name='hivtrace',
        version='0.1.2',
        description='HIV Trace',
        author='Steven Weaver',
        author_email='sweaver@ucsd.edu',
        url='http://www.hivtrace.org',
        packages=['hivtrace'],
        package_data={
            'hivtrace': [
                'rsrc/LANL.FASTA.gz',
                'rsrc/LANL.TN93OUTPUT.csv.gz'
                ]
            },
        dependency_links = ['git+git://github.com/veg/hyphy-python.git@0.1.1#egg=HyPhy-0.1.1',
                            'git+git://github.com/veg/BioExt.git@0.17.2#egg=BioExt-0.17.2',
                            'git+git://github.com/veg/hppy.git@0.9.6#egg=hppy-0.9.6',
                            'git+git://github.com/veg/hivclustering.git@1.1.3#egg=hivclustering-1.1.3'
                            ],
        install_requires=[
            'biopython >= 1.58',
            'BioExt >= 0.17.2',
            'HyPhy >= 0.1.1',
            'hppy >= 0.9.6',
            'hivclustering >= 1.1.4',
            ],
        entry_points= {
            'console_scripts': [
                'hivtrace = hivtrace.hivtrace:main',
                'hivtrace_strip_drams = hivtrace.strip_drams:main',
            ]
        },
        tests_require=[
            'nose'
        ]

    )

# Unzip LANL

if __name__ == '__main__':
    setup_package()

# Non-Python/non-PyPI plugin dependencies:
# tn93
