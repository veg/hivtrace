function busted_draw_distribution(node_name, omegas, weights, settings) {

  var make_plot_data = function(omegas, weights) {

    var data_to_plot = [],
        norm  = weights.reduce (function (p, c) {return p + c;}, 0),
        mean  = 0.;
                
    for (var i = 0; i < omegas.length; i++) {

      if (omegas[i] == null || weights[i] == null) {
          return;
      }

      var this_class = {'omega' : omegas[i], 'weight' : weights[i]/norm};
      data_to_plot.push (this_class);

    }

    return data_to_plot;

  }


  var svg_id = settings["svg"] || "primary-omega-plot",
      tag_id = settings["tag"] || "primary-omega-tag";

  var legend_id   = settings["legend"] || null;
  var do_log_plot = settings["log"]    || false;

  var dimensions = settings["dimensions"] || {
    "width"  : 300,
    "height" : 200
  };

  var margins = {
      'left'   : 50,
      'right'  : 15,
      'bottom' : 35,
      'top'    : 35
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

  var scaling_exponent = 0.33;       
  var omega_color = d3.scale.pow().exponent(scaling_exponent)                    
                      .domain([0, 0.25, 1, 5, 10])
                      .range([ "#5e4fa2", "#3288bd", "#e6f598","#f46d43","#9e0142"])
                      .clamp(true);


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

datamonkey.busted.draw_distribution = busted_draw_distribution;
