function hivtrace_histogram(graph, histogram_tag, histogram_label) {  

  var defaultFloatFormat = d3.format(",.2f");
  var histogram_w = 300,
  histogram_h = 300;

  hivtrace_render_histogram(graph["Degrees"]["Distribution"], 
                            graph["Degrees"]["fitted"], 
                            histogram_w, 
                            histogram_h, 
                            histogram_tag);
                            
  var label = "Network degree distribution is best described by the <strong>" + graph["Degrees"]["Model"] + "</strong> model, with &rho; of " + 
             defaultFloatFormat(graph["Degrees"]["rho"]);
             
  if (graph["Degrees"]["rho CI"] != undefined) {
        label += " (95% CI " + defaultFloatFormat(graph["Degrees"]["rho CI"][0]) + " - " + defaultFloatFormat(graph["Degrees"]["rho CI"][1]) + ")";
  }

  d3.select (histogram_label).html(label);
}

function hivtrace_histogram_distances (graph, histogram_tag, histogram_label) {  

  var defaultFloatFormat = d3.format(",.3p");
  var histogram_w = 300,
  histogram_h = 300;

  var edge_lengths = _.map (graph["Edges"], function (edge) {return edge.length;});
  

  hivtrace_render_histogram_continuous(edge_lengths, 
                            histogram_w, 
                            histogram_h, 
                            histogram_tag);
                            
  var label = "Genetic distances among linked nodes.";
  d3.select (histogram_label).html(label);
}

function hivtrace_render_histogram_continuous (data, w, h, id) {

	var margin = {top: 10, right: 30, bottom: 50, left: 30},
				width = w - margin.left - margin.right,
				height = h - margin.top - margin.bottom;


    var histogram_data = d3.layout.histogram()(data);



	var x = d3.scale.linear()
			.domain(d3.extent (data))
			.range([0, width]);
		
	var y = d3.scale.linear ()
			.domain ([0, d3.max (_.map (histogram_data, function (b) {return b.y}))])
			.range  ([height,0]); 
		
	
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left");
		
	var histogram_svg = d3.select(id).selectAll("svg");

	if (histogram_svg) {
		histogram_svg.remove();
	}

	histogram_data.splice (0, 0, {'x' : x.domain ()[0], 'y' : 0, 'dx' : 0});
	histogram_data.splice (histogram_data.length, 0, {'x' : x.domain ()[1], 'y' : 0, 'dx' : 0});

	histogram_svg = d3.select(id).insert("svg",".histogram-label")
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
					.datum (histogram_data);
	
	var histogram_line = d3.svg.line()
						.x(function(d) { return x(d.x+d.dx); })
						.y(function(d) { return y(d.y); })
						.interpolate("step-before");
					
	histogram_svg.selectAll ("path").remove();
	histogram_svg.append ("path")
				 .attr ("d", function(d) { return histogram_line(d) + "Z"; })
				 .attr ("class", "histogram");

  

	var x_axis = histogram_svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);    
	
	x_axis.selectAll ("text").attr ("transform", "rotate(45)").attr("dx","1em").attr("dy","0.5em");

	var y_axis = histogram_svg.append("g")
		.attr("class", "y axis")
		//.attr("transform", "translate(0," + height + ")")
		.call(yAxis);    
	
}


function hivtrace_render_histogram(counts, fit, w, h, id) {

	var margin = {top: 10, right: 30, bottom: 50, left: 30},
				width = w - margin.left - margin.right,
				height = h - margin.top - margin.bottom;

	var x = d3.scale.linear()
			.domain([0, counts.length+1])
			.range([0, width]);
		
	var y = d3.scale.log()
			.domain ([1, d3.max (counts)])
			.range  ([height,0]);
		
	var total = d3.sum(counts);

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");
	
	var histogram_svg = d3.select(id).selectAll("svg");

	if (histogram_svg) {
		histogram_svg.remove();
	}

	var data_to_plot = counts.map (function (d, i) {return {'x' : i+1, 'y' : d+1};});
	data_to_plot.push ({'x' : counts.length+1, 'y' : 1});
	data_to_plot.push ({'x' : 0, 'y' : 1});
	data_to_plot.push ({'x' : 0, 'y' : counts[0]+1});

	histogram_svg = d3.select(id).insert("svg",".histogram-label")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	.datum (data_to_plot);
	
	var histogram_line = d3.svg.line()
						.x(function(d) { return x(d.x); })
						.y(function(d) { return y(d.y); })
						.interpolate("step-before");
					
	histogram_svg.selectAll ("path").remove();
	histogram_svg.append ("path")
				 .attr ("d", function(d) { return histogram_line(d) + "Z"; })
				 .attr ("class", "histogram");

  

	  if (fit) {    
		  var fit_line = d3.svg.line()
			  .interpolate("linear")
			  .x(function(d,i) { return x(i+1) + (x(i+1)-x(i))/2; })
			  .y(function(d) { return y(1+d*total); });
		  histogram_svg.append("path").datum(fit)
			.attr("class", "line")
			.attr("d", function(d) { return fit_line(d); });
	  }

	var x_axis = histogram_svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);    
	
	x_axis.selectAll ("text").attr ("transform", "rotate(45)").attr("dx","1em").attr("dy","0.5em");
}

datamonkey.hivtrace.histogram = hivtrace_histogram;
datamonkey.hivtrace.histogram_distances = hivtrace_histogram_distances;
