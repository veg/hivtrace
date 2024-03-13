#!/usr/bin/env python

import os
from os import path

from hivtrace import hivtrace
from hivtrace.strip_drams import strip_drams
import unittest
import json
import csv
import logging
import tempfile
import shutil

logging.basicConfig(level=logging.DEBUG)


class TestHIVTrace(unittest.TestCase):
    def setUp(self):

        this_dirname = os.path.join(
            os.path.dirname(os.path.realpath(__file__)))

        self.fn = path.join(this_dirname, 'rsrc/TEST.FASTA')
        self.aligned_fn = path.join(this_dirname, 'rsrc/TEST.ALIGNED.FASTA')
        self.custom_reference = path.join(this_dirname,
                                          'rsrc/TEST_REFERENCE.FASTA')
        self.malformed_ids_fn = path.join(
            this_dirname, 'rsrc/TEST_WITH_REFERENCE_CONTAMINANTS.fa')
        self.env_fn = path.join(this_dirname,
                                'rsrc/HIV1_ALL_2013_env_DNA.fasta')
        self.lanl_tn93output_csv = path.join(
            this_dirname, '../hivtrace/rsrc/LANL.TN93OUTPUT.csv')
        self.lanl_file = path.join(this_dirname, '../hivtrace/rsrc/LANL.FASTA')

        self.user_lanl_tn93output = self.fn + '_USERLANL.TN93OUTPUT.CSV'
        self.output_tn93_fn = self.fn + '_USER.TN93OUTPUT.CSV'
        self.output_usertolanl_tn93_fn = self.fn + '_USERTOLANL.TN93OUTPUT.CSV'
        self.hxb2_linked_fn = self.fn + '_user.hxb2linked.csv'
        self.lanl_output_cluster_json = self.fn + '_LANL_USER.TRACE.JSON'

        self.ambiguities = 'average'
        self.reference = 'HXB2_prrt'
        self.distance_threshold = '.015'
        self.distance_threshold = '.015'
        self.min_overlap = '500'
        self.ambiguity_handling = 'AVERAGE'
        self.hivcluster_json_fn = self.fn + '_USER.TRACE.JSON'

    def tearDown(self):
        return

    def test_flag_duplicates(self):

        # Copy file
        tmp_file = tempfile.mktemp()
        shutil.copy2(self.fn, tmp_file)

        hivtrace.rename_duplicates(tmp_file, '|')

        # Check ids
        with open(tmp_file, 'r') as fasta_f:
            ids = filter(lambda x: x.startswith('>'), fasta_f.readlines())

        self.assertTrue('>Z|JP|K03455|2036|DUPLICATE 6\n' in ids)

        return

    def test_concatenate_data(self):
        hivtrace.concatenate_data(
            self.user_lanl_tn93output, self.lanl_tn93output_csv,
            self.output_usertolanl_tn93_fn, self.output_tn93_fn)

        with open(self.lanl_tn93output_csv, 'r') as tn93_file:
            lanl_length = len(tn93_file.readlines()) - 1

        with open(self.output_usertolanl_tn93_fn, 'r') as tn93_file:
            u2l_length = len(tn93_file.readlines()) - 1

        with open(self.output_tn93_fn, 'r') as tn93_file:
            output_length = len(tn93_file.readlines()) - 1

        # Check that there are five test_ids
        with open(self.user_lanl_tn93output, 'r') as tn93_file:
            total_length = len(tn93_file.readlines()) - 1
            self.assertTrue(
                lanl_length + u2l_length + output_length == total_length)
        return

    def test_annotate_lanl(self):

        tmp_file = tempfile.mktemp()
        shutil.copy2(self.lanl_output_cluster_json, tmp_file)

        hivtrace.annotate_lanl(tmp_file, self.lanl_file)

        # Check that there are five test_ids
        with open(tmp_file, 'r') as fasta_f:
            # Parse each node and check if is_lanl exists
            results = json.loads(fasta_f.read())
            [self.assertTrue("is_lanl" in node) for node in results["Nodes"]]

        return

    def test_filter_list(self):

        tmp_file = tempfile.mktemp()
        hivtrace.create_filter_list(self.output_tn93_fn, tmp_file)
        print(tmp_file)

        # Check that file exists and that there are five ids named correctly
        with open(tmp_file, 'r') as filter_list:
            lines = filter_list.readlines()
            print(lines)
            length = len(lines)
            self.assertTrue(length >= 5)
        return

    def test_attribute_parse(self):

        output_tn93_fn = self.fn + '_USER.TN93OUTPUT.CSV'
        attribute_map = ('SOURCE', 'SUBTYPE', 'COUNTRY', 'ACCESSION_NUMBER',
                         'YEAR_OF_SAMPLING')
        id_dict = hivtrace.id_to_attributes(output_tn93_fn, attribute_map, '|')

        # Test that file ids have been changed
        with open(output_tn93_fn, 'r') as output_tn93_f:
            preader = csv.reader(output_tn93_f, delimiter=',', quotechar='|')
            preader.__next__()
            ids = set([item for row in preader for item in row[:2]])
            # Test that each id in id_dict exists for id in file
            self.assertEqual(set(list(id_dict.keys())), set(ids))

        return

    def test_attribute_adaptation(self):

        id_dict = {
            'Z|JP|K03455|2036': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            },
            'Z|JP|K03455|2036|7': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            },
            'Z|JP|K03455|2036|2': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            },
            'Z|JP|K03455|2036|3': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            },
            'Z|JP|K03455|2036|4': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            },
            'Z|JP|K03455|2036|5': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            },
            'Z|JP|K03455|2036|6': {
                'COUNTRY': 'JP',
                'SOURCE': 'TEST.FASTA_output.fasta',
                'YEAR_OF_SAMPLING': '2036',
                'ACCESSION_NUMBER': 'K03455',
                'SUBTYPE': 'Z'
            }
        }

        hivtrace.annotate_attributes(self.hivcluster_json_fn, id_dict)

        # Test that file was changed
        with open(self.hivcluster_json_fn) as json_fh:
            hivtrace_json = json.loads(json_fh.read())
            nodes = hivtrace_json.get('Nodes')
            [
                self.assertTrue(type(node['attributes']) is dict)
                for node in nodes
            ]

        return

    #
    def test_strip_drams(self):

        # run the whole thing and make sure it completed via the status file
        results = strip_drams(self.fn, 'lewis')
        self.assertTrue(results.__next__()[1][120:123] == '---')
        self.assertTrue(results.__next__()[1][672:675] == '---')
        self.assertFalse(results.__next__()[1][687:690] == '---')

        results = strip_drams(self.fn, 'wheeler')
        self.assertTrue(results.__next__()[1][129:132] == '---')
        self.assertTrue(results.__next__()[1][687:690] == '---')

        results = hivtrace.hivtrace(id, self.fn, self.reference,
                                    self.ambiguities, self.distance_threshold,
                                    self.min_overlap, False, '0.025', 'lewis')

        self.assertTrue(results["trace_results"])

        return

    # TODO: Expand test
    def test_env(self):

        id = os.path.basename(self.env_fn)
        reference = 'HXB2_env'

        # run the whole thing and make sure it completed via the status file
        hivtrace.hivtrace(id, self.env_fn, reference, self.ambiguities,
                          self.distance_threshold, self.min_overlap, False,
                          '0.015')

        self.assertTrue(True)

    def test_custom_reference(self):

        input_fn = self.fn
        reference = self.custom_reference
        id = os.path.basename(input_fn)

        known_contaminants = ['Z|JP|K03455|2036|7']

        # run the whole thing and make sure it completed via the status file
        results = hivtrace.hivtrace(id, input_fn, reference, self.ambiguities,
                                    self.distance_threshold, self.min_overlap,
                                    False, '0.015')

        # Read output json
        known_contaminants = [
            'B|FR|A04321|1983', '08_BC_HXB2_SABOTAGE|CN|AB078686|2000'
        ]

        [
            self.assertTrue(not any([k in node for k in known_contaminants]))
            for node in results["trace_results"]["Nodes"]
        ]

    def test_empty_contaminants(self):

        input_fn = self.fn
        reference = self.reference
        id = os.path.basename(input_fn)

        # run the whole thing and make sure it completed via the status file
        results = hivtrace.hivtrace(
            id,
            input_fn,
            reference,
            self.ambiguities,
            self.distance_threshold,
            self.min_overlap,
            False,
            '0.015',
            handle_contaminants='remove',
            filter_edges='remove')

    def test_premade_alignment(self):

        compare_to_lanl = True
        input_fn = self.fn
        reference = self.reference
        id = os.path.basename(input_fn)

        # Ensure that you cannot compare to lanl if skipping alignment
        with self.assertRaises(Exception):
            results = hivtrace.hivtrace(
                id,
                input_fn,
                reference,
                self.ambiguities,
                self.distance_threshold,
                self.min_overlap,
                compare_to_lanl,
                '0.015',
                handle_contaminants='remove',
                filter_edges='remove',
                skip_alignment=True)

        # Ensure that unequal sequence lengths fail
        with self.assertRaises(Exception):
            results = hivtrace.hivtrace(
                id,
                input_fn,
                reference,
                self.ambiguities,
                self.distance_threshold,
                self.min_overlap,
                False,
                '0.015',
                handle_contaminants='remove',
                filter_edges='remove',
                skip_alignment=True)

        results = hivtrace.hivtrace(
            id,
            self.aligned_fn,
            reference,
            self.ambiguities,
            self.distance_threshold,
            self.min_overlap,
            False,
            '0.015',
            handle_contaminants='remove',
            filter_edges='remove',
            skip_alignment=True)

        self.assertTrue('trace_results' in results.keys())

    def test_contaminant_screening_separately(self):

        this_dirname = os.path.join(
            os.path.dirname(os.path.realpath(__file__)))

        input_fn = path.join(this_dirname, 'rsrc/CONTAM.fasta')
        reference = path.join(this_dirname, 'rsrc/HXB2_1497.fasta')

        id = os.path.basename(input_fn)


        results = hivtrace.hivtrace(
            id,
            input_fn,
            reference,
            self.ambiguities,
            self.distance_threshold,
            self.min_overlap,
            False,
            '0.015',
            handle_contaminants='separately',
            filter_edges='remove',
            skip_alignment=True)

        self.assertTrue("contaminant_sequences" in results["trace_results"][
            "Network Summary"])

    def test_annotate_file_attributes(self):

        this_dirname = os.path.join(
            os.path.dirname(os.path.realpath(__file__)))

        trace_json_fn = path.join(this_dirname, 'rsrc/SD_2017.trace.json')

        patient_attributes_fn = path.join(
            this_dirname, 'rsrc/SD_2017.patient_attributes.json')

        with open(trace_json_fn) as trace_json_fh:
            trace_json = json.loads(trace_json_fh.read())

        results = hivtrace.annotate_file_attributes(
            trace_json["trace_results"], patient_attributes_fn, "ehars_uid")
        self.assertTrue("patient_attributes" in results["Nodes"][0])

    def test_empty_tn93(self):

        '''
          If tn93 has zero distances, report error and return 1
        '''

        this_dirname = os.path.join(
            os.path.dirname(os.path.realpath(__file__)))

        tn93_csv = path.join(this_dirname, 'rsrc/empty.tn93output.csv')

        is_empty = hivtrace.is_tn93_file_empty(tn93_csv)
        self.assertTrue(is_empty)

        populated_tn93_csv = path.join(this_dirname, 'rsrc/populated.tn93output.csv')
        is_empty = hivtrace.is_tn93_file_empty(populated_tn93_csv)
        self.assertFalse(is_empty)


if __name__ == '__main__':
    unittest.main()
