if (!datamonkey) {
    var datamonkey = new Object;
}

datamonkey.absrel = function() {

    var width = 800, //$(container_id).width(),
        height = 600, //$(container_id).height()
        color_scheme = d3.scale.category10(),
        branch_omegas = {},
        branch_p_values = {},
        alpha_level = 0.05,
        omega_format = d3.format(".3r"),
        prop_format = d3.format(".2p"),
        fit_format = d3.format(".2f"),
        branch_table_format = d3.format(".4f"),
        render_color_bar = true,
        which_model = "Full model",
        color_legend_id = 'color_legend',
        self = this,
        container_id = 'tree_container';


    self.tree = d3.layout.phylotree("body")
        .size([height, width])
        .separation(function(a, b) {
            return 0;
        });

    self.analysis_data = null;

    self.svg = d3.select("#" + container_id).append("svg").attr("width", width)
        .attr("height", height);

    var scaling_exponent = 0.33;

    var omega_color = d3.scale.pow().exponent(scaling_exponent)
        .domain([0, 0.25, 1, 5, 10])
        .range(["#5e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"])
        .clamp(true);


    // *** PHYLOTREE HANDLERS ***

    set_tree_handlers(self.tree);


    $("#datamonkey-absrel-color-or-grey").on("click", function(e) {
        if ($(self).data('color-mode') == 'gray') {
            $(self).data('color-mode', 'color');
            omega_color.range(["#5e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"]);
        } else {
            $(self).data('color-mode', 'gray');
            omega_color.range(["#EEE", "#BBB", "#999", "#333", "#000"]);
        }
        branch_omegas = render_bs_rel_tree(self.analysis_data, which_model)[1];
        self.tree.update();
        render_color_scheme(color_legend_id);
    });

    $("#datamonkey-absrel-show-color-bar").on("click", function(e) {
        render_color_bar = !render_color_bar;
        if ($(self).data('color-bar') == 'on') {
            $(self).data('color-mode', 'off');
        } else {
            $(self).data('color-mode', 'on');
        }
        render_color_scheme(color_legend_id);
    });



    // *** MODEL HANDLERS ***
    $("#datamonkey-absrel-show-model").on("click", function(e) {
        if ($(self).data('model') == 'MG94') {
            $(self).data('model', 'Full model');
        } else {
            $(self).data('model', 'MG94');
        }
        which_model = $(self).data('model');
        branch_omegas = render_bs_rel_tree(self.analysis_data, which_model)[1];
        self.tree.layout();
    });

    function default_tree_settings() {
        self.tree.branch_length(null);
        self.tree.branch_name(null);
        self.tree.node_span('equal');
        self.tree.options({
            'draw-size-bubbles': false,
            'selectable': false,
            'transitions': false
        }, false);
        self.tree.font_size(18);
        self.tree.scale_bar_font_size(14);
        self.tree.node_circle_size(0);
        self.tree.spacing_x(35, true);

        //self.tree.style_nodes (node_colorizer);
        self.tree.style_edges(edge_colorizer);
        //self.tree.selection_label (current_selection_name);
    }

    function render_color_scheme(svg_container) {

        var svg = d3.select("#" + svg_container).selectAll("svg").data([omega_color.domain()]);
        svg.enter().append("svg");
        svg.selectAll("*").remove();

        if (render_color_bar) {
            var bar_width = 70,
                bar_height = 300,
                margins = {
                    'bottom': 30,
                    'top': 15,
                    'left': 40,
                    'right': 2
                };

            svg.attr("width", bar_width)
                .attr("height", bar_height);



            this_grad = svg.append("defs").append("linearGradient")
                .attr("id", "_omega_bar")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%");

            var omega_scale = d3.scale.pow().exponent(scaling_exponent)
                .domain(d3.extent(omega_color.domain()))
                .range([0, 1]),
                axis_scale = d3.scale.pow().exponent(scaling_exponent)
                .domain(d3.extent(omega_color.domain()))
                .range([0, bar_height - margins['top'] - margins['bottom']]);


            omega_color.domain().forEach(function(d) {
                this_grad.append("stop")
                    .attr("offset", "" + omega_scale(d) * 100 + "%")
                    .style("stop-color", omega_color(d));
            });

            var g_container = svg.append("g").attr("transform", "translate(" + margins["left"] + "," + margins["top"] + ")");

            g_container.append("rect").attr("x", 0)
                .attr("width", bar_width - margins['left'] - margins['right'])
                .attr("y", 0)
                .attr("height", bar_height - margins['top'] - margins['bottom'])
                .style("fill", "url(#_omega_bar)");


            var draw_omega_bar = d3.svg.axis().scale(axis_scale)
                .orient("left")
                .tickFormat(d3.format(".1r"))
                .tickValues([0, 0.01, 0.1, 0.5, 1, 2, 5, 10]);

            var scale_bar = g_container.append("g");
            scale_bar.style("font-size", "14")
                .attr("class", "hyphy-omega-bar")
                .call(draw_omega_bar);

            scale_bar.selectAll("text")
                .style("text-anchor", "right");

            var x_label = _label = scale_bar.append("g").attr("class", "hyphy-omega-bar");
            x_label = x_label.selectAll("text").data(["\u03C9"]);
            x_label.enter().append("text");
            x_label.text(function(d) {
                    return d
                })
                .attr("transform", "translate(" + (bar_width - margins['left'] - margins['right']) * 0.5 + "," + (bar_height - margins['bottom']) + ")")
                .style("text-anchor", "middle")
                .style("font-size", "18")
                .attr("dx", "0.0em")
                .attr("dy", "0.1em");
        }
    }

    function render_error(e) {
        $("#datamonkey-absrel-error-hide").on("click", function(e) {
            d3.select("#datamonkey-absrel-error").style("display", "none");
            e.preventDefault();
        });

        d3.select("#datamonkey-absrel-error-text").text(e);
        d3.select("#datamonkey-absrel-error").style('display', 'block');
    }

    function make_plot_data(omegas, weights) {
        var data_to_plot = [],
            norm = weights.reduce(function(p, c) {
                return p + c;
            }, 0),
            mean = 0.;

        for (var i = 0; i < omegas.length; i++) {
            if (omegas[i] == null || weights[i] == null) {
                return;
            }

            var this_class = {
                'omega': omegas[i],
                'weight': weights[i] / norm
            };
            data_to_plot.push(this_class);
        }
        return data_to_plot;
    }

    function drawDistribution(node_name, omegas, weights, settings) {

        var svg_id = settings["svg"] || "primary_omega_plot",
            tag_id = settings["tag"] || "primary_omega_tag";

        var legend_id = settings["legend"] || null;
        var do_log_plot = settings["log"] || false;

        var dimensions = settings["dimensions"] || {
            "width": 600,
            "height": 400
        };

        var margins = {
                'left': 50,
                'right': 15,
                'bottom': 35,
                'top': 35
            },
            plot_width = dimensions["width"] - margins['left'] - margins['right'],
            plot_height = dimensions["height"] - margins['top'] - margins['bottom'];

        var k_p = settings["k"] || null;


        var domain = settings["domain"] || d3.extent(omegas);


        var omega_scale = (do_log_plot ? d3.scale.log() : d3.scale.linear())
            .range([0, plot_width]).domain(domain).nice().clamp(true),
            proportion_scale = d3.scale.linear().range([plot_height, 0]).domain([0, 1]);




        // compute margins -- circle AREA is proportional to the relative weight
        // maximum diameter is (height - text margin)


        var data_to_plot = make_plot_data(omegas, weights);

        d3.select("#" + tag_id).text(node_name);

        var svg = d3.select("#" + svg_id).attr("width", dimensions.width)
            .attr("height", dimensions.height),
            plot = svg.selectAll(".container");

        if (plot.empty()) {
            plot = svg.append("g").attr("class", "container");
        }


        plot.attr("transform", "translate(" + margins["left"] + " , " + margins["top"] + ")");



        var omega_lines = plot.selectAll(".hyphy-omega-line").data(data_to_plot);

        omega_lines.enter().append("line");
        omega_lines.exit().remove();
        omega_lines.transition().attr("x1", function(d) {
                return omega_scale(d.omega);
            })
            .attr("x2", function(d) {
                return omega_scale(d.omega);
            })
            .attr("y1", function(d) {
                return proportion_scale(0);
            })
            .attr("y2", function(d) {
                return proportion_scale(d.weight);
            })
            .style("stroke", function(d) {
                return omega_color(d.omega);
            })
            .attr("class", "hyphy-omega-line");


        var neutral_line = plot.selectAll(".hyphy-neutral-line").data([1]);
        neutral_line.enter().append("line").attr("class", "hyphy-neutral-line");
        neutral_line.exit().remove();
        neutral_line.transition().attr("x1", function(d) {
                return omega_scale(d);
            })
            .attr("x2", function(d) {
                return omega_scale(d);
            })
            .attr("y1", 0)
            .attr("y2", plot_height);



        var xAxis = d3.svg.axis()
            .scale(omega_scale)
            .orient("bottom");



        if (do_log_plot) {
            xAxis.ticks(10, ".1r");
        }


        var x_axis = svg.selectAll(".x.hyphy-axis");
        var x_label;
        if (x_axis.empty()) {
            x_axis = svg.append("g")
                .attr("class", "x hyphy-axis");

            x_label = x_axis.append("g").attr("class", "hyphy-axis-label x-label");
        } else {
            x_label = x_axis.select(".hyphy-axis-label.x-label");
        }



        x_axis.attr("transform", "translate(" + margins["left"] + "," + (plot_height + margins["top"]) + ")")
            .call(xAxis);
        x_label = x_label.attr("transform", "translate(" + plot_width + "," + margins["bottom"] + ")")
            .selectAll("text").data(["\u03C9"]);
        x_label.enter().append("text");
        x_label.text(function(d) {
                return d
            })
            .style("text-anchor", "end")
            .attr("dy", "0.0em");



        var yAxis = d3.svg.axis()
            .scale(proportion_scale)
            .orient("left")
            .ticks(10, ".1p");

        var y_axis = svg.selectAll(".y.hyphy-axis");
        var y_label;
        if (y_axis.empty()) {
            y_axis = svg.append("g")
                .attr("class", "y hyphy-axis");

            y_label = y_axis.append("g").attr("class", "hyphy-axis-label y-label");
        } else {
            y_label = y_axis.select(".hyphy-axis-label.y-label");
        }



        y_axis.attr("transform", "translate(" + margins["left"] + "," + margins["top"] + ")")
            .call(yAxis);
        y_label = y_label.attr("transform", "translate(" + (-margins["left"]) + "," + 0 + ")")
            .selectAll("text").data(["Proportion of sites"]);
        y_label.enter().append("text");
        y_label.text(function(d) {
                return d
            })
            .style("text-anchor", "start")
            .attr("dy", "-1em")

    }

    function edge_colorizer(element, data) {

        var coloration = branch_omegas[data.target.name];
        if (coloration) {
            if ('color' in coloration) {
                element.style('stroke', coloration['color']);
            } else {
                element.style('stroke', 'url(#' + coloration['grad'] + ')');
                if (self.tree.radial()) {
                    d3.select('#' + coloration['grad']).attr("gradientTransform", "rotate(" + data.target.angle + ")");
                } else {
                    d3.select('#' + coloration['grad']).attr("gradientTransform", null);
                }
            }
            $(element[0][0]).tooltip({
                'title': coloration['tooltip'],
                'html': true,
                'trigger': 'hover',
                'container': 'body',
                'placement': 'auto'
            });
        }

        element.style('stroke-width', branch_p_values[data.target.name] <= alpha_level ? '12' : '5')
            .style('stroke-linejoin', 'round')
            .style('stroke-linecap', 'round');

    }

    function create_gradient(svg_defs, grad_id, rateD, already_cumulative) {
        var this_grad = svg_defs.append("linearGradient")
            .attr("id", grad_id);

        var current_weight = 0;
        rateD.forEach(function(d, i) {
            if (d[1]) {
                var new_weight = current_weight + d[1];
                this_grad.append("stop")
                    .attr("offset", "" + current_weight * 100 + "%")
                    .style("stop-color", omega_color(d[0]));
                this_grad.append("stop")
                    .attr("offset", "" + new_weight * 100 + "%")
                    .style("stop-color", omega_color(d[0]));
                current_weight = new_weight;
            }
        });
    }

    function render_bs_rel_tree(json, model_id) {

        self.tree(json["fits"][model_id]["tree string"]).svg(self.svg);

        var svg_defs = self.svg.selectAll("defs");
        if (svg_defs.empty()) {
            svg_defs = self.svg.append("defs");
        }
        svg_defs.selectAll("*").remove();

        gradID = 0;
        var local_branch_omegas = {};

        var fitted_distributions = json["fits"][model_id]["rate distributions"];

        for (var b in fitted_distributions) {
            // Quick inf and nan quick fix 
            fitted_distributions[b] = fitted_distributions[b].replace(/inf/g, '1e+9999');
            fitted_distributions[b] = fitted_distributions[b].replace(/-nan/g, 'null');
            fitted_distributions[b] = fitted_distributions[b].replace(/nan/g, 'null');

            var rateD = JSON.parse(fitted_distributions[b]);
            if (rateD.length == 1) {
                local_branch_omegas[b] = {
                    'color': omega_color(rateD[0][0])
                };
            } else {
                gradID++;
                var grad_id = "branch_gradient_" + gradID;
                create_gradient(svg_defs, grad_id, rateD);
                local_branch_omegas[b] = {
                    'grad': grad_id
                };
            }
            local_branch_omegas[b]['omegas'] = rateD;
            local_branch_omegas[b]['tooltip'] = "<b>" + b + "</b>";
            local_branch_omegas[b]['distro'] = "";
            rateD.forEach(function(d, i) {
                var omega_value = d[0] > 1e20 ? "&infin;" : omega_format(d[0]),
                    omega_weight = prop_format(d[1]);

                local_branch_omegas[b]['tooltip'] += "<br/>&omega;<sub>" + (i + 1) + "</sub> = " + omega_value +
                    " (" + omega_weight + ")";
                if (i) {
                    local_branch_omegas[b]['distro'] += "<br/>";
                }
                local_branch_omegas[b]['distro'] += "&omega;<sub>" + (i + 1) + "</sub> = " + omega_value +
                    " (" + omega_weight + ")";
            });
            local_branch_omegas[b]['tooltip'] += "<br/><i>p = " + omega_format(json["test results"][b]["p"]) + "</i>";
        }

        self.tree.style_edges(function(element, data) {
            edge_colorizer(element, data);
        });
        branch_lengths = {};
        self.tree.get_nodes().forEach(function(d) {
            if (d.parent) {
                branch_lengths[d.name] = self.tree.branch_length()(d);
            }
        });

        return [branch_lengths, local_branch_omegas];
    }

    var render_bs_rel = function(json) {

        try {
            d3.select("#datamonkey-absrel-error").style('display', 'none');

            self.analysis_data = json;

            function make_distro_plot(d) {
                if (Object.keys(rate_distro_by_branch).indexOf(d[0]) != -1) {
                    drawDistribution(d[0],
                        rate_distro_by_branch[d[0]].map(function(r) {
                            return r[0];
                        }),
                        rate_distro_by_branch[d[0]].map(function(r) {
                            return r[1];
                        }), {
                            'log': true,
                            'legend': false,
                            'domain': [0.00001, 10],
                            'dimensions': {
                                'width': 400,
                                'height': 400
                            }
                        });
                }
            }

            default_tree_settings();



            branch_p_values = {};

            var rate_distro_by_branch = {},
                branch_count = 0,
                selected_count = 0,
                tested_count = 0;

            var for_branch_table = [];

            var tree_info = render_bs_rel_tree(json, "Full model");

            var branch_lengths = tree_info[0],
                tested_branches = {};

            branch_omegas = tree_info[1];

            for (var p in json["test results"]) {
                branch_p_values[p] = json["test results"][p]["p"];
                if (branch_p_values[p] <= 0.05) {
                    selected_count++;
                }
                if (json["test results"][p]["tested"] > 0) {
                    tested_branches[p] = true;
                    tested_count += 1;
                }
            }

            var fitted_distributions = json["fits"]["Full model"]["rate distributions"];

            for (var b in fitted_distributions) {
                for_branch_table.push([b + (tested_branches[b] ? "" : " (not tested)"), branch_lengths[b], 0, 0, 0]);
                try {
                    for_branch_table[branch_count][2] = json["test results"][b]["LRT"];
                    for_branch_table[branch_count][3] = json["test results"][b]["p"];
                    for_branch_table[branch_count][4] = json["test results"][b]["uncorrected p"];
                } catch (e) {}

                var rateD = (JSON.parse(fitted_distributions[b]));
                rate_distro_by_branch[b] = rateD;
                for_branch_table[branch_count].push(branch_omegas[b]['distro']);
                branch_count += 1;
            }



            render_color_scheme(color_legend_id);

            // render summary data

            var total_tree_length = json["fits"]["Full model"]["tree length"];

            for_branch_table = for_branch_table.sort(function(a, b) {
                return a[4] - b[4];
            });
            make_distro_plot(for_branch_table[0]);

            for_branch_table = d3.select('#table-branch-table').selectAll("tr").data(for_branch_table);
            for_branch_table.enter().append('tr');
            for_branch_table.exit().remove();
            for_branch_table.style('font-weight', function(d) {
                return d[3] <= 0.05 ? 'bold' : 'normal';
            });
            for_branch_table.on("click", function(d) {
                make_distro_plot(d);
            });
            for_branch_table = for_branch_table.selectAll("td").data(function(d) {
                return d;
            });
            for_branch_table.enter().append("td");
            for_branch_table.html(function(d) {
                if (typeof d == "number") {
                    return branch_table_format(d);
                }
                return d;
            });


            d3.select('#summary-method-name').text(json['version']);
            d3.select('#summary-pmid').text("PubMed ID " + json['PMID'])
                .attr("href", "http://www.ncbi.nlm.nih.gov/pubmed/" + json['PMID']);
            d3.select('#summary-total-runtime').text(format_run_time(json['timers']['overall']));
            d3.select('#summary-complexity-runtime').text(format_run_time(json['timers']['overall']));
            d3.select('#summary-complexity-runtime').text(format_run_time(json['timers']['Complexity analysis']));
            d3.select('#summary-testing-runtime').text(format_run_time(json['timers']['Testing']));
            d3.select('#summary-total-branches').text(branch_count);
            d3.select('#summary-tested-branches').text(tested_count);
            d3.select('#summary-selected-branches').text(selected_count);

            var model_rows = [
                [],
                []
            ];

            for (k = 0; k < 2; k++) {
                var access_key;
                if (k == 0) {
                    access_key = 'MG94';
                    model_rows[k].push('Branch-wise &omega; variation (MG94)');
                } else {
                    access_key = 'Full model';
                    model_rows[k].push('Branch-site &omega; variation');
                }
                model_rows[k].push(fit_format(json['fits'][access_key]['log-likelihood']));
                model_rows[k].push(json['fits'][access_key]['parameters']);
                model_rows[k].push(fit_format(json['fits'][access_key]['AIC-c']));
                model_rows[k].push(format_run_time(json['fits'][access_key]['runtime']));
            }

            model_rows = d3.select('#summary-model-table').selectAll("tr").data(model_rows);
            model_rows.enter().append('tr');
            model_rows.exit().remove();
            model_rows = model_rows.selectAll("td").data(function(d) {
                return d;
            });
            model_rows.enter().append("td");
            model_rows.html(function(d) {
                return d;
            });

            d3.select('#summary-tree-length').text(fit_format(json["fits"]["Full model"]["tree length"]));
            d3.select('#summary-tree-length-mg94').text(fit_format(json["fits"]["MG94"]["tree length"]));


            var by_rate_class_count = {};
            self.tree.get_nodes().forEach(function(d) {
                if (d.parent) {
                    var rc = rate_distro_by_branch[d.name].length;
                    if (!(rc in by_rate_class_count)) {
                        by_rate_class_count[rc] = [rc, 0, 0, 0];
                    }
                    by_rate_class_count[rc][1]++;
                    by_rate_class_count[rc][2] += self.tree.branch_length()(d);
                    if (json["test results"][d.name]["p"] <= 0.05) {
                        by_rate_class_count[rc][3]++;
                    }
                }
            });
            var by_rate_class_count_array = [];
            for (k in by_rate_class_count) {
                d = by_rate_class_count[k];
                by_rate_class_count_array.push([d[0], d[1], prop_format(d[1] / branch_count), prop_format(d[2] / total_tree_length), d[3]]);
            };

            by_rate_class_count_array = by_rate_class_count_array.sort(function(a, b) {
                return a[0] - b[0];
            });
            by_rate_class_count_array = d3.select('#summary-tree-table').selectAll("tr").data(by_rate_class_count_array);
            by_rate_class_count_array.enter().append('tr');
            by_rate_class_count_array.exit().remove();
            by_rate_class_count_array = by_rate_class_count_array.selectAll("td").data(function(d) {
                return d;
            });
            by_rate_class_count_array.enter().append("td");
            by_rate_class_count_array.html(function(d) {
                return d;
            });

            self.tree.layout();

        } catch (e) {
            render_error(e.message);
        }

    }

    function format_run_time(seconds) {
        var duration_string = "";
        seconds = parseFloat(seconds);
        var split_array = [Math.floor(seconds / (24 * 3600)), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60],
            quals = ["d.", "hrs.", "min.", "sec."];

        split_array.forEach(function(d, i) {
            if (d) {
                duration_string += " " + d + " " + quals[i];
            }
        });

        return duration_string;
    }



    return render_bs_rel;

}
