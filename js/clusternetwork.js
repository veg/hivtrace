var _networkGraphAttrbuteID = "user attributes";
var _defaultFloatFormat = d3.format(",.2r");



var hivtrace_cluster_network_graph = function (json, network_container, network_status_string, network_warning_tag, button_bar_ui, attributes, filter_edges_toggle, clusters_table, nodes_table, parent_container) {

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

    self.ww = d3.select(parent_container).property("clientWidth");
    self.nodes = [];
    self.edges = [];
    self.clusters = [];         
    self.cluster_sizes = [];
    self.colorizer = {'selected': function (d) {return d == 'selected' ? d3.rgb(51, 122, 183) : '#FFF';}}
    self.filter_edges = true,
    self.hide_hxb2 = false,
    self.charge_correction = 1,
    self.margin = {top: 20, right: 10, bottom: 30, left: 10},
    self.width  = self.ww - self.margin.left - self.margin.right,
    self.height = 500 - self.margin.top - self.margin.bottom,
    self.cluster_table = d3.select (clusters_table),
    self.node_table = d3.select (nodes_table),
    self.needs_an_update = false,
    self.json = json;

  var cluster_mapping = {},
      l_scale = 5000,   // link scale
      graph_data = self.json,     // the raw JSON network object
      max_points_to_render = 500,
      warning_string     = "",
      singletons         = 0,
      open_cluster_queue = [],
      currently_displayed_objects;

  /*------------ D3 globals and SVG elements ---------------*/

  var network_layout = d3.layout.force()
    .on("tick", tick)
    .charge(function(d) { if (d.cluster_id) return self.charge_correction*(-50-20*Math.pow(d.children.length,0.7)); return self.charge_correction*(-20*Math.sqrt(d.degree)); })
    .linkDistance(function(d) { return Math.max(d.length*l_scale,1); })
    .linkStrength (function (d) { if (d.support != undefined) { return 2*(0.5-d.support);} return 1;})
    .chargeDistance (500)
    .friction (0.25);
        
  d3.select(network_container).selectAll (".my_progress").remove();

  var network_svg = d3.select(network_container).append("svg:svg")
      .style ("border", "solid black 1px")
      .attr("id", "network-svg")
      .attr("width", self.width + self.margin.left + self.margin.right)
      .attr("height", self.height + self.margin.top + self.margin.bottom);

      //.append("g")
      // .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

  network_svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("refX", 9) /*must be smarter way to calculate shift*/
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
               .text (function (d) {if (cluster.fixed) return "Release fix"; return "Fix in place";})
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
      
      var treemap = d3.layout.treemap()
      .size([self.width, self.height])
      .sticky(true)
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
        nodes = nodes.map (function (v) {v.x += v.dx/2; v.y += v.dy/2; return v;});
        clusters.forEach (collapse_cluster); 
        return [clusters, nodes];
    }
    
 function change_spacing (delta) {
    self.charge_correction = self.charge_correction * delta;
    network_layout.start ();
 }

 function change_window_size (delta, trigger) {
 
    if (delta) {
        self.width  += delta;
        self.height += delta;
    
        self.width  = Math.min (Math.max (self.width, 200), 4000); 
        self.height = Math.min (Math.max (self.height, 200), 4000);
    } 
    
    network_layout.size ([self.width, self.height - 160]);
    network_svg.attr ("width", self.width).attr ("height", self.height);
    
    if (trigger) {
        network_layout.start ();       
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
     
         var cluster_ui_container = d3.select ("#" + button_bar_ui + "_cluster_operations_container");
         
         [
            ["Expand All",          function () {return self.expand_some_clusters()},   true],
            ["Collapse All",        function () {return self.collapse_some_clusters()}, true],
            ["Expand Filtered",     function () {return self.expand_some_clusters(self.select_some_clusters (function (n) {return n.match_filter;}))},   true],
            ["Collapse Filtered",   function () {return self.collapse_some_clusters(self.select_some_clusters (function (n) {return n.match_filter;}))}, true],
            ["Hide problematic clusters", function (item) {
                                            d3.select (item).text (self.hide_hxb2 ? "Hide problematic clusters" :  "Show problematic clusters");
                                            self.toggle_hxb2 ();
                                          }, self.has_hxb2_links],
                                          
            ["Show removed edges",   function (item) {
                                        self.filter_edges = !self.filter_edges; 
                                        d3.select (item).text (self.filter_edges ? "Show removed edges" :  "Hide removed edges");
                                        self.update (false); 
                                     }
                                    , function () {return _.some (self.edges, function (d) {return d.removed;});}]
            
         ].forEach (function (item,index) {
            var handler_callback = item[1];
            if (item[2]) {
                this.append ("li").append ("a")
                                  .text (item[0])
                                  .attr ("href", "#")
                                  .on ("click", function(e) {
                                    handler_callback(this);
                                    d3.event.preventDefault();
                                  });
            }
         },cluster_ui_container);
         
         
         var button_group  = d3.select ("#" + button_bar_ui + "_button_group");
         
         if (! button_group.empty()) {
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Expand spacing").on ("click", function (d) {change_spacing (5/4);}).append ("i").classed ("fa fa-arrows", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Compress spacing").on ("click", function (d) {change_spacing (4/5);}).append ("i").classed ("fa fa-arrows-alt", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Enlarge window").on ("click", function (d) {change_window_size (20, true);}).append ("i").classed ("fa fa-expand", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Shrink window").on ("click", function (d) {change_window_size (-20, true);}).append ("i").classed ("fa fa-compress", true);
            button_group.append ("button").classed ("btn btn-default btn-sm", true).attr ("title", "Compute graph statistics").on ("click", function (d) {_.bind(self.compute_graph_stats,this)();}).append ("i").classed ("fa fa-calculator", true);
            button_group.append ("button")
              .classed("btn btn-default btn-sm", true)
              .attr("title", "Save Image")
              .attr("id", "hivtrace-export-image")
              .on("click", function(d) { datamonkey.save_image("png", "#network-svg");})
              .append ("i").classed ("fa fa-image", true);
         }
         
         $("#" + button_bar_ui + "_filter").on ("input propertychange", _.throttle (function (e) {  
               var filter_value = $(this).val();
               self.filter (filter_value.split (" ").filter (function (d) {return d.length > 0;}).map (function (d) { return new RegExp (d,"i")}));
            }, 250));
        
    }
          
     
     
    
     if (attributes && "hivtrace" in attributes) {
        attributes = attributes["hivtrace"];
     }
     
     if (attributes && "attribute_map" in attributes) {
         /*  
            map attributes into nodes and into the graph object itself using 
            _networkGraphAttrbuteID as the key  
         */
     
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
            
            
            // populate the UI elements
            if (button_bar_ui) {
                var valid_cats = graph_data [_networkGraphAttrbuteID].filter (function (d) { return d['type'] == 'category'; });
                //valid_cats.splice (0,0, {'label' : 'None', 'index' : -1});
                               
                [d3.select ("#" + button_bar_ui + "_attributes"),d3.select ("#" + button_bar_ui + "_attributes_cat")].forEach (function (m) {
                
                    m.selectAll ("li").remove();
                
                    var cat_menu = m.selectAll ("li")
                                    .data([[['None',-1]],[['Categorical', -2]]].concat(valid_cats.map (function (d) {return [[d['label'],d['index']]];})));        
                                                                     
                    cat_menu.enter ().append ("li").classed ("disabled", function (d) {return d[0][1] < -1;});
                    cat_menu.selectAll ("a").data (function (d) {return d;})
                                            .enter ()
                                            .append ("a")
                                            .text (function (d,i,j) {return d[0];})
                                            .attr ("style", function (d,i,j) {if (d[1] < -1) return 'font-style: italic'; if (j == 0) { return ' font-weight: bold;'}; return null; })
                                            .attr ('href', '#')
                                            .on ("click", function (d) { handle_attribute_categorical (d[1]); });
                });
            }
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
      warning_string = "Excluded " + (sorted_array.length - max_points_to_render) + " clusters (maximum size " +  sorted_array[k-1][0] + " nodes) because only " + max_points_to_render + " points can be shown at once.";
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
            });
     
     
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
  
  
  function _cluster_table_draw_buttons (element, payload) {
    var this_cell = d3.select (element);
    var labels = [[payload[0] ? "collapsed" : "expanded",0]];
    if (payload[1]) {
        labels.push (["problematic",1]);
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
    var labels = [[payload[0] ? "shown" : "hidden",0]];

    var buttons = this_cell.selectAll ("button").data (labels);
    buttons.enter().append ("button");
    buttons.exit().remove();
    buttons.classed ("btn btn-primary btn-xs", true).text (function (d) {return d[0];})
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
                                 {value: "Properties", sort: "value"}, 
                                 {value: "Degree", sort: "value", help: "Node degree"}, 
                                 {value: "Cluster", sort: "value", help: "Which cluster does the node belong to"}, 
                                 {value: "LCC", sort: "value", help: "Local clustering coefficient"}
                               ]], 
                                 // rows 
                               self.nodes.map (function (n, i) {
                                console.log(datamonkey.hivtrace.format_value(n.lcc,_defaultFloatFormat));
                                return [{"value": n.id, help: "Node ID"}, 
                                        {       "value": function () {return [!self.clusters [n.cluster-1].collapsed, n.cluster]}, 
                                                "callback": _node_table_draw_buttons,
                                                "volatile" : true
                                        }, 
                                        {"value" : n.degree, help: "Node degree"},
                                        {"value" : n.cluster, help: "Which cluster does the node belong to"}, 
                                        {"value": function () {return datamonkey.hivtrace.format_value(n.lcc,_defaultFloatFormat);},
                                         "volatile" : true, "html": true, help: "Local clustering coefficient"}];
        
                                }));
    }
  }
  
  function draw_cluster_table () {
    if (self.cluster_table) {
        add_a_sortable_table (self.cluster_table,
                                // headers
                              [[{value:"ID", sort : "value", help: "Unique cluster ID"}, 
                                 {value: "Properties", sort: "value"}, 
                                 {value: "Size", sort: "value", help: "Number of nodes in the cluster"}, 
                                 {value: "Degrees<br>Mean [Median, IQR]", html : true}, 
                                 {value: "CC", sort: "value", help: "Global clustering coefficient"},
                                 {value: "MPL", sort: "value", help: "Mean Path Length"}
                               ]],
                                self.clusters.map (function (d, i) {
                                 // rows 
                                return [{value: d.cluster_id}, 
                                        {       value: function () {return [d.collapsed, d.hxb2_linked, d.cluster_id]}, 
                                                callback: _cluster_table_draw_buttons,
                                                volatile : true
                                        }, 
                                        {value :d.children.length},
                                        {value : d.degrees, format: function (d) {return _defaultFloatFormat(d['mean']) + " [" + _defaultFloatFormat(d['median']) + ", " + _defaultFloatFormat(d['Q1']) + " - " + _defaultFloatFormat(d['Q3']) +"]"}}, 
                                        {
                                            value: function () {return hivtrace_format_value(d.cc,_defaultFloatFormat);},
                                            volatile : true, 
                                            help: "Global clustering coefficient"
                                        },
                                        {
                                            value: function () {return hivtrace_format_value(d.mpl,_defaultFloatFormat);},
                                            volatile : true, 
                                            help: "Mean path length"
                                        }
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
          
          var s = "Displaying a network on <strong>" + self.nodes.length + "</strong> nodes, <strong>" + self.clusters.length + "</strong> clusters"
                  + (clusters_removed > 0 ? " (an additional " + clusters_removed + " clusters and " + nodes_removed + " nodes have been removed due to network size constraints)" : "") + ". <strong>" 
                  + clusters_shown +"</strong> clusters are expanded. Of <strong>" + self.edges.length + "</strong> edges, <strong>" + draw_me.edges.length + "</strong>, and of  <strong>" + self.nodes.length  + " </strong> nodes,  <strong>" + draw_me.nodes.length + " </strong> are displayed. ";
          if (singletons > 0) {
              s += "<strong>" +singletons + "</strong> singleton nodes are not shown. ";
          }
          d3.select (network_status_string).html(s);
    }
  }

  
  function draw_a_node (container, node) {
    container = d3.select(container);
    container.attr("d", d3.svg.symbol().size( node_size )
        .type( function(d) { return (d.hxb2_linked && !d.is_lanl) ? "cross" : (d.is_lanl ? "triangle-down" : "circle") }))
        .attr('class', 'node')
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; })
        .style('fill', function(d) { return node_color(d); })
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
          .style ("fill", function (d,i) {return d.rim ? self.colorizer ['selected'] (d.name) : cluster_color (the_cluster, d.name);})
          ;
    
     
     
  }
  
  function handle_attribute_categorical (cat_id) {
  
    var set_attr = "None";

    ["#" + button_bar_ui + "_attributes","#" + button_bar_ui + "_attributes_cat"].forEach (function (m) {
        d3.select (m).selectAll ("li")
                                                       .selectAll ("a")
                                                       .attr ("style", function (d,i) {if (d[1] == cat_id) { set_attr = d[0]; return ' font-weight: bold;'}; return null; });
      
        d3.select (m + "_label").html (set_attr + ' <span class="caret"></span>');
    });
                                                   


     self.clusters.forEach (function (the_cluster) {the_cluster['binned_attributes'] = stratify(attribute_cluster_distribution (the_cluster, cat_id));});
    
     if (cat_id >= 0) {
        self.colorizer['category']    = graph_data [_networkGraphAttrbuteID][cat_id]['range'] <= 10 ? d3.scale.category10() : d3.scale.category20c();
        self.colorizer['category_id'] = cat_id;  
        self.colorizer['category_map'] = graph_data [_networkGraphAttrbuteID][cat_id]['values'];
        self.colorizer['category_map'][null] =  graph_data [_networkGraphAttrbuteID][cat_id]['range'];
        self.colorizer['category_pairwise'] = attribute_pairwise_distribution(cat_id, graph_data [_networkGraphAttrbuteID][cat_id]['range'] + 1, self.colorizer['category_map']);
        render_chord_diagram ("#" + button_bar_ui + "_aux_svg_holder", self.colorizer['category_map'], self.colorizer['category_pairwise']);
        render_binned_table  ("#" + button_bar_ui + "_attribute_table", self.colorizer['category_map'], self.colorizer['category_pairwise']);
    } else {
        self.colorizer['category']          = null;
        self.colorizer['category_id']       = null;
        self.colorizer['category_pairwise'] = null;
        self.colorizer['category_map']      = null;
        render_chord_diagram ("#" + button_bar_ui + "_aux_svg_holder", null, null);
        render_binned_table  ("#" + button_bar_ui + "_attribite_table", null, null);
    }
    
    console.log (self.colorizer, graph_data [_networkGraphAttrbuteID]);

    self.update(true);
    d3.event.preventDefault();
  }
  
  self.filter = function (expressions, skip_update) {
  
    var anything_changed = false;
    
    self.clusters.forEach (function (c) {
        c.match_filter = 0;
    });
    
    self.nodes.forEach (function (n) {
        var did_match = _.some(expressions, function (regexp) {    
            return regexp.test (n.id)  ;
        });
        
        if (did_match != n.match_filter) {
            n.match_filter = did_match;
            anything_changed = true;
        }
        
        if (n.match_filter) {
            n.parent.match_filter += 1;
        }
    });
    
    
    if (anything_changed && !skip_update) {
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
        
        var link_enter = link.enter().append("line")
            .classed ("link", true)
            .classed ("removed", function (d) {return d.removed;})
            .classed ("unsupported", function (d) { return "support" in d && d["support"] > 0.05;})
            .on ("mouseover", edge_pop_on)
            .on ("mouseout", edge_pop_off)
            .filter (function (d) {return d.directed;})
            .attr("marker-end", "url(#arrowhead)");

        link.exit().remove();


    
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
        
        draw_cluster_table ();
        draw_node_table ();
    
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
    
     
    if (!soft) {
        currently_displayed_objects = rendered_clusters[0].length + rendered_nodes[0].length;

        network_layout.on("tick", function() {
        
          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

          rendered_nodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; });
          rendered_clusters.attr("transform", function(d) { return "translate(" + d.x + "," + d.y+ ")"; });
        });    
    }
  }

  function tick() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
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
     if (_networkGraphAttrbuteID in d ) {
        if (id) {
            return d[_networkGraphAttrbuteID][id];
        }
     }
     return null;
  }
  
  function  attribute_name_by_id (id) {
    if (typeof id == "number") {
        return graph_data [_networkGraphAttrbuteID][id]['label'];
    }
    return null;
  }
  
  function node_size (d) {
    var r = 3+Math.sqrt(d.degree); return (d.match_filter ? 10 : 4)*r*r; 
  }

  function node_color(d) {
    
    if (d.match_filter) {
        return "white";
    }
  
    var color = attribute_node_value_by_id (d, self.colorizer['category_id']);
    if (color) {
        return self.colorizer['category'](color);
    }
    return d.hxb2_linked ? "black" : (d.is_lanl ? "red" : "#7fc97f");
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
      var str = "Degree <em>" + n.degree + "</em>"+
             "<br>Clustering coefficient <em> " + datamonkey.hivtrace.format_value (n.lcc, _defaultFloatFormat) + "</em>";
                 
      var attribute = attribute_node_value_by_id (n, self.colorizer['category_id']);
      if (attribute) {
         str += "<br>"  + attribute_name_by_id (self.colorizer['category_id']) + " <em>" + attribute + "</em>"
      }
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
      toggle_tooltip (this, true, "Node " + d.id, node_info_string (d));
  }

  function node_pop_off (d) {
      toggle_tooltip (this, false);
  }

  function edge_pop_on (e) {
      toggle_tooltip (this, true, e.source.id + " - " + e.target.id, edge_info_string (e));
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
    
    if (matrix) {
        
        var fill = self.colorizer['category'];
        lookup = _.invert (the_map);
        
        
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

        var rows = the_table.append ("tbody").selectAll ("tr").data (matrix.map (function (d, i) {return [lookup[i]].concat (d);}));
        rows.enter ().append ("tr");
        rows.selectAll ("td").data (function (d) {return d}).enter().append ("td").html (function (d, i) {
            return i == 0 ? ("<span>&nbsp;" + d + "</span>") : d;
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
        if (matrix) {
        
            lookup = _.invert (the_map);
            
  
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
        scan_from.forEach (function (edge) { the_matrix[the_map[attribute_node_value_by_id(self.nodes[edge.source], id)]][the_map[attribute_node_value_by_id(self.nodes[edge.target], id)]] += 1;});
        // check if there are null values
        
        var haz_null = the_matrix.some (function (d, i) { if (i == dim - 1) {return d.some (function (d2) {return d2 > 0;});} return d[dim-1] > 0;});
        if (!haz_null) {
            the_matrix.pop();
            for (i = 0 ; i < dim - 1; i+=1) {
                the_matrix[i].pop();
            }
        }
        
        return the_matrix;
  }
    
  function attribute_cluster_distribution (the_cluster, attribute_id) {
        if (attribute_id >= 0 && the_cluster) {
            return the_cluster.children.map (function (d) {return (_networkGraphAttrbuteID in d) ? d[_networkGraphAttrbuteID][attribute_id] : null;});
        }
        return null;
  }

  function cluster_info_string (id) {
      var the_cluster = self.clusters[id-1],
          attr_info = the_cluster["binned_attributes"];
          
          

      var str = "<strong>" + self.cluster_sizes[id-1] + "</strong> nodes." + 
             "<br>Mean degree <em>" + _defaultFloatFormat(the_cluster.degrees['mean']) + "</em>" +
             "<br>Max degree <em>" + the_cluster.degrees['max'] + "</em>" +
             "<br>Clustering coefficient <em> " + datamonkey.hivtrace.format_value (the_cluster.cc, _defaultFloatFormat) + "</em>";
      
      if (attr_info) {
            attr_info.forEach (function (d) { str += "<br>" + d[0] + " <em>" + d[1] + "</em>"});
      }
             
      return str;
  }

  function cluster_pop_on (d) {
      toggle_tooltip (this, true, "Cluster " + d.cluster_id, cluster_info_string (d.cluster_id));
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
      return 5*Math.sqrt (c.children.length);
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
  function toggle_tooltip(element, turn_on, title, tag) {
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
                 container: 'body',
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
  return self;
}



var hivtrace_cluster_graph_summary = function (graph, tag) {
 
    var summary_table = d3.select (tag).append ("tbody");
    
    var table_data = [];
    
    if (!summary_table.empty()) {
        _.each (graph["Network Summary"], function (value, key) {
            table_data.push ([key, value]);
        });
    }
    
    var degrees = [];
    _.each (graph ["Degrees"]["Distribution"], function (value, index) { for (k = 0; k < value; k++) {degrees.push (index+1);}});    
    degrees = datamonkey.helpers.describe_vector (degrees);
    table_data.push (['Degrees', '']);
    table_data.push (['&nbsp;&nbsp;<i>Mean</i>',  _defaultFloatFormat(degrees['mean'])]);
    table_data.push (['&nbsp;&nbsp;<i>Median</i>',  _defaultFloatFormat(degrees['median'])]);
    table_data.push (['&nbsp;&nbsp;<i>Range</i>', degrees['min'] + " - " + degrees['max']]);
    table_data.push (['&nbsp;&nbsp;<i>IQR</i>', degrees['Q1'] + " - " + degrees['Q3']]);

    degrees = datamonkey.helpers.describe_vector (graph ["Cluster sizes"]);
    table_data.push (['Cluster sizes', '']);
    table_data.push (['&nbsp;&nbsp;<i>Mean</i>',  _defaultFloatFormat(degrees['mean'])]);
    table_data.push (['&nbsp;&nbsp;<i>Median</i>',  _defaultFloatFormat(degrees['median'])]);
    table_data.push (['&nbsp;&nbsp;<i>Range</i>', degrees['min'] + " - " + degrees['max']]);
    table_data.push (['&nbsp;&nbsp;<i>IQR</i>', degrees['Q1'] + " - " + degrees['Q3']]);
    
    
    summary_table.selectAll ("tr").data (table_data).enter().append ("tr").selectAll ("td").data (function (d) {return d;}).enter().append ("td").html (function (d) {return d});
}

datamonkey.hivtrace.cluster_network_graph = hivtrace_cluster_network_graph;
datamonkey.hivtrace.graph_summary = hivtrace_cluster_graph_summary;
