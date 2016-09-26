#!/usr/bin/env python

import sys
import os
from os import path

from hivtrace import hivtrace
from hivtrace.strip_drams import strip_drams
import subprocess
import unittest
import json
import re
import csv
import argparse
import logging
import tempfile
import shutil

logging.basicConfig(level=logging.DEBUG)

class TestHIVTrace(unittest.TestCase):

  def setUp(self):

    this_dirname = os.path.join(os.path.dirname(os.path.realpath(__file__)))

    self.fn                        = path.join(this_dirname, 'rsrc/TEST.FASTA')
    self.aligned_fn                = path.join(this_dirname, 'rsrc/TEST.ALIGNED.FASTA')
    self.custom_reference          = path.join(this_dirname, 'rsrc/TEST_REFERENCE.FASTA')
    self.malformed_ids_fn          = path.join(this_dirname, 'rsrc/TEST_WITH_REFERENCE_CONTAMINANTS.fa')
    self.env_fn                    = path.join(this_dirname, 'rsrc/HIV1_ALL_2013_env_DNA.fasta')
    self.lanl_tn93output_csv       = path.join(this_dirname, '../hivtrace/rsrc/LANL.TN93OUTPUT.csv')
    self.lanl_file                 = path.join(this_dirname, '../hivtrace/rsrc/LANL.FASTA')

    self.user_lanl_tn93output      = self.fn+'_USERLANL.TN93OUTPUT.CSV'
    self.output_tn93_fn            = self.fn+'_USER.TN93OUTPUT.CSV'
    self.output_usertolanl_tn93_fn = self.fn+'_USERTOLANL.TN93OUTPUT.CSV'
    self.hxb2_linked_fn            = self.fn+'_user.hxb2linked.csv'
    self.lanl_output_cluster_json  = self.fn+'_LANL_USER.TRACE.JSON'

    self.ambiguities        = 'average'
    self.reference          = 'HXB2_prrt'
    self.distance_threshold = '.015'
    self.distance_threshold = '.015'
    self.min_overlap        = '500'
    self.ambiguity_handling = 'AVERAGE'
    self.hivcluster_json_fn = self.fn+'_USER.TRACE.JSON'

  def tearDown(self):
      return

  def test_flag_duplicates(self):

    # Copy file
    tmp_file = tempfile.mktemp()
    shutil.copy2(self.fn, tmp_file)

    hivtrace.rename_duplicates(tmp_file, '|')

    #Check ids
    with open(tmp_file, 'r') as fasta_f:
      ids = filter(lambda x: x.startswith('>'), fasta_f.readlines())

    self.assertTrue('>Z|JP|K03455|2036|DUPLICATE 6\n' in ids)

    return

  def test_concatenate_data(self):
    hivtrace.concatenate_data(self.user_lanl_tn93output,
                              self.lanl_tn93output_csv,
                              self.output_usertolanl_tn93_fn,
                              self.output_tn93_fn)

    with open(self.lanl_tn93output_csv, 'r') as tn93_file:
        lanl_length = len(tn93_file.readlines()) - 1

    with open(self.output_usertolanl_tn93_fn, 'r') as tn93_file:
        u2l_length = len(tn93_file.readlines()) - 1

    with open(self.output_tn93_fn, 'r') as tn93_file:
        output_length = len(tn93_file.readlines()) - 1


    #Check that there are five test_ids
    with open(self.user_lanl_tn93output, 'r') as tn93_file:
      total_length = len(tn93_file.readlines()) - 1
      self.assertTrue(lanl_length + u2l_length + output_length == total_length)
    return

  def test_annotate_lanl(self):

    tmp_file = tempfile.mktemp()
    shutil.copy2(self.lanl_output_cluster_json, tmp_file)

    hivtrace.annotate_lanl(tmp_file, self.lanl_file)

    #Check that there are five test_ids
    with open(tmp_file, 'r') as fasta_f:
      # Parse each node and check if is_lanl exists
      results = json.loads(fasta_f.read())
      [self.assertTrue("is_lanl" in node) for node in results["Nodes"]]

    return

  def test_filter_list(self):

    tmp_file = tempfile.mktemp()
    hivtrace.create_filter_list(self.output_tn93_fn, tmp_file)
    print(tmp_file)

    #Check that file exists and that there are five ids named correctly
    with open(tmp_file, 'r') as filter_list:
      lines = filter_list.readlines()
      print(lines)
      length = len(lines)
      self.assertTrue(length == 5)
    return

  def test_annotate_with_hxb2(self):

    hxb2_links_fn=self.fn+'_USER.HXB2LINKED.CSV'
    hivcluster_json_fn=self.fn+'_USER.TRACE.JSON'
    hivtrace.annotate_with_hxb2(hxb2_links_fn, hivcluster_json_fn)

    with open(hivcluster_json_fn) as json_fh:
      hivcluster_json = json.loads(json_fh.read())
    nodes = hivcluster_json.get('Nodes')
    test_subjects = ['testid_3', 'testid_5']

    # Ensure test subjects have hxb2 attribute
    test_subject_nodes = filter(lambda x: x['id'] in test_subjects, nodes)
    [self.assertEqual(node.get('hxb2_linked'), 'true') for node in test_subject_nodes]

    # Ensure the others have not been discriminated
    non_test_subject_nodes = filter(lambda x: x['id'] not in test_subjects, nodes)
    [self.assertEqual(node.get('hxb2_linked'), 'false') for node in non_test_subject_nodes]

    return

  #def test_lanl_annotate_with_hxb2(self):

  #  self.fn = './res/INPUT.FASTA'
  #  HXB2_LINKED_LANL='../../app/hivtrace/res/LANL.HXB2.csv'
  #  LANL_OUTPUT_CLUSTER_JSON=self.fn+'_LANL_USER.TRACE.JSON'
  #  DISTANCE_THRESHOLD = '.025'

  #  hivtrace.lanl_annotate_with_hxb2(HXB2_LINKED_LANL,
  #                                   LANL_OUTPUT_CLUSTER_JSON,
  #                                   DISTANCE_THRESHOLD)

  #  with open(LANL_OUTPUT_CLUSTER_JSON) as json_fh:
  #    lanl_hivcluster_json = json.loads(json_fh.read())

  #  nodes = lanl_hivcluster_json.get('Nodes')

  #  test_subjects = ['B|JP|D21166|-', 'B_CH_AF077691_9999' ]

  #  # Ensure test subjects have hxb2 attribute
  #  test_subject_nodes = filter(lambda x: x['id'] in test_subjects, nodes)
  #  [self.assertEqual(node.get('hxb2_linked'), 'true') for node in test_subject_nodes]

  #  # Ensure the others have not been discriminated
  #  non_test_subject_nodes = filter(lambda x: x['id'] not in test_subjects, nodes)
  #  [self.assertEqual(node.get('hxb2_linked'), 'false') for node in non_test_subject_nodes]

  #  return

  def test_attribute_parse(self):

    output_tn93_fn=self.fn+'_USER.TN93OUTPUT.CSV'
    attribute_map = ('SOURCE', 'SUBTYPE', 'COUNTRY', 'ACCESSION_NUMBER', 'YEAR_OF_SAMPLING')
    id_dict = hivtrace.id_to_attributes(output_tn93_fn, attribute_map, '|')

    #Test that file ids have been changed
    with open(output_tn93_fn, 'r') as output_tn93_f:
      preader = csv.reader(output_tn93_f, delimiter=',', quotechar='|')
      preader.__next__()
      ids = set([item for row in preader for item in row[:2]])
      #Test that each id in id_dict exists for id in file
      self.assertEqual(set(list(id_dict.keys())), set(ids))

    return

  def test_attribute_parse_with_malformed_ids(self):

    output_tn93_fn=self.malformed_ids_fn+'_USER.TN93OUTPUT.CSV'
    attribute_map = ('SOURCE', 'SUBTYPE', 'COUNTRY', 'ACCESSION_NUMBER', 'YEAR_OF_SAMPLING')
    #self.assertTrue(type(hivtrace.id_to_attributes(output_tn93_fn, attribute_map, self.config.get('default_delimiter'))) is ValueError)

    return

  def test_attribute_adaptation(self):

    output_fasta_fn=self.fn+'_OUTPUT.FASTA'
    attribute_map = ('SOURCE', 'SUBTYPE', 'COUNTRY', 'ACCESSION_NUMBER', 'YEAR_OF_SAMPLING')
    id_dict = {'Z|JP|K03455|2036': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'},
               'Z|JP|K03455|2036|7': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'},
               'Z|JP|K03455|2036|2': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'},
               'Z|JP|K03455|2036|3': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'},
               'Z|JP|K03455|2036|4': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'},
               'Z|JP|K03455|2036|5': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'},
               'Z|JP|K03455|2036|6': {'COUNTRY': 'JP', 'SOURCE': 'TEST.FASTA_output.fasta', 'YEAR_OF_SAMPLING': '2036', 'ACCESSION_NUMBER': 'K03455', 'SUBTYPE': 'Z'}}

    hivtrace.annotate_attributes(self.hivcluster_json_fn, id_dict)

    # Test that file was changed
    with open(self.hivcluster_json_fn) as json_fh:
      hivtrace_json = json.loads(json_fh.read())
      nodes = hivtrace_json.get('Nodes')
      [self.assertTrue(type(node['attributes']) is dict) for node in nodes]

    return

  ## Test currently takes too long
  #def test_hivtrace_lanl(self):

  #  id = os.path.basename(self.fn)
  #  compare_to_lanl = True

  #  #run the whole thing and make sure it completed via the status file
  #  results = hivtrace.hivtrace(id, self.fn, self.reference, self.ambiguities,
  #                    self.distance_threshold, self.min_overlap,
  #                    compare_to_lanl, '0.025', False, "report")

  #  # Read output json
  #  self.assertTrue(results["lanl_trace_results"]["Network Summary"]["Clusters"] == 2)
  #  self.assertTrue(results["lanl_trace_results"]["Network Summary"]["Edges"] == 31)
  #  self.assertTrue(results["lanl_trace_results"]["Network Summary"]["Nodes"] == 13)
  #  self.assertTrue(set(results["lanl_trace_results"].keys()) == set(['Cluster sizes', 'Edge Stages', 'Edges', 'HIV Stages', 'Network Summary', 'Settings', 'Degrees', 'Directed Edges', 'Multiple sequences', 'Nodes']))

  #  return

  def test_strip_reference_sequences(self):

    id = os.path.basename(self.fn)
    compare_to_lanl = False

    ##run the whole thing and make sure it completed via the status file
    results = hivtrace.hivtrace(id, self.fn, self.reference, self.ambiguities,
                      self.distance_threshold, self.min_overlap,
                      compare_to_lanl, '0.025')


    [self.assertTrue("removed" in edge) for edge in results["trace_results"]["Edges"]]

    # Read output json
    known_contaminants = ['B|FR|A04321|1983', '08_BC_HXB2_SABOTAGE|CN|AB078686|2000']
    [self.assertTrue(not any([k in node for k in known_contaminants])) for node in results["trace_results"]["Nodes"]]

    return

  #
  def test_strip_drams(self):

    #run the whole thing and make sure it completed via the status file
    results = strip_drams(self.fn, 'lewis')
    self.assertTrue(results.__next__()[1][120:123] == '---')
    self.assertTrue(results.__next__()[1][672:675] == '---')
    self.assertFalse(results.__next__()[1][687:690] == '---')

    results = strip_drams(self.fn, 'wheeler')
    self.assertTrue(results.__next__()[1][129:132] == '---')
    self.assertTrue(results.__next__()[1][687:690] == '---')

    results = hivtrace.hivtrace(id, self.fn, self.reference, self.ambiguities,
                      self.distance_threshold, self.min_overlap,
                      False, '0.025', 'lewis')

    self.assertTrue(results["trace_results"])


    return



  # TODO: Expand test
  def test_env(self):

    compare_to_lanl = True
    id  = os.path.basename(self.env_fn)
    reference = 'HXB2_env'
    strip_drams = False

    #run the whole thing and make sure it completed via the status file
    hivtrace.hivtrace(id, self.env_fn, reference, self.ambiguities,
                      self.distance_threshold, self.min_overlap,
                      False, '0.015')


    self.assertTrue(True)

  def test_custom_reference(self):

    compare_to_lanl = True
    input_fn   = self.fn
    reference  = self.custom_reference
    id = os.path.basename(input_fn)
    status_file = input_fn+'_status'

    known_contaminants = ['Z|JP|K03455|2036|7']

    #run the whole thing and make sure it completed via the status file
    results = hivtrace.hivtrace(id, input_fn, reference, self.ambiguities,
                      self.distance_threshold, self.min_overlap,
                      False, '0.015')


    # Read output json
    known_contaminants = ['B|FR|A04321|1983', '08_BC_HXB2_SABOTAGE|CN|AB078686|2000']

    [self.assertTrue(not any([k in node for k in known_contaminants])) for node in results["trace_results"]["Nodes"]]

  def test_empty_contaminants(self):

    compare_to_lanl = False
    input_fn   = self.fn
    reference  = self.reference
    id = os.path.basename(input_fn)
    status_file = input_fn+'_status'

    #run the whole thing and make sure it completed via the status file
    results = hivtrace.hivtrace(id, input_fn, reference, self.ambiguities,
                      self.distance_threshold, self.min_overlap,
                      False, '0.015', handle_contaminants='remove', filter_edges='remove')



  def test_premade_alignment(self):

    compare_to_lanl = True
    input_fn   = self.fn
    reference  = self.reference
    id = os.path.basename(input_fn)
    status_file = input_fn+'_status'

    #Ensure that you cannot compare to lanl if skipping alignment
    with self.assertRaises(Exception):
        results = hivtrace.hivtrace(id, input_fn, reference, self.ambiguities,
                          self.distance_threshold, self.min_overlap,
                          compare_to_lanl, '0.015', handle_contaminants='remove', filter_edges='remove', skip_alignment=True)

    #Ensure that unequal sequence lengths fail
    with self.assertRaises(Exception):
        results = hivtrace.hivtrace(id, input_fn, reference, self.ambiguities,
                          self.distance_threshold, self.min_overlap,
                          False, '0.015', handle_contaminants='remove', filter_edges='remove', skip_alignment=True)

    results = hivtrace.hivtrace(id, self.aligned_fn, reference, self.ambiguities,
                      self.distance_threshold, self.min_overlap,
                      False, '0.015', handle_contaminants='remove', filter_edges='remove', skip_alignment=True)


    self.assertTrue('trace_results' in results.keys())


if __name__ == '__main__':
  unittest.main()

