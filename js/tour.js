var tour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-arrows'
  }
});

// Introduction
tour.addStep('intro', {
  title: 'Welcome to HIV-TRACE',
  text: '<p>HIV TRACE is a tool that aids in understanding how HIV is spreading among infected individuals.</p>' +
        '<p>Please take a moment to become acquainted by taking the tour.</p>',
  attachTo: '.nav-trace top',
  advanceOn: '.docs-link click'
});

// Nav Bar introduction
tour.addStep('navbar', {
  title: 'Tool Bar',
  text: '<p>The toolbar provides options such as adjusting spacing between clusters, resizing the viewing window, and more.</p>' + 
        '<p>Hover over the buttons to discover each option\'s function.</p>',
  attachTo: '.input-group-btn left',
  advanceOn: '.docs-link click'
});


// Calculator
tour.addStep('calculator', {
  title: 'Compute Graph Statistics',
  text: '<p>Some graph statistics can be computationally expensive, and will take more time as the number of nodes within a cluster increase.</p>' + 
        '<p>Clicking the calculator button will perform these computations, and place the results in tables we will discover later in the tour.</p>',
  attachTo: '#hivtrace-compute-graph-statistics right',
  advanceOn: '#hivtrace-compute-graph-statistics click',
  buttons : [{
        text: 'Compute and Continue',
        action: tour.next
      }],
  when: {
      hide: function() {
        $("#hivtrace-compute-graph-statistics").click();
      }
    }
});


// Filter nodes
tour.addStep('filter-nodes', {
  title: 'Node Search',
  text: '<p>Do you have a specific set of nodes (i.e. sequences) in mind?</p>'
        + '<p>Use the search method to search by ID or a specific attribute.</p>'
        + '<p>Clusters with matching nodes within will spawn a blue halo with an arc length in proportion to the number of nodes matched.</p>'
        + '<p>Matching nodes will appear white.</p>',
  attachTo: '#network_ui_bar_filter left',
  advanceOn: '.docs-link click',
  when: {
      show: function() {
        $("#network_ui_bar_filter").focus();
        var node_string = 'CN';
        var delay_time = 500;

        for (var i=0; i<= node_string.length; i++) {
          _.delay(function(a){ $("#network_ui_bar_filter").val(node_string.slice(0,a));}, i*delay_time, i);
        }
        _.delay(function(){$("#network_ui_bar_filter").trigger('propertychange')}, node_string.length * delay_time);
      }
    }
});

// Hover over cluster
tour.addStep('cluster-hover', {
  title: 'Cluster Options',
  text: 'We seem to have found a match! Shall we expand the matched cluster by clicking the <code>Expand Filtered</code> option?',
  attachTo: '#network_ui_bar_cluster_operations_button top',
  advanceOn: '#hivtrace-expand-filtered click',
  when: {
      show: function() {
        _.delay(function() {$("#network_ui_bar_cluster_operations_button").click()}, 100);
      },
      hide: function() {
        _.delay(function() {$("#hivtrace-expand-filtered")[0].click();}, 200);
      }
    }
});

// Expand cluster
tour.addStep('expanded-clusters', {
  title: 'Expanded Cluster',
  text: '<p>Now that we have revealed the nodes within the cluster, please take a moment to mouse-over some of the nodes to discover their properties.</p>' 
        + '<p>We will learn more about these properties later in the tour.</p>',
  attachTo: '#network_tag bottom',
  advanceOn: '.docs-link click',

});

// Graph tab
tour.addStep('graph-tab', {
  title: 'Graph Tab',
  text: 'Shall we select the graph tab to reveal statistics about our inferred network?',
  attachTo: '#graph-tab top',
  advanceOn: '#graph-tab > a click',
  when: {
      hide: function() {
        $("#graph-tab > a").click();
      }
    }
});

// Explain table
tour.addStep('graph-statistics', {
  title: 'Graph Statistics',
  text: 'An overview of the entire graph can be found in this table.'
        + '<br />Degrees refer to average degree of all nodes in the graph.'
        + '<br />Cluster sizes refer to average number of nodes within each cluster in the graph.',
  attachTo: '#graph_summary_table right',
  advanceOn: '.docs-link click',
});

// Explain graph
tour.addStep('degree-distribution', {
  title: 'Degree distribution',
  text: '<p>A graph of the network degree count per cluster and its inferred probability distribution.</p>'
      + '<p>Possible distributions are <code>Waring</code>, <code>Yule</code>, <code>Pareto</code>, and <code>Negative Binomial</code></p>',
  attachTo: '#histogram_tag left',
  advanceOn: '.docs-link click'
});

// Cluster tab
tour.addStep('cluster-tab', {
  title: 'Cluster properties',
  text: 'Now please join me in viewing tabular cluster statistics.',
  attachTo: '#clusters-tab top',
  advanceOn: '#clusters-tab > a click',
  when: {
      hide: function() {
        $("#clusters-tab > a").click();
      }
    }
});

// Column explanation
tour.addStep('cluster-columns', {
  title: 'Cluster columns',
  text: 'This view provides per cluster tabular insight. Below is a brief overview of the columns and their descriptions.'
+    '<table class="table hivtrace-tut-table">'
+      '<thead>'
+        '<tr>'
+          '<th>Column Name</th>'
+          '<th>Description</th>'
+        '</tr>'
+      '</thead>'
+      '<tbody>'
+        '<tr>'
+          '<td>ID</td>'
+          '<td>The cluster\'s identification number.</td>'
+        '</tr>'
+        '<tr>'
+          '<td>Properties</td>'
+          '<td>Whether the cluster is currently collapsed or expanded on the Network view.</td>'
+        '</tr>'
+        '<tr>'
+          '<td>Size</td>'
+          '<td>The number of nodes within the cluster</td>'
+        '</tr>'
+        '<tr>'
+          '<td>Degrees</td>'
+          '<td>The average of each node within the cluster\'s degree in mean, median, and interquartile range, respectively</td>'
+        '</tr>'
+        '<tr>'
+          '<td>CC</td>'
+          '<td>The <a target="_blank" href="//en.wikipedia.org/wiki/Clustering_coefficient#Global_clustering_coefficient">Global Clustering Coefficient</a></td>'
+        '</tr>'
+        '<tr>'
+          '<td>MPL</td>'
+          '<td>The <a target="_blank" href="//en.wikipedia.org/wiki/Average_path_length">Mean Path Length</a></td>'
+        '</tr>'
+      '</tbody>'
+    '</table>',
  attachTo: '.page-header bottom',
  advanceOn: '.docs-link click'
});


// Properties
tour.addStep('cluster-properties', {
  title: 'Cluster properties',
  text: "Click the buttons to expand or collapse the respective clusters on the Network view.",
  attachTo: '.btn-xs top',
  advanceOn: '.docs-link click'
});


// Node tab
tour.addStep('node-tab', {
  title: 'Nodes',
  text: 'Shall we take a look at the node data?',
  attachTo: '#nodes-tab top',
  advanceOn: '#nodes-tab > a click',
  when: {
      hide: function() {
        $("#nodes-tab > a").click();
      }
    }
});


// Column explanation
tour.addStep('node-columns', {
  title: 'Node columns',
  text: 'This view provides per node tabular insight. Below is a brief overview of the columns and their descriptions.'
+    '<table class="table hivtrace-tut-table">'
+      '<thead>'
+        '<tr>'
+          '<th>Column Name</th>'
+          '<th>Description</th>'
+        '</tr>'
+      '</thead>'
+      '<tbody>'
+        '<tr>'
+          '<td>ID</td>'
+          '<td>The cluster\'s identification number.</td>'
+        '</tr>'
+        '<tr>'
+          '<td>Properties</td>'
+          '<td>Whether the node is currently hidden (in a collapsed cluster) or visible on the Network view.</td>'
+        '</tr>'
+        '<tr>'
+          '<td>Degree</td>'
+          '<td>The <a target="_blank" href="//en.wikipedia.org/wiki/Degree_(graph_theory)">degree</a> of the node</td>'
+        '</tr>'
+        '<tr>'
+          '<td>Cluster</td>'
+          '<td>The ID of the cluster the node belongs to.</td>'
+        '</tr>'
+        '<tr>'
+          '<td>LCC</td>'
+          '<td>The <a target="_blank" href="//en.wikipedia.org/wiki/Clustering_coefficient#Local_clustering_coefficient">Local Clustering Coefficient</a></td>'
+        '</tr>'
+      '</tbody>'
+    '</table>',
  attachTo: '#node_table top',
  advanceOn: '.docs-link click'
});


// Properties
tour.addStep('node-properties', {
  title: 'Node Properties',
  text: "Click the buttons to show or hide the respective nodes on the Network view.",
  attachTo: '.btn-node-property top',
  advanceOn: '.docs-link click'
});

// Closing statements
tour.addStep('closing-statements', {
  title: 'Tour Completed',
  text: "<p>This marks the end of our tour. Please visit <a href=//hivtrace.org>hivtrace.org</a> to try it yourself," 
        + " or stay on the demo page to familiarize yourself with the application a bit more.</p>"
        + "<p>We appreciate your time and effort today, and hope that HIV-TRACE will find utility in your endeavors.</p>",
  attachTo: '.page-header bottom',
  advanceOn: '.docs-link click',
  buttons : [{
        text: 'Done',
        action: tour.cancel
      }]
});

tour.start();

