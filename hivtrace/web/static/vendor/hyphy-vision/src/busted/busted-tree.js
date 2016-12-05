function busted_render_tree(container_id, container, json) {

  var width  = 600,
      height = 600,
      color_scheme = d3.scale.category10(),
      branch_omegas = {},
      branch_p_values = {},
      alpha_level = 0.05,
      omega_format = d3.format (".3r"),
      prop_format = d3.format (".2p"),
      branch_table_format = d3.format (".4f"),
      analysis_data = null,
      render_color_bar = true,
      which_model = "Constrained model",
      color_legend_id = 'color_legend';

  var tree = d3.layout.phylotree(container)
      .size([height, width])
      .separation (function (a,b) {return 0;});


  var svg = d3.select(container_id).append("svg")
      .attr("width", width)
      .attr("height", height);

  var scaling_exponent = 0.33;       

  var omega_color = d3.scale.pow().exponent(scaling_exponent)                    
                      .domain([0, 0.25, 1, 5, 10])
                      .range([ "#5e4fa2", "#3288bd", "#e6f598","#f46d43","#9e0142"])
                      .clamp(true);


  $("#expand_spacing").on("click", function (e) {
    tree.spacing_x(tree.spacing_x() + 1).update(true);
  });

  $("#compress_spacing").on ("click", function (e) {
    tree.spacing_x(tree.spacing_x() - 1).update(true);
  })

  $("#color_or_grey").on("click", function (e) {

    if ($(this).data ('color-mode') == 'gray') {
      $(this).data ('color-mode', 'color');
      d3.select (this).text ("Use grayscale");
      omega_color.range([ "#5e4fa2", "#3288bd", "#e6f598","#f46d43","#9e0142"]);
    } else {
      $(this).data ('color-mode', 'gray');
      d3.select (this).text ("Use color");
      omega_color.range(["#EEE", "#BBB","#999","#333","#000"]);    
    }

    branch_omegas = render_bs_rel_tree(analysis_data, which_model)[1];

    tree.update();
    e.preventDefault();

  });

  $("#show_color_bar").on("click", function (e) {

     render_color_bar = !render_color_bar;

     if ($(this).data ('color-bar') == 'on') {
        $(this).data ('color-mode', 'off');
        d3.select (this).html ("Show &omega; color legend");
    } else {
        $(this).data ('color-mode', 'on');
        d3.select (this).html ("Hide &omega; color legend");
    }

    render_color_scheme(color_legend_id);
    e.preventDefault();

  });

  $("#show_model").on ("click", function (e) {
     if ($(this).data ('model') == 'Unconstrained') {
        $(this).data ('model', 'Unconstrained model');
        d3.select (this).html ("Show Unconstrained model Model");
    } else {
        $(this).data ('model', 'Constrained model');
        d3.select (this).html("Show Branch-site Model");
    }
    which_model = $(this).data ('model');
    branch_omegas = render_bs_rel_tree(analysis_data, which_model)[1];
    tree.layout();
    e.preventDefault();
  });

  function render_color_scheme(svg_container) {
      console.log(omega_color);
      var svg = d3.select ("#" + svg_container).selectAll ("svg").data ([omega_color.domain()]);
      svg.enter().append ("svg");
      svg.selectAll ("*").remove();
     
      if (render_color_bar) {
          var bar_width  = 70,
              bar_height = 300,
              margins = {'bottom' : 30,
                         'top'    : 15,
                         'left'   : 40,
                         'right'  : 2};
                         
          svg.attr ("width", bar_width)
             .attr ("height", bar_height);
         
         
      
          this_grad = svg.append ("defs").append ("linearGradient")
                      .attr ("id", "_omega_bar")
                      .attr ("x1", "0%")
                      .attr ("y1", "0%")
                      .attr ("x2", "0%")
                      .attr ("y2", "100%");
         
          var omega_scale = d3.scale.pow().exponent(scaling_exponent)                    
                           .domain(d3.extent (omega_color.domain()))
                           .range ([0,1]),
              axis_scale = d3.scale.pow().exponent(scaling_exponent)                    
                           .domain(d3.extent (omega_color.domain()))
                           .range ([0,bar_height - margins['top']-margins['bottom']]);
                       
                      
         omega_color.domain().forEach (function (d) { 
          this_grad.append ("stop")
                   .attr ("offset",  "" + omega_scale (d) * 100 + "%")
                   .style ("stop-color", omega_color (d));
         });
     
         var g_container = svg.append ("g").attr ("transform", "translate(" + margins["left"] + "," + margins["top"] + ")");
     
         g_container.append ("rect").attr ("x", 0)
                            .attr ("width", bar_width - margins['left']-margins['right'])
                            .attr ("y", 0)
                            .attr ("height", bar_height - margins['top']-margins['bottom'])
                            .style ("fill", "url(#_omega_bar)");
   
     
          var draw_omega_bar  =  d3.svg.axis().scale(axis_scale)
                                   .orient ("left")
                                   .tickFormat (d3.format(".1r"))
                                   .tickValues ([0,0.01,0.1,0.5,1,2,5,10]);
                               
          var scale_bar = g_container.append("g");
          scale_bar.style ("font-size", "14")
                         .attr  ("class", "hyphy-omega-bar")
                         .call (draw_omega_bar);
                     
          scale_bar.selectAll ("text")
                         .style ("text-anchor", "right");
                     
          var x_label =_label = scale_bar.append ("g").attr("class", "hyphy-omega-bar");
          x_label = x_label.selectAll("text").data(["\u03C9"]);
          x_label.enter().append ("text");
          x_label.text (function (d) {return d})
                  .attr  ("transform", "translate(" + ( bar_width - margins['left']-margins['right'])*0.5 + "," + (bar_height - margins['bottom']) + ")")
                  .style ("text-anchor", "middle")
                  .style ("font-size", "18")
                  .attr ("dx", "0.0em")
                  .attr ("dy", "0.1em");
      }               
  }        

  function render_bs_rel_tree(json, model_id) {

    tree(json["fits"][model_id]["tree string"]).svg(svg);
   
    var svg_defs = svg.selectAll ("defs");

    if (svg_defs.empty()) {
      svg_defs = svg.append ("defs");
    }

    svg_defs.selectAll ("*").remove();
    gradID = 0;

    var local_branch_omegas = {};
    var fitted_distributions = json["fits"][model_id]["rate distributions"];
    
    for (var b in fitted_distributions) {       

       var rateD = fitted_distributions[b];

       if (rateD.length == 1) {
          local_branch_omegas[b] = {'color': omega_color (rateD[0][0])};
       } else {
          gradID ++;
          var grad_id = "branch_gradient_" + gradID;
          //create_gradient (svg_defs, grad_id, rateD);
          local_branch_omegas[b] = {'grad' : grad_id};
       }

       local_branch_omegas[b]['omegas'] = rateD;
       local_branch_omegas[b]['tooltip'] = "<b>" + b + "</b>";
       local_branch_omegas[b]['distro'] = "";

       rateD.forEach (function (d,i) {
           var omega_value = d[0] > 1e20 ? "&infin;" : omega_format (d[0]),
               omega_weight = prop_format (d[1]);
       
           local_branch_omegas[b]['tooltip'] += "<br/>&omega;<sub>" + (i+1) + "</sub> = " + omega_value + 
                                          " (" + omega_weight + ")";
           if (i) {
               local_branch_omegas[b]['distro'] += "<br/>";
           }                               
           local_branch_omegas[b]['distro'] += "&omega;<sub>" + (i+1) + "</sub> = " + omega_value + 
                                           " (" + omega_weight + ")";
        });
        local_branch_omegas[b]['tooltip'] += "<br/><i>p = " + omega_format (json["test results"]["p"]) + "</i>";
    }    
    
    tree.style_edges(function (element, data) {
      edge_colorizer (element, data);
    });

    branch_lengths = {};
    tree.get_nodes().forEach(function (d) {if (d.parent) {branch_lengths[d.name] = tree.branch_length()(d);}});
    tree.layout();
    return [branch_lengths, local_branch_omegas];
  }


  function edge_colorizer(element, data) {

    var coloration = branch_omegas[data.target.name];
    if (coloration) {
      if ('color' in coloration) {
        element.style ('stroke', coloration['color']);
      } else {
        element.style ('stroke', 'url(#' + coloration['grad'] + ')');
      }

      $(element[0][0]).tooltip({'title' : coloration['tooltip'], 'html' : true, 'trigger' : 'hover', 'container' : 'body', 'placement' : 'auto'});

    }

    // Color the FG a different color
    var is_foreground = false;

    if(global_test_set.indexOf(data.target.name) != -1) {
      is_foreground = true;
    }

    element.style ('stroke-width', branch_p_values[data.target.name] <= alpha_level ? '12' : '5')
           .style ('stroke', is_foreground ? 'red' : 'gray')
           .style ('stroke-linejoin', 'round')
           .style ('stroke-linejoin', 'round')
           .style ('stroke-linecap', 'round');
    
  }

  $("#export-phylo-png").on('click', function(e) { 
    datamonkey.save_image("png", "#tree_container"); 
  });

  $("#export-phylo-svg").on('click', function(e) { 
    datamonkey.save_image("svg", "#tree_container"); 
  });

  tree.branch_length(null);
  tree.branch_name(null);
  tree.node_span ('equal');
  tree.options ({'draw-size-bubbles' : false}, false);
  tree.options ({'selectable' : false}, false);
  tree.font_size (18);
  tree.scale_bar_font_size (14);
  tree.node_circle_size (6);
  tree.spacing_x (35, true);
  tree.style_edges(edge_colorizer);

  render_bs_rel_tree(json, "Unconstrained model");

}

datamonkey.busted.render_tree = busted_render_tree;
