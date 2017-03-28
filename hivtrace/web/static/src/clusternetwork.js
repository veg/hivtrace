var _networkGraphAttrbuteID = "patient_attribute_schema";
var _networkNodeAttributeID = "patient_attributes";
var _networkMissing         = 'missing';
var _networkMissingOpacity  = '0.1';
var _networkMissingColor    = '#999';
var _networkContinuousColorStops = 9;
var _networkShapeOrdering   = ['circle','square','hexagon','diamond','cross','octagon'];
var _defaultFloatFormat     = d3.format(",.2r");
var _defaultPercentFormat   = d3.format(",.3p");
var _defaultDateFormat      = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");

var _networkCategorical     = ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928"];
var _maximumValuesInCategories	= _networkCategorical.length;     

var _networkSequentialColor = {
								3: ["#ffeda0","#feb24c","#f03b20"],
								4: ["#ffffb2","#fecc5c","#fd8d3c","#e31a1c"],
								5: ["#ffffb2","#fecc5c","#fd8d3c","#f03b20","#bd0026"],
								6: ["#ffffb2","#fed976","#feb24c","#fd8d3c","#f03b20","#bd0026"],
								7: ["#ffffb2","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#b10026"],
								8: ["#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#b10026"],
								9: ["#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#bd0026","#800026"]
							  };


var _is_CDC_ = true;

var _networkPresetColorSchemes = {'trans_categ' : {
                                    'Other-Male': '#999999',
                                    'Heterosexual Contact-Male': '#e31a1c',
                                    'Other-Child': '#ff7f00',
                                    'Perinatal': '#ff7f00',
                                    'MSM': '#1f78b4',
                                    'IDU-Male': '#33a02c',
                                    'Other-Female': '#999999',
                                    'IDU-Female': '#33a02c',
                                    'MSM & IDU': '#33a02c',
                                    'Missing': '#999999',
                                    'Heterosexual Contact-Female': '#e31a1c'
                                 }};
                                 



var hivtrace_cluster_network_graph = function (json, network_container, network_status_string, network_warning_tag, button_bar_ui, attributes, filter_edges_toggle, clusters_table, nodes_table, parent_container, options) {

  // [REQ] json                        :          the JSON object containing network nodes, edges, and meta-information
  // [REQ] network_container           :          the CSS selector of the DOM element where the SVG containing the network will be placed (e.g. '#element')
  // [OPT] network_status_string       :          the CSS selector of the DOM element where the text describing the current state of the network is shown (e.g. '#element')
  // [OPT] network_warning_tag         :          the CSS selector of the DOM element where the any warning messages would go (e.g. '#element')
  // [OPT] button_bar_ui               :          the ID of the control bar which can contain the following elements (prefix = button_bar_ui value)
  //                                                - [prefix]_cluster_operations_container : a drop-down for operations on clusters
  //                                                - [prefix]_attributes :  a drop-down for operations on attributes
  //                                                - [prefix]_filter : a text box used to search the graph
  // [OPT] network_status_string       :          the CSS selector of the DOM element where the text describing the current state of the network is shown (e.g. '#element')
  // [OPT] attributes                  :          A JSON object with mapped node attributes


	
 
 
  	var self = new Object;
                	
    self.ww = options && options["width"] ? options["width"] : d3.select(parent_container).property("clientWidth");
    self.container = network_container;
    self.nodes = [];
    self.edges = [];
    self.clusters = [];
    self.cluster_sizes = [];
    self.colorizer = {'selected': function (d) {return d == 'selected' ? d3.rgb(51, 122, 183) : '#FFF'}};
    self.node_shaper = {'id' : null, 'shaper' : function () { return 'circle' }};
    self.filter_edges = true,
    self.hide_hxb2 = false,
    self.charge_correction = 5,
    self.margin = {top: 20, right: 10, bottom: 30, left: 10},
    self.width  = self.ww - self.margin.left - self.margin.right,
    self.height = self.width * 9 / 16,
    self.cluster_table = d3.select (clusters_table),
    self.node_table = d3.select (nodes_table),
    self.needs_an_update = false,
    self.json = json,
    self.hide_unselected = false,
    self.show_percent_in_pairwise_table = false,
    self.gradient_id = 0;
    
    self._networkPredefinedAttributeTransforms = {
		'binned_vl_recent_value' : {
			'depends': 'vl_recent_value',
			'label' : 'binned_vl_recent_value',
			'enum' : ["≤200", "200-10000", ">10000"],
			'color_scale' : function () {
							 return d3.scale.ordinal()
							.domain(["≤200", "200-10000", ">10000",_networkMissing])
							.range(_.union(_networkSequentialColor[3],[_networkMissingColor]))},
							
			'map' : function (node) {
				var vl_value = attribute_node_value_by_id (node, 'vl_recent_value');
				if (vl_value != _networkMissing) {
					if (vl_value <= 200) {
						return "≤200";
					}
					if (vl_value <= 10000) {
						return "200-10000";
					}
					return ">10000";
				}
				return _networkMissing;
			}
		},
		'hiv_aids_dx_dt_year' : {
			'depends': 'hiv_aids_dx_dt',
			'label' : 'hiv_aids_dx_dt_year',
			'type' : "String",
			'map' : function (node) {
				var value = _defaultDateFormat.parse (attribute_node_value_by_id (node, 'hiv_aids_dx_dt'));
				if (value) {
					value = "" + value.getFullYear();
				} else {
					value = _networkMissing;
				}
				return value;
			},
			'color_scale': function (attr) {
				var range_without_missing = _.without (attr.value_range,_networkMissing);
				var color_scale = _.compose(d3.interpolateRgb("#ffffcc","#800026"),d3.scale.linear().domain ([range_without_missing[0],range_without_missing[range_without_missing.length-1]]).range([0,1]));
				return function (v) {
					if (v == _networkMissing) {
						return _networkMissingColor;
					}
					return color_scale (v);
				}
			}
		}
	};

  var cluster_mapping = {},
      l_scale = 5000,   // link scale
      graph_data = self.json,     // the raw JSON network object
      max_points_to_render = 500,
      warning_string     = "",
      singletons         = 0,
      open_cluster_queue = [],
      currently_displayed_objects,
      gravity_scale = d3.scale.pow().exponent (0.5).domain ([1,100000]).range ([0.1,0.15]);

  /*------------ D3 globals and SVG elements ---------------*/

  var network_layout = d3.layout.force()
    .on("tick", tick)
    .charge(function(d) { if (d.cluster_id) return self.charge_correction*(-20-5*Math.pow(d.children.length,0.7)); return self.charge_correction*(-5-20*Math.sqrt(d.degree)); })
    .linkDistance(function(d) { return Math.max(d.length,0.005)*l_scale; })
    .linkStrength (function (d) { if (d.support != undefined) { return 2*(0.5-d.support);} return 1;})
    .chargeDistance (l_scale*0.25)
    .gravity (gravity_scale(json.Nodes.length))
    .friction (0.25);

  d3.select(network_container).selectAll (".my_progress").remove();


  d3.select(network_container).selectAll ("svg").remove();
  self.node_table.selectAll ("*").remove();
  self.cluster_table.selectAll ("*").remove();

  var network_svg = d3.select(network_container).append("svg:svg")
      //.style ("border", "solid black 1px")
      .attr("id", "network-svg")
      .attr("width", self.width + self.margin.left + self.margin.right)
      .attr("height", self.height + self.margin.top + self.margin.bottom);

      //.append("g")
      // .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

  var legend_svg = network_svg.append ("g").attr("transform", "translate(5,5)");

  network_svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("refX", 9) /* there must be a smarter way to calculate shift*/
      .attr("refY", 2)
      .attr("markerWidth",  6)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .attr("stroke", "#666666")
      .attr("fill", "#AAAAAA")
      .append("path")
          .attr("d", "M 0,0 V 4 L6,2 Z"); //this is actual shape for arrowhead


  change_window_size();


  /*------------ Network layout code ---------------*/
  var handle_cluster_click = function (cluster, release) {

    var container = d3.select(network_container);
    var id = "d3_context_menu_id";
    var menu_object = container.select ("#" + id);

    if (menu_object.empty()) {
      menu_object = container.append ("ul")
        .attr ("id", id)
        .attr ("class","dropdown-menu")
        .attr ("role", "menu");
    }

    menu_object.selectAll ("li").remove();

    var already_fixed = cluster && cluster.fixed == 1;


    if (cluster) {
      menu_object.append("li").append ("a")
                   .attr("tabindex", "-1")
                   .text("Expand cluster")
                   .on ("click", function (d) {
                      cluster.fixed = 0;
                      expand_cluster_handler(cluster, true);
                      menu_object.style ("display", "none");
                      });

      menu_object.append("li").append ("a")
                   .attr ("tabindex", "-1")
                   .text ("Center on screen")
                   .on ("click", function (d) {
                      cluster.fixed = 0;
                      center_cluster_handler(cluster);
                      menu_object.style ("display", "none");
                      });

     menu_object.append("li").append ("a")
               .attr ("tabindex", "-1")
               .text (function (d) {if (cluster.fixed) return "Allow cluster to float"; return "Hold cluster at current position";})
               .on ("click", function (d) {
                  cluster.fixed = !cluster.fixed;
                  menu_object.style ("display", "none");
                  });

     cluster.fixed = 1;

     menu_object.style ("position", "absolute")
        .style("left", "" + d3.event.offsetX + "px")
        .style("top", "" + d3.event.offsetY + "px")
        .style("display", "block");

    } else {
      if (release) {
        release.fixed = 0;
      }
      menu_object.style("display", "none");
    }

    container.on("click", function (d) {handle_cluster_click(null, already_fixed ? null : cluster);}, true);

  };

  var handle_node_click = function (node) {
    var container = d3.select(network_container);
    var id = "d3_context_menu_id";
    var menu_object = container.select ("#" + id);

    if (menu_object.empty()) {
      menu_object = container.append ("ul")
        .attr ("id", id)
        .attr ("class","dropdown-menu")
        .attr ("role", "menu");
    }

    menu_object.selectAll ("li").remove();

    if (node) {
      node.fixed = 1;
      menu_object.append("li").append ("a")
                   .attr("tabindex", "-1")
                   .text("Collapse cluster")
                   .on ("click", function (d) {
                      node.fixed = 0;
                      collapse_cluster_handler(node, true)
                      menu_object.style ("display", "none");
                      });

      menu_object.style ("position", "absolute")
        .style ("left", "" + d3.event.offsetX + "px")
        .style ("top", "" + d3.event.offsetY + "px")
        .style ("display", "block");

    } else {
      menu_object.style("display", "none");
    }

    container.on("click", function (d) {handle_node_click(null);}, true);

  };

  function get_initial_xy (nodes, cluster_count, exclude ) {
      var d_clusters = {'id': 'root', 'children': []};
      for (var k = 0; k < cluster_count; k+=1) {
       if (exclude != undefined && exclude[k+1] != undefined) {continue;}
          d_clusters.children.push ({'cluster_id' : k+1, 'children': nodes.filter (function (v) {return v.cluster == k+1;})});
      }

      var treemap = d3.layout.pack()
      .size([self.width, self.height])
      //.sticky(true)
      .children (function (d)  {return d.children;})
      .value(function(d) { return 1;});

      return treemap.nodes (d_clusters);
  }

  function prepare_data_to_graph () {

      var graphMe = {};
      graphMe.all = [];
      graphMe.edges = [];
      graphMe.nodes = [];
      graphMe.clusters = [];

      expandedClusters = [];
      drawnNodes = [];

      self.clusters.forEach (function (x) {
          // Check if hxb2_linked is in a child
          var hxb2_exists = x.children.some(function(c) {return c.hxb2_linked}) && self.hide_hxb2;
          if(!hxb2_exists) {
            if (x.collapsed) {
                graphMe.clusters.push (x);
                graphMe.all.push(x);
            } else {
                expandedClusters[x.cluster_id] = true;
            }
          }
      });

      self.nodes.forEach (function (x, i) {
          if (expandedClusters[x.cluster]) {
              drawnNodes[i] = graphMe.nodes.length +  graphMe.clusters.length;
              graphMe.nodes.push(x);
              graphMe.all.push(x);
          }

      });

      self.edges.forEach (function (x) {

          if(!(x.removed && self.filter_edges)) {
            if (drawnNodes[x.source] != undefined && drawnNodes[x.target] != undefined) {

                var y = {};
                for (var prop in x) {
                    y[prop] = x[prop];
                }

                y.source = drawnNodes[x.source];
                y.target = drawnNodes[x.target];
                graphMe.edges.push(y);
            }
          }
      });

      return graphMe;

  }

  function default_layout (clusters, nodes, exclude_cluster_ids) {
        init_layout = get_initial_xy (nodes, self.cluster_sizes.length, exclude_cluster_ids);
        clusters = init_layout.filter (function (v,i,obj) { return  !(typeof v.cluster_id === "undefined");});

        var sizes = network_layout.size();

        _.each (nodes,  function (n) {n.x += n.dx/2; n.y += n.dy/2});
        clusters.forEach (collapse_cluster);
        return [clusters, nodes];
    }

 function change_spacing (delta) {
    self.charge_correction = self.charge_correction * delta;
    network_layout.start ();
 }

 function change_window_size (delta, trigger) {

    if (delta) {

		var x_scale = (self.width+delta/2)/self.width;
		var y_scale = (self.height+delta/2)/self.height;

        self.width  += delta;
        self.height += delta;

        var rescale_x = d3.scale.linear().domain (d3.extent (network_layout.nodes(), function (node) {return node.x}));
        rescale_x.range (_.map (rescale_x.domain (), function (v) {return v*x_scale;}));
        //.range ([50,self.width-50]),
        var rescale_y = d3.scale.linear().domain (d3.extent (network_layout.nodes(), function (node) {return node.y}));
        rescale_y.range (_.map (rescale_y.domain (), function (v) {return v*y_scale;}));

        _.each (network_layout.nodes(), function (node) {
            node.x = rescale_x(node.x);
            node.y = rescale_y(node.y);
        });
        
    }

    self.width  = Math.min (Math.max (self.width, 200), 4000);
    self.height = Math.min (Math.max (self.height, 200), 4000);

    network_layout.size ([self.width, self.height]);
    network_svg.attr ("width", self.width).attr ("height", self.height);

    if (trigger) {
        network_layout.start ();
    } else {
    	if (delta) {
    		self.update(true);
    	}
    }
 }

 self.compute_adjacency_list = _.once(function () {

    self.nodes.forEach (function (n) {
        n.neighbors = d3.set();
    });

    self.edges.forEach (function (e) {
        self.nodes[e.source].neighbors.add(e.target);
        self.nodes[e.target].neighbors.add(e.source);
    });

 });

 self.compute_local_clustering_coefficients = _.once (function () {

    self.compute_adjacency_list();

    self.nodes.forEach (function (n) {
        _.defer (function (a_node) {
            neighborhood_size = a_node.neighbors.size ();
            if (neighborhood_size < 2) {
                a_node.lcc = datamonkey.hivtrace.undefined;
            } else {
                if (neighborhood_size > 500) {
                    a_node.lcc = datamonkey.hivtrace.too_large;
                } else {
                    // count triangles
                    neighborhood = a_node.neighbors.values();
                    counter = 0;
                    for (n1 = 0; n1 < neighborhood_size; n1 += 1) {
                        for (n2 = n1 + 1; n2 < neighborhood_size; n2 += 1) {
                            if (self.nodes [neighborhood[n1]].neighbors.has (neighborhood[n2])) {
                                counter ++;
                            }
                        }
                    }

                    a_node.lcc = 2 * counter / neighborhood_size / (neighborhood_size - 1);
                }
            }

        }, n);
    });

 });

  self.get_node_by_id = function(id) {
    return self.nodes.filter(function(n) {
        return n.id == id;
    })[0];


  }

 self.compute_local_clustering_coefficients_worker = _.once (function () {

    var worker = new Worker('workers/lcc.js');

    worker.onmessage = function(event) {

      var nodes = event.data.Nodes;

      nodes.forEach(function(n) {
        node_to_update = self.get_node_by_id(n.id);
        node_to_update.lcc = n.lcc ? n.lcc : datamonkey.hivtrace.undefined;
      });

    };

    var worker_obj = {}
    worker_obj["Nodes"] = self.nodes;
    worker_obj["Edges"] = self.edges;
    worker.postMessage(worker_obj);

 });



  estimate_cubic_compute_cost = _.memoize(function (c) {
    self.compute_adjacency_list();
    return _.reduce (_.first(_.pluck (c.children, "degree").sort (d3.descending),3),function (memo, value) {return memo*value;},1);
  }, function (c) {return c.cluster_id;});

  self.compute_global_clustering_coefficients = _.once (function () {
    self.compute_adjacency_list();

    self.clusters.forEach (function (c) {
         _.defer (function (a_cluster) {
                cluster_size = a_cluster.children.length;
                if (cluster_size < 3) {
                    a_cluster.cc = datamonkey.hivtrace.undefined;
                } else {
                    if (estimate_cubic_compute_cost (a_cluster, true) >= 5000000) {
                        a_cluster.cc = datamonkey.hivtrace.too_large;
                    } else {
                        // pull out all the nodes that have this cluster id
                        member_nodes = [];

                        var triads = 0;
                        var triangles = 0;

                        self.nodes.forEach (function (n,i) {if (n.cluster == a_cluster.cluster_id) {member_nodes.push (i);}});
                        member_nodes.forEach (function (node) {
                            my_neighbors = self.nodes[node].neighbors.values().map (function (d) {return +d;}).sort (d3.ascending);
                            for (n1 = 0; n1 < my_neighbors.length; n1 += 1) {
                                for (n2 = n1 + 1; n2 < my_neighbors.length; n2 += 1) {
                                    triads += 1;
                                    if (self.nodes[my_neighbors[n1]].neighbors.has (my_neighbors[n2])) {
                                        triangles += 1;
                                    }
                                }
                            }
                        });

                        a_cluster.cc = triangles/triads;
                    }
                }

            }, c);
        });
 });

 self.mark_nodes_as_processing = function (property) {
    self.nodes.forEach (function (n) { n[property] = datamonkey.hivtrace.processing });
  }

 self.compute_graph_stats = function () {

    d3.select (this).classed ("disabled", true).select("i").classed ({"fa-calculator": false, "fa-cog": true, "fa-spin": true});
    self.mark_nodes_as_processing('lcc');
    self.compute_local_clustering_coefficients_worker();
    self.compute_global_clustering_coefficients();
    d3.select (this).remove();

 };


  /*------------ Constructor ---------------*/
  function initial_json_load() {
    var connected_links = [];
    var total = 0;
    var exclude_cluster_ids = {};
    self.has_hxb2_links = false;
    self.cluster_sizes = [];

    graph_data.Nodes.forEach (function (d) {
          if (typeof self.cluster_sizes[d.cluster-1]  === "undefined") {
            self.cluster_sizes[d.cluster-1] = 1;
          } else {
            self.cluster_sizes[d.cluster-1] ++;
          }
          if ("is_lanl" in d) {
            d.is_lanl = d.is_lanl == "true";
          }


          if (d.attributes.indexOf ("problematic") >= 0) {
            self.has_hxb2_links = d.hxb2_linked = true;
          }

    });

     /* add buttons and handlers */
     /* clusters first */

     if (button_bar_ui) {

        $('#' + button_bar_ui + '_cluster_zoom').on('show.bs.modal', function (event) {
            var link_clicked = $(event.relatedTarget);
            var cluster_id = link_clicked.data ("cluster");
            var modal = d3.select ('#' + button_bar_ui + '_cluster_zoom');
            modal.selectAll (".modal-title").text ("Cluster " + cluster_id);

            $("#" + button_bar_ui + "_cluster_zoom_svg_export").on ("click", function (e) {
                datamonkey.save_image("png", "#" + button_bar_ui + "_cluster_zoom_svg");
            });

            var node_indices = {};
            var used_index   = 0;

            var only_this_cluster = {
                                        "Nodes" : _.map (_.filter (self.nodes, function (n,i) {if (n.cluster == cluster_id) {node_indices [i] = used_index++; return true;} return false;}), function (n) {var nn = _.clone (n); nn.cluster = 1; delete nn["parent"]; return nn;}),
                                        "Edges" : _.map (_.filter (self.edges, function (e) {
                                            if (e.source in node_indices && e.target in node_indices) {
                                                return true;
                                            }
                                            return false;
                                        }), function (e) {var ne  = _.clone (e); ne.target = node_indices[ne.target]; ne.source = node_indices[ne.source]; return ne;}),

                                     };


            only_this_cluster[_networkGraphAttrbuteID] = self.json[_networkGraphAttrbuteID];


            hivtrace_cluster_network_graph (only_this_cluster, "#" + button_bar_ui + "_cluster_zoom_svg", null, null, null, null, null, null, null, "#" + button_bar_ui + "_cluster_zoom_body",
                    {"expand" : [1], "charge" : 10, "colorizer" : self.colorizer, "node_shaper" : self.node_shaper,  "width" : 600});

        });

        $('#' + button_bar_ui + '_cluster_list').on('show.bs.modal', function (event) {
            var link_clicked = $(event.relatedTarget);
            var cluster_id = link_clicked.data ("cluster");
            var modal = d3.select ('#' + button_bar_ui + '_cluster_list');
            modal.selectAll (".modal-title").text ("Listing nodes in cluster " + cluster_id);
			var the_list = modal.select ('#' + button_bar_ui + '_cluster_list_payload');
			the_list.selectAll ('*').remove();
			
			var allowed_types = {"String" : 1, "Date": 1, "Number" : 1};
			
			var column_ids = _.filter (self.json[_networkGraphAttrbuteID], function (d) {return d.type in allowed_types;});
		
			_.each (_.filter (self.nodes, function (n) {return n.cluster == cluster_id;}), function (node) {
				var patient_record = the_list.append ("li");
				patient_record.append ("code").text (node.id);
				var patient_list = patient_record.append ("dl").classed ("dl-horizontal", true);
				_.each (column_ids, function (column) {
					patient_list.append ("dt").text (column.raw_attribute_key);
					patient_list.append ("dd").text (attribute_node_value_by_id (node, column.raw_attribute_key));
					
				});
			});
			
 
        });

         var cluster_ui_container = d3.select ("#" + button_bar_ui + "_cluster_operations_container");

		 var cluster_commands = 
         [
            ["Expand All",          function () {return self.expand_some_clusters()},   true, 'hivtrace-expand-all'],
            ["Collapse All",        function () {return self.collapse_some_clusters()}, true, 'hivtrace-collapse-all'],
            ["Expand Filtered",     function () {return self.expand_some_clusters(self.select_some_clusters (function (n) {return n.match_filter;}))},   true, 'hivtrace-expand-filtered'],
            ["Collapse Filtered",   function () {return self.collapse_some_clusters(self.select_some_clusters (function (n) {return n.match_filter;}))}, true, 'hivtrace-collapse-filtered'],
            ["Hide problematic clusters", function (item) {
                                            d3.select (item).text (self.hide_hxb2 ? "Hide problematic clusters" :  "Show problematic clusters");
                                            self.toggle_hxb2 ();
                                          }, self.has_hxb2_links, 'hivtrace-hide-problematic-clusters']
        ];
        
        if (!_is_CDC_) {
        	cluster_commands.push (["Show removed edges",   function (item) {
                                        self.filter_edges = !self.filter_edges;
                                        d3.select (item).text (self.filter_edges ? "Show removed edges" :  "Hide removed edges");
                                        self.update (false);
                                     }
                                    , function () {return _.some (self.edges, function (d) {return d.removed;});}, 'hivtrace-show-removed-edges'])
                                    
        }

            
        cluster_commands.forEach (function (item,index) {
            var handler_callback = item[1];
            if (item[2]) {
                this.append ("li").append ("a")
                                  .text (item[0])
                                  .attr ("href", "#")
                                  .attr ("id", item[3])
                                  .on ("click", function(e) {
                                    handler_callback(this);
                                    d3.event.preventDefault();
                                  });
            }
         },cluster_ui_container);


         var button_group  = d3.select ("#" + button_bar_ui + "_button_group");

         if (! button_group.empty()) {
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Expand spacing").on ("click", function (d) {change_spacing (5/4);}).append ("i").classed ("fa fa-plus", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Compress spacing").on ("click", function (d) {change_spacing (4/5);}).append ("i").classed ("fa fa-minus", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Enlarge window").on ("click", function (d) {change_window_size (100, true);}).append ("i").classed ("fa fa-expand", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Shrink window").on ("click", function (d) {change_window_size (-100, true);}).append ("i").classed ("fa fa-compress", true);


			if (!_is_CDC_) {
				button_group.append ("button")
				  .classed("btn btn-default btn-sm", true)
				  .attr("title", "Compute graph statistics")
				  .attr("id", "hivtrace-compute-graph-statistics")
				  .on("click", function (d) {_.bind(self.compute_graph_stats,this)();})
				  .append("i")
				  .classed("fa fa-calculator", true);
			}

            button_group.append ("button")
              .classed("btn btn-default btn-sm", true)
              .attr("title", "Save Image")
              .attr("id", "hivtrace-export-image")
              .on("click", function(d) { datamonkey.save_image("png", "#network-svg");})
              .append ("i").classed ("fa fa-image", true);
         }

         $("#" + button_bar_ui + "_filter").on ("input propertychange", _.throttle (function (e) {
               var filter_value = $(this).val();
               self.filter (filter_value.split (" ").filter (function (d) {return d.length > 0;}).map (function (d) { 
               	if (d.length > 2) {
                		if (d[0] == '"' && d[d.length-1] == '"') {
               			return {type : 're' , value: new RegExp ("^" + d.substr (1, d.length-2) + "$","i")};
               		} 
               		if (d[0] == '<') {
               			var distance_threshold = parseFloat (d.substr (1));
               			if (distance_threshold > 0) {
               				return {type: 'distance', value: distance_threshold};
               			}
               		}
               		
               	} 
               	return {type : 're' , value: new RegExp (d,"i")};
               }));
               
             }, 250));

         $("#" + button_bar_ui + "_hide_filter").on ("change", _.throttle (function (e) {
               self.hide_unselected = !self.hide_unselected;
               self.filter_visibility ();
               self.update (true);
            }, 250));


         $("#" + button_bar_ui + "_pairwise_table_pecentage").on ("change", _.throttle (function (e) {
               self.show_percent_in_pairwise_table = !self.show_percent_in_pairwise_table;
               render_binned_table  ("#" + button_bar_ui + "_attribute_table", self.colorizer['category_map'], self.colorizer['category_pairwise']);
            }, 250));
    }


     if (_networkGraphAttrbuteID in json) {
        attributes = json[_networkGraphAttrbuteID];
     } else {
         if (attributes && "hivtrace" in attributes) {
            attributes = attributes["hivtrace"];
         }
    }

     if (attributes) {
         /*
            map attributes into nodes and into the graph object itself using
            _networkGraphAttrbuteID as the key
         */
         
         
         if ("attribute_map" in attributes) {
             var attribute_map = attributes["attribute_map"];
             
             if ("map" in attribute_map && attribute_map["map"].length > 0) {
                 graph_data [_networkGraphAttrbuteID] = attribute_map["map"].map (function (a,i) { return {'label': a, 'type' : null, 'values': {}, 'index' : i, 'range' : 0};});

                 graph_data.Nodes.forEach (function (n) {
                    n[_networkGraphAttrbuteID] = n.id.split (attribute_map["delimiter"]);
                    n[_networkGraphAttrbuteID].forEach (function (v,i) {
                        if (i < graph_data [_networkGraphAttrbuteID].length) {
                            if (! (v in graph_data [_networkGraphAttrbuteID][i]["values"])) {
                                graph_data [_networkGraphAttrbuteID][i]["values"][v] = graph_data [_networkGraphAttrbuteID][i]["range"];
                                graph_data [_networkGraphAttrbuteID][i]["range"] += 1;
                            }
                        }
                        //graph_data [_networkGraphAttrbuteID][i]["values"][v] = 1 + (graph_data [_networkGraphAttrbuteID][i]["values"][v] ? graph_data [_networkGraphAttrbuteID][i]["values"][v] : 0);
                    });
                });

                graph_data [_networkGraphAttrbuteID].forEach (function (d) {
                    if (d['range'] < graph_data.Nodes.length && d['range'] > 1 &&d['range' ] <= 20) {
                        d['type'] = 'category';
                    }
                });
            }
        }


		_.each (self._networkPredefinedAttributeTransforms, function (computed, key) {
			if (!computed['depends'] || _.has (graph_data [_networkGraphAttrbuteID], computed['depends'])) {
				var extension = {};
				extension[key] = computed;
				_.extend (graph_data [_networkGraphAttrbuteID], extension);
				_.each (graph_data.Nodes, function (node) {
					inject_attribute_node_value_by_id (node, key, computed['map'](node));
				});
			}
		});

        // populate the UI elements
        if (button_bar_ui) {
            // decide if the variable can be considered categorical by examining its range


            var valid_cats = _.filter (_.map (graph_data [_networkGraphAttrbuteID], function (d,k) {
                d['raw_attribute_key'] = k;
                if (d['type'] == "String") {
                    d['value_range'] = _.keys(_.countBy (graph_data.Nodes, function (nd) {
                        return attribute_node_value_by_id (nd, k);
                    }));
                     d['dimension'] = d["value_range"].length;
                } else {
					if ('enum' in d) {
						 d["value_range"] = _.clone (d["enum"]);
						 d["value_range"].push (_networkMissing);
						 d['dimension'] = d["value_range"].length;
						 d['no-sort'] = true;
					}
                }	
                return d;
            }), function (d) {
                return 'value_range' in d && d['value_range'].length <= _maximumValuesInCategories;
            });

            var valid_shapes = _.filter (valid_cats, function (d) {
                 return d.dimension <= 5;
            });
            

            // sort values alphabetically for consistent coloring

            _.each ([valid_cats, valid_shapes], function (list) {
                _.each (list, function (d) {
                    var values;
                    if (d['no-sort']) {
                    	values = d['value_range'];
                    } else {
                    
                    	if (d['type'] == "String") {
			
							values = d['value_range'].sort ();
							
							if (d.dimension <= _maximumValuesInCategories) {
			
								var string_hash = function (str) {
									var hash   = 5801;
									for (ci = 0; ci < str.length; ci++) {
										var charCode = str.charCodeAt (ci);
										hash = (hash << 5 + hash) + charCode;
									}
									return hash;
								};

								var hashed   = _.map (values, string_hash);
								var available_keys = {};
								var reindexed = {};
								
								for (i = 0; i < _maximumValuesInCategories; i++) {
									available_keys[i] = true;
								}
								
								
							
								_.each (hashed, function (value, index) {
									if (value < 0) {
										value = -value;
									}
								
									var first_try = value % _maximumValuesInCategories;
									if (first_try in available_keys) {
										reindexed[values[index]] = first_try;
										delete available_keys[first_try];
										return;
									}

									var second_try = Math.floor (value / _maximumValuesInCategories) % _maximumValuesInCategories;
									if (second_try in available_keys) {
										reindexed[values[index]] = second_try;
										delete available_keys[second_try];
										return;
									}
									
									var last_resort = parseInt (_.keys (available_keys).sort () [0]);
									reindexed[values[index]] = last_resort;
									delete available_keys[last_resort];
								}); 
							
								d['stable-ish order'] = reindexed;
							
								
							}
							//values = _.unzip(_.zip (d['value_range'], ordering_map).sort (function (a,b) { if (a[1] < b[1]) return -1; if (a[1] > b[1]) return 1; return 0}))[0]; //d['value_range'].sort ();
						
						
						} else {
                   			values = d['value_range'].sort ();
						}
                    }
                    
                     
                    
                    var map    = new Object;

                    _.each (values, function (d2, i) {
                        map[d2] = i;
                    });
                    
                    d['value_map'] = function (v,key) {return key ? (key == 'lookup' ? _.invert (map) : map) : map[v];};

                })});


            var valid_scales = _.filter (_.map (graph_data [_networkGraphAttrbuteID], function (d,k) {
                d['raw_attribute_key'] = k;
                if (d.type == "Number") {
                    var values = _.filter (_.map (graph_data.Nodes, function (nd) {
                        return attribute_node_value_by_id (nd, k);
                     }), function (v) {
                        return v == _networkMissing ? null : v;
                    });
                    // automatically determine the scale and see what spaces the values most evenly
                    d['value_range'] = d3.extent (values);

                     var low_var = Infinity;


                    _.each ([d3.scale.linear(), d3.scale.log(), d3.scale.pow().exponent (1/3),  d3.scale.pow().exponent (0.25), d3.scale.pow().exponent (0.5),  d3.scale.pow().exponent (1/8),  d3.scale.pow().exponent (1/16)], function (scl) {
                        var bins = _.map (_.range (_networkContinuousColorStops), function () {return 0.});
                        scl.range ([0,_networkContinuousColorStops-1]).domain (d['value_range']);
                        _.each (values, function (v) {
                                bins[Math.floor (scl(v))] ++;
                        });

                        var mean = values.length / _networkContinuousColorStops;
                        var vrnc = _.reduce (bins, function (p, c) {
                            return p + (c-mean)*(c-mean);
                        });

                        if (vrnc < low_var) {
                            low_var = vrnc;
                            d['scale'] = scl;
                        }

                    });
                }
                return d;
            }), function (d) {
                return d.type == "Number";
            });




            //valid_cats.splice (0,0, {'label' : 'None', 'index' : -1});

            [d3.select ("#" + button_bar_ui + "_attributes"),d3.select ("#" + button_bar_ui + "_attributes_cat")].forEach (function (m) {

                m.selectAll ("li").remove();

                var menu_items = [[['None',null,_.partial (handle_attribute_categorical,null)]],[['Categorical', 'heading',null]]].concat(valid_cats.map (function (d,i) {return [[d['label'],d['raw_attribute_key'],_.partial (handle_attribute_categorical, d['raw_attribute_key'])]];}));


               if (valid_scales.length) {
                    menu_items = menu_items.concat ([[['Continuous', 'heading',null]]]).concat (valid_scales.map (function (d,i) {return [[d['label'],d['raw_attribute_key'],
                            _.partial (handle_attribute_continuous, d['raw_attribute_key'])]];}));
                }

                var cat_menu = m.selectAll ("li")
                                .data(menu_items);


                cat_menu.enter ().append ("li").classed ("disabled", function (d) {return d[0][1] == 'heading';}).style ("font-variant", function (d) {return d[0][1] < -1 ? "small-caps" : "normal";} );

                cat_menu.selectAll ("a").data (function (d) {return d;})
                                        .enter ()
                                        .append ("a")
                                        .text (function (d,i,j) {return d[0];})
                                        .attr ("style", function (d,i,j) {if (d[1] == 'heading') return 'font-style: italic'; if (j == 0) { return ' font-weight: bold;'}; return null; })
                                        .attr ('href', '#')
                                        .on ("click", function (d) { if (d[2]) {d[2].call()}});
            });

            [d3.select ("#" + button_bar_ui + "_shapes")].forEach (function (m) {

                m.selectAll ("li").remove();
                var cat_menu = m.selectAll ("li")
                                .data([[['None',null,_.partial (handle_shape_categorical,null)]]].concat(valid_shapes.map (function (d,i) {return [[d['label'],d['raw_attribute_key'],_.partial (handle_shape_categorical, d['raw_attribute_key'])]];})));

                cat_menu.enter ().append ("li").style ("font-variant", function (d) {return d[0][1] < -1 ? "small-caps" : "normal";} );

                cat_menu.selectAll ("a").data (function (d) {return d;})
                                        .enter ()
                                        .append ("a")
                                        .text (function (d,i,j) {return d[0];})
                                        .attr ("style", function (d,i,j) {if (j == 0) { return ' font-weight: bold;'}; return null; })
                                        .attr ('href', '#')
                                        .on ("click", function (d) { if (d[2]) {d[2].call()}});
            });

             $("#" + button_bar_ui + "_opacity_invert").on ("click", function (e) {
                if (self.colorizer ['opacity_scale']) {
                    self.colorizer ['opacity_scale'].range (self.colorizer ['opacity_scale'].range().reverse());
                    self.update(true);
                    draw_attribute_labels();

                }
                $(this).toggleClass ("btn-active btn-default");

             });

             $("#" + button_bar_ui + "_attributes_invert").on ("click", function (e) {
                if (self.colorizer ['category_id']) {
                    graph_data [_networkGraphAttrbuteID][self.colorizer ['category_id']]['scale'].range ( graph_data [_networkGraphAttrbuteID][self.colorizer ['category_id']]['scale'].range().reverse());
                    self.clusters.forEach (function (the_cluster) {the_cluster["gradient"] = compute_cluster_gradient (the_cluster, self.colorizer ['category_id']);});
                    self.update(true);
                    draw_attribute_labels();

                }
                $(this).toggleClass ("btn-active btn-default");

             });

             [d3.select ("#" + button_bar_ui + "_opacity")].forEach (function (m) {


                m.selectAll ("li").remove();
                var cat_menu = m.selectAll ("li")
                                .data([[['None',null,_.partial (handle_attribute_opacity,null)]]].concat(valid_scales.map (function (d,i) {return [[d['label'],d['raw_attribute_key'],_.partial (handle_attribute_opacity, d['raw_attribute_key'])]];})));


                cat_menu.enter ().append ("li").style ("font-variant", function (d) {return d[0][1] < -1 ? "small-caps" : "normal";} );
                cat_menu.selectAll ("a").data (function (d) {return d;})
                                        .enter ()
                                        .append ("a")
                                        .text (function (d,i,j) {return d[0];})
                                        .attr ("style", function (d,i,j) {if (j == 0) { return ' font-weight: bold;'}; return null; })
                                        .attr ('href', '#')
                                        .on ("click", function (d) { if (d[2]) {d[2].call()}});
            });

        }
    }

    if (self.cluster_sizes.length > max_points_to_render) {
      var sorted_array = self.cluster_sizes.map (function (d,i) {
          return [d,i+1];
        }).sort (function (a,b) {
          return a[0] - b[0];
        });

      for (var k = 0; k < sorted_array.length - max_points_to_render; k++) {
          exclude_cluster_ids[sorted_array[k][1]] = 1;
      }
      warning_string = "Excluded " + (sorted_array.length -
					  max_points_to_render) + " clusters (maximum size " + 
					  sorted_array[k-1][0] + " nodes) because only " +
					  max_points_to_render + " points can be shown at once.";
    }

    // Initialize class attributes
    singletons = graph_data.Nodes.filter (function (v,i) { return v.cluster === null; }).length; self.nodes = graph_data.Nodes.filter (function (v,i) { if (v.cluster && typeof exclude_cluster_ids[v.cluster]  === "undefined"  ) {connected_links[i] = total++; return true;} return false;  });
    self.edges = graph_data.Edges.filter (function (v,i) { return connected_links[v.source] != undefined && connected_links[v.target] != undefined});
    self.edges = self.edges.map (function (v,i) {v.source = connected_links[v.source]; v.target = connected_links[v.target]; v.id = i; return v;});

    compute_node_degrees(self.nodes, self.edges);

    var r = default_layout(self.clusters, self.nodes, exclude_cluster_ids);
    self.clusters = r[0];
    self.nodes = r[1];
    self.clusters.forEach (function (d,i) {
            cluster_mapping[d.cluster_id] = i;
            d.hxb2_linked = d.children.some(function(c) {return c.hxb2_linked});
            var degrees = d.children.map (function (c) {return c.degree;});
            degrees.sort (d3.ascending);
            d.degrees = datamonkey_describe_vector (degrees);
            d.distances = [];
            });
            
            
    self.edges.forEach (function (e,i) {
    	self.clusters [cluster_mapping[self.nodes[e.target].cluster]].distances.push (e.length);
    });

    self.clusters.forEach (function (d,i) {
            d.distances = datamonkey_describe_vector (d.distances);
	});
    //self.clusters


    self.update();

  }

  function sort_table_toggle_icon (element, value) {
    if (value) {
        $(element).data ("sorted", value);
        d3.select (element).selectAll ("i").classed ("fa-sort-amount-desc", value == "desc").classed ("fa-sort-amount-asc", value == "asc").classed ("fa-sort", value == "unsorted");
    } else {
        var sorted_state = $(element).data ("sorted");
        sort_table_toggle_icon (element, sorted_state == "asc" ? "desc" : "asc");
        return sorted_state == "asc" ? d3.descending: d3.ascending;
    }
  }

  function sort_table_by_column (element, datum) {
    d3.event.preventDefault();
    var table_element = $(element).closest ("table");
    if (table_element.length) {
        var sort_on             = parseInt($(element).data ("column-id"));
        var sort_key            = $(element).data ("sort-on");
        var sorted_state        = ($(element).data ("sorted"));
        var sorted_function     = sort_table_toggle_icon (element);

        sort_accessor = sort_key ? function (x) {var val = x[sort_key]; if (typeof (val) === "function") return val (); return val;} : function (x) {return x;};

        d3.select (table_element[0]).select ("tbody").selectAll ("tr").sort (function (a,b) { return sorted_function (sort_accessor(a[sort_on]), sort_accessor(b[sort_on]));});

        // select all other elements from thead and toggle their icons

        $(table_element).find ("thead [data-column-id]")
                        .filter (function () {return parseInt ($(this).data ("column-id")) != sort_on;})
                        .each (function () { sort_table_toggle_icon (this, "unsorted");});
    }
  }

  function format_a_cell (data, index, item) {

     var this_sel  = d3.select (item);

     current_value = typeof (data.value) === "function" ? data.value() : data.value;

     if ("callback" in data) {
        data.callback (item, current_value);
     } else {
         var repr = "format" in data ?  data.format (current_value) : current_value;
         if ("html" in data) this_sel.html (repr); else this_sel.text(repr);
         if ("sort" in data) {
            var clicker = this_sel.append ("a").property ("href", "#").on ("click", function (d) {sort_table_by_column (this, d);}).attr ("data-sorted", "unsorted").attr ("data-column-id", index).attr ("data-sort-on", data.sort);
            clicker.append ("i").classed ("fa fa-sort", true).style ("margin-left", "0.2em");
          }
     }
     if ("help" in data) {
        this_sel.attr ("title", data.help);
     }

  }

  function add_a_sortable_table (container, headers, content) {

        var thead = container.selectAll ("thead");
        if (thead.empty()) {
            thead = container.append ("thead");
            thead.selectAll ("tr").data (headers).enter().append ("tr").selectAll ("th").data (function (d) {return d;}).enter().append ("th").
                                  call (function (selection) { return selection.each (function (d, i) {
                                        format_a_cell (d, i, this);
                                    })
                                  });
        }

        var tbody = container.selectAll ("tbody");
        if (tbody.empty()) {
            tbody = container.append ("tbody");
            tbody.selectAll ("tr").data (content).enter().append ("tr").selectAll ("td").data (function (d) {return d;}).enter().append ("td").call (function (selection) { return selection.each (function (d, i) {
                                        handle_cluster_click
                                        format_a_cell (d, i, this);
                                    })
                                  });
        }


  }

  function _cluster_table_draw_id (element, payload) {
        var this_cell = d3.select (element);
        this_cell.selectAll ("*").remove();
        this_cell.append ("span").text (payload).style ("padding-right", "0.5em");
        this_cell.append ("button").classed ("btn btn-primary btn-xs pull-right", true).text ("Zoom").attr ("data-toggle","modal").attr("data-target", "#" + button_bar_ui + "_cluster_zoom").attr ("data-cluster", payload);
        this_cell.append ("button").classed ("btn btn-xs pull-right", true).text ("List").attr ("data-toggle","modal").attr("data-target", "#" + button_bar_ui + "_cluster_list").attr ("data-cluster", payload);
  }

  function _cluster_table_draw_buttons (element, payload) {
  
    var this_cell = d3.select (element);
    var labels = [[payload[0] ? "expand" : "collapse",0]];
    if (payload[1]) {
        labels.push (["problematic",1]);
    }
    if (payload[2]) {
        labels.push (["match",1]);	
    }
    var buttons = this_cell.selectAll ("button").data (labels);
    buttons.enter().append ("button");
    buttons.exit().remove();
    buttons.classed ("btn btn-primary btn-xs", true).text (function (d) {return d[0];})
                                                 .attr ("disabled", function (d) {return d[1] ? "disabled" : null})
                                                 .on ("click", function (d) {
                                                    if (d[1] == 0) {
                                                        if (payload[0]) {
                                                            expand_cluster (self.clusters [payload[payload.length-1] - 1], true);
                                                        } else {
                                                            collapse_cluster (self.clusters [payload[payload.length-1] - 1]);
                                                        }
                                                        format_a_cell (d3.select (element).datum(), null, element);
                                                    }
                                                 });

  };

 function _node_table_draw_buttons (element, payload) {
    var this_cell = d3.select (element);
    var labels = [[payload[0] ? "hide" : "show",0]];

    var buttons = this_cell.selectAll ("button").data (labels);
    buttons.enter().append ("button");
    buttons.exit().remove();
    buttons.classed ("btn btn-primary btn-xs btn-node-property", true).text (function (d) {return d[0];})
                                                 .attr ("disabled", function (d) {return d[1] ? "disabled" : null})
                                                 .on ("click", function (d) {
                                                    if (d[1] == 0) {
                                                        if (payload[0]) {
                                                            collapse_cluster (self.clusters [payload[payload.length-1] - 1], true);
                                                        } else {
                                                            expand_cluster (self.clusters [payload[payload.length-1] - 1]);
                                                        }
                                                        format_a_cell (d3.select (element).datum(), null, element);
                                                    }
                                                 });

  };

  self.update_volatile_elements = function (container) {
    container.selectAll ("td").filter (function (d,i) {
        return ("volatile" in d);
    }).each (function (d,i) {
        format_a_cell (d, i, this);
    });
  };

  function draw_node_table () {

    if (self.node_table) {
        add_a_sortable_table (self.node_table,
                                // headers
                              [[{value:"ID", sort : "value", help: "Node ID"},
                                 {value: "Status", sort: "value"},
                                 {value: "# of links", sort: "value", help: "Number of links (Node degree)"},
                                 {value: "Cluster", sort: "value", help: "Which cluster does the node belong to"}
                               ]],
                                 // rows
                               self.nodes.map (function (n, i) {
                                return [{"value": n.id, help: "Node ID"},
                                        {       "value": function () {return [!self.clusters [n.cluster-1].collapsed, n.cluster]},
                                                "callback": _node_table_draw_buttons,
                                                "volatile" : true
                                        },
                                        {"value" : n.degree, help: "Node degree"},
                                        {"value" : n.cluster, help: "Which cluster does the node belong to"}];

                                }));
    }
  }

  function draw_cluster_table () {
    if (self.cluster_table) {
        add_a_sortable_table (self.cluster_table,
                                // headers
                              [[{value:"Cluster ID", sort : "value", help: "Unique cluster ID"},
                                 {value: "Visibility", sort: "value", help: "Visibility in the network tab"},
                                 {value: "Size", sort: "value", help: "Number of nodes in the cluster"},
                                 {value: "# links/node<br>Mean [Median, IQR]", html : true},
                                 {value: "Genetic distance<br>Mean [Median, IQR]", help: "Genetic distance among nodes in the cluster", html: true}
                               ]],
                                self.clusters.map (function (d, i) {
                                 // rows
                                return [{value: d.cluster_id,
                                         callback: _cluster_table_draw_id},
                                        {       value: function () {return [d.collapsed, d.hxb2_linked, d.match_filter, d.cluster_id]},
                                                callback: _cluster_table_draw_buttons,
                                                volatile : true
                                        },
                                        {value : d.children.length},
                                        {value : d.degrees, format: function (d) {return _defaultFloatFormat(d['mean']) + " [" + _defaultFloatFormat(d['median']) + ", " + _defaultFloatFormat(d['Q1']) + " - " + _defaultFloatFormat(d['Q3']) +"]"}},
                                        {value : d.distances, format: function (d) {return _defaultFloatFormat(d['mean']) + " [" + _defaultFloatFormat(d['median']) + ", " + _defaultFloatFormat(d['Q1']) + " - " + _defaultFloatFormat(d['Q3']) +"]"}}
                                        ];

                                })
                                );
        }
  }

  /*------------ Update layout code ---------------*/
  function update_network_string (draw_me) {
      if (network_status_string) {
          var clusters_shown = self.clusters.length-draw_me.clusters.length,
              clusters_removed = self.cluster_sizes.length - self.clusters.length,
              nodes_removed = graph_data.Nodes.length - singletons - self.nodes.length;

          /*var s = "Displaying a network on <strong>" + self.nodes.length + "</strong> nodes, <strong>" + self.clusters.length + "</strong> clusters"
                  + (clusters_removed > 0 ? " (an additional " + clusters_removed + " clusters and " + nodes_removed + " nodes have been removed due to network size constraints)" : "") + ". <strong>"
                  + clusters_shown +"</strong> clusters are expanded. Of <strong>" + self.edges.length + "</strong> edges, <strong>" + draw_me.edges.length + "</strong>, and of  <strong>" + self.nodes.length  + " </strong> nodes,  <strong>" + draw_me.nodes.length + " </strong> are displayed. ";
          if (singletons > 0) {
              s += "<strong>" +singletons + "</strong> singleton nodes are not shown. ";
          }*/
          
          var s = "<span class = 'badge'>" + self.clusters.length + "</span> clusters <span class = 'label label-primary'>" + clusters_shown + " expanded</span> <span class = 'badge'> " + 
          									 self.nodes.length + "</span> nodes <span class = 'label label-primary'>" + draw_me.nodes.length + " shown</span> " +
          									 "<span class = 'badge'>" + self.edges.length + "</span> " + (_is_CDC_? "links" : "edges") +" <span class = 'label label-primary'>" + draw_me.edges.length  + " shown</span>";
          									 
          
          d3.select (network_status_string).html(s);
    }
  }


  function draw_a_node (container, node) {
    container = d3.select(container);

    var symbol_type =  (node.hxb2_linked && !node.is_lanl) ? "cross" : (node.is_lanl ? "triangle-down" : self.node_shaper['shaper'] (node));

    container.attr("d", datamonkey.hivtrace.symbol (symbol_type).size( node_size (node) ))
        .attr('class', 'node')
        .classed ('selected_object', function (d) {return d.match_filter})
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; })
        .style('fill', function(d) { return node_color(d); })
        .style('opacity', function (d) {return node_opacity(d);})
        .style('display', function (d) {if (d.is_hidden) return 'none'; return null;})
        .on ('click', handle_node_click)
        .on ('mouseover', node_pop_on)
        .on ('mouseout', node_pop_off)
        .call(network_layout.drag().on('dragstart', node_pop_off));

   }


  function draw_a_cluster (container, the_cluster) {

     container_group = d3.select(container);

     var draw_from   = the_cluster["binned_attributes"] ? the_cluster["binned_attributes"].map (function (d) {return d.concat ([0]);}) : [[null, 1, 0]];

     if (the_cluster.match_filter) {
        draw_from = draw_from.concat ([["selected",the_cluster.match_filter,1],["not selected",the_cluster.children.length - the_cluster.match_filter,1]]);
     }

     var sums  = [d3.sum(draw_from.filter (function (d) {return d[2] == 0}),function (d) {return d[1];}),
                  d3.sum(draw_from.filter (function (d) {return d[2] != 0}),function (d) {return d[1];})];

     var running_totals = [0,0];

     draw_from = draw_from.map (function (d) {  index = d[2];
                                                var v = {'container' : container,
                                                        'cluster': the_cluster,
                                                        'startAngle' : running_totals[index]/sums[index]*2*Math.PI,
                                                        'endAngle': (running_totals[index]+d[1])/sums[index]*2*Math.PI,
                                                        'name': d[0],
                                                        'rim' : index > 0};
                                                 running_totals[index] += d[1];
                                                 return v;

                                             });


     var arc_radius = cluster_box_size(the_cluster)*0.5;
     var paths = container_group.selectAll ("path").data (draw_from);
     paths.enter ().append ("path");
     paths.exit  ().remove();

     paths.classed ("cluster", true)
          .classed ("hiv-trace-problematic", function (d) {return the_cluster.hxb2_linked && !d.rim;})
          .classed ("hiv-trace-selected", function (d) {return d.rim;})
          .attr ("d", function (d) {
                return (d.rim
                        ? d3.svg.arc().innerRadius(arc_radius+2).outerRadius(arc_radius+5)
                        : d3.svg.arc().innerRadius(0).outerRadius(arc_radius))(d);
                })
          .style ("fill", function (d,i) {return d.rim ? self.colorizer ['selected'] (d.name) : (the_cluster["gradient"] ? 'url(#' + the_cluster["gradient"] + ')' : cluster_color (the_cluster, d.name));})
          .style('display', function (d) {if (the_cluster.is_hidden) return 'none'; return null;})
          ;



  }

  function handle_shape_categorical (cat_id) {
        var set_attr = "None";

        ["#" + button_bar_ui + "_shapes"].forEach (function (m) {
            d3.select (m).selectAll ("li").selectAll ("a").attr ("style", function (d,i) {if (d[1] == cat_id) { set_attr = d[0]; return ' font-weight: bold;'}; return null; });
            d3.select (m + "_label").html ("Shape: " + set_attr + ' <span class="caret"></span>');
        });


         if (cat_id) {
            var shape_mapper = d3.scale.ordinal().domain (_.range (0,graph_data [_networkGraphAttrbuteID][cat_id].dimension)).range (_networkShapeOrdering);
            self.node_shaper['id'] = cat_id;
            self.node_shaper['shaper'] = function (d) {return shape_mapper (graph_data [_networkGraphAttrbuteID][cat_id]['value_map'](attribute_node_value_by_id(d,cat_id)));} ;
            self.node_shaper['category_map'] = graph_data [_networkGraphAttrbuteID][cat_id]['value_map'];
        } else {
            self.node_shaper.id = null;
            self.node_shaper.shaper = function () { return 'circle' };
            self.node_shaper['category_map'] = null;
        }
        //console.log (graph_data [_networkGraphAttrbuteID][cat_id]['value_map'], self.node_shaper.domain(), self.node_shaper.range());
        draw_attribute_labels();
        self.update(true);
        d3.event.preventDefault();
  }

  function draw_attribute_labels () {

        legend_svg.selectAll ("g.hiv-trace-legend").remove();
        var offset = 10;

        if (self.colorizer['category_id']) {
            legend_svg.append ("g").attr ("transform", "translate(0," + offset + ")").classed ('hiv-trace-legend',true).append ("text").text ("Color: " + self.colorizer['category_id']).style ("font-weight", "bold");
            offset += 18;

            if (self.colorizer["continuous"]) {
                var anchor_format = d3.format(",.4r");
                var scale = graph_data [_networkGraphAttrbuteID][self.colorizer['category_id']]['scale'];

                _.each (_.range (_networkContinuousColorStops), function (value) {
                     var x =  scale.invert (value);
                     legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(20," + offset + ")").append ("text").text (anchor_format(x));
                     legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(0," + offset + ")").append ("circle").attr ("cx", "8")
                                    .attr ("cy", "-4").attr ("r","8").classed ("legend",true).style ("fill", self.colorizer['category'](x));

                     offset += 18;
                });

                legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(20," + offset + ")").append ("text").text ("missing");
                legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(0," + offset + ")").append ("circle").attr ("cx", "8")
                                .attr ("cy", "-4").attr ("r","8").classed ("legend",true).style ("fill", _networkMissingColor);

                offset += 18;
            } else {
                _.each (self.colorizer['category_map'](null,'map'), function (value, key) {
                     legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(20," + offset + ")").append ("text").text (key);
                     legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(0," + offset + ")").append ("circle").attr ("cx", "8").attr ("cy", "-4").attr ("r","8").classed ("legend",true).style ("fill", self.colorizer['category'](key));

                     offset += 18;
                });
            }
        }

        if (self.node_shaper['id']) {
            legend_svg.append ("g").attr ("transform", "translate(0," + offset + ")").classed ('hiv-trace-legend',true).append ("text").text ("Shape: " + self.node_shaper['id']).style ("font-weight", "bold");
            offset += 18;

            var shape_mapper = d3.scale.ordinal().domain (_.range (0,graph_data [_networkGraphAttrbuteID][self.node_shaper['id']].dimension)).range (_networkShapeOrdering);

            _.each (self.node_shaper['category_map'](null,'map'), function (value, key) {
                 legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(20," + offset + ")").append ("text").text (key);

                 legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(0," + offset + ")").append ("path")
                                                                          .attr ("transform", "translate(5,-5)")
                                                                          .attr("d",  datamonkey.hivtrace.symbol(shape_mapper (value)).size( 128 ))
                                                                          .classed('legend', true)
                                                                          .style ('fill', 'none');

                 offset += 18;
            });
        }

        if (self.colorizer['opacity_id']) {
            legend_svg.append ("g").attr ("transform", "translate(0," + offset + ")").classed ('hiv-trace-legend',true).append ("text").text ("Opacity: " + self.colorizer['opacity_id']).style ("font-weight", "bold");
            offset += 18;
			
			var anchor_format = d3.format(",.4r");
			var scale = graph_data [_networkGraphAttrbuteID][self.colorizer['opacity_id']]['scale'];

			_.each (_.range (_networkContinuousColorStops), function (value) {
				 var x =  scale.invert (value);
				 legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(20," + offset + ")").append ("text").text (anchor_format(x));
				 legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(0," + offset + ")").append ("circle").attr ("cx", "8")
								.attr ("cy", "-4").attr ("r","8").classed ("legend",true).style ("fill","black").style ("opacity", self.colorizer['opacity'](x));

				 offset += 18;
			});

			legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(20," + offset + ")").append ("text").text ("missing");
			legend_svg.append ("g").classed ('hiv-trace-legend',true).attr ("transform", "translate(0," + offset + ")").append ("circle").attr ("cx", "8")
						.attr ("cy", "-4").attr ("r","8").classed ("legend",true).style ("fill","black").style ("opacity", _networkMissingOpacity);

			offset += 18;
        }
  }

  function compute_cluster_gradient (cluster, cat_id) {
        if (cat_id) {
            var id = "hivtrace-cluster-gradient-" + (self.gradient_id++);
            var gradient = network_svg.selectAll("defs").append ("radialGradient").attr ("id", id);
            var values = _.map (cluster.children, function (node) {var value = attribute_node_value_by_id (node, cat_id); return value == _networkMissing ? Infinity : value;}).sort(function (a,b) {return (0+a) - (0+b);});
            var finite = _.filter (values, function (d) {return d < Infinity; });
            var infinite = values.length - finite.length;


            if (infinite) {
                gradient.append ("stop").attr ("offset", "0%").attr ("stop-color", _networkMissingColor);
                gradient.append ("stop").attr ("offset", "" + (infinite/values.length * 100) + "%").attr ("stop-color", _networkMissingColor);
            }


            _.each (finite, function (value, index) {
                   gradient.append ("stop").attr ("offset", "" + ((1+index+infinite) * 100) / values.length + "%").attr ("stop-color", self.colorizer['category'] (value));
            });
            //gradient.append ("stop").attr ("offset", "100%").attr ("stop-color", self.colorizer['category'] (dom[1]));


            return id;
        }
        return null;
  }

  function handle_attribute_opacity (cat_id) {
    var set_attr = "None";

    ["#" + button_bar_ui + "_opacity"].forEach (function (m) {
        d3.select (m).selectAll ("li").selectAll ("a").attr ("style", function (d,i) {if (d[1] == cat_id) { set_attr = d[0]; return ' font-weight: bold;'}; return null; });
        d3.select (m + "_label").html ("Opacity: " + set_attr + ' <span class="caret"></span>');
    });

    d3.select ("#" + button_bar_ui + "_opacity_invert").style ("display", set_attr == "None" ? "none" : "inline").classed ("btn-active",false).classed ("btn-default",true);



    self.colorizer['opacity_id']       = cat_id;
    if (cat_id) {
        var scale = graph_data [_networkGraphAttrbuteID][cat_id]['scale'];
        self.colorizer['opacity_scale'] = d3.scale.linear ().domain ([0,_networkContinuousColorStops-1]).range ([0.25,1]);
        self.colorizer['opacity']          = function (v) {
                if ( v == _networkMissing) {
                    return _networkMissingOpacity;
                }
                return self.colorizer['opacity_scale'] (scale(v));
            };
    } else {
        self.colorizer['opacity']          = null;
        self.colorizer['opacity_scale']          = null;
    }


    draw_attribute_labels();
    self.update(true);
    d3.event.preventDefault();
  }

  function handle_attribute_continuous (cat_id) {
    var set_attr = "None";

    render_chord_diagram ("#" + button_bar_ui + "_aux_svg_holder", null, null);
    render_binned_table  ("#" + button_bar_ui + "_attribute_table", null, null);

    network_svg.selectAll ("radialGradient").remove();

    self.clusters.forEach (function (the_cluster) {delete the_cluster['binned_attributes']; delete the_cluster["gradient"]});

    ["#" + button_bar_ui + "_attributes","#" + button_bar_ui + "_attributes_cat"].forEach (function (m) {
        d3.select (m).selectAll ("li").selectAll ("a").attr ("style", function (d,i) {if (d[1] == cat_id) { set_attr = d[0]; return ' font-weight: bold;'}; return null; });
        d3.select (m + "_label").html ("Color: " + set_attr + ' <span class="caret"></span>');
    });

    d3.select ("#" + button_bar_ui + "_attributes_invert").style ("display", set_attr == "None" ? "none" : "inline").classed ("btn-active",false).classed ("btn-default",true);

    if (cat_id) {
        //console.log (graph_data [_networkGraphAttrbuteID][cat_id]);


        self.colorizer['category']    = _.wrap (d3.scale.linear().range(["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"]).domain (_.range(_networkContinuousColorStops)),
                         function (func, arg) {
                            return func (graph_data [_networkGraphAttrbuteID][cat_id]['scale'](arg));
                         });        //console.log (self.colorizer['category'].exponent ());

        //console.log (self.colorizer['category'] (graph_data [_networkGraphAttrbuteID][cat_id]['value_range'][0]), self.colorizer['category'] (d['value_range'][1]));

        self.colorizer['category_id'] = cat_id;
        self.colorizer['continuous'] = true;
        self.clusters.forEach (function (the_cluster) {the_cluster["gradient"] = compute_cluster_gradient (the_cluster, cat_id);});


        var points = [];

        _.each (self.edges, function (e) {


            var src  = attribute_node_value_by_id(self.nodes[e.source], cat_id),
                tgt =  attribute_node_value_by_id(self.nodes[e.target], cat_id);

            if (src != _networkMissing && tgt != _networkMissing) {
                points.push ({x : src, y : tgt, title: self.nodes[e.source].id + " (" + src + ") -- " + self.nodes[e.target].id + " (" + tgt + ")"});
            }
        });
		d3.select ("#" + button_bar_ui + "_aux_svg_holder_enclosed").style ("display", null);


        datamonkey.hivtrace.scatterplot (points, 400, 400, "#" + button_bar_ui + "_aux_svg_holder", {x : "Source", y : "Target"});

    } else {
        self.colorizer['category']          = null;
        self.colorizer['category_id']       = null;
        self.colorizer['continuous']        = false;
        self.colorizer['category_pairwise'] = null;
        self.colorizer['category_map']      = null;
    }

    draw_attribute_labels();
    self.update(true);
    d3.event.preventDefault();

  }

  function handle_attribute_categorical (cat_id) {

    //console.log (cat_id, graph_data [_networkGraphAttrbuteID]);

    var set_attr = "None";
       d3.select ("#" + button_bar_ui + "_attributes_invert").style ("display", "none");

    network_svg.selectAll ("radialGradient").remove();

    ["#" + button_bar_ui + "_attributes","#" + button_bar_ui + "_attributes_cat"].forEach (function (m) {
        d3.select (m).selectAll ("li").selectAll ("a").attr ("style", function (d,i) {if (d[1] == cat_id) { set_attr = d[0]; return ' font-weight: bold;'}; return null; });
        d3.select (m + "_label").html ("Color: " + set_attr + ' <span class="caret"></span>');
    });

     self.clusters.forEach (function (the_cluster) {delete the_cluster["gradient"]; the_cluster['binned_attributes'] = stratify(attribute_cluster_distribution (the_cluster, cat_id)); });


     self.colorizer['continuous']        = false;

     if (cat_id) {
        if (cat_id in _networkPresetColorSchemes) {
            var domain = [], range = [];
            _.each (_networkPresetColorSchemes[cat_id], function (value, key) {
                domain.push (key);
                range.push (value);
            });
            self.colorizer['category'] = d3.scale.ordinal ().domain (domain).range (range);

        } else {
        	if (graph_data[_networkGraphAttrbuteID][cat_id]['color_scale']) { 
        		self.colorizer['category']    = graph_data[_networkGraphAttrbuteID][cat_id]['color_scale'] (graph_data[_networkGraphAttrbuteID][cat_id]);
        	} else {
        	
         		
            	self.colorizer['category']    = d3.scale.ordinal ().range(_networkCategorical);
            	var extended_range = _.clone(self.colorizer['category'].range());
            	extended_range.push (_networkMissingColor);
            	
            	self.colorizer['category'].domain (_.range (_maximumValuesInCategories+1));
             	self.colorizer['category'].range (extended_range);
  
	           	if (graph_data[_networkGraphAttrbuteID][cat_id]['stable-ish order']) {
            		self.colorizer['category'] = _.wrap (self.colorizer['category'], function (func, arg) {
            			if (arg == _networkMissing) {
            				return func (_maximumValuesInCategories);
            			}
            			return func (graph_data[_networkGraphAttrbuteID][cat_id]['stable-ish order'][arg]);
            		});        		
            		//console.log (graph_data[_networkGraphAttrbuteID][cat_id]['stable-ish order']);
            	}
            	
            }
        }
        self.colorizer['category_id'] = cat_id;
        self.colorizer['category_map'] = graph_data [_networkGraphAttrbuteID][cat_id]['value_map'];
        //self.colorizer['category_map'][null] =  graph_data [_networkGraphAttrbuteID][cat_id]['range'];
        self.colorizer['category_pairwise'] = attribute_pairwise_distribution(cat_id, graph_data [_networkGraphAttrbuteID][cat_id].dimension, self.colorizer['category_map']);



        render_chord_diagram ("#" + button_bar_ui + "_aux_svg_holder", self.colorizer['category_map'], self.colorizer['category_pairwise']);
        render_binned_table  ("#" + button_bar_ui + "_attribute_table", self.colorizer['category_map'], self.colorizer['category_pairwise']);
    } else {
        self.colorizer['category']          = null;
        self.colorizer['category_id']       = null;
        self.colorizer['category_pairwise'] = null;
        self.colorizer['category_map']      = null;
        render_chord_diagram ("#" + button_bar_ui + "_aux_svg_holder", null, null);
        render_binned_table  ("#" + button_bar_ui + "_attribute_table", null, null);
    }

    draw_attribute_labels();
    self.update(true);
    d3.event.preventDefault();
  }

  self.filter_visibility = function () {
  	 self.clusters.forEach (function (c) {
        c.is_hidden = self.hide_unselected && !c.match_filter;
    });
  	 self.nodes.forEach (function (n) {
        n.is_hidden = self.hide_unselected && !n.match_filter;
    });
  };


  self.filter = function (conditions, skip_update) {

    var anything_changed = false;
    
    
    conditions = _.map (['re', 'distance'], function (cnd) {
		return _.map (_.filter (conditions, function (v) {
			return v.type == cnd;
		}), function (v) {return v.value;});
	});
    
    
	if (conditions[1].length) {
			self.nodes.forEach (function (n) {
				n.length_filter = false;
			});

		 _.each (self.edges, function (e) {
			var did_match = _.some(conditions[1], function (d) {
				return e.length <= d;
			});		 
			
			if (did_match) {
				self.nodes[e.source].length_filter = true;
				self.nodes[e.target].length_filter = true;
			}
    	});	
	}
	

    self.clusters.forEach (function (c) {
        c.match_filter = 0;
    });

    self.nodes.forEach (function (n) {
    
        var did_match = _.some(conditions[0], function (regexp) {
            return regexp.test (n.id) || _.some (n[_networkNodeAttributeID], function (attr) {return regexp.test (attr)});
        });

		did_match = did_match || n.length_filter;

        if (did_match != n.match_filter) {
            n.match_filter = did_match;
            anything_changed = true;
        }

        if (n.match_filter) {
            n.parent.match_filter += 1;
        }
    });


    if (anything_changed && !skip_update) {	
    	if (self.hide_unselected) {
           		self.filter_visibility ();
        }

        self.update (true);
    }

  }

  self.update = function (soft, friction) {

    self.needs_an_update = false;

    if (friction) {
        network_layout.friction (friction);
    }
    if (network_warning_tag) {
        if (warning_string.length) {
          d3.select (network_warning_tag).text (warning_string).style ("display", "block");
          warning_string = "";
        } else {
          d3.select (network_warning_tag).style ("display", "none");
        }
    }

    var rendered_nodes,
        rendered_clusters,
        link;

    if (!soft) {

        var draw_me = prepare_data_to_graph();


        network_layout.nodes(draw_me.all)
            .links(draw_me.edges)
            .start ();

        update_network_string(draw_me);

        link = network_svg.selectAll(".link")
            .data(draw_me.edges, function (d) {return d.id;});

        link.enter().append("line")
            .classed ("link", true);
        link.exit().remove();

        link.classed ("removed", function (d) {return d.removed;})
            .classed ("unsupported", function (d) { return "support" in d && d["support"] > 0.05;})
            .on ("mouseover", edge_pop_on)
            .on ("mouseout", edge_pop_off)
            .filter (function (d) {return d.directed;})
            .attr("marker-end", "url(#arrowhead)");


        rendered_nodes  = network_svg.selectAll('.node')
            .data(draw_me.nodes, function (d) {return d.id;});
        rendered_nodes.exit().remove();
        rendered_nodes.enter().append("path");

        rendered_clusters = network_svg.selectAll (".cluster-group").
          data(draw_me.clusters.map (function (d) {return d;}), function (d) {return d.cluster_id;});

        rendered_clusters.exit().remove();
        rendered_clusters.enter().append ("g").attr ("class", "cluster-group")
              .attr ("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; })
              .on ("click", handle_cluster_click)
              .on ("mouseover", cluster_pop_on)
              .on ("mouseout", cluster_pop_off)
              .call(network_layout.drag().on("dragstart", cluster_pop_off));

        draw_cluster_table();
        draw_node_table();

    } else {
        rendered_nodes = network_svg.selectAll('.node');
        rendered_clusters = network_svg.selectAll (".cluster-group");
        link = network_svg.selectAll(".link");
    }

    rendered_nodes.each (function (d) {
              draw_a_node (this, d);
             });

    rendered_clusters.each (function (d) {
        draw_a_cluster (this, d);
    });

    link.style ("opacity", function (d) {return Math.max (node_opacity (d.target), node_opacity (d.source))})
    link.style ("display", function (d) {if (d.target.is_hidden || d.source.is_hidden) {return 'none'}; return null;})
    

    if (!soft) {
        currently_displayed_objects = rendered_clusters[0].length + rendered_nodes[0].length;

        network_layout.on("tick", function() {
          var sizes = network_layout.size();

          rendered_nodes.attr("transform", function(d) { return "translate(" + (d.x = Math.max(10, Math.min(sizes[0] - 10, d.x))) + "," + (d.y = Math.max(10, Math.min(sizes[1] - 10, d.y)))+ ")"; });
          rendered_clusters.attr("transform", function(d) { return "translate(" + (d.x = Math.max(10, Math.min(sizes[0] - 10, d.x))) + "," + (d.y = Math.max(10, Math.min(sizes[1] - 10, d.y))) + ")"; });

          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });
        });
    }  else {
    	link.each (function (d) {
    		d3.select(this).attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; })
    	});
    }
  }

  function tick() {
    var sizes = network_layout.size();

    node.attr("cx", function(d) { return d.x = Math.max(10, Math.min(sizes[0] - 10, d.x)); })
        .attr("cy", function(d) { return d.y = Math.max(10, Math.min(sizes[1] - 10, d.y)); });

    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

  }

  /*------------ Node Methods ---------------*/
  function compute_node_degrees(nodes, edges) {
      for (var n in nodes) {
          nodes[n].degree = 0;
      }

      for (var e in edges) {
          nodes[edges[e].source].degree++;
          nodes[edges[e].target].degree++;
      }
  }


  function  attribute_node_value_by_id (d, id) {
     if (_networkNodeAttributeID in d && id) {
        if (id in d[_networkNodeAttributeID]) {
            var v = d[_networkNodeAttributeID][id];
            if (_.isString (v) && v.length == 0) {
                return _networkMissing;
            }
            return v;
        }
     }
     return _networkMissing;
  }

  function  inject_attribute_node_value_by_id (d, id, value) {
     if (_networkNodeAttributeID in d && id) {
        d[_networkNodeAttributeID][id] = value;
     }
  }
  
  function node_size (d) {
    var r = 5+Math.sqrt(d.degree); //return (d.match_filter ? 10 : 4)*r*r;
    return 4*r*r;
  }

  function node_color(d) {

    /*if (d.match_filter) {
        return "white";
    }*/

    if (self.colorizer['category_id']) {
        var v = attribute_node_value_by_id (d, self.colorizer['category_id']);
        if (self.colorizer['continuous']) {
            if (v == _networkMissing) {
                return _networkMissingColor;
            }
        }
        return self.colorizer['category'](v);

    }
    return d.hxb2_linked ? "black" : (d.is_lanl ? "red" : "gray");
  }

 function node_opacity(d) {
    if (self.colorizer['opacity']) {
        return self.colorizer ['opacity'] (attribute_node_value_by_id (d, self.colorizer['opacity_id']));
    }
    return 1.;
  }

  function cluster_color(d, type) {
    if (d["binned_attributes"]) {
        return self.colorizer['category'](type);
    }
    return "#bdbdbd";
  }

  function hxb2_node_color(d) {
    return "black";
  }

  function node_info_string (n) {
      var str;
      
      if (!_is_CDC_) {
           str =  "Degree <em>" + n.degree + "</em><br>Clustering coefficient <em> " + datamonkey.hivtrace.format_value (n.lcc, _defaultFloatFormat) + "</em>";
      } else {
      	   str =  "# links <em>" + n.degree + "</em>";
      }


	  _.each ([self.colorizer['category_id'], self.node_shaper['id'], self.colorizer['opacity_id']],
	  		  function (key) {
	  		  	if (key) {
					  var attribute = attribute_node_value_by_id (n, key);
					  if (attribute) {
						 str += "<br>"  + key + " <em>" + attribute + "</em>"
					  }
				
	  		  	}
	  		  });

     
      return str;
  }

  function edge_info_string (n) {
     var str = "Length <em>" + _defaultFloatFormat(n.length) + "</em>";
     if ("support" in n) {
        str += "<br>Worst triangle-based support (p): <em>" + _defaultFloatFormat(n.support) + "</em>";
     }

      var attribute = attribute_node_value_by_id (n, self.colorizer['category_id']);

      return str;
  }

  function node_pop_on (d) {
      toggle_tooltip (this, true, (_is_CDC_ ? "Individual " : "Node ") + d.id, node_info_string (d), self.container);
  }

  function node_pop_off (d) {
      toggle_tooltip (this, false);
  }

  function edge_pop_on (e) {
      toggle_tooltip (this, true, e.source.id + " - " + e.target.id, edge_info_string (e), self.container);
  }

  function edge_pop_off (d) {
      toggle_tooltip (this, false);
  }


  /*------------ Cluster Methods ---------------*/

  function compute_cluster_centroids (clusters) {
      for (var c in clusters) {
          var cls = clusters[c];
          cls.x = 0.;
          cls.y = 0.;
          cls.children.forEach (function (x) { cls.x += x.x; cls.y += x.y; });
          cls.x /= cls.children.length;
          cls.y /= cls.children.length;
      }
  }

  function collapse_cluster(x, keep_in_q) {
      self.needs_an_update = true;
      x.collapsed = true;
      currently_displayed_objects -= self.cluster_sizes[x.cluster_id-1]-1;
      if (!keep_in_q) {
          var idx = open_cluster_queue.indexOf(x.cluster_id);
          if (idx >= 0) {
           open_cluster_queue.splice (idx,1);
          }
      }
      compute_cluster_centroids ([x]);
      return x.children.length;
  }

  function expand_cluster (x, copy_coord) {
      self.needs_an_update = true;
      x.collapsed = false;
      currently_displayed_objects += self.cluster_sizes[x.cluster_id-1]-1;
      open_cluster_queue.push (x.cluster_id);
      if (copy_coord) {
          x.children.forEach (function (n) { n.x = x.x + (Math.random()-0.5)*x.children.length; n.y = x.y + (Math.random()-0.5)*x.children.length; });
      } else {
          x.children.forEach (function (n) { n.x = self.width * 0.25 + (Math.random()-0.5)*x.children.length; n.y = 0.25*self.height + (Math.random()-0.5)*x.children.length; })
      }
  }

  function render_binned_table (id, the_map, matrix) {

    var the_table = d3.select (id);

    the_table.selectAll ("thead").remove();
    the_table.selectAll ("tbody").remove();

	d3.select (id + "_enclosed").style ("display", matrix ? null : "none");

    if (matrix) {

        var fill = self.colorizer['category'];
        lookup =  the_map(null, 'lookup');


        var headers = the_table.append ("thead").append ("tr")
                      .selectAll ("th").data ([""].concat (matrix[0].map (function (d,i) {return lookup [i];})));

        headers.enter().append ("th");
        headers.html (function (d) { return "<span>&nbsp;" + d + "</span>";}).each (
            function (d,i) {
                if (i) {
                    d3.select (this).insert ("i",":first-child")
                        .classed ("fa fa-circle", true)
                        .style ("color", function () {return fill (d);});
                }
            }
        );
        
        if (self.show_percent_in_pairwise_table) {
			var sum = _.map (matrix, function (row) {
				return _.reduce (row, function (p, c) {return p + c;}, 0);
			});
		
			matrix = _.map (matrix, function (row, row_index) {
				return _.map (row, function (c) {return c/sum[row_index];});
       		 });
		}
        
        
        

        var rows = the_table.append ("tbody").selectAll ("tr").data (matrix.map (function (d, i) {return [lookup[i]].concat (d);}));

        rows.enter ().append ("tr");
        rows.selectAll ("td").data (function (d) {return d}).enter().append ("td").html (function (d, i) {
            return i == 0 ? ("<span>&nbsp;" + d + "</span>") : (self.show_percent_in_pairwise_table ? _defaultPercentFormat (d): d);
        }).each (function (d, i) {
                if (i == 0) {
                    d3.select (this).insert ("i",":first-child")
                        .classed ("fa fa-circle", true)
                        .style ("color", function () {return fill (d);});
                }

        });



    } 
  }

  function render_chord_diagram (id, the_map, matrix) {

        d3.select (id).selectAll ("svg").remove();

		d3.select (id + "_enclosed").style ("display", matrix ? null : "none");

        if (matrix) {

            lookup = the_map(null, 'lookup');


            var svg = d3.select (id).append ("svg");


            var chord = d3.layout.chord()
                .padding(.05)
                .sortSubgroups(d3.descending)
                .matrix(matrix);

            var text_offset = 20,
                width  = 450,
                height = 450,
                innerRadius = Math.min(width, height-text_offset) * .41,
                outerRadius = innerRadius * 1.1;

            var fill = self.colorizer['category'],
                font_size = 12;



            var text_label = svg.append ("g")
                                .attr("transform", "translate(" + width / 2 + "," + (height-text_offset)  + ")")
                                .append ("text")
                                .attr ("text-anchor", "middle")
                                .attr ("font-size", font_size)
                                .text ("");

            svg = svg.attr("width", width)
                .attr("height", height-text_offset)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + (height-text_offset) / 2 + ")");


            svg.append("g").selectAll("path")
                .data(chord.groups)
              .enter().append("path")
                .style("fill", function(d)   { return fill(lookup[d.index]); })
                .style("stroke", function(d) { return fill(lookup[d.index]); })
                .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
                .on("mouseover", fade(0.1,true))
                .on("mouseout", fade(1,false));



            svg.append("g")
                .attr("class", "chord")
              .selectAll("path")
                .data(chord.chords)
              .enter().append("path")
                .attr("d", d3.svg.chord().radius(innerRadius))
                .style("fill", function(d) { return fill(d.target.index); })
                .style("opacity", 1);

            // Returns an event handler for fading a given chord group.
            function fade(opacity,t) {
              return function(g, i) {
                text_label.text (t ? lookup[i] : "");
                svg.selectAll(".chord path")
                    .filter(function(d) { return d.source.index != i && d.target.index != i; })
                  .transition()
                    .style("opacity", opacity);
              };
            }
        }
  }

  function attribute_pairwise_distribution (id, dim, the_map, only_expanded) {
        var scan_from = only_expanded ? draw_me.edges : self.edges;
        var the_matrix = [];
        for (i = 0 ; i < dim; i+=1) {
            the_matrix.push([]);
            for (j = 0; j < dim; j += 1){
                the_matrix[i].push (0);
            }
        }


        _.each (scan_from,
            function (edge) {
            	//console.log (attribute_node_value_by_id(self.nodes[edge.source], id), attribute_node_value_by_id(self.nodes[edge.target], id));
                the_matrix[the_map(attribute_node_value_by_id(self.nodes[edge.source], id))][the_map(attribute_node_value_by_id(self.nodes[edge.target], id))] += 1;
            });
        // check if there are null values

        var haz_null = the_matrix.some (function (d, i) { if (i == dim - 1) {return d.some (function (d2) {return d2 > 0;});} return d[dim-1] > 0;});
        if (!haz_null) {
            the_matrix.pop();
            for (i = 0 ; i < dim - 1; i+=1) {
                the_matrix[i].pop();
            }
        }
        
        // symmetrize the matrix
	
		dim = the_matrix.length;

        for (i = 0 ; i < dim; i+=1) {
            for (j = i; j < dim; j += 1){
                the_matrix[i][j] += the_matrix[j][i];
                the_matrix[j][i] = the_matrix[i][j];
            }
        }

        return the_matrix;
  }

  function attribute_cluster_distribution (the_cluster, attribute_id) {
        if (attribute_id && the_cluster) {
            return the_cluster.children.map (function (d) {return attribute_node_value_by_id (d, attribute_id);});
        }
        return null;
  }

  function cluster_info_string (id) {
      var the_cluster = self.clusters[id-1],
          attr_info = the_cluster["binned_attributes"];



      var str;
      
      if (_is_CDC_) {
        str = "<strong>" + self.cluster_sizes[id-1] + "</strong> individuals." +
             "<br>Mean links/individual <em> = " + _defaultFloatFormat(the_cluster.degrees['mean']) + "</em>" +
             "<br>Max links/individual <em> = " + the_cluster.degrees['max'] + "</em>";      
      } else {
        str = "<strong>" + self.cluster_sizes[id-1] + "</strong> nodes." +
             "<br>Mean degree <em>" + _defaultFloatFormat(the_cluster.degrees['mean']) + "</em>" +
             "<br>Max degree <em>" + the_cluster.degrees['max'] + "</em>" +
             "<br>Clustering coefficient <em> " + datamonkey.hivtrace.format_value (the_cluster.cc, _defaultFloatFormat) + "</em>";
	  }
	  
      if (attr_info) {
            attr_info.forEach (function (d) { str += "<br>" + d[0] + " <em>" + d[1] + "</em>"});
      }

      return str;
  }

  function cluster_pop_on (d) {
      toggle_tooltip (this, true, "Cluster " + d.cluster_id, cluster_info_string (d.cluster_id), self.container);
  }

  function cluster_pop_off (d) {
      toggle_tooltip (this, false);
  }

  function expand_cluster_handler (d, do_update, move_out) {
    if (d.collapsed) {
        var new_nodes = self.cluster_sizes[d.cluster_id-1] - 1;

        if (new_nodes > max_points_to_render) {
            warning_string = "This cluster is too large to be displayed";
        }
        else {
            var leftover = new_nodes + currently_displayed_objects - max_points_to_render;
            if (leftover > 0) {
              for (k = 0; k < open_cluster_queue.length && leftover > 0; k++) {
                  var cluster = self.clusters[cluster_mapping[open_cluster_queue[k]]];
                  leftover -= cluster.children.length - 1;
                  collapse_cluster(cluster,true);
              }
              if (k || open_cluster_queue.length) {
                  open_cluster_queue.splice (0, k);
              }
            }

            if (leftover <= 0) {
                expand_cluster (d, !move_out);
            }
        }

        if (do_update) {
            self.update(false, 0.6);
        }
    }
    return "";
  }

  function collapse_cluster_handler (d, do_update) {
    collapse_cluster(self.clusters[cluster_mapping[d.cluster]]);
    if (do_update) {
        self.update(false, 0.4);
    }

  }

  function center_cluster_handler (d) {
    d.x = self.width/2;
    d.y = self.height/2;
    self.update(false, 0.4);
  }

  function cluster_box_size (c) {
      return 8*Math.sqrt (c.children.length);
  }

  self.expand_some_clusters = function(subset)  {
    subset = subset || self.clusters;
    subset.forEach (function (x) { expand_cluster_handler (x, false); });
    self.update ();
  }

  self.select_some_clusters = function (condition) {
    return self.clusters.filter (function (c, i) {
        return _.some(c.children, (function (n) {return condition (n);}));
    });
  }

  self.collapse_some_clusters = function(subset) {
    subset = subset || self.clusters;
    subset.forEach (function (x) { if (!x.collapsed) collapse_cluster (x); });
    self.update();
  }

  self.toggle_hxb2 = function()  {
    self.hide_hxb2 = !self.hide_hxb2;
    self.update();
  }

  $('#reset_layout').click(function(e) {
    default_layout(clusters, nodes);
    self.update ();
    e.preventDefault();// prevent the default anchor functionality
    });

  function stratify (array) {
    if (array) {
        var dict = {},
            stratified = [];

        array.forEach (function (d) { if (d in dict) {dict[d] += 1;} else {dict[d] = 1;}});
        for (var uv in dict) {
            stratified.push ([uv, dict[uv]]);
        }
        return stratified.sort (function (a,b) {
              return a[0] - b[0];
            });
     }
     return array;
   }

  /*------------ Event Functions ---------------*/
  function toggle_tooltip(element, turn_on, title, tag, container) {
    //if (d3.event.defaultPrevented) return;
    
    if (turn_on && !element.tooltip) {

      // check to see if there are any other tooltips shown
     ($("[role='tooltip']")).each (function (d) {
        $(this).remove();
     });

      var this_box = $(element);
      var this_data = d3.select(element).datum();
      element.tooltip = this_box.tooltip({
                 title: title + "<br>" + tag,
                 html: true,
                 container: container ? container : 'body',
               });

      //this_data.fixed = true;

      _.delay (_.bind(element.tooltip.tooltip, element.tooltip), 500, 'show');
    } else {
      if (turn_on == false && element.tooltip) {
        element.tooltip.tooltip('destroy');
        element.tooltip = undefined;
      }
    }
  }
  
  initial_json_load();
  if (options) {
    if (_.isNumber(options ["charge"])) {
        self.charge_correction = options ["charge"];
    }

    if ("colorizer" in options) {
        self.colorizer = options["colorizer"];
    }

    if ("node_shaper" in options) {
        self.node_shaper = options["node_shaper"];
    }

    draw_attribute_labels();
    network_layout.start ();

    if (_.isArray (options ["expand"])) {
        self.expand_some_clusters (_.filter (self.clusters, function (c) {return options["expand"].indexOf (c.cluster_id) >=0;}));
    }
  }
  return self;
}



var hivtrace_cluster_graph_summary = function (graph, tag) {

    var summary_table = d3.select (tag).append ("tbody");

    var table_data = [];

    if (!summary_table.empty()) {
        _.each (graph["Network Summary"], function (value, key) {
        	if (_is_CDC_ && key == "Edges") {
        		key = "Links";
        	}
            table_data.push ([key, value]);
        });
    }

    var degrees = [];
    _.each (graph ["Degrees"]["Distribution"], function (value, index) { for (k = 0; k < value; k++) {degrees.push (index+1);}});
    degrees = datamonkey.helpers.describe_vector (degrees);
    table_data.push (['Links/node', '']);
    table_data.push (['&nbsp;&nbsp;<i>Mean</i>',  _defaultFloatFormat(degrees['mean'])]);
    table_data.push (['&nbsp;&nbsp;<i>Median</i>',  _defaultFloatFormat(degrees['median'])]);
    table_data.push (['&nbsp;&nbsp;<i>Range</i>', degrees['min'] + " - " + degrees['max']]);
    table_data.push (['&nbsp;&nbsp;<i>Interquartile range</i>', degrees['Q1'] + " - " + degrees['Q3']]);

    degrees = datamonkey.helpers.describe_vector (graph ["Cluster sizes"]);
    table_data.push (['Cluster sizes', '']);
    table_data.push (['&nbsp;&nbsp;<i>Mean</i>',  _defaultFloatFormat(degrees['mean'])]);
    table_data.push (['&nbsp;&nbsp;<i>Median</i>',  _defaultFloatFormat(degrees['median'])]);
    table_data.push (['&nbsp;&nbsp;<i>Range</i>', degrees['min'] + " - " + degrees['max']]);
    table_data.push (['&nbsp;&nbsp;<i>Interquartile range</i>', degrees['Q1'] + " - " + degrees['Q3']]);
    
    if (_is_CDC_) {
     degrees = datamonkey.helpers.describe_vector (_.map (graph ["Edges"], function (e) {return e.length;}));
     table_data.push (['Genetic distances (links only)', '']);
     table_data.push (['&nbsp;&nbsp;<i>Mean</i>',  _defaultPercentFormat(degrees['mean'])]);
     table_data.push (['&nbsp;&nbsp;<i>Median</i>',  _defaultPercentFormat(degrees['median'])]);
     table_data.push (['&nbsp;&nbsp;<i>Range</i>', _defaultPercentFormat(degrees['min']) + " - " + _defaultPercentFormat(degrees['max'])]);
     table_data.push (['&nbsp;&nbsp;<i>Interquartile range</i>', _defaultPercentFormat(degrees['Q1']) + " - " + _defaultPercentFormat(degrees['Q3'])]);
  
    }


    summary_table.selectAll ("tr").data (table_data).enter().append ("tr").selectAll ("td").data (function (d) {return d;}).enter().append ("td").html (function (d) {return d});
}

datamonkey.hivtrace.cluster_network_graph = hivtrace_cluster_network_graph;
datamonkey.hivtrace.graph_summary = hivtrace_cluster_graph_summary;
