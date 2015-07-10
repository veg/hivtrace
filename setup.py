#!/usr/bin/env python

from setuptools import setup
import os
import zipfile

def unzip_file(zip_file, dir):
    zip_ref = zipfile.ZipFile(zip_file, 'r')
    zip_ref.extractall(dir)
    zip_ref.close()


def setup_package():

    # Unzip LANL files
    resource_dir =  os.path.join(os.path.dirname(os.path.realpath(__file__)), 'hivtrace/rsrc')
    lanl_zip = os.path.join(resource_dir, 'lanl.zip')
    lanl_tn93output_zip = os.path.join(resource_dir, 'lanl.tn93results.zip')
    unzip_file(lanl_zip, resource_dir)
    unzip_file(lanl_tn93output_zip, resource_dir)

    setup(

        name='hivtrace',
        version='0.1.0',
        description='HIV Trace',
        author='Steven Weaver',
        author_email='sweaver@ucsd.edu',
        url='http://www.hivtrace.org',
        packages=['hivtrace'],
        entry_points= {
            'console_scripts': [
                'hivtrace = hivtrace.hivtrace:main',
                'hivtrace_strip_drams = hivtrace.strip_drams:main',
            ]
        }
    )

# Unzip LANL

if __name__ == '__main__':
    setup_package()

# Non-Python/non-PyPI plugin dependencies:
# convert: ffmpeg
# bpd: pygst


