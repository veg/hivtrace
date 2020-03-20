#!/usr/bin/env python3

import os
import gzip
from setuptools import setup

def gunzip_file(zip_file, out_file):
    ''' unzips files'''
    with gzip.open(zip_file, 'rb') as f_in:
        with open(out_file, 'wb') as f_out:
            f_out.writelines(f_in)

def setup_package():
    ''' setup declaration '''

    # Unzip LANL files
    resource_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'hivtrace/rsrc')
    lanl_zip = os.path.join(resource_dir, 'LANL.FASTA.gz')
    lanl_tn93output_zip = os.path.join(resource_dir, 'LANL.TN93OUTPUT.csv.gz')
    lanl_outfile = os.path.join(resource_dir, 'LANL.FASTA')
    lanl_tn93output_outfile = os.path.join(resource_dir, 'LANL.TN93OUTPUT.csv')

    gunzip_file(lanl_zip, lanl_outfile)
    gunzip_file(lanl_tn93output_zip, lanl_tn93output_outfile)

    setup(
        name='hivtrace',
        version='0.6.1',
        description='HIV-TRACE',
        author='Joel Wertheim, Sergei Pond, and Steven Weaver',
        author_email='sweaver@temple.edu',
        url='http://www.hivtrace.org',
        packages=['hivtrace'],
        package_data={
            'hivtrace': [
                'rsrc/LANL.FASTA.gz',
                'rsrc/LANL.TN93OUTPUT.csv.gz',
                'web/templates/results.html',
                'web/static/*.js',
                'web/static/*.css',
                'web/static/workers/*.js',
                'web/static/css/*.css',
                'web/static/fonts/*'
                ]
            },
        install_requires=[
            'biopython >= 1.58',
            'bioext >= 0.19.4',
            'hppy >= 0.9.9',
            'tornado >= 4.3',
            'hivclustering >= 1.6.0',
            ],
        entry_points={
            'console_scripts': [
                'hivtrace = hivtrace.hivtrace:main',
                'hivtrace_strip_drams = hivtrace.strip_drams:main',
                'hivtrace_viz = hivtrace.hivtraceviz:main',
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
