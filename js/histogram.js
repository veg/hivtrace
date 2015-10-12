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

    if (histogram_svg != undefined) {
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
    
    /*var bar = histogram_svg.selectAll(".bar")
    .data(counts.map (function (d) { return d+1; }))
    .enter().append("g")
    .attr("class", "bar")
    .attr("transform", function(d,i) { return "translate(" + x(i+1) + "," + y(d) + ")"; });
      
    bar.append("rect")
        .attr("x", 1)
        .attr("width", function (d,i) {return x(i+2) - x(i+1);})
        .attr("height", function(d) { return height - y(d); })
        .append ("title").text (function (d,i) { return "" + counts[i] + " nodes with degree " + (i+1);});*/
        
      

      if (fit != undefined) {    
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
