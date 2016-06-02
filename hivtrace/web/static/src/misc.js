//_ = require('underscore');

function hivtrace_cluster_adjacency_list(obj) {

    var nodes = obj.Nodes,
        edges = obj.Edges;


    var adjacency_list = {};

    edges.forEach(function(e, i) {

        function in_nodes(n, id) {
            return n.id == id;
        }

        var seq_ids = e["sequences"];

        var n1 = nodes.filter(function(n) {
                return in_nodes(n, seq_ids[0])
            })[0],
            n2 = nodes.filter(function(n) {
                return in_nodes(n, seq_ids[1])
            })[0];

        adjacency_list[n1.id] ? adjacency_list[n1.id].push(n2) : adjacency_list[n1.id] = [n2];
        adjacency_list[n2.id] ? adjacency_list[n2.id].push(n1) : adjacency_list[n2.id] = [n1];

    });


    return adjacency_list;

}


function hivtrace_new_cluster_adjacency_list(obj) {

    var nodes = obj.Nodes,
        edges = obj.Edges;


    nodes.forEach (function (n) {
        n.neighbors = d3.set();
    });
    
    edges.forEach (function (e) {
        nodes[e.source].neighbors.add(e.target);
        nodes[e.target].neighbors.add(e.source);
    });

}

// Reconstructs path from floyd-warshall algorithm
function hivtrace_get_path(next, i, j) {

    var all_paths = [];
    var i = parseInt(i);
    var j = parseInt(j);

    for (var c = 0; c < next[i][j].length; c++) {

        var k = next[i][j][c];
        var intermediate = k;

        if (intermediate == null || intermediate == i) {
            return [
                [parseInt(i), parseInt(j)]
            ];
        } else {

            var paths_i_k = hivtrace_get_path(next, i, intermediate);
            var paths_k_j = hivtrace_get_path(next, intermediate, j);

            for (var i_k_index = 0; i_k_index < paths_i_k.length; i_k_index++) {
                var i_k = paths_i_k[i_k_index];
                for (var k_j_index = 0; k_j_index < paths_k_j.length; k_j_index++) {
                    var k_j = paths_k_j[k_j_index];
                    if (i_k.length) {
                        if ((i_k[0] == i) && (i_k[i_k.length - 1] == k) && (k_j[0] == k) && (k_j[k_j.length - 1] == j)) {
                            i_k.pop()
                            all_paths.push(i_k.concat(k_j));
                        }
                    }
                }
            }
        }
    }

    return all_paths;

}

function hivtrace_paths_with_node(node, next, i, j) {

    var paths = hivtrace_get_path(next, i, j);

    // Retrieve intermediary paths
    paths = paths.map(function(sublist) {
        return sublist.slice(1, -1)
    });

    if (!paths) {
        return 0;
    }

    var num_nodes = [];

    for (var i = 0; i < paths.length; i++) {
        sublist = paths[i];
        num_nodes.push(d3.sum(sublist.map(function(n) {
            return n == node;
        })));
    }

    var mean = d3.mean(num_nodes);

    if (mean == undefined) {
        mean = 0;
    }

    return mean;

}


// Same as compute shortest paths, but with an additional next parameter for reconstruction
function hivtrace_compute_shortest_paths_with_reconstruction(obj, subset, use_actual_distances) {

    // Floyd-Warshall implementation
    var distances = [];
    var next = [];
    var nodes = obj.Nodes;
    var edges = obj.Edges;
    var node_ids = [];

    var adjacency_list = datamonkey.hivtrace.cluster_adjacency_list(obj);

    if (!subset) {
        subset = Object.keys(adjacency_list);
    }

    var node_count = subset.length;

    for (var i = 0; i < subset.length; i++) {
        var a_node = subset[i];
        var empty_arr = _.range(node_count).map(function(d) {
            return null
        });
        var zeroes = _.range(node_count).map(function(d) {
            return null
        });
        distances.push(zeroes);
        next.push(empty_arr);
    };

    for (var index = 0; index < subset.length; index++) {
        var a_node = subset[index];
        for (var index2 = 0; index2 < subset.length; index2++) {
            var second_node = subset[index2];
            if (second_node != a_node) {
                if (adjacency_list[a_node].map(function(n) {
                        return n.id
                    }).indexOf(second_node) != -1) {
                    distances[index][index2] = 1;
                    distances[index2][index] = 1;
                }
            }
        }
    }

    for (var index_i = 0; index_i < subset.length; index_i++) {
        var n_i = subset[index_i];
        for (var index_j = 0; index_j < subset.length; index_j++) {
            var n_j = subset[index_j];
            if (index_i == index_j) {
                next[index_i][index_j] = [];
            } else {
                next[index_i][index_j] = [index_i];
            }
        }
    }

    // clone distances
    var distances2 = _.map(distances, _.clone);
    var c = 0;

    for (var index_k = 0; index_k < subset.length; index_k++) {
        var n_k = subset[index_k];
        for (var index_i = 0; index_i < subset.length; index_i++) {
            var n_i = subset[index_i];
            for (var index_j = 0; index_j < subset.length; index_j++) {
                var n_j = subset[index_j];

                if (n_i != n_j) {

                    d_ik = distances[index_k][index_i];
                    d_jk = distances[index_k][index_j];
                    d_ij = distances[index_i][index_j];

                    if (d_ik != null && d_jk != null) {
                        d_ik += d_jk;
                        if (d_ij == null || (d_ij > d_ik)) {
                            distances2[index_i][index_j] = d_ik;
                            distances2[index_j][index_i] = d_ik;
                            next[index_i][index_j] = [];
                            next[index_i][index_j] = next[index_i][index_j].concat(next[index_k][index_j]);
                            continue;
                        } else if (d_ij == d_ik) {
                            next[index_i][index_j] = next[index_i][index_j].concat(next[index_k][index_j]);
                        }
                    }
                    c++;
                    distances2[index_j][index_i] = distances[index_j][index_i];
                    distances2[index_i][index_j] = distances[index_i][index_j];
                }
            }
        }

        var t = distances2;
        distances2 = distances;
        distances = t;

    }

    return {
        'ordering': subset,
        'distances': distances,
        'next': next
    };

}

function hivtrace_filter_to_node_in_cluster(node, obj) {

    var nodes = obj.Nodes,
        edges = obj.Edges,
        cluster_id = null;

    // Retrieve nodes that are part of the cluster
    var node_obj = nodes.filter(function(n) {
        return node == n.id;
    });

    if (node_obj) {
        cluster_id = node_obj[0].cluster;
    } else {
        console.log('could not find node');
        return null;
    }

    // Filter out all edges and nodes that belong to the cluster
    var nodes_in_cluster = nodes.filter(function(n) {
        return cluster_id == n.cluster;
    });
    var node_ids = nodes_in_cluster.map(function(n) {
        return n.id
    });
    var edges_in_cluster = edges.filter(function(e) {
        return node_ids.indexOf(e.sequences[0]) != -1
    });

    var filtered_obj = {};
    filtered_obj["Nodes"] = nodes_in_cluster;
    filtered_obj["Edges"] = edges_in_cluster;
    return filtered_obj;

}

function hivtrace_compute_betweenness_centrality_all_nodes_in_cluster(cluster, obj, cb) {

    var nodes = obj.Nodes,
        edges = obj.Edges;


    var nodes_in_cluster = nodes.filter(function(n) {
        return cluster == n.cluster;
    });
    var node_ids = nodes_in_cluster.map(function(n) {
        return n.id
    });
    var edges_in_cluster = edges.filter(function(e) {
        return node_ids.indexOf(e.sequences[0]) != -1
    });

    var filtered_obj = {};
    filtered_obj["Nodes"] = nodes_in_cluster;
    filtered_obj["Edges"] = edges_in_cluster;

    // get length of cluster
    if (nodes_in_cluster.length > 70) {
        cb('cluster too large', null);
        return;
    }

    // get paths
    var paths = hivtrace_compute_shortest_paths_with_reconstruction(filtered_obj);
    var node_ids = nodes_in_cluster.map(function(n) {
        return n.id
    });

    var betweenness = {}
    nodes_in_cluster.forEach(function(n) {
        betweenness[n.id] = hivtrace_compute_betweenness_centrality(n.id, filtered_obj, paths);
    });

    cb(null, betweenness);
    return;

}

// Returns dictionary of nodes' betweenness centrality
// Utilizes the Floyd-Warshall Algorithm with reconstruction
function hivtrace_compute_betweenness_centrality(node, obj, paths) {

    if (!paths) {
        var filtered_obj = hivtrace_filter_to_node_in_cluster(node, obj)
        paths = hivtrace_compute_shortest_paths_with_reconstruction(filtered_obj);
    }

    // find index of id
    var index = paths['ordering'].indexOf(node);

    if (index == -1) {
        return null;
    }

    var length = paths['distances'].length;

    if (length != 2) {
        scale = 1 / ((length - 1) * (length - 2));
    } else {
        scale = 1;
    }


    // If s->t goes through 1, add to sum
    // Reconstruct each shortest path and check if node is in it
    var paths_with_node = [];
    for (i in _.range(length)) {
        for (j in _.range(length)) {
            paths_with_node.push(hivtrace_paths_with_node(index, paths['next'], i, j));
        }
    }

    return d3.sum(paths_with_node) * scale;

}


function hivtrace_compute_node_degrees(obj) {

    var nodes = obj.Nodes,
        edges = obj.Edges;

    for (var n in nodes) {
        nodes[n].degree = 0;
    }

    for (var e in edges) {
        nodes[edges[e].source].degree++;
        nodes[edges[e].target].degree++;
    }

}

function hivtrace_get_node_by_id(id, obj) {
    return obj.Nodes.filter(function(n) {
        return id == n.id
    })[0] || undefined;
}

function hivtrace_compute_cluster_betweenness(obj, callback) {

    var nodes = obj.Nodes;

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    // Get all unique clusters
    var clusters = nodes.map(function(n) {
        return n.cluster
    });
    var unique_clusters = clusters.filter(onlyUnique);

    var cb_count = 0;

    function cb(err, results) {

        cb_count++;

        for (node in results) {
            hivtrace_get_node_by_id(node, obj)['betweenness'] = results[node];
        }

        if (cb_count >= unique_clusters.length) {
            callback('done');
        }

    }

    // Compute betweenness in parallel
    unique_clusters.forEach(function(cluster_id) {
        datamonkey.hivtrace.betweenness_centrality_all_nodes_in_cluster(cluster_id, obj, cb);
    });

    // once all settled callback

}


function hivtrace_is_contaminant(node) {
    return node.attributes.indexOf('problematic') != -1;
}

function hivtrace_convert_to_csv(obj, callback) {
    //Translate nodes to rows, and then use d3.format
    hivtrace_compute_node_degrees(obj);

    hivtrace_compute_cluster_betweenness(obj, function(err) {
        var node_array = obj.Nodes.map(function(d) {
            return [d.id, d.cluster, d.degree, d.betweenness, hivtrace_is_contaminant(d), d.attributes.join(';')]
        });
        node_array.unshift(['seqid', 'cluster', 'degree', 'betweenness', 'is_contaminant', 'attributes'])
        node_csv = d3.csv.format(node_array);
        callback(null, node_csv);
    });
}

function hivtrace_export_csv_button(graph, tag) {

    var data = hivtrace_convert_to_csv(graph, function(err, data) {
        if (data != null) {
            var pom = document.createElement('a');
            pom.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data));
            pom.setAttribute('download', 'export.csv');
            pom.className = 'btn btn-default btn-sm';
            pom.innerHTML = '<span class="glyphicon glyphicon-floppy-save"></span> Export Results';
            $(tag).append(pom);
        }
    });

}

function hiv_trace_export_table_to_text(parent_id, table_id, sep) {

    var the_button = d3.select(parent_id).append("a")
        .attr("target", "_blank")
        .on("click", function(data, element) {
            var table_tag = d3.select(this).attr("data-table");
            var table_text = datamonkey.helpers.table_to_text(table_tag);
            datamonkey.helpers.export_handler(table_text, table_tag.substring(1) + ".tsv", "text/tab-separated-values");
        })
        .attr("data-table", table_id);

    the_button.append("i").classed("fa fa-download fa-2x", true);
    return the_button;

}

hivtrace_compute_local_clustering_coefficients = _.once (function (obj) {

  datamonkey.hivtrace.new_cluster_adjacency_list(obj);

  var nodes = obj.Nodes;

  nodes.forEach (function (n) {
  
    var a_node = n;
    var neighborhood_size = a_node.neighbors.size();

    if (neighborhood_size < 2) {
        a_node.lcc = undefined;
    } else {

        if (neighborhood_size > 500) {
            a_node.lcc = datamonkey.hivtrace.too_large;     
        } else {
            // count triangles
            neighborhood = a_node.neighbors.values();
            counter = 0;
            for (n1 = 0; n1 < neighborhood_size; n1 += 1) {
                for (n2 = n1 + 1; n2 < neighborhood_size; n2 += 1) {
                    if (nodes [neighborhood[n1]].neighbors.has (neighborhood[n2])) {
                        counter ++;
                    }
                }
            }
            a_node.lcc = 2 * counter / neighborhood_size / (neighborhood_size - 1);
        }
    }

  });

});

function hivtrace_render_settings(settings, explanations) {
    // TODO:
    //d3.json (explanations, function (error, expl) {
    //    //console.log (settings);
    //});
}

function hivtrace_format_value(value, formatter) {

    if (typeof value === 'undefined') {
        return "Not computed";
    }
    if (value === datamonkey.hivtrace.undefined) {
        return "Undefined";
    }
    if (value === datamonkey.hivtrace.too_large) {
        return "Size limit";
    }

    if (value === datamonkey.hivtrace.processing) {
        return '<span class="fa fa-spin fa-spinner"></span>';
    }

    return formatter ? formatter(value) : value;

}


if (typeof datamonkey == 'undefined') {
    datamonkey = function() {};
}

if (typeof datamonkey.hivtrace == 'undefined') {
    datamonkey.hivtrace = function() {};
}

datamonkey.hivtrace.compute_node_degrees = hivtrace_compute_node_degrees;
datamonkey.hivtrace.export_csv_button = hivtrace_export_csv_button;
datamonkey.hivtrace.convert_to_csv = hivtrace_convert_to_csv;
datamonkey.hivtrace.betweenness_centrality = hivtrace_compute_betweenness_centrality;
datamonkey.hivtrace.betweenness_centrality_all_nodes_in_cluster = hivtrace_compute_betweenness_centrality_all_nodes_in_cluster;
datamonkey.hivtrace.cluster_adjacency_list = hivtrace_cluster_adjacency_list;
datamonkey.hivtrace.new_cluster_adjacency_list = hivtrace_new_cluster_adjacency_list;
datamonkey.hivtrace.analysis_settings = hivtrace_render_settings;
datamonkey.hivtrace.export_table_to_text = hiv_trace_export_table_to_text;
datamonkey.hivtrace.compute_local_clustering = hivtrace_compute_local_clustering_coefficients;
datamonkey.hivtrace.undefined = new Object();
datamonkey.hivtrace.too_large = new Object();
datamonkey.hivtrace.processing = new Object();
datamonkey.hivtrace.format_value = hivtrace_format_value;
