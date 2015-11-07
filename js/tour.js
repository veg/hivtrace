var tour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-arrows'
  }
});

// Introduction
tour.addStep('intro', {
  title: 'Welcome to HIV-TRACE',
  text: '<p>HIV TRACE is a tool that aids in understanding how HIV is spreading among different groups of people.</p>' +
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


// calculator
tour.addStep('calculator', {
  title: 'Compute Graph Statistics',
  text: '<p>Some graph statistics can be computationally expensive, and will take more time as the number of nodes within a cluster increase.</p>' + 
        '<p>Clicking the calculator button will perform these computations, and place the results in tables we will discover later in the tour.</p>',
  attachTo: '#hivtrace-compute-graph-statistics right',
  advanceOn: '.docs-link click'
});


// Filter nodes
tour.addStep('filter-nodes', {
  title: 'Node Search',
  text: '<p>Do you have a specific set of nodes (i.e. sequences) in mind?</p>'
        + '<p>Use the search method to search by ID or a specific attribute.</p>'
        + '<p>Matching nodes will appear white.</p>'
        + '<p>Clusters with matching nodes within will spawn a blue halo with an arc length in proportion to the number of nodes matched.</p>',
  attachTo: '#network_ui_bar_filter left',
  advanceOn: '.docs-link click',
  when: {
      show: function() {
        $("#network_ui_bar_filter").focus();
        var node_string = 'Node 65';
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
  advanceOn: '.docs-link click',
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
        + '<p>We will learn more about them later in the tour.</p>',
  attachTo: '#network_tag bottom',
  advanceOn: '.docs-link click',

});

// Graph tab
tour.addStep('graph-tab', {
  title: 'Graph Tab',
  text: 'Now we shall select the graph tab to reveal statistics about our inferred network.',
  attachTo: '#graph-tab top',
  advanceOn: '.docs-link click',
  when: {
      hide: function() {
        $("#graph-tab > a").click();
      }
    }
});

// Explain table
tour.addStep('graph-statistics', {
  title: 'Notice the Statistics',
  text: 'Notice the statistics.',
  attachTo: '#graph_summary_table right',
  advanceOn: '.docs-link click',


});

// Explain graph
tour.addStep('degree-distribution', {
  title: 'Degree distribution',
  text: 'A graph of the network degree count per cluster and its inferred probability distribution.',
  attachTo: '#histogram_tag left',
  advanceOn: '.docs-link click'
});

// Cluster tab
tour.addStep('cluster-tab', {
  title: 'Cluster properties',
  text: 'Notice the cluster tab',
  attachTo: '#clusters-tab top',
  advanceOn: '.docs-link click',
  when: {
      hide: function() {
        $("#clusters-tab > a").click();
      }
    }
});

// Column explanation
tour.addStep('cluster-columns', {
  title: 'Cluster columns',
  text: "Let's talk about columns",
  attachTo: '#cluster_table top',
  advanceOn: '.docs-link click'
});


// Properties
tour.addStep('cluster-properties', {
  title: 'Cluster properties',
  text: "Let's talk about properties",
  attachTo: '.btn-xs top',
  advanceOn: '.docs-link click'
});


// Node tab
tour.addStep('node-tab', {
  title: 'Node tab',
  text: 'Node tab',
  attachTo: '#nodes-tab top',
  advanceOn: '.docs-link click',
  when: {
      hide: function() {
        $("#nodes-tab > a").click();
      }
    }
});


// Column explanation
tour.addStep('node-columns', {
  title: 'Node columns',
  text: "Let's talk about nodes",
  attachTo: '#node_table top',
  advanceOn: '.docs-link click'
});



// Properties
tour.addStep('node-properties', {
  title: 'node properties',
  text: "Let's talk about node properties",
  attachTo: '.btn-node-property top',
  advanceOn: '.docs-link click'
});

tour.start();

//for (var i=0; i<= 9; i++) {
//  _.delay(function() {tour.next();}, i*50);
//}


