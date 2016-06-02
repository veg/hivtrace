if (!datamonkey) {
    var datamonkey = {};
}

datamonkey.relax = function() {

    settings = {
        'omegaPlot': {},
        'tree-options': {
            /* value arrays have the following meaning
                [0] - the value of the attribute
                [1] - does the change in attribute value trigger tree re-layout?
            */
            'datamonkey-relax-tree-model': [null, true],
            'datamonkey-relax-tree-highlight': [null, false],
            'datamonkey-relax-tree-branch-lengths': [true, true],
            'datamonkey-relax-tree-fill-legend': [true, false],
            'datamonkey-relax-tree-fill-color': [true, false]
        },
        'suppress-tree-render': false,
        'chart-append-html' : true
    };


    var width = 800,
        height = 600,
        alpha_level = 0.05,
        omega_format = d3.format(".3r"),
        prop_format = d3.format(".2p"),
        fit_format = d3.format(".2f"),
        p_value_format = d3.format(".4f"),
        analysis_data = null,
        branch_annotations = [],
        branch_lengths = [];

    var tree = d3.layout.phylotree("body")
        .size([height, width])
        .separation(function(a, b) {
            return 0;
        });

    set_handlers      ();
    set_tree_handlers (tree);

    var svg = d3.select("#tree_container").append("svg")
        .attr("width", width)
        .attr("height", height);

    var scaling_exponent = 0.33;


    function set_handlers() {

          
    
        $("#datamonkey-relax-error-hide").on("click", function(e) {
            d3.select("#datamonkey-relax-error").style("display", "none");
            e.preventDefault();
        });

        $("#datamonkey-relax-load-json").on("change", function(e) {
            // FileList object
            var files = e.target.files; 

            if (files.length == 1) {
                var f = files[0];
                var reader = new FileReader();

                reader.onload = (function(theFile) {
                    return function(e) {
                        analysis_data = JSON.parse(e.target.result);
                        render(analysis_data);
                    };

                })(f);

                reader.readAsText(f);
            }

            e.preventDefault();
        });
        
        $(".datamonkey-relax-tree-trigger").on("click", function(e) {
            render_tree();
        });
    }


    function default_tree_settings() {
        tree.branch_name(null);
        tree.node_span('equal');
        tree.options({
            'draw-size-bubbles': false,
            'selectable': false
        }, false);
        tree.font_size(18);
        tree.scale_bar_font_size(14);
        tree.node_circle_size(0);
        tree.branch_length(function(n) {
            if (branch_lengths) {
                return branch_lengths[n.name] || 0;
            }
            return undefined;
        });
        tree.style_edges(edge_colorizer);
        tree.style_nodes(node_colorizer);
        tree.spacing_x(30, true);
    }


    render_color_scheme = function(svg_container, attr_name, do_not_render) {
        var svg = d3.select("#" + svg_container).selectAll("svg").data([omega_color.domain()]);
        svg.enter().append("svg");
        svg.selectAll("*").remove();

        if (branch_annotations && !do_not_render) {
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
            x_label = x_label.selectAll("text").data([attr_name]);
            x_label.enter().append("text");
            x_label.text(function(d) {
                return $('<textarea />').html(d).text();
            })
                .attr("transform", "translate(" + (bar_width - margins['left'] - margins['right']) * 0.5 + "," + (bar_height - margins['bottom']) + ")")
                .style("text-anchor", "middle")
                .style("font-size", "18")
                .attr("dx", "0.0em")
                .attr("dy", "0.1em");
        }
    }


    render_tree = function(skip_render) {

        if (!settings['suppress-tree-render']) {

            var do_layout = false;

            for (var k in settings["tree-options"]) {
                var controller = d3.select("#" + k),
                    controller_value = (controller.attr("value") || controller.property("checked"));
                    
                if (controller_value != settings["tree-options"][k][0]) {
                    settings["tree-options"][k][0] = controller_value;
                    do_layout = do_layout || settings["tree-options"][k][1];
                }
            }
            

            var which_model = settings["tree-options"]["datamonkey-relax-tree-model"][0];
            
            branch_lengths     = settings["tree-options"]["datamonkey-relax-tree-branch-lengths"][0] ? analysis_data["fits"][which_model]["branch-lengths"] : null;
            branch_annotations = analysis_data["fits"][which_model]["branch-annotations"];
            
 
            partition = (settings["tree-options"]["datamonkey-relax-tree-highlight"] ? analysis_data["partition"][settings["tree-options"]["datamonkey-relax-tree-highlight"][0]] : null) || null;


            omega_color = d3.scale.pow().exponent(scaling_exponent)
                .domain([0, 0.25, 1, 5, 10])
                .range(settings["tree-options"]["datamonkey-relax-tree-fill-color"][0] ? ["#5e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"] : ["#DDDDDD", "#AAAAAA", "#888888", "#444444", "#000000"])
                .clamp(true);


            render_color_scheme("color_legend", analysis_data["fits"][which_model]["annotation-tag"], !(settings["tree-options"]["datamonkey-relax-tree-fill-legend"][0]));

            if (!skip_render) {
                if (do_layout) {
                    tree.update_layout();
                }
                d3_phylotree_trigger_refresh (tree);
            }

        }
    }

    function relax_render_error(e) {
        d3.select("#datamonkey-relax-error-text").text(e);
        d3.select("#datamonkey-relax-error").style('display', 'block');
        //console.log(e);
    }



    render = function(json) {

        try {
            analysis_data = json;
            d3.select('#summary-pmid').text("PubMed ID " + json['PMID'])
                .attr("href", "http://www.ncbi.nlm.nih.gov/pubmed/" + json['PMID']);

            var relaxation_K = json["fits"]["Alternative"]["K"];
            var p = json["relaxation-test"]["p"];

            d3.select('#summary-direction').text(relaxation_K > 1 ? 'intensification' : 'relaxation');
            d3.select('#summary-evidence').text(p <= alpha_level ? 'significant' : 'not significant');
            d3.select('#summary-pvalue').text(p_value_format(p));
            d3.select('#summary-LRT').text(fit_format(json["relaxation-test"]["LR"]));
            d3.select('#summary-K').text(fit_format(relaxation_K));

            d3.select("#datamonkey-relax-error").style('display', 'none');

            var table_row_data = [];
            var omega_distributions = {};

            for (var m in json["fits"]) {
                var this_model_row = [],
                    this_model = json["fits"][m];

                this_model_row = [this_model['display-order'],
                    "",
                    m,
                    fit_format(this_model['log-likelihood']),
                    this_model['parameters'],
                    fit_format(this_model['AIC-c']),
                    format_run_time(this_model['runtime']),
                    fit_format(d3.values(this_model["branch-lengths"]).reduce(function(p, c) {
                        return p + c;
                    }, 0))
                ];

                omega_distributions[m] = {};

                var distributions = [];
                for (var d in this_model["rate-distributions"]) {
                    var this_distro = this_model["rate-distributions"][d];
                    var this_distro_entry = [d, "", "", ""];

                    omega_distributions[m][d] = this_distro.map(function(d) {
                        return {
                            'omega': d[0],
                            'weight': d[1]
                        };
                    });

                    for (var k = 0; k < this_distro.length; k++) {
                        this_distro_entry[k + 1] = (omega_format(this_distro[k][0]) + " (" + prop_format(this_distro[k][1]) + ")");
                    }
                    distributions.push(this_distro_entry);
                }


                distributions.sort(function(a, b) {
                    return a[0] < b[0] ? -1 : (a[0] == b[0] ? 0 : 1);
                });
                this_model_row = this_model_row.concat(distributions[0]);
                this_model_row[1] = distributions[0][0];
                table_row_data.push(this_model_row);

                for (var d = 1; d < distributions.length; d++) {
                    var this_distro_entry = this_model_row.map(function(d, i) {
                        if (i) return "";
                        return d;
                    });
                    this_distro_entry[1] = distributions[d][0];
                    for (var k = this_distro_entry.length - 4; k < this_distro_entry.length; k++) {
                        this_distro_entry[k] = distributions[d][k - this_distro_entry.length + 4];
                    }
                    table_row_data.push(this_distro_entry);
                }

            }

            table_row_data.sort(function(a, b) {
                if (a[0] == b[0]) {
                    return a[1] < b[1] ? -1 : (a[1] == b[1] ? 0 : 1);
                }
                return a[0] - b[0];
            });
            table_row_data = table_row_data.map(function(r) {
                return r.slice(2);
            });

            model_rows = d3.select('#summary-model-table').selectAll("tr").data(table_row_data);
            model_rows.enter().append('tr');
            model_rows.exit().remove();
            model_rows = model_rows.selectAll("td").data(function(d) {
                return d;
            });
            model_rows.enter().append("td");
            model_rows.html(function(d) {
                return d;
            });

            _.templateSettings = {
              evaluate:    /\{\%(.+?)\%\}/g,
              interpolate: /\{\{(.+?)\}\}/g,
              variable    : "rc"
            };

            var omega_plot_template = _.template(
              $("script.hyphy-omega-plots").html()
            );
            

            // Filter omega_distributions that have Test and Reference

            _.map(omega_distributions, function(item,key) { 
              item.key   = key.toLowerCase().replace(/ /g, '-'); 
              item.label = key; 
            });

            var distributions_to_chart = _.filter(omega_distributions, function(d) { return d.hasOwnProperty('Reference') });
            var omega_plot_html = omega_plot_template(distributions_to_chart);
            

            if (settings['chart-append-html']) {
                $("#hyphy-omega-plots").append(omega_plot_html);
                settings['chart-append-html'] = false;
            }

            // Replace with for loop
            _.each(distributions_to_chart, function(item, key) {

              var svg_element =  item.key + '-svg';
              var container_element =  '#' + item.key;
              var export_svg =  '#export-' + item.key + '-svg';
              var export_png =  '#export-' + item.key + '-png';

              if(item.hasOwnProperty('Reference')) {

                omegaPlot(item["Reference"], item["Test"], {'svg' : svg_element });
                d3.select(container_element).style ('display', 'block');

                // TODO: Make this a data-bind
                $(export_svg).on('click', function(e) { 
                  datamonkey.save_image("svg", '#' + svg_element); 
                });

                $(export_png).on('click', function(e) { 
                  datamonkey.save_image("png", '#' + svg_element); 
                });
              }

            });

            settings['suppress-tree-render'] = true;

            var def_displayed = false;

            var model_list = d3.select("#datamonkey-relax-tree-model-list").selectAll("li").data(d3.keys(json["fits"]).map(function(d) {
                return [d];
            }).sort());
            model_list.enter().append("li");
            model_list.exit().remove();
            model_list = model_list.selectAll("a").data(function(d) {
                return d;
            });
            model_list.enter().append("a");
            model_list.attr("href", "#").on("click", function(d, i) {
                d3.select("#datamonkey-relax-tree-model").attr("value", d);
                render_tree();
            });
            model_list.text(function(d) {
                if (d == "General Descriptive") {
                    def_displayed = true;
                    this.click();
                }
                if (!def_displayed && d == "Alternative") {
                    def_displayed = true;
                    this.click();
                }
                if (!def_displayed && d == "Partitioned MG94xREV") {
                    def_displayed = true;
                    this.click();
                }

                return d;
            });

            var partition_list = d3.select("#datamonkey-relax-tree-highlight-branches").selectAll("li").data([
                ['None']
            ].concat(d3.keys(json["partition"]).map(function(d) {
                return [d];
            }).sort()));
            partition_list.enter().append("li");
            partition_list.exit().remove();
            partition_list = partition_list.selectAll("a").data(function(d) {
                return d;
            });
            partition_list.enter().append("a");
            partition_list.attr("href", "#").on("click", function(d, i) {
                d3.select("#datamonkey-relax-tree-highlight").attr("value", d);
                render_tree();
            });
            partition_list.text(function(d) {
                if (d == "RELAX.test") {
                    this.click();
                }
                return d;
            });

            settings['suppress-tree-render'] = false;
            render_tree(true);
            default_tree_settings();
            tree(analysis_data["tree"]).svg(svg);
            tree.layout();

        } catch (e) {
            relax_render_error(e.message);
            //console.log(e.message);
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

    function edge_colorizer(element, data) {

        if (branch_annotations) {
            element.style('stroke', omega_color(branch_annotations[data.target.name]) || null);
            $(element[0][0]).tooltip('destroy');
            $(element[0][0]).tooltip({
                'title': omega_format(branch_annotations[data.target.name]),
                'html': true,
                'trigger': 'hover',
                'container': 'body',
                'placement': 'auto'
            })
        } else {
            element.style('stroke', null);
            $(element[0][0]).tooltip('destroy');
        }


        element.style('stroke-width', (partition && partition[data.target.name]) ? '8' : '4')
            .style('stroke-linejoin', 'round')
            .style('stroke-linecap', 'round');

    }
    
    function node_colorizer(element, data) {  
        if (partition) { 
            element.style('opacity', (partition && partition[data.name]) ? '1' : '0.25');
        } else {
            element.style('opacity', '1');        
        }
    }

    /* Distribution plotters */
    omegaPlot = function(data_to_plot, secondary_data, settings) {

        makeSpring = function(x1, x2, y1, y2, step, displacement) {
            if (x1 == x2) {
                y1 = Math.min(y1, y2);
                return "M" + x1 + "," + (y1 - 40) + "v20";
            }



            var spring_data = [],
                point = [x1, y1],
                angle = Math.atan2(y2 - y1, x2 - x1);

            step = [step * Math.cos(angle), step * Math.sin(angle)];
            //spring_data.push (point);
            k = 0;

            if (Math.abs(x1 - x2) < 15) {
                spring_data.push(point);
            } else {
                while (x1 < x2 && point[0] < x2 - 15 || x1 > x2 && point[0] > x2 + 15) {
                    point = point.map(function(d, i) {
                        return d + step[i];
                    });
                    if (k % 2) {
                        spring_data.push([point[0], point[1] + displacement]);
                    } else {
                        spring_data.push([point[0], point[1] - displacement]);
                    }
                    k++;
                    if (k > 100) {
                        break;
                    }
                }
            }
            if (spring_data.length > 1) {
                spring_data.pop();
            }
            spring_data.push([x2, y2]);

            var line = d3.svg.line().interpolate("monotone");

            return line(spring_data);
        }

        var svg_id = settings["svg"] || "primary_omega_plot";

        var legend_id   = settings["legend"] || null;
        var do_log_plot = settings["log"] || true;
        var has_zeros   = false;
        if (do_log_plot) {
            has_zeros = data_to_plot.some (function (d) {return d.omega <= 0;});
            if (secondary_data) {
                has_zeros = has_zeros || data_to_plot.some (function (d) {return d.omega <= 0;});
            }
        }

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


        var domain = settings["domain"] || d3.extent(secondary_data ? secondary_data.map(function(d) {
            return d.omega;
        }).concat(data_to_plot.map(function(d) {
            return d.omega;
        })) : data_to_plot.map(function(d) {
            return d.omega;
        }));
        domain[0] *= 0.5;

        var omega_scale = (do_log_plot ? (has_zeros ? d3.scale.pow().exponent (0.2) : d3.scale.log()) : d3.scale.linear())
            .range([0, plot_width]).domain(domain).nice(),
            proportion_scale = d3.scale.linear().range([plot_height, 0]).domain([-0.05, 1]).clamp(true);

        // compute margins -- circle AREA is proportional to the relative weight
        // maximum diameter is (height - text margin)

        var svg = d3.select("#" + svg_id).attr("width", dimensions.width)
            .attr("height", dimensions.height),
            plot = svg.selectAll(".container");

        svg.selectAll("defs").remove();

        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("refX", 10) /*must be smarter way to calculate shift*/
            .attr("refY", 4)
            .attr("markerWidth", 10)
            .attr("markerHeight", 8)
            .attr("orient", "auto")
            .attr("stroke", "#000")
            .attr("fill", "#000")
            .append("path")
            .attr("d", "M 0,0 V8 L10,4 Z");

        if (plot.empty()) {
            plot = svg.append("g").attr("class", "container");
        }

        plot.attr("transform", "translate(" + margins["left"] + " , " + margins["top"] + ")");

        var reference_omega_lines = plot.selectAll(".hyphy-omega-line-reference"),
            displacement_lines = plot.selectAll(".hyphy-displacement-line");

        if (secondary_data) {

            var diffs = data_to_plot.map(function(d, i) {
                return {
                    'x1': d.omega,
                    'x2': secondary_data[i].omega,
                    'y1': d.weight * 0.98,
                    'y2': secondary_data[i].weight * 0.98
                };
            });


            displacement_lines = displacement_lines.data(diffs);
            displacement_lines.enter().append("path");
            displacement_lines.exit().remove();

            displacement_lines.transition().attr("d", function(d) {
                return makeSpring(omega_scale(d.x1),
                    omega_scale(d.x2),
                    proportion_scale(d.y1 * 0.5),
                    proportion_scale(d.y2 * 0.5),
                    5,
                    5);
            })
                .attr("marker-end", "url(#arrowhead)")
                .attr("class", "hyphy-displacement-line");


            reference_omega_lines = reference_omega_lines.data(data_to_plot);
            reference_omega_lines.enter().append("line");
            reference_omega_lines.exit().remove();
            reference_omega_lines.transition().attr("x1", function(d) {
                return omega_scale(d.omega);
            })
                .attr("x2", function(d) {
                    return omega_scale(d.omega);
                })
                .attr("y1", function(d) {
                    return proportion_scale(-0.05);
                })
                .attr("y2", function(d) {
                    return proportion_scale(d.weight);
                })
                .style("stroke", function(d) {
                    return "#d62728";
                })
                .attr("class", "hyphy-omega-line-reference");

        } else {
            reference_omega_lines.remove();
            displacement_lines.remove();
        }

        var omega_lines = plot.selectAll(".hyphy-omega-line").data(secondary_data ? secondary_data : data_to_plot);

        omega_lines.enter().append("line");
        omega_lines.exit().remove();
        omega_lines.transition().attr("x1", function(d) {
            return omega_scale(d.omega);
        })
            .attr("x2", function(d) {
                return omega_scale(d.omega);
            })
            .attr("y1", function(d) {
                return proportion_scale(-0.05);
            })
            .attr("y2", function(d) {
                return proportion_scale(d.weight);
            })
            .style("stroke", function(d) {
              return "#1f77b4";
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
            xAxis.ticks(10, has_zeros ? ".2r" : ".1r");
        }


        var x_axis = svg.selectAll(".x.axis");
        var x_label;
        if (x_axis.empty()) {
            x_axis = svg.append("g")
                .attr("class", "x hyphy-axis");

            x_label = x_axis.append("g").attr("class", "hyphy-axis-label x-label");
        } else {
            x_label = x_axis.select(".axis-label.x-label");
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

};
