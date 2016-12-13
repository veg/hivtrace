var root = this;

var datamonkey = function () {};

if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = Datamonkey;
  }
  exports.datamonkey = datamonkey;
} else {
  root.datamonkey = datamonkey;
}

datamonkey.errorModal = function (msg) {
  $('#modal-error-msg').text(msg);
  $('#errorModal').modal();
}

datamonkey.export_csv_button = function(data) {
  data = d3.csv.format(data);
  if (data != null) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data));
    pom.setAttribute('download', 'export.csv');
    pom.className = 'btn btn-default btn-sm';
    pom.innerHTML = '<span class="glyphicon glyphicon-floppy-save"></span> Download CSV';
    $("body").append(pom);
    pom.click();
    pom.remove();
  }
}

datamonkey.save_image = function(type, container) {

  var prefix = {
    xmlns: "http://www.w3.org/2000/xmlns/",
    xlink: "http://www.w3.org/1999/xlink",
    svg: "http://www.w3.org/2000/svg"
  }

  function get_styles(doc) {

    function process_stylesheet(ss) {
      try {
        if (ss.cssRules) {
          for (var i = 0; i < ss.cssRules.length; i++) {
            var rule = ss.cssRules[i];
            if (rule.type === 3) {
              // Import Rule
              process_stylesheet(rule.styleSheet);
            } else {
              // hack for illustrator crashing on descendent selectors
              if (rule.selectorText) {
                if (rule.selectorText.indexOf(">") === -1) {
                  styles += "\n" + rule.cssText;
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Could not process stylesheet : ' + ss);
      }
    }

    var styles = "",
        styleSheets = doc.styleSheets;

    if (styleSheets) {
      for (var i = 0; i < styleSheets.length; i++) {
        process_stylesheet(styleSheets[i]);
      }
    }

    return styles;

  }

  var convert_svg_to_png = function(image_string) {

    var image = document.getElementById("hyphy-chart-image");

    image.onload = function() {

      var canvas = document.getElementById("hyphy-chart-canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      var context = canvas.getContext("2d");
      context.fillStyle = "#FFFFFF";
      context.fillRect(0,0,image.width,image.height);
      context.drawImage(image, 0, 0);
      var img = canvas.toDataURL("image/png");
      var pom = document.createElement('a');
      pom.setAttribute('download', 'image.png');
      pom.href = canvas.toDataURL("image/png");     
      $("body").append(pom);
      pom.click();
      pom.remove();

    }

    image.src = image_string;

  }

  var svg = $(container).find("svg")[0];
  if (!svg) {
    svg = $(container)[0];
  }

  var styles = get_styles(window.document);

  svg.setAttribute("version", "1.1");

  var defsEl = document.createElement("defs");
  svg.insertBefore(defsEl, svg.firstChild); 

  var styleEl = document.createElement("style")
  defsEl.appendChild(styleEl);
  styleEl.setAttribute("type", "text/css");


  // removing attributes so they aren't doubled up
  svg.removeAttribute("xmlns");
  svg.removeAttribute("xlink");

  // These are needed for the svg
  if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
    svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
  }

  if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
    svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
  }

  var source = (new XMLSerializer()).serializeToString(svg).replace('</style>', '<![CDATA[' + styles + ']]></style>');
  var rect = svg.getBoundingClientRect();
  var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
  var to_download = [doctype + source]
  var image_string = 'data:image/svg+xml;base66,' + encodeURIComponent(to_download);

  if(type == "png") {
    convert_svg_to_png(image_string);
  } else {
    var pom = document.createElement('a');
    pom.setAttribute('download', 'image.svg');
    pom.setAttribute('href', image_string);
    $("body").append(pom);
    pom.click();
    pom.remove();
  }

}

datamonkey.jobQueue = function(container) {

  // Load template
  _.templateSettings = {
    evaluate    : /\{\%(.+?)\%\}/g,
    interpolate : /\{\{(.+?)\}\}/g,
    variable    : "rc"
  };

  d3.json( '/jobqueue', function(data) {

    var job_queue = _.template(
      $("script.job-queue").html()
    );

    var job_queue_html = job_queue(data);
    $("#job-queue-panel").find('table').remove();
    $(container).append(job_queue_html);

  });

}

datamonkey.status_check = function () {

  // Check if there are any status checkers on the page
  if($(".status-checker").length) {
    // Check health status and report back to element
    var url = "/clusterhealth";
    d3.json(url, function(data) {
      // Add appropriate class based on result
      if (data["successful_connection"]) {
        d3.select('.status-checker').classed({'status-healthy': true, 'status-troubled': false})
        $(".status-checker").attr( "title", 'Cluster Status : Healthy');
      } else {
        d3.select('.status-checker').classed({'status-healthy': false, 'status-troubled': true})
        $(".status-checker").attr( "title", 'Cluster Status : Troubled; ' + data.msg.description);
      }
    });
  }
}

datamonkey.validate_date = function () {

  // Check that it is not empty
  if($(this).val().length == 0) {
    $(this).next('.help-block').remove();
    $(this).parent().removeClass('has-success');
    $(this).parent().addClass('has-error');

    jQuery('<span/>', {
          class: 'help-block',
          text : 'Field is empty'
      }).insertAfter($(this));

  } else if(isNaN(Date.parse($(this).val()))) {
    $(this).next('.help-block').remove();
    $(this).parent().removeClass('has-success');
    $(this).parent().addClass('has-error');

    jQuery('<span/>', {
          class: 'help-block',
          text : 'Date format should be in the format YYYY-mm-dd'
      }).insertAfter($(this));

  } else {
    $(this).parent().removeClass('has-error');
    $(this).parent().addClass('has-success');
    $(this).next('.help-block').remove();
  }

}

$( document ).ready( function () {
  $(function () {$('[data-toggle="tooltip"]').tooltip()});
  $('#datamonkey-header').collapse ();
  
  var initial_padding = $("body").css("padding-top");
  
  $("#collapse_nav_bar").on ("click", function (e) {
    $('#datamonkey-header').collapse ('toggle');
    $(this).find ("i").toggleClass ("fa-times-circle fa-eye");
    var new_padding =  $("body").css("padding-top") == initial_padding ? "5px" : initial_padding;
    d3.select ("body").transition ().style ("padding-top", new_padding);
  });
});


function datamonkey_alignment_viewer(options) {

  var self = this;

 function initialize(options) {
    if (!options) options = {};

    //-- Public
    self.container = $('div.seq-viewer');
    self.dataset = [];
    self.cell_size = 30;
    self.zoom = { low: 0.0, high: 1.0 };

    self.dataset = [
      "TREESPARROW_HENAN_1_2004",
      "HUMAN_VIETNAM_CL105_2005", 
      "TREESPARROW_HENAN_4_2004",
      "CHICKEN_HEBEI_326_2005",
      "CHICKEN_HONGKONG_915_97",
      "VIETNAM_3062_2004",
      "GOOSE_HONGKONG_W355_97",
      "DUCK_HONGKONG_Y283_97",
      "DUCK_VIETNAM_376_2005",
      "MALLARD_VIETNAM_16_2003",
      "CHICKEN_THAILAND_KANCHANABURI_CK_160_2005",
      "DUCK_GUANGZHOU_20_2005",
      "CK_HK_WF157_2003",
      "SWINE_ANHUI_2004",
      "DUCK_VIETNAM_272_2005",
      "HONGKONG_97_98",
      "GOOSE_SHANTOU_2216_2005",
      "TREESPARROW_HENAN_3_2004",
      "PEREGRINEFALCON_HK_D0028_2004",
      "TREESPARROW_HENAN_2_2004",
      "HONGKONG_538_97"
    ]

    //-- Private
    //self.xScale; 
    //self.yScale;
    //self.mean = 0;
    //self.tooltip;
    //self.infotip;

    draw();

  };


  function draw() {

    var width = $(window).width();
    var height = $(window).height() - Math.floor($('.navbar').height()*1.1);
    var offset = 15;
  
    //initial draw
    self.paper = d3.selectAll( self.container.selector )
      .append('svg')
        .attr("width", width)
        .attr("height", height);

    // Y Legend 
    var yAxisAttrs = { 'class'  : 'yAxis',
                       'height' : height,
                       'width'  : width
                     };

    self.yAxis = self.paper
      .append('g')
        .attr(yAxisAttrs);


    self.yAxisLabels = self.yAxis
      .append('g')
        .attr('class', 'sequence-labels');

    var legenedHLabel = self.yAxisLabels
        .selectAll('sequence-label')
          .data(self.dataset);

    var legenedHLabelAttrs = { 'class' : 'sequence-label',
                               'y' : function (d, i) { return i * self.cell_size + offset; },
                               'fill' : '#333',
                               'dominant-baseline' : 'central',
                               'text-anchor' : 'right',
                               'font-family' : '"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif', };

    legenedHLabel.enter()
      .append('text')
        .attr(legenedHLabelAttrs)
        .text(function(d) { return d; });

    legenedHLabel.exit()
      .remove();

    self.xScale = d3.scale.linear()
        .domain([
                (function() {
                  if(d3.min(values) < 0) {
                    return (d3.min(values));
                  } else {
                    return (d3.max(values));
                  }
                })(),

                 (d3.max(values) + maxMean)*self.zoom.high
                 ])
        .range([0, width]);


    // X Legend 
    self.xAxis = d3.svg.axis()
        .scale(self.xScale)
        .orient('top')

    var xAxisHeaderAttrs = { 'class'     : 'xAxis header',
                             'height'    : 20,
                             'width'     : 2000,
                             'transform' : 'translate('+ (width) +', 0)', 
                           }

    self.xAxisHeader = self.paper
      .append('g')
        .attr(xAxisHeaderAttrs);

    self.xAxisHeader
      .style('fill', 'none')
      .call(self.xAxis);

    self.yScale = d3.scale.ordinal()
      .domain( d3.range(self.dataset.length) )
      .rangeRoundBands([0, height], 0.25);

    var xGridAttrs = { 'transform' : 'translate(0,'+ self.yScale(self.dataset.length) +')',
                       'fill' : '#ccc',
                       'font-size' : '12px',
                       'font-family' : '"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif', };

    self.xAxisHeader
      .append('g')
        .attr('class', 'guide_lines_x')
        .call( self.xAxis.tickFormat('').tickSize(-height,0,0));

    var xAxisHeaderStyles = { 'fill' : '#000',
                              'font-size' : 12,
                              'font-family' : '"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif'};

    self.xAxisHeader.selectAll('g.xAxis.header g text').style(xAxisHeaderStyles);
    var xAxisTickLineStyles = { 'stroke' : '#CCC', };
    self.xAxisHeader.selectAll('g.guide_lines_x g line').style(xAxisTickLineStyles);

  }


  initialize(options);
  return this;

}

datamonkey.alignment_viewer = datamonkey_alignment_viewer;

function datamonkey_cancel(self) {
    $(self).show().next().remove();
}

function datamonkey_change(value, self) {
    $(self).text (value)
        .show()
        .next().remove();
}

function datamonkey_check_valid_value (value, value_list, previous) {
    if (value.length) {
        if (value == previous) {
            return true;
        }
        if (value_list) {
            return !(value in value_list);
        }
        return true;
    }
    return false;
}

function datamonkey_editable(self, value_list, edit_group) {
    $(self).hide();
    
    if (edit_group) {
        edit_group.filter (function (d) {return d[1];}).forEach (function (d) {datamonkey_cancel (d[0]);});
        edit_group.forEach (function (d) {d[1] = d[0] === self;});
    }

    var div            = d3.select ($(self).parent()[0]).append ("div").classed ("input-group", true);
        text_field     = div.append ("input").style ("margin-right","1em"),
        button_ok      = div.append ("button").classed ("btn btn-primary btn-xs", true),
        button_cancel  = div.append ("button").classed ("btn btn-primary btn-xs", true),
        current_value  = $(self).text();

    button_ok.append ("i").classed ("glyphicon glyphicon-ok", true);
    button_cancel.append ("i").classed ("glyphicon glyphicon-remove", true);


    $(text_field[0]).val(current_value).on ("input propertychange", function (event) {
        button_ok.property ("disabled", !datamonkey_check_valid_value ($(this).val(), value_list,current_value));
    });

    button_ok.on ("click", function (event, datum) {
        datamonkey_change ($(text_field[0]).val(), self);
    });

    button_cancel.on ("click", function (event, datum) {
        datamonkey_cancel (self);
    });
}

datamonkey.editable = datamonkey_editable;

function datamonkey_get_styles(doc) {
  var styles = "",
      styleSheets = doc.styleSheets;

  if (styleSheets) {
    for (var i = 0; i < styleSheets.length; i++) {
      processStyleSheet(styleSheets[i]);
    }
  }

  function processStyleSheet(ss) {
    if (ss.cssRules) {
      for (var i = 0; i < ss.cssRules.length; i++) {
        var rule = ss.cssRules[i];
        if (rule.type === 3) {
          // Import Rule
          processStyleSheet(rule.styleSheet);
        } else {
          // hack for illustrator crashing on descendent selectors
          if (rule.selectorText) {
            if (rule.selectorText.indexOf(">") === -1) {
              styles += "\n" + rule.cssText;
            }
          }
        }
      }
    }
  }
  return styles;
}


function datamonkey_save_newick_to_file() {
  var top_modal_container = "#neighbor-tree-modal";
  var nwk = $(top_modal_container).data("tree");
  var pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/octet-stream;charset=utf-8,' + encodeURIComponent(nwk));
  pom.setAttribute('download', 'nwk.txt');
  $("body").append(pom);
  pom.click();
  pom.remove();
}

function datamonkey_convert_svg_to_png(image_string) {
  var image = document.getElementById("image");
  image.src = image_string;

  image.onload = function() {
    var canvas = document.getElementById("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    var context = canvas.getContext("2d");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0,0,image.width,image.height);
    context.drawImage(image, 0, 0);
    var img = canvas.toDataURL("image/png");

    var pom = document.createElement('a');
    pom.setAttribute('download', 'phylotree.png');
    pom.href = canvas.toDataURL("image/png");
    $("body").append(pom);
    pom.click();
    pom.remove();
  }
}

function datamonkey_save_newick_tree(type) {

  var prefix = {
    xmlns: "http://www.w3.org/2000/xmlns/",
    xlink: "http://www.w3.org/1999/xlink",
    svg: "http://www.w3.org/2000/svg"
  }

  var tree_container = "#tree_container";
  var svg = $("#tree_container").find("svg")[0];
  var styles = datamonkey_get_styles(window.document);

  svg.setAttribute("version", "1.1");

  var defsEl = document.createElement("defs");
  svg.insertBefore(defsEl, svg.firstChild);

  var styleEl = document.createElement("style")
  defsEl.appendChild(styleEl);
  styleEl.setAttribute("type", "text/css");


  // removing attributes so they aren't doubled up
  svg.removeAttribute("xmlns");
  svg.removeAttribute("xlink");

  // These are needed for the svg
  if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
    svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
  }

  if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
    svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
  }

  var source = (new XMLSerializer()).serializeToString(svg).replace('</style>', '<![CDATA[' + styles + ']]></style>');
  var rect = svg.getBoundingClientRect();
  var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
  var to_download = [doctype + source]
  var image_string = 'data:image/svg+xml;base66,' + encodeURIComponent(to_download);

  if(type == "png") {
    datamonkey_convert_svg_to_png(image_string)
  } else {
    var pom = document.createElement('a');
    pom.setAttribute('download', 'phylotree.svg');
    pom.setAttribute('href', image_string);
    $("body").append(pom);
    pom.click();
    pom.remove();
  }

}

function datamonkey_validate_email(email) {
  if($(this).find("input[name='receive_mail']")[0].checked) {
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if(regex.test($(this).find("input[name='mail']").val())) {
       // Give them green. They like that.
      $(this).removeClass('has-error');
      $(this).addClass('has-success');
      $(this).next('.help-block').remove();
    } else {
      $(this).next('.help-block').remove();
      $(this).removeClass('has-error');
      $(this).removeClass('has-success');
      $(this).addClass('has-error');
      var span = jQuery('<span/>', {
            class: 'help-block col-lg-9 pull-right',
            text : 'Invalid Email'
        }).insertAfter($(this));
    }
  } else {
    $(this).removeClass('has-error');
    $(this).removeClass('has-success');
    $(this).next('.help-block').remove();
  }

}

function datamonkey_describe_vector (vector, as_list) {

    vector.sort (d3.ascending);

    var d = {'min' : d3.min (vector),
             'max' : d3.max (vector),
             'median' : d3.median (vector),
             'Q1' : d3.quantile (vector, 0.25),
             'Q3' : d3.quantile (vector, 0.75),
             'mean': d3.mean (vector)};

    if (as_list) {

        d = "<pre>Range  :" + d['min'] + "-" + d['max'] + "\n"
            +    "IQR    :" + d['Q1'] + "-" + d['Q3'] + "\n"
            +    "Mean   :" + d['mean'] + "\n"
            +    "Median :" + d['median'] + "\n"
            + "</pre>";

        /*d =
        "<dl class = 'dl-horizontal'>" +
        "<dt>Range</dt><dd>" + d['min'] + "-" + d['max'] + "</dd>" +
        "<dt>IQR</dt><dd>" + d['Q1'] + "-" + d['Q3'] +  "</dd>" +
        "<dt>Mean</dt><dd>" + d['mean'] +  "</dd>" +
        "<dt>Median</dt><dd>" + d['median'] + "</dd></dl>";*/
    }

    return d;

}

function datamonkey_export_handler (data, filename, mimeType) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:' + (mimeType || 'text/plain')  +  ';charset=utf-8,' + encodeURIComponent(data));
    pom.setAttribute('download', filename || "download.tsv");
    pom.click();
    pom.remove();
}


function datamonkey_table_to_text (table_id, sep) {
    sep = sep || "\t";
    var header_row = [];
    d3.select (table_id + " thead").selectAll ("th").each (function () {header_row.push (d3.select(this).text())});
    var data_rows = [];
    d3.select (table_id + " tbody").selectAll ("tr").each (function (d,i) {data_rows.push ([]); d3.select (this).selectAll ("td").each (function () {data_rows[i].push (d3.select(this).text())})});

    return header_row.join (sep) + "\n" +
           data_rows.map (function (d) {return d.join (sep);}).join ("\n");
}

function datamonkey_capitalize(s) {
  if(s.length > 0) {
    return s[0].toUpperCase() + s.slice(1);
  } else {
    return s;
  }
}

function datamonkey_count_partitions (json) {
    try {
      return _.keys (json).length;
    } catch (e) {
        // ignore errors
    }
    return 0;
}

function datamonkey_sum (object, accessor) {
    accessor = accessor || function (value) {return value;};
    return _.reduce (object, function (sum, value, index) {return sum + accessor (value, index);},0);
}

function datamonkey_count_sites_from_partitions (json) {
    try {
        return datamonkey_sum (json ["partitions"], function (value) {return value["coverage"][0].length;});
    } catch (e) {
        // ignore errors
    }
    return 0;
}

function datamonkey_filter_list (list, predicate, context) {
    var result = {};
    predicate = _.bind (predicate, context);
    _.each (list, _.bind(function (value, key) {
        if (predicate (value, key)) {
            result[key] = value;
        }
      }, context)
    );
    return result;
}

function datamonkey_map_list (list, transform, context) {
    var result = {};
    transform = _.bind (transform, context);
   _.each (list, _.bind(function (value, key) {
        result[key] = transform(value,key);
      }, context)
    );
    return result;
}

datamonkey.helpers = new Object;
datamonkey.helpers.save_newick_to_file = datamonkey_save_newick_to_file;
datamonkey.helpers.convert_svg_to_png = datamonkey_convert_svg_to_png;
datamonkey.helpers.save_newick_tree = datamonkey_save_newick_tree;
datamonkey.helpers.validate_email = datamonkey_validate_email;
datamonkey.helpers.describe_vector = datamonkey_describe_vector;
datamonkey.helpers.table_to_text = datamonkey_table_to_text;
datamonkey.helpers.export_handler = datamonkey_export_handler;
datamonkey.helpers.capitalize = datamonkey_capitalize;
datamonkey.helpers.countPartitionsJSON = datamonkey_count_partitions;
datamonkey.helpers.countSitesFromPartitionsJSON = datamonkey_count_sites_from_partitions;
datamonkey.helpers.sum = datamonkey_sum;
datamonkey.helpers.filter=datamonkey_filter_list;
datamonkey.helpers.map=datamonkey_map_list;

function set_tree_handlers(tree_object) {
    $("[data-direction]").on("click", function(e) {
        var which_function = $(this).data("direction") == 'vertical' ? tree_object.spacing_x : tree_object.spacing_y;
        which_function(which_function() + (+$(this).data("amount"))).update();
    });


    $(".phylotree-layout-mode").on("change", function(e) {
        if ($(this).is(':checked')) {
            if (tree_object.radial() != ($(this).data("mode") == "radial")) {
                tree_object.radial(!tree_object.radial()).placenodes().update();
            }
        }
    });

    $(".phylotree-align-toggler").on("change", function(e) {
        if ($(this).is(':checked')) {
            if (tree_object.align_tips($(this).data("align") == "right")) {
                tree_object.placenodes().update();
            }
        }
    });

    $("#sort_original").on("click", function(e) {
        tree_object.resort_children(function(a, b) {
            return a["original_child_order"] - b["original_child_order"];
        });

        e.preventDefault();

    });

    $("#sort_ascending").on("click", function(e) {
        sort_nodes(true);
        e.preventDefault();
    });

    $("#sort_descending").on("click", function(e) {
        sort_nodes(false);
        e.preventDefault();
    });

    function sort_nodes(asc) {
        tree_object.traverse_and_compute(function(n) {
            var d = 1;
            if (n.children && n.children.length) {
                d += d3.max(n.children, function(d) {
                    return d["count_depth"];
                });
            }
            n["count_depth"] = d;
        });
        tree_object.resort_children(function(a, b) {
            return (a["count_depth"] - b["count_depth"]) * (asc ? 1 : -1);
        });
    }
}
var root = this;

if (!datamonkey) {
  datamonkey = function() {};
}

datamonkey.busted = function () {};

if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = datamonkey.busted;
  }
  exports.datamonkey.busted = datamonkey.busted;

} else {
  root.datamonkey.busted = datamonkey.busted;
}


function busted_render_summary(json) {

  var fit_format = d3.format (".2f"),
      prop_format = d3.format (".2p"),
      omega_format = d3.format (".3r");

  var format_run_time = function(seconds) {

    var duration_string = "";
    seconds = parseFloat (seconds);
    var split_array = [Math.floor (seconds/(24*3600)) ,Math.floor (seconds/3600) % 24, Math.floor (seconds/60) % 60,seconds % 60],
        quals = ["d.", "hrs.", "min.", "sec."];
        
    split_array.forEach (function (d,i) {
        if (d) {
            duration_string += " " + d + " " + quals[i];
        }
    });
    
    return duration_string;

  }

  var branch_p_values = {};
  
  var rate_distro_by_branch = {},
      branch_count = 0,
      selected_count = 0,
      tested_count = 0;
  
  var for_branch_table = [];
  
  //var tree_info = render_bs_rel_tree (json, "Unconstrained model");
  
  //var branch_lengths   = tree_info[0],
  //    tested_branches  = {};
  
  //var branch_omegas = tree_info[1];
  
  for (var p in json["test results"]) {
    branch_p_values[p] = json["test results"]["p"];
    if (branch_p_values[p] <= 0.05) {
        selected_count++;
    }
  }
  
  var fitted_distributions = json["fits"]["Unconstrained model"]["rate distributions"];
  
  for (var b in fitted_distributions) {
     //for_branch_table.push ([b + (tested_branches[b] ? "" : ""),branch_lengths[b],0,0,0]);
     try {
          for_branch_table[branch_count][2] = json["test results"][b]["LRT"];
          for_branch_table[branch_count][3] = json["test results"][b]["p"];
          for_branch_table[branch_count][4] = json["test results"][b]["uncorrected p"];
     } catch (e) {
     }
     
     var rateD = fitted_distributions[b];
     rate_distro_by_branch[b] = rateD; 
     //for_branch_table[branch_count].push (branch_omegas[b]['distro']);
     branch_count+=1;
  }
  
  // render summary data
  var total_tree_length =  d3.format("g")(json["fits"]["Unconstrained model"]["tree length"]); 
  
  for_branch_table = for_branch_table.sort (function (a,b) {return a[4]-b[4];});

  d3.select ('#summary-test-result').text (json['test results']['p'] <= 0.05 ? "evidence" : "no evidence");
  d3.select ('#summary-test-pvalue').text (d3.format(".3f")(json['test results']['p']));
  d3.select ('#summary-pmid').text ("PubMed ID " + json['PMID'])
                             .attr ("href", "http://www.ncbi.nlm.nih.gov/pubmed/" + json['PMID']);
  d3.select ('#summary-total-runtime').text (format_run_time(json['timers']['overall']));
  d3.select ('#summary-total-branches').text (branch_count);
  d3.select ('#summary-tested-branches').text (tested_count);
  d3.select ('#summary-selected-branches').text (selected_count);
  
  has_background = json['background'];
      
  var model_rows = [[],[]];
  
  if (has_background) {
      model_rows.push ([]);
  }
  
  for (k = 0; k < 2 + has_background; k++)  {

      var access_key,
          secondary_key,
          only_distro = 0;
          
      if (k == 0) {

          access_key = 'Unconstrained model';
          secondary_key = 'FG';
          model_rows[k].push ('Unconstrained Model');
          only_distro = 0;

      } else {

          if (has_background && k == 1) {
              model_rows[k].push ('(background branches)');
              secondary_key = 'BG';
              only_distro = 1;
          } else {
              access_key = 'Constrained model';
              if (! (access_key in json['fits'])) {
                break;
              }
              model_rows[k].push ('Constrained Model');                    
              secondary_key = 'FG';
              only_distro = 0;
          }
      }
      
      try {
        model_rows[k].push (only_distro ? '' : fit_format(json['fits'][access_key]['log-likelihood']));
        model_rows[k].push (only_distro ? '' : json['fits'][access_key]['parameters']);
        model_rows[k].push (only_distro ? '' : fit_format(json['fits'][access_key]['AIC-c']));
        model_rows[k].push (only_distro ? '' : format_run_time(json['fits'][access_key]['runtime']));
        model_rows[k].push (only_distro ? '' : fit_format(json['fits'][access_key]['tree length']));

        for (j = 0; j < 3; j++) {
         model_rows[k].push (   omega_format(json['fits'][access_key]['rate distributions'][secondary_key][j][0]) + " (" +
                                prop_format(json['fits'][access_key]['rate distributions'][secondary_key][j][1]) + ")");
        }
      } catch(e) {
        datamonkey.errorModal(e);
      }
  }
                             
  model_rows = d3.select ('#summary-model-table').selectAll ("tr").data (model_rows);
  model_rows.enter().append ('tr');
  model_rows.exit().remove ();
  model_rows = model_rows.selectAll ("td").data (function (d) {return d;});
  model_rows.enter().append ("td");
  model_rows.html (function (d) {return d;});
  
}

datamonkey.busted.render_summary = busted_render_summary;


var BSRELSummary = React.createClass({displayName: "BSRELSummary",

  float_format : d3.format(".2f"),

  countBranchesTested: function(branches_tested) {

    if(branches_tested) {
      return branches_tested.split(';').length;
    } else {
      return 0;
    }

  },

  getBranchesWithEvidence : function(test_results) {

    var self = this;
    return _.filter(test_results, function(d) { return d.p <= .05 }).length;

  },

  getTestBranches : function(test_results) {

    var self = this;
    return _.filter(test_results, function(d) { return d.tested > 0 }).length;

  },

  getTotalBranches : function(test_results) {

    var self = this;
    return _.keys(test_results).length;

  },

  getInitialState: function() {

    var self = this;

    return { 
              branches_with_evidence : this.getBranchesWithEvidence(self.props.test_results), 
              test_branches : this.getTestBranches(self.props.test_results),
              total_branches : this.getTotalBranches(self.props.test_results)
           };
  },

  componentWillReceiveProps: function(nextProps) {

    this.setState({
                    branches_with_evidence : this.getBranchesWithEvidence(nextProps.test_results), 
                    test_branches : this.getTestBranches(nextProps.test_results),
                    total_branches : this.getTotalBranches(nextProps.test_results)
                  });

  },

  render: function() {

    var self = this;

    return (
          React.createElement("ul", {className: "list-group"}, 
              React.createElement("li", {className: "list-group-item list-group-item-info"}, 
                  React.createElement("h3", {className: "list-group-item-heading"}, 
                    React.createElement("i", {className: "fa fa-list"}), 
                    React.createElement("span", {id: "summary-method-name"}, "Adaptive branch site REL"), " summary"
                  ), 
                  React.createElement("p", {className: "list-group-item-text lead"}, 
                    "Evidence", React.createElement("sup", null, "†"), " of episodic diversifying selection was found on",  
                      React.createElement("strong", null, " ", self.state.branches_with_evidence), " out of",  
                      React.createElement("span", null, " ", self.state.test_branches), " tested branches" + ' ' + 
                      "(", React.createElement("span", null, self.state.total_branches), " total branches)."
                  ), 
                  React.createElement("p", null, 
                    React.createElement("small", null, 
                      React.createElement("sup", null, "†"), React.createElement("abbr", {title: "Likelihood Ratio Test"}, "LRT"), " p ≤ 0.05, corrected for multiple testing."
                    )
                  ), 
                  React.createElement("p", null, 
                    React.createElement("small", null, 
                      "Please cite ", React.createElement("a", {href: "http://www.ncbi.nlm.nih.gov/pubmed/25697341", id: "summary-pmid", target: "_blank"}, "PMID 25697341"), " if you use this result in a publication, presentation, or other scientific work."
                    )
                  )
              )
          )
        )
  }

});

// Will need to make a call to this
// omega distributions
function render_absrel_summary(test_results, pmid, element) {
  React.render(
    React.createElement(BSRELSummary, {test_results: test_results, pmid: pmid}),
    document.getElementById(element)
  );
}


var BSREL = React.createClass({displayName: "BSREL",

  float_format : d3.format(".2f"),

  loadFromServer : function() {

    var self = this;
    d3.json(this.props.url, function(data) {

      data["fits"]["MG94"]["branch-annotations"] = self.formatBranchAnnotations(data, "MG94");
      data["fits"]["Full model"]["branch-annotations"] = self.formatBranchAnnotations(data, "Full model");

      // GH-#18 Add omega annotation tag
      data["fits"]["MG94"]["annotation-tag"] = "ω";
      data["fits"]["Full model"]["annotation-tag"] = "ω";


      var annotations = data["fits"]["Full model"]["branch-annotations"],
          json = data,
          pmid = data["PMID"],
          test_results = data["test results"];

      self.setState({
                      annotations : annotations,
                      json : json,
                      pmid : pmid,
                      test_results : test_results
                    });

    });

  },

  getDefaultProps: function() {

    var edgeColorizer = function (element, data) {

        var self = this;

        var svg = d3.select("#tree_container svg"),
            svg_defs = d3.select(".phylotree-definitions");

        if (svg_defs.empty()) {
          svg_defs = svg.append("defs")
                      .attr("class", "phylotree-definitions")
        }

        // clear existing linearGradients

        var scaling_exponent = 1./3,
            omega_format = d3.format(".3r"),
            prop_format = d3.format(".2p"),
            fit_format = d3.format(".2f"),
            p_value_format = d3.format(".4f");

        self.omega_color = d3.scale.pow().exponent(scaling_exponent)
            .domain([0, 0.25, 1, 5, 10])
            .range(
              self.options()["color-fill"]
                ? ["#DDDDDD", "#AAAAAA", "#888888", "#444444", "#000000"]
                : ["#6e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"])
            .clamp(true);


        var createBranchGradient = function(node) {

            function generateGradient(svg_defs, grad_id, annotations, already_cumulative) {

                var current_weight = 0;
                var this_grad = svg_defs.append("linearGradient")
                    .attr("id", grad_id);

                annotations.forEach(function(d, i) {

                    if (d.prop) {
                        var new_weight = current_weight + d.prop;
                        this_grad.append("stop")
                            .attr("offset", "" + current_weight * 100 + "%")
                            .style("stop-color", self.omega_color(d.omega));
                        this_grad.append("stop")
                            .attr("offset", "" + new_weight * 100 + "%")
                            .style("stop-color", self.omega_color(d.omega));
                        current_weight = new_weight;
                    }
                });
            }

            // Create svg definitions
            if(self.gradient_count == undefined) {
              self.gradient_count = 0;
            }

            if(node.annotations) {

              if (node.annotations.length == 1) {
                node['color'] = self.omega_color(node.annotations[0]["omega"]);
              } else {
                self.gradient_count++;
                var grad_id = "branch_gradient_" + self.gradient_count;
                generateGradient(svg_defs, grad_id, node.annotations.omegas);
                node['grad'] = grad_id;
              }

            }
        }

        var annotations = data.target.annotations,
            alpha_level = 0.05,
            tooltip = "<b>" + data.target.name + "</b>",
            reference_omega_weight =  prop_format(0),
            distro = '';

        if (annotations) {

            reference_omega_weight = annotations.omegas[0].prop;

            annotations.omegas.forEach(function(d, i) {

                var omega_value = d.omega > 1e20 ? "&infin;" : omega_format(d.omega),
                    omega_weight = prop_format(d.prop);

                tooltip += "<br/>&omega;<sub>" + (i + 1) + "</sub> = " + omega_value +
                    " (" + omega_weight + ")";

                if (i) {
                  distro += "<br/>";
                }

                distro += "&omega;<sub>" + (i + 1) + "</sub> = " + omega_value +
                    " (" + omega_weight + ")";


            });

            tooltip += "<br/><i>p = " + omega_format(annotations["p"]) + "</i>";

            $(element[0][0]).tooltip({
                'title': tooltip,
                'html': true,
                'trigger': 'hover',
                'container': 'body',
                'placement': 'auto'
            });

            createBranchGradient(data.target);

            if(data.target.grad) {
              element.style('stroke', 'url(#' + data.target.grad + ')');
            } else {
              element.style('stroke', data.target.color);
            }

            element.style('stroke-width', annotations["p"] <= alpha_level ? '12' : '5')
                .style('stroke-linejoin', 'round')
                .style('stroke-linecap', 'round');

      }

    };

    return {
      edgeColorizer : edgeColorizer
    };

  },

  getInitialState: function() {

    var tree_settings = {
        'omegaPlot': {},
        'tree-options': {
            /* value arrays have the following meaning
                [0] - the value of the attribute
                [1] - does the change in attribute value trigger tree re-layout?
            */
            'hyphy-tree-model': ['Full model', true],
            'hyphy-tree-highlight': [null, false],
            'hyphy-tree-branch-lengths': [true, true],
            'hyphy-tree-hide-legend': [false, true],
            'hyphy-tree-fill-color': [false, true]
        },
        'suppress-tree-render': false,
        'chart-append-html' : true,
        'edgeColorizer' : this.props.edgeColorizer
    };



    return {
              annotations : null,
              json : null,
              pmid : null,
              settings : tree_settings,
              test_results : null,
              tree : null,
           };

  },

  componentWillMount: function() {
    this.loadFromServer();
    this.setEvents();
  },

  setEvents : function() {

    var self = this;

    $("#datamonkey-absrel-json-file").on("change", function(e) {
        var files = e.target.files; // FileList object

        if (files.length == 1) {
            var f = files[0];
            var reader = new FileReader();

            reader.onload = (function(theFile) {
                return function(e) {
                  var data = JSON.parse(this.result);
                  data["fits"]["MG94"]["branch-annotations"] = self.formatBranchAnnotations(data, "MG94");
                  data["fits"]["Full model"]["branch-annotations"] = self.formatBranchAnnotations(data, "Full model");

                  var annotations = data["fits"]["Full model"]["branch-annotations"],
                      json = data,
                      pmid = data["PMID"],
                      test_results = data["test results"];

                  self.setState({
                                  annotations : annotations,
                                  json : json,
                                  pmid : pmid,
                                  test_results : test_results
                                });

                };
            })(f);
            reader.readAsText(f);
        }

        $("#datamonkey-absrel-toggle-here").dropdown("toggle");
        e.preventDefault();
    });


  },

  formatBranchAnnotations : function(json, key) {

    var initial_branch_annotations = json["fits"][key]["branch-annotations"];

    if(!initial_branch_annotations) {
      initial_branch_annotations = json["fits"][key]["rate distributions"];
    }

    // Iterate over objects
    branch_annotations = _.mapObject(initial_branch_annotations, function(val, key) {

      var vals = [];
        try {
          vals = JSON.parse(val);
        } catch (e) {
          vals = val;
        }

      var omegas = {"omegas" : _.map(vals, function(d) { return _.object(["omega","prop"], d)})};
      var test_results = _.clone(json["test results"][key]);
      _.extend(test_results, omegas);
      return test_results;

    });

    return branch_annotations;

  },

  initialize : function() {

    var model_fits_id = "#hyphy-model-fits",
        omega_plots_id = "#hyphy-omega-plots",
        summary_id = "#hyphy-relax-summary",
        tree_id = "#tree-tab";

  },

  render: function() {

    var self = this;

    return (
        React.createElement("div", {className: "tab-content"}, 
            React.createElement("div", {className: "tab-pane active", id: "summary-tab"}, 

                React.createElement("div", {className: "row"}, 
                  React.createElement("div", {id: "summary-div", className: "col-md-12"}, 
                    React.createElement(BSRELSummary, {test_results: self.state.test_results, 
                                  pmid: self.state.pmid})
                  )
                ), 

                React.createElement("div", {className: "row"}, 
                    React.createElement("div", {id: "hyphy-tree-summary", className: "col-md-6"}, 
                      React.createElement(TreeSummary, {json: self.state.json})
                    ), 
                    React.createElement("div", {id: "hyphy-model-fits", className: "col-md-6"}, 
                      React.createElement(ModelFits, {json: self.state.json})
                    )
                )
            ), 

            React.createElement("div", {className: "tab-pane", id: "tree-tab"}, 
              React.createElement(Tree, {json: self.state.json, 
                    settings: self.state.settings})
            ), 

            React.createElement("div", {className: "tab-pane", id: "table_tab"}, 
              React.createElement(BranchTable, {tree: self.state.tree, 
                           test_results: self.state.test_results, 
                           annotations: self.state.annotations})
            )

        )
        )
  }

});



// Will need to make a call to this
// omega distributions
function render_absrel(url, element) {
  React.render(
    React.createElement(BSREL, {url: url}),
    document.getElementById(element)
  );
}

var BranchTable = React.createClass({displayName: "BranchTable",

  getInitialState: function() {

    // add the following
    var table_row_data = this.getBranchRows(this.props.tree, this.props.test_results, this.props.annotations),
        table_columns = this.getBranchColumns(table_row_data),
        initial_model_name = _.take(_.keys(this.props.annotations)),
        initial_omegas = this.props.annotations ? 
                         this.props.annotations[initial_model_name]["omegas"] : 
                         null;

    var distro_settings = {
      dimensions : { width : 600, height : 400 },
      margins : { 'left': 50, 'right': 15, 'bottom': 15, 'top': 35 },
      legend: false,
      domain : [0.00001, 10000],
      do_log_plot : true,
      k_p : null,
      plot : null,
      svg_id : "prop-chart"
    };

    return { 
             tree : this.props.tree,
             test_results : this.props.test_results,
             annotations : this.props.annotations,
             table_row_data : table_row_data, 
             table_columns : table_columns,
             current_model_name : initial_model_name,
             current_omegas : initial_omegas,
             distro_settings : distro_settings
           };
  },

  getBranchLength : function(m) {

    if(!this.state.tree) {
      return '';
    }

    return d3.format(".4f")(this.state.tree.get_node_by_name(m).attribute);
  },

  getLRT : function(branch) {
    var formatted = d3.format(".4f")(branch["LRT"]);
    if(formatted == "NaN") {
      return branch["LRT"];
    } else {
      return formatted;
    }
  },

  getPVal : function(branch) {
    return d3.format(".4f")(branch["p"]);
  },

  getUncorrectedPVal : function(branch) {
    return d3.format(".4f")(branch["uncorrected p"]);
  },

  getOmegaDistribution : function(m, annotations) {

    if(!annotations) {
      return '';
    }

    var omega_string = "";

    for(var i in annotations[m]["omegas"]) {
      var omega = parseFloat(annotations[m]["omegas"][i]["omega"]);
      var formatted_omega = "∞";
      if(omega<1e+20) {
        formatted_omega = d3.format(".3r")(omega)
      }
      omega_string += "&omega;<sub>" + (parseInt(i) + 1) + "</sub> = " + formatted_omega + " (" + d3.format(".2p")(annotations[m]["omegas"][i]["prop"]) + ")<br/>";
    }

    return omega_string;

  },

  getBranchRows : function(tree, test_results, annotations) {

    var self = this;

    var table_row_data = [],
        omega_format = d3.format(".3r"),
        prop_format = d3.format(".2p");

    for (var m in test_results) {

      var branch_row = [];
      branch = test_results[m];

      branch_row = [
        m,
        this.getBranchLength(m),
        this.getLRT(branch),
        this.getPVal(branch),
        this.getUncorrectedPVal(branch),
        this.getOmegaDistribution(m, annotations)
      ];

      table_row_data.push(branch_row);

    }

    table_row_data.sort(function(a, b) {

      if (a[0] == b[0]) {
          return a[1] < b[1] ? -1 : (a[1] == b[1] ? 0 : 1);
      }

      return a[3] - b[3];

    });

    return table_row_data;

  },

  setEvents : function() {

    var self = this;

    if(self.state.annotations) {
      var branch_table = d3.select('#table-branch-table').selectAll("tr");

      branch_table.on("click", function(d) {
        var label = d[0];
        self.setState({
                        current_model_name : label, 
                        current_omegas : self.state.annotations[label]["omegas"]
                      });
      });
    }

  },

  createDistroChart : function() {

    var self = this;

    this.settings = {
      dimensions : { width : 600, height : 400 },
      margins : { 'left': 50, 'right': 15, 'bottom': 15, 'top': 15 },
      has_zeros : true,
      legend_id : null,
      do_log_plot : true,
      k_p : null,
      plot : null,
      svg_id : "prop-chart"
    };

  },

  getBranchColumns : function(table_row_data) {

    if(table_row_data.length <= 0) {
      return null;
    }

    var name_header = '<th>Name</th>',
        length_header = '<th><abbr title="Branch Length">B</abbr></th>',
        lrt_header = '<th><abbr title="Likelihood ratio test statistic">LRT</abbr></th>',
        pvalue_header = '<th>Test p-value</th>',
        uncorrected_pvalue_header = '<th>Uncorrected p-value</th>',
        omega_header = '<th>ω distribution over sites</th>';

    // inspect table_row_data and return header
    all_columns = [ 
                    name_header,
                    length_header,
                    lrt_header,
                    pvalue_header,
                    uncorrected_pvalue_header,
                    omega_header
                  ];

    // validate each table row with its associated header

    // trim columns to length of table_row_data
    column_headers = _.take(all_columns, table_row_data[0].length)

    // remove all columns that have 0, null, or undefined rows
    items = d3.transpose(table_row_data);
    

    return column_headers;

  },

  componentWillReceiveProps: function(nextProps) {

    var table_row_data = this.getBranchRows(nextProps.tree, 
                                            nextProps.test_results, 
                                            nextProps.annotations),
        table_columns = this.getBranchColumns(table_row_data),
        initial_model_name = _.take(_.keys(nextProps.annotations)),
        initial_omegas = nextProps.annotations ? 
                         nextProps.annotations[initial_model_name]["omegas"] : 
                         null;

    var distro_settings = {
      dimensions : { width : 600, height : 400 },
      margins : { 'left': 50, 'right': 15, 'bottom': 15, 'top': 15 },
      legend: false,
      domain : [0.00001, 10000],
      do_log_plot : true,
      k_p : null,
      plot : null,
      svg_id : "prop-chart"
    };

    if(nextProps.test_results && nextProps.annotations) {
      this.setState({ 
               tree : nextProps.tree,
               test_results : nextProps.test_results,
               annotations : nextProps.annotations,
               table_row_data : table_row_data, 
               table_columns : table_columns,
               current_model_name : initial_model_name,
               current_omegas : initial_omegas,
               distro_settings : distro_settings
             });
    }

  },

  componentDidUpdate : function() {

    var branch_columns = d3.select('#table-branch-header');
    branch_columns = branch_columns.selectAll("th").data(this.state.table_columns);
    branch_columns.enter().append("th");

    branch_columns.html(function(d) {
        return d;
    });

    var branch_rows = d3.select('#table-branch-table').selectAll("tr").data(this.state.table_row_data);

    branch_rows.enter().append('tr');
    branch_rows.exit().remove();
    branch_rows.style('font-weight', function(d) {
        return d[3] <= 0.05 ? 'bold' : 'normal';
    });

    branch_rows = branch_rows.selectAll("td").data(function(d) {
        return d;
    });

    branch_rows.enter().append("td");
    branch_rows.html(function(d) {
        return d;
    });

    this.createDistroChart();
    this.setEvents();

  },

  render: function() {

    var self = this;

    return (
        React.createElement("div", {className: "row"}, 
          React.createElement("div", {id: "hyphy-branch-table", className: "col-md-7"}, 
              React.createElement("table", {className: "table table-hover table-condensed"}, 
                  React.createElement("thead", {id: "table-branch-header"}), 
                  React.createElement("tbody", {id: "table-branch-table"})
              )
          ), 

          React.createElement("div", {id: "primary-omega-tag", className: "col-md-5"}, 
            React.createElement(PropChart, {name: self.state.current_model_name, omegas: self.state.current_omegas, 
             settings: self.state.distro_settings})
          )
        )

      )
  }

});

// Will need to make a call to this
// omega distributions
function render_branch_table(tree, test_results, annotations, element) {
  React.render(
    React.createElement(BranchTable, {tree: tree, test_results: test_results, annotations: annotations}),
    $(element)[0]
  );
}

// Will need to make a call to this
// omega distributions
function rerender_branch_table(tree, test_results, annotations, element) {
  $(element).empty();
  render_branch_table(tree, test_results, annotations, element);
}


var BUSTED = React.createClass({displayName: "BUSTED",

  float_format : d3.format(".2f"),
  p_value_format : d3.format(".4f"),
  fit_format : d3.format(".2f"),

  loadFromServer : function() {

    var self = this;
    d3.json(this.props.url, function(data) {

      data["fits"]["Unconstrained model"]["branch-annotations"] = self.formatBranchAnnotations(data, "Unconstrained model");
      data["fits"]["Constrained model"]["branch-annotations"] = self.formatBranchAnnotations(data, "Constrained model");

      // rename rate distributions
      data["fits"]["Unconstrained model"]["rate-distributions"] = data["fits"]["Unconstrained model"]["rate distributions"];
      data["fits"]["Constrained model"]["rate-distributions"] = data["fits"]["Constrained model"]["rate distributions"];

      // set display order
      data["fits"]["Unconstrained model"]["display-order"] = 0;
      data["fits"]["Constrained model"]["display-order"] = 1;

      var json = data,
          pmid = "25701167",
          pmid_text = "PubMed ID " + pmid,
          pmid_href = "http://www.ncbi.nlm.nih.gov/pubmed/" + pmid,
          p = json["test results"]["p"],
          test_result = p <= 0.05 ? "evidence" : "no evidence";

      var fg_rate = json["fits"]["Unconstrained model"]["rate distributions"]["FG"];
      var mapped_omegas = {"omegas" : _.map(fg_rate, function(d) { return _.object(["omega","prop"], d)})};

      self.setState({
                      p : p,
                      test_result : test_result,
                      json : json,
                      omegas : mapped_omegas["omegas"],
                      pmid_text : pmid_text,
                      pmid_href : pmid_href
                    });

    });

  },

  getDefaultProps: function() {

    var edgeColorizer = function(element, data) {

      var is_foreground = data.target.annotations.is_foreground,
          color_fill = this.options()["color-fill"] ? "black" : "red";

      element.style ('stroke', is_foreground ? color_fill : 'gray')
             .style ('stroke-linejoin', 'round')
             .style ('stroke-linejoin', 'round')
             .style ('stroke-linecap', 'round');
      
    }


    var tree_settings = {
        'omegaPlot': {},
        'tree-options': {
            /* value arrays have the following meaning
                [0] - the value of the attribute
                [1] - does the change in attribute value trigger tree re-layout?
            */
            'hyphy-tree-model': ["Unconstrained model", true],
            'hyphy-tree-highlight': ["RELAX.test", false],
            'hyphy-tree-branch-lengths': [true, true],
            'hyphy-tree-hide-legend': [true, false],
            'hyphy-tree-fill-color': [true, false]
        },
        'hyphy-tree-legend-type': 'discrete',
        'suppress-tree-render': false,
        'chart-append-html' : true,
        'edgeColorizer' : edgeColorizer
    };


    var distro_settings = {
      dimensions : { width : 600, height : 400 },
      margins : { 'left': 50, 'right': 15, 'bottom': 35, 'top': 35 },
      legend: false,
      domain : [0.00001, 100],
      do_log_plot : true,
      k_p : null,
      plot : null,
      svg_id : "prop-chart"
    };

    return {
      distro_settings : distro_settings,
      tree_settings : tree_settings,
      constrained_threshold : "Infinity",
      null_threshold : "-Infinity",
      model_name : "FG"
    }

  },

  getInitialState: function() {
    return {
      p : null,
      test_result : null,
      json : null,
      omegas : null,
      pmid_text : null,
      pmid_href : null
    }

  },

  setEvents : function() {

    var self = this;

    $("#json_file").on("change", function(e) {
        var files = e.target.files; // FileList object
        if (files.length == 1) {
            var f = files[0];
            var reader = new FileReader();
            reader.onload = (function(theFile) {
              return function(e) {

                var data = JSON.parse(this.result);
                data["fits"]["Unconstrained model"]["branch-annotations"] = self.formatBranchAnnotations(data, "Unconstrained model");
                data["fits"]["Constrained model"]["branch-annotations"] = self.formatBranchAnnotations(data, "Constrained model");

                // rename rate distributions
                data["fits"]["Unconstrained model"]["rate-distributions"] = data["fits"]["Unconstrained model"]["rate distributions"]
                data["fits"]["Constrained model"]["rate-distributions"] = data["fits"]["Constrained model"]["rate distributions"]

                var json = data,
                    pmid = "25701167",
                    pmid_text = "PubMed ID " + pmid,
                    pmid_href = "http://www.ncbi.nlm.nih.gov/pubmed/" + pmid,
                    p = json["test results"]["p"],
                    test_result = p <= 0.05 ? "evidence" : "no evidence";

                var fg_rate = json["fits"]["Unconstrained model"]["rate distributions"]["FG"];
                var mapped_omegas = {"omegas" : _.map(fg_rate, function(d) { return _.object(["omega","prop"], d)})};

                self.setState({
                                p : p,
                                test_result : test_result,
                                json : json,
                                omegas : mapped_omegas["omegas"],
                                pmid_text : pmid_text,
                                pmid_href : pmid_href
                              });

              }
            })(f);
            reader.readAsText(f);
        }
        $("#datamonkey-absrel-toggle-here").dropdown("toggle");
        e.preventDefault();
    });


  },

  formatBranchAnnotations : function(json, key) {

    // attach is_foreground to branch annotations
    var foreground = json["test set"].split(",");

    var tree = d3.layout.phylotree(),
        nodes = tree(json["fits"][key]["tree string"]).get_nodes(),
        node_names = _.map(nodes, function(d) { return d.name});
    
    // Iterate over objects
    branch_annotations = _.object(node_names, 
                           _.map(node_names, function(d) {
                             return { is_foreground : _.indexOf(foreground, d) > -1 }
                             })
                          );

    return branch_annotations;

  },

  initialize : function() {

    var json = this.state.json;

    if(!json) {
      return;
    }

    datamonkey.busted.render_histogram("#chart-id", json);

    // delete existing tree
    d3.select('#tree_container').select("svg").remove();

    //datamonkey.busted.render_tree('#tree_container', "body", json);
    //var svg = d3.select('#tree_container').select("svg");
    //add_dc_legend(svg);

    var fg_rate = json["fits"]["Unconstrained model"]["rate distributions"]["FG"],
        omegas  = fg_rate.map(function (r) {return r[0];}),
        weights = fg_rate.map(function (r) {return r[1];});

    var dsettings = { 
      'log'       : true,
      'legend'    : false,
      'domain'    : [0.00001, 20],
      'dimensions': {'width' : 325, 'height' : 300}
    }

    //datamonkey.busted.draw_distribution("FG", omegas, weights, dsettings);


    $("#export-dist-svg").on('click', function(e) { 
      datamonkey.save_image("svg", "#primary-omega-dist"); 
    }); 

    $("#export-dist-png").on('click', function(e) { 
      datamonkey.save_image("png", "#primary-omega-dist"); 
    }); 


  },

  componentWillMount: function() {
    this.loadFromServer();
    this.setEvents();
  },

  render: function() {

    var self = this;
    self.initialize();

    return (

      React.createElement("div", {className: "tab-content"}, 
        React.createElement("div", {className: "tab-pane active", id: "summary_tab"}, 
          React.createElement("div", {className: "row", styleName: "margin-top: 5px"}, 
            React.createElement("div", {className: "col-md-12"}, 
              React.createElement("ul", {className: "list-group"}, 
              React.createElement("li", {className: "list-group-item list-group-item-info"}, 
                React.createElement("h3", {className: "list-group-item-heading"}, 
                  React.createElement("i", {className: "fa fa-list", styleName: "margin-right: 10px"}), 
                  React.createElement("span", {id: "summary-method-name"}, "BUSTED"), " summary"), 
                  "There is ", React.createElement("strong", null, this.state.test_result), " of episodic diversifying selection, with LRT p-value of ", this.state.p, ".", 
                  React.createElement("p", null, 
                    React.createElement("small", null, "Please cite ", React.createElement("a", {href: this.state.pmid_href, id: "summary-pmid"}, this.state.pmid_text), " if you use this result in a publication, presentation, or other scientific work.")
                  )
               )
              )
            )
          ), 

           React.createElement("div", {className: "row"}, 
              React.createElement("div", {id: "hyphy-model-fits", className: "col-lg-12"}, 
                React.createElement(ModelFits, {json: self.state.json})
              )
          ), 

          React.createElement("button", {id: "export-chart-svg", type: "button", className: "btn btn-default btn-sm pull-right btn-export"}, 
            React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " Export Chart to SVG"
          ), 

          React.createElement("button", {id: "export-chart-png", type: "button", className: "btn btn-default btn-sm pull-right btn-export"}, 
            React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " Export Chart to PNG"
          ), 

          React.createElement("div", {className: "row hyphy-busted-site-table"}, 
            React.createElement("div", {id: "chart-id", className: "col-lg-8"}, 
              React.createElement("strong", null, "Model Evidence Ratios Per Site"), 
              React.createElement("div", {className: "clearfix"})
            )
          ), 


          React.createElement("div", {className: "row site-table"}, 

            React.createElement("div", {className: "col-lg-12"}, 

              React.createElement("form", {id: "er-thresholds"}, 
                React.createElement("div", {className: "form-group"}, 
                  React.createElement("label", {for: "er-constrained-threshold"}, "Constrained Evidence Ratio Threshold:"), 
                  React.createElement("input", {type: "text", className: "form-control", id: "er-constrained-threshold", defaultValue: this.props.constrained_threshold}
                  )
                ), 
                React.createElement("div", {className: "form-group"}, 
                  React.createElement("label", {for: "er-optimized-null-threshold"}, "Optimized Null Evidence Ratio Threshold:"), 
                  React.createElement("input", {type: "text", className: "form-control", id: "er-optimized-null-threshold", defaultValue: this.props.null_threshold}
                  )
                )
              ), 

              React.createElement("button", {id: "export-csv", type: "button", className: "btn btn-default btn-sm pull-right hyphy-busted-btn-export"}, 
                React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " Export Table to CSV"
              ), 

              React.createElement("button", {id: "apply-thresholds", type: "button", className: "btn btn-default btn-sm pull-right hyphy-busted-btn-export"}, 
                "Apply Thresholds"
              ), 


              React.createElement("table", {id: "sites", className: "table sites dc-data-table"}, 
                React.createElement("thead", null, 
                  React.createElement("tr", {className: "header"}, 
                    React.createElement("th", null, "Site Index"), 
                    React.createElement("th", null, "Unconstrained Likelihood"), 
                    React.createElement("th", null, "Constrained Likelihood"), 
                    React.createElement("th", null, "Optimized Null Likelihood"), 
                    React.createElement("th", null, "Constrained Evidence Ratio"), 
                    React.createElement("th", null, "Optimized Null Evidence Ratio")
                  )
                )
              )
            )
          )

        ), 

        React.createElement("div", {className: "tab-pane", id: "tree_tab"}, 

          React.createElement("div", {className: "col-md-12"}, 
            React.createElement(Tree, {json: self.state.json, 
                 settings: self.props.tree_settings})
          ), 

          React.createElement("div", {className: "col-md-12"}, 
            React.createElement("div", {id: "primary-omega-dist", className: "panel-body"}, 
              React.createElement(PropChart, {name: self.props.model_name, omegas: self.state.omegas, 
               settings: self.props.distro_settings})
            )
          )



        )
      )
    )
  }
});



// Will need to make a call to this
// omega distributions
function render_busted(url, element) {
  React.render(
    React.createElement(BUSTED, {url: url}),
    document.getElementById(element)
  );
}


function busted_render_histogram(c, json) {

  var self = this;

  // Massage data for use with crossfilter
  if (d3.keys (json ["evidence ratios"]).length == 0) { // no evidence ratios computed
    d3.selectAll (c).style ("display", "none");
    d3.selectAll (".dc-data-table").style ("display", "none");
    //d3.selectAll ('[id^="export"]').style ("display", "none");
    d3.selectAll ("#er-thresholds").style ("display", "none");
    d3.selectAll ("#apply-thresholds").style ("display", "none");
    return;
  } else {
    d3.selectAll (c).style ("display", "block");
    d3.selectAll (".dc-data-table").style ("display", "table");
    //d3.selectAll ('[id^="export"]').style ("display", "block");
    d3.selectAll ("#er-thresholds").style ("display", "block");
    d3.selectAll ("#apply-thresholds").style ("display", "block");
  }

  var erc = json["evidence ratios"]["constrained"][0];
  erc = erc.map(function(d) { return Math.log(d)})

  var test_set = json["test set"].split(",");
  var model_results = [];

  erc.forEach(function(elem, i) { 
    model_results.push({
      "site_index"          : i + 1,
      "unconstrained"       : json["profiles"]["unconstrained"][0][i],
      "constrained"         : json["profiles"]["constrained"][0][i],
      "optimized_null"      : json["profiles"]["optimized null"][0][i],
      "er_constrained"      : Math.log(json["evidence ratios"]["constrained"][0][i]),
      "er_optimized_null"   : Math.log(json["evidence ratios"]["optimized null"][0][i])
    })

  });

  var data = crossfilter(model_results);
  var site_index = data.dimension(function(d) { return d["site_index"]; });

  var sitesByConstrained = site_index.group().reduce(
    function (p, v) {
      p.constrained_evidence += +v["er_constrained"];
      p.optimized_null_evidence += +v["er_optimized_null"];
      return p;
    },
    function (p, v) {
      p.constrained_evidence -= +v["er_constrained"];
      p.optimized_null_evidence -= +v["er_optimized_null"];
      return p;
    },
    function () {
      return { constrained_evidence : 0, optimized_null_evidence : 0 };
    }
  );

  var sitesByON = site_index.group().reduce(
    function (p, v) {
      p.optimized_null_evidence += +v["er_optimized_null"];
      return p;
    },
    function (p, v) {
      p.optimized_null_evidence -= +v["er_optimized_null"];
      return p;
    },
    function () {
      return { optimized_null_evidence : 0 };
    }
  );
  
  // Set up new crossfilter dimensions to slice the table by constrained or ON evidence ratio.
  var er_constrained = data.dimension(function(d) { return d["er_constrained"]; });
  var er_optimized_null = data.dimension(function(d) { return d["er_optimized_null"]; });
  self.er_constrained = er_constrained
  self.er_optimized_null = er_optimized_null


  var composite = dc.compositeChart(c);

  composite
      .width($(window).width())
      .height(300)
      .dimension(site_index)
      .x(d3.scale.linear().domain([1, erc.length]))
      .yAxisLabel("2 * Ln Evidence Ratio")
      .xAxisLabel("Site Location")
      .legend(dc.legend().x($(window).width() - 150).y(20).itemHeight(13).gap(5))
      .renderHorizontalGridLines(true)
      .compose([
        dc.lineChart(composite)
          .group(sitesByConstrained, "Constrained")
          .colors(d3.scale.ordinal().range(['green']))
          .valueAccessor(function(d) {
              return 2 * d.value.constrained_evidence;
          })
          .keyAccessor(function(d) {
              return d.key;
          }), 
        dc.lineChart(composite)
          .group(sitesByON, "Optimized Null")
          .valueAccessor(function(d) {
              return 2 * d.value.optimized_null_evidence;
          })
          .keyAccessor(function(d) {
              return d.key;
          })
          .colors(d3.scale.ordinal().range(['red']))
      ]);

  composite.xAxis().ticks(50);

  var numberFormat = d3.format(".4f");

  // Render the table
  dc.dataTable(".dc-data-table")
      .dimension(site_index)
      // data table does not use crossfilter group but rather a closure
      // as a grouping function
      .group(function (d) {
        return site_index.bottom(1)[0].site_index + " - " + site_index.top(1)[0].site_index;
      })
      .size(site_index.groupAll().reduceCount().value()) // (optional) max number of records to be shown, :default = 25
      // dynamic columns creation using an array of closures
      .columns([
          function (d) {
              return d.site_index;
          },
          function (d) {
              return numberFormat(d["unconstrained"]);
          },
          function (d) {
              return numberFormat(d["constrained"]);
          },
          function (d) {
              return numberFormat(d["optimized_null"]);
          },
          function (d) {
              return numberFormat(d["er_constrained"]);
          },
          function (d) {
              return numberFormat(d["er_optimized_null"]);
          },

      ])

      // (optional) sort using the given field, :default = function(d){return d;}
      .sortBy(function (d) {
          return d.site_index;
      })

      // (optional) sort order, :default ascending
      .order(d3.ascending)

      // (optional) custom renderlet to post-process chart using D3
      .renderlet(function (table) {
          table.selectAll(".dc-table-group").classed("info", true);
      });

  $("#export-csv").on('click', function(e) { datamonkey.export_csv_button(site_index.top(Infinity)); } );

  $("#export-chart-svg").on('click', function(e) { 
    // class manipulation for the image to display correctly
    $("#chart-id").find("svg")[0].setAttribute("class", "dc-chart");
    datamonkey.save_image("svg", "#chart-id"); 
    $("#chart-id").find("svg")[0].setAttribute("class", "");
  });

  $("#export-chart-png").on('click', function(e) { 
    // class manipulation for the image to display correctly
    $("#chart-id").find("svg")[0].setAttribute("class", "dc-chart");
    datamonkey.save_image("png", "#chart-id"); 
    $("#chart-id").find("svg")[0].setAttribute("class", "");
  });
  $("#apply-thresholds").on('click', function(e) { 
    var erConstrainedThreshold = document.getElementById("er-constrained-threshold").value;
    var erOptimizedNullThreshold = document.getElementById("er-optimized-null-threshold").value;
    self.er_constrained.filter(function(d) { return d >= erConstrainedThreshold; });
    self.er_optimized_null.filter(function(d) { return d >= erOptimizedNullThreshold; });
    dc.renderAll();
  });


  dc.renderAll();

}

datamonkey.busted.render_histogram = busted_render_histogram;

function getStyles(doc) {

  function processStyleSheet(ss) {
    if (ss.cssRules) {
      for (var i = 0; i < ss.cssRules.length; i++) {
        var rule = ss.cssRules[i];
        if (rule.type === 3) {
          // Import Rule
          processStyleSheet(rule.styleSheet);
        } else {
          // hack for illustrator crashing on descendent selectors
          if (rule.selectorText) {
            if (rule.selectorText.indexOf(">") === -1) {
              styles += "\n" + rule.cssText;
            }
          }
        }
      }
    }
  }

  var styles = "",
      styleSheets = doc.styleSheets;

  if (styleSheets) {
    for (var i = 0; i < styleSheets.length; i++) {
      processStyleSheet(styleSheets[i]);
    }
  }

  return styles;

}

function exportCSVButton(data) {

  data = d3.csv.format(data);
  if (data != null) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data));
    pom.setAttribute('download', 'export.csv');
    pom.className = 'btn btn-default btn-sm';
    pom.innerHTML = '<span class="glyphicon glyphicon-floppy-save"></span> Download CSV';
    $("body").append(pom);
    pom.click();
    pom.remove();
  }

}

function convertSVGtoPNG(image_string) {

  var image = document.getElementById("chart-image");
  image.src = image_string;

  image.onload = function() {
    var canvas = document.getElementById("chart-canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    var context = canvas.getContext("2d");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0,0,image.width,image.height);
    context.drawImage(image, 0, 0);
    var img = canvas.toDataURL("image/png");

    var pom = document.createElement('a');
    pom.setAttribute('download', 'image.png');
    pom.href = canvas.toDataURL("image/png");     
    $("body").append(pom);
    pom.click();
    pom.remove();
  }

}

function saveImage(type, container) {

  var prefix = {
    xmlns: "http://www.w3.org/2000/xmlns/",
    xlink: "http://www.w3.org/1999/xlink",
    svg: "http://www.w3.org/2000/svg"
  }

  var svg = $(container).find("svg")[0];
  var styles = getStyles(window.document);

  svg.setAttribute("version", "1.1");

  var defsEl = document.createElement("defs");
  svg.insertBefore(defsEl, svg.firstChild); 

  var styleEl = document.createElement("style")
  defsEl.appendChild(styleEl);
  styleEl.setAttribute("type", "text/css");


  // removing attributes so they aren't doubled up
  svg.removeAttribute("xmlns");
  svg.removeAttribute("xlink");

  // These are needed for the svg
  if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
    svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
  }

  if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
    svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
  }

  var source = (new XMLSerializer()).serializeToString(svg).replace('</style>', '<![CDATA[' + styles + ']]></style>');
  var rect = svg.getBoundingClientRect();
  var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
  var to_download = [doctype + source]
  var image_string = 'data:image/svg+xml;base66,' + encodeURIComponent(to_download);

  if(type == "png") {
    convertSVGtoPNG(image_string)
  } else {
    var pom = document.createElement('a');
    pom.setAttribute('download', 'image.svg');
    pom.setAttribute('href', image_string);
    $("body").append(pom);
    pom.click();
    pom.remove();
  }

}

var FadeSummary = React.createClass({displayName: "FadeSummary",

  float_format : d3.format(".2f"),

  countBranchesTested: function(branches_tested) {
    if(branches_tested) {
      return branches_tested.split(';').length;
    } else {
      return 0;
    }
  },

  getDefaultProps : function() {
    return {
     subs : []
    };

  },

  componentDidMount: function() {

    this.setProps({
       alpha_level : 0.05,
       sequences : this.props.msa.sequences,
       subs : this.props.fade_results["TREE_LENGTHS"][0],
       sites : this.props.msa.sites,
       model : this.props.fade_results["MODEL_INFO"],
       grid_desc : this.props.fade_results["GRID_DESCRIPTION"],
       branches_tested : this.props.fade_results["BRANCHES_TESTED"]
    });

  },

  render: function() {

    var self = this;

    return (
          React.createElement("dl", {className: "dl-horizontal"}, 
            React.createElement("dt", null, "Data summary"), 
            React.createElement("dd", null, this.props.sequences, " sequences with ", this.props.partitions, " partitions."), React.createElement("dd", null, 
            React.createElement("div", {className: "alert"}, "These sequences have not been screened for recombination. Selection analyses of alignments with recombinants in them using a single tree may generate ", React.createElement("u", null, "misleading"), " results.")), 
            this.props.msa.partition_info.map(function(partition, index) {
              return (React.createElement("div", null, React.createElement("dt", null, "Partition ", partition["partition"]), React.createElement("dd", null, " ", self.float_format(self.props.subs[index]), " subs/ aminoacid  site"), React.createElement("dd", null, partition["endcodon"] - partition["startcodon"], " aminoacids")))
            }), 
            React.createElement("dt", null, "Settings"), React.createElement("dd", null, this.props.model), React.createElement("dd", null, this.props.grid_desc), 
            React.createElement("dd", null, "Directional model applied to ", self.countBranchesTested(this.props.branches_tested), " branches")
          )
        )
  }

});

// Will need to make a call to this
// omega distributions
function render_fade_summary(json, msa) {
  React.render(
    React.createElement(FadeSummary, {fade_results: json, msa: msa}),
    document.getElementById("summary-div")
  );
}

if (!datamonkey) {
    var datamonkey = {};
}

datamonkey.fade = function(json) { 
  
  var _colorizerB = d3.interpolateRgb  (d3.rgb(0,0,255),d3.rgb(255,255,255));
  var _colorizerR = d3.interpolateRgb  (d3.rgb(255,255,255),d3.rgb(255,0,0));
  var _use_BF = false;

  fade_headers = [
    ['Site','A','C','D','E','F','G','H','I','K','L','M','N','P','Q','R','S','T','V','W','Y'],
    ['Site','Alanine','Cysteine','Aspartic acid','Glutamic acid','Phenylalanine','Glycine','Histidine','Isoleucine','Lysine','Leucine','Methionine', 'Asparagine','Proline','Glutamine','Arginine','Serine','Threonine','Valine', 'Tryptophan','Tyrosin']
  ];

  var fade_results = json['results']["FADE"];

  var dict_to_array = function(dict) {
          ar = []
          for (k in dict) {
              ar.push (dict[k])
          }
          return ar;
      }
      
   var keys_in_dict = function(dict) {
          ar = []
          for (k in dict) {
              ar.push (k)
          }
          return ar;
      }   
      
  //For displaying table with Posteriors
  var display_column_map = function(row) { 
      result = [parseInt(row[0])];
    
    for (k = 4; k < row.length; k+=5) {
          result.push((row[k]));
      }
      return result;
  }

  //For displaying table with BFs
  var display_column_map_bf = function(row) { 
       //result = [parseInt(row[0]),row[3]];
      result = [parseInt(row[0])];
    
    for (k = 5; k < row.length; k+=5) {
          result.push((row[k]));
      }
      return result;
  }


  var row_display_filter = function(d) {

  //Any row, with at least one val > thres must get displayed. Any elements greater must be in red. 
     // if (d.slice(2).reduce (function (a,b) {return a+b;}) == 0.0) {return false;} 
      //console.log (d, this);
      for (k=1;k<21;k++) {
          if (d[k] > this) return true;
      } 
      return false;
  };



  var initial_display = function() {
      //load_data_summary ("summary_div", data_summary);
      $('#filter_on_pvalue').trigger ('submit');
      plot_property_graphs("property_plot_svg",fade_results); //Using a matrix from html
  }

  var set_handlers = function (file_id) {
      $('body').attr ('data-job-id', file_id);
      $('#filter_on_pvalue').submit(function (e) {
              cutoff = parseFloat($('#pvalue')[0].value);
              if (_use_BF) {
                  found = load_analysis_results('prime_table',fade_headers, fade_results,display_column_map_bf,row_display_filter);            
              } else {
                  found = load_analysis_results('prime_table',fade_headers, fade_results,display_column_map,row_display_filter);
              }
              d3.select ("#total_sites_found").selectAll("span").data (found).html (function (d) {return d;});
              return false;
          });

      $('#site_rate_display').on ('show', (function (e) {
              //alert ("Show");
              //console.log (this);
              return true;
          }));

      
        $( 'body' ).on( 'click', '[data-toggle="modal"]', function(event) {
              display_site_properties ($(this).attr ("data-codon-id"));
      });
   

     $( '#set-p-value' ).click(function(event) {
           d3.select ("#pq_selector").html ("Posterior <span class='caret'></span>");
           _use_BF = false;
           event.preventDefault(); 
     } );    

     $( '#set-q-value' ).click(function(event) {
           d3.select ("#pq_selector").html ("BF <span class='caret'></span>");
           _use_BF = true;
           event.preventDefault(); 
     } );    
           
     $( 'body' ).on( 'click', '#property_selector .btn', function(event) {
          event.stopPropagation(); // prevent default bootstrap behavior
          if( $(this).attr('data-toggle') != 'button' ) { // don't toggle if data-toggle="button"
              $(this).toggleClass('active');
          }
           toggle_view("property_plot_svg", parseInt($(this).attr( 'data-property-id' )), $(this).hasClass( 'active' ) ); // button state AFTER the click
      });
  }

  property_plot_done = false;


  var display_site_properties = function(site_id) {
      job_id = $('body').attr ('data-job-id');
      url = "/cgi-bin/datamonkey/wrapHyPhyBF.pl?file=fade_site&mode=1&arguments=" + job_id + "-" + site_id;
      d3.json (url, function (json) { site_info (json, site_id) });
  }

  var toggle_view = function(property_plot, group, show_hide) {
      if (show_hide) {
          prop = 'visible';
      } else {
          prop = 'hidden';
      }
      d3.select("#"+property_plot).selectAll(".dot"+group)
                    .style("visibility", prop);
  }

  var site_info = function(values, site_id) {    
      d3.select ("#site_rate_display_header").html ("Detailed information about site " + site_id);
      elements = dict_to_array(values);
      headers = keys_in_dict (elements[0]).sort();
      header_element = d3.select ('#site_info_table').select("thead");
      header_element.selectAll("th").remove();
      header_element.selectAll("th").data (headers).enter().append("th").html (function (d,i) //Get header of table
          {return d;}
      );

  }


  var plot_property_graphs = function(property_plot, property_info) {
      if (!property_plot_done) {
          property_info = property_info.map (display_column_map);
          property_plot_done = true;
          site_count = property_info.length;
                 
          //console.log (d3.extent (property_info.map(function (d){return d[0];})));
                  
          var margin = {top: 20, right: 40, bottom: 30, left: 40},
              width  = 800 - margin.left - margin.right,
              height = 500 - margin.top - margin.bottom;

          var x = d3.scale.linear()
              .range([0, width]);

          var y = d3.scale.linear()
              .range([height, 0]);

          var color = d3.scale.category10();

          var xAxis = d3.svg.axis()
              .scale(x)
              .orient("bottom");

          var yAxis = d3.svg.axis()
              .scale(y)
              .orient("left");
   
           var yAxis2 = d3.svg.axis()
              .scale(y)
              .orient("right");
             
          var make_x_axis = function() {        
              return d3.svg.axis()
                  .scale(x)
                   .orient("bottom")
                   .ticks(20);
          }

          var make_y_axis = function() {        
              return d3.svg.axis()
                  .scale(y)
                  .orient("left")
                  .ticks(20);
          }

          var svg = d3.select("#"+property_plot)
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
               .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                  
          x.domain ([1,site_count]);
          y.domain ([0,1]);

          svg.append("g")
                .attr("class", "x hyphy-axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
              .append("text")
                //.attr("class", "label")
                .attr("x", width)
                .attr("y", 30)
                .style("text-anchor", "end")
                .text("Site index");

          svg.append("g")         
                  .attr("class", "grid")
                  .call(make_y_axis()
                      .tickSize(-width, 0, 0)
                      .tickFormat("")
                  );
          
          svg.append("g")         
                  .attr("class", "grid")
                  .attr("transform", "translate(0," + height + ")")
                  .call(make_x_axis()
                      .tickSize(-height, 0, 0)
                      .tickFormat("")
                  );
          
          svg.append("g")
                .attr("class", "y hyphy-axis")
                .call(yAxis)
              .append("text")
                //.attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("y", -37)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("P(Bias>1)");  

          var y2= svg.append("g")
                .attr("class", "y hyphy-axis")
                .attr("transform", "translate("+width+",0)")
                .call(yAxis2.tickFormat (""));
                
          y2.append("text")
                //.attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("y", 10)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("High Posteriors");  

          y2.append("text")
                //.attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("y", 10)
                .attr("x", -height)
                .attr("dy", ".71em")
                .style("text-anchor", "start")
                .text("Low Posteriors");  

          var legend = svg.selectAll(".legend")
                .data(color.domain())
              .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
      
      
      var h = new Object(); //Hash of numbers -> AA names for labels
      h[1] = "Alanine";
      h[2] = "Cysteine";
      h[3] = "Aspartic acid";
      h[4] = "Glutamic acid";
      h[5] = "Phenylalanine";
      h[6] = "Glycine";
      h[7] = "Histidine";
      h[8] = "Isoleucine";
      h[9] = "Lysine";
      h[10] = "Leucine";
      h[11] = "Methionine";
      h[12] = "Asparagine";
      h[13] = "Proline";
      h[14] = "Glutamine";
      h[15] = "Arginine";
      h[16] = "Serine";
      h[17] = "Threonine";
      h[18] = "Valine";
      h[19] = "Tryptophan";
      h[20] = "Tyrosine";
      
      

          vis = 'visible';
          for (series = 1; series <= 20; series++) {
              if (series > 1) {
                  vis = 'hidden';
              }
              svg.selectAll(".dot"+series)
                    .data(property_info)
                  .enter().append("circle")
                    .attr("class", "dot"+series)
                    .attr("r", function (d) {if (d[series] == 0) return 1; return 3.5;})
                    .attr("cx", function(d) { return x(d[0]); })
                    .attr("cy", function(d) { return y(d[series]); })
                    .style("fill", function(d) { return color(series); })
            .style("opacity", 0.5)
            .style ('visibility', vis)
                    .append ("title").text (function (d) { return "Site " + d[0] + ", " + h[series] + " P(Beta>1) =" + d[series];});
              d3.select ("#show_property" + series).style ("color", function(d) { return color(series); }); //Colour buttons on HTML
          }
        
       } 
          
  }

  var load_data_summary = function(id, json_object) {
      //if (error) return console.warn(error);
      reportable_entries = []
      warnings = []
      for (k in json_object) {
          if (k == 'Warnings') {
              warnings = json_object[k];
          } else {
              reportable_entries.push ({"Phase": k, "Information": json_object[k]});
          }
      }
      info_container = d3.select ("#" + id);
      items = info_container.selectAll("dt").data(reportable_entries);
      items.enter().append("dt").text (function (d) {return d["Phase"]});
      item_count = items[0].length;
      current_child = 2;
      for (z = 1; z <= item_count; z++) { 
          info = dict_to_array(reportable_entries[z-1]["Information"]);
          for (y = 0; y < info.length; y++) {
              info_container.insert ("dd",":nth-child("+current_child+")").data([info[y]]).text (function (d) {return d;});
          }
          key = reportable_entries[z-1]["Phase"];
          if (key in warnings) {
              current_child++;
              info_container.insert ("dd",":nth-child("+current_child+")").selectAll("div").data([warnings[key]]).enter().append("div").classed("alert",true).html (function (d) {return d;})
          }
          current_child += info.length+1;
      }
      return 0;
  }
      
  var load_analysis_results = function (id, headers, matrix, column_selector, condition) {    
      header_element = d3.select ('#' + id).select("thead");
      header_element.selectAll("th").remove();
      header_element.selectAll("th").data (headers[0]).enter().append("th").html (function (d,i) //Get header of table
          {return "<a href='#' data-toggle='tooltip' data-placement = 'right' data-html = true title data-original-title='" + headers[1][i] + "'>" + d + "</a>";}
      );
          
      parent_element = d3.select ('#' + id).select("tbody");
      parent_element.selectAll("tr").remove();
      filtered_matrix = matrix.map (column_selector).filter(condition,cutoff); //Get the columns to display in table
      rows = parent_element.selectAll("tr").data(function (d) {return filtered_matrix;});
      conserved = 0;
      rows.enter().append ("tr").selectAll("td").data (function (d) {return d;}).enter().append("td").
          html (function (d,i) {
              d = parseFloat (d);
              if (i) {
                  if (_use_BF == false)  {
                      if (d > 0.99)  return "1.00";
                      return d.toFixed (2);
                  } else {
                      if (d > 100) return "100+";
                      return d.toFixed (1);
                  }
              }
              return "<b>" + d + "</b> <a href='#site_rate_display' data-toggle='modal' data-codon-id = '" + d + "' data-placement = 'bottom'><i class='icon-list'></i></a>";}
              ).
              classed ("btn-danger", function (d,i,j)  {if (d >= cutoff &&  i>=1 ) {conserved++; return true;} return false;});
              
      d3.select ('#' + id).classed ("table-striped table-hover", true);
      $('a').tooltip(); 
      return [filtered_matrix.length, conserved];
  }


  var numberToColor = function(value) {
      if (typeof (value) == "string") {
          return "rgba (1,0,0,1)";
      }
      rate_value = Math.min(20,Math.max(-20,Math.log (value)/Math.LN20));
      if (rate_value < 0) {
          return _colorizerB ((20+rate_value)/20.);
      }
      return _colorizerR ((rate_value)/20.);
  }

  var fgColor = function(value, normalizer) {
      if (typeof (value) == "string") {
          return "rgba (1,1,1,1)";
      }
      
      var score = 1-Math.exp(-20*value/normalizer);
      
      if (score > 0.45) {
          return "white";
      }
      return "black";
  }

  set_handlers('test');
  initial_display();

}

var ModelFits = React.createClass({displayName: "ModelFits",

  getInitialState: function() {
    var table_row_data = this.getModelRows(this.props.json),
        table_columns = this.getModelColumns(table_row_data);

    return { 
             table_row_data: table_row_data, 
             table_columns: table_columns
           };
  },

  formatRuntime : function(seconds) {
      var duration_string = "",
          seconds = parseFloat(seconds);

      var split_array = [Math.floor(seconds / (24 * 3600)), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60],
          quals = ["d.", "hrs.", "min.", "sec."];

      split_array.forEach(function(d, i) {
          if (d) {
              duration_string += " " + d + " " + quals[i];
          }
      });

      return duration_string;
  },

  getLogLikelihood : function(this_model) {
    return d3.format(".2f")(this_model['log-likelihood']);
  },

  getAIC : function(this_model) {
    return d3.format(".2f")(this_model['AIC-c']);
  },

  getNumParameters : function(this_model) {
    return this_model['parameters'];
  },

  getBranchLengths : function(this_model) {

    if(this_model["tree length"]) {
      return d3.format(".2f")(this_model["tree length"]); 
    } else {
      return d3.format(".2f")(d3.values(this_model["branch-lengths"]).reduce(function(p, c) {
          return p + c;
      }, 0))
    }

  },

  getRuntime : function(this_model) {
    //return this.formatRuntime(this_model['runtime']);
    return this.formatRuntime(this_model['runtime']);
  },

  getDistributions : function(m, this_model) {

    var omega_distributions = {};
    omega_distributions[m] = {};

    var omega_format = d3.format(".3r"),
        prop_format = d3.format(".2p");
        p_value_format = d3.format(".4f");


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

    return distributions;

  },

  getModelRows : function(json) {

    if(!json) {
      return [];
    }

    var table_row_data = [];
    var omega_format = d3.format(".3r");
    var prop_format = d3.format(".2p");
    var p_value_format = d3.format(".4f");

    for (var m in json["fits"]) {

      var this_model_row = [],
          this_model = json["fits"][m];

      this_model_row = [
          this_model['display-order'],
          "",
          m,
          this.getLogLikelihood(this_model),
          this.getNumParameters(this_model),
          this.getAIC(this_model),
          this.getRuntime(this_model),
          this.getBranchLengths(this_model)
      ];


      var distributions = this.getDistributions(m, this_model);

      if(distributions.length) {

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
      } else {
        table_row_data.push(this_model_row);
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

    return table_row_data;

  },

  getModelColumns : function(table_row_data) {

    var model_header = '<th>Model</th>',
        logl_header = '<th><em> log </em>L</th>',
        num_params_header = '<th><abbr title="Number of estimated model parameters"># par.</abbr></th>',
        aic_header = '<th><abbr title="Small Sample AIC">AIC<sub>c</sub></abbr></th>',
        runtime_header = '<th>Time to fit</th>',
        branch_lengths_header = '<th><abbr title="Total tree length, expected substitutions/site">L<sub>tree</sub></abbr></th>',
        branch_set_header = '<th>Branch set</th>',
        omega_1_header = '<th>&omega;<sub>1</sub></th>',
        omega_2_header = '<th>&omega;<sub>2</sub></th>',
        omega_3_header = '<th>&omega;<sub>3</sub></th>';

    // inspect table_row_data and return header
    all_columns = [ 
                    model_header,
                    logl_header, 
                    num_params_header, 
                    aic_header, 
                    runtime_header, 
                    branch_lengths_header,  
                    branch_set_header,
                    omega_1_header,
                    omega_2_header,
                    omega_3_header
                  ];

    // validate each table row with its associated header
    if(table_row_data.length == 0) {
      return [];
    }

    // trim columns to length of table_row_data
    column_headers = _.take(all_columns, table_row_data[0].length)

    // remove all columns that have 0, null, or undefined rows
    items = d3.transpose(table_row_data);

    return column_headers;
  },

  componentDidUpdate : function() {

    var model_columns = d3.select('#summary-model-header1');
    model_columns = model_columns.selectAll("th").data(this.state.table_columns);
    model_columns.enter().append("th");
    model_columns.html(function(d) {
        return d;
    });

    var model_rows = d3.select('#summary-model-table').selectAll("tr").data(this.state.table_row_data);
    model_rows.enter().append('tr');
    model_rows.exit().remove();
    model_rows = model_rows.selectAll("td").data(function(d) {
        return d;
    });
    model_rows.enter().append("td");
    model_rows.html(function(d) {
        return d;
    });

  },

  componentWillReceiveProps: function(nextProps) {

    var table_row_data = this.getModelRows(nextProps.json),
        table_columns = this.getModelColumns(table_row_data);

    this.setState({
             table_row_data: table_row_data, 
             table_columns: table_columns
           });
  },

  render: function() {

    return (
        React.createElement("div", {className: "col-lg-12"}, 
          React.createElement("ul", {className: "list-group"}, 
            React.createElement("li", {className: "list-group-item"}, 
              React.createElement("h4", {className: "list-group-item-heading"}, React.createElement("i", {className: "fa fa-cubes", styleFormat: "margin-right: 10px"}), "Model fits"), 
               React.createElement("table", {className: "table table-hover table-condensed list-group-item-text", styleFormat: "margin-top:0.5em;"}, 
                  React.createElement("thead", {id: "summary-model-header1"}), 
                  React.createElement("tbody", {id: "summary-model-table"})
               )
            )
          )
        )
      )
  }

});

// Will need to make a call to this
// omega distributions
function render_model_fits(json, element) {
  React.render(
    React.createElement(ModelFits, {json: json}),
    $(element)[0]
  );
}

// Will need to make a call to this
// omega distributions
function rerender_model_fits(json, element) {
  $(element).empty();
  render_model_fits(json, element);

}


var OmegaPlot = React.createClass({displayName: "OmegaPlot",

  getDefaultProps : function() {
    return {
      svg_id : null,
      dimensions : { width : 600, height : 400 },
      margins : { 'left': 50, 'right': 15, 'bottom': 35, 'top': 35 },
      has_zeros : false,
      legend_id : null,
      do_log_plot : true,
      k_p : null,
      plot : null,
    };

  },

  setEvents : function() {
    var self = this;

    d3.select("#" + this.save_svg_id).on('click', function(e) {
      datamonkey.save_image("svg", "#" + self.svg_id);
    });

    d3.select("#" + this.save_png_id).on('click', function(e) {
      datamonkey.save_image("png", "#" + self.svg_id);
    });
  },

  initialize : function() {

    if(!this.state.omegas || !this.state.omegas["Reference"]) {
      return;
    }

    var data_to_plot = this.state.omegas["Reference"];
    var secondary_data = this.state.omegas["Test"];

    // Set props from settings
    this.props.svg_id = this.props.settings.svg_id;
    this.props.dimensions = this.props.settings.dimensions || this.props.dimensions;
    this.props.legend_id = this.props.settings.legend || this.props.legend_id;
    this.props.do_log_plot = this.props.settings.log || this.props.do_log_plot;
    this.props.k_p = this.props.settings.k || this.props.k_p;

    var dimensions = this.props.dimensions;
    var margins = this.props.margins;

    if (this.props.do_log_plot) {
      this.props.has_zeros = data_to_plot.some(function(d) {return d.omega <= 0;});
      if (secondary_data) {
        this.props.has_zeros = this.props.has_zeros || data_to_plot.some(function(d) {return d.omega <= 0;});
      }
    }

    this.plot_width = dimensions["width"] - margins['left'] - margins['right'],
    this.plot_height = dimensions["height"] - margins['top'] - margins['bottom'];

    var domain = this.state.settings["domain"] || d3.extent(secondary_data ? secondary_data.map(function(d) {
        return d.omega;
    }).concat(data_to_plot.map(function(d) {
        return d.omega;
    })) : data_to_plot.map(function(d) {
        return d.omega;
    }));

    domain[0] *= 0.5;

    this.omega_scale = (this.props.do_log_plot ? (this.props.has_zeros ? d3.scale.pow().exponent (0.2) : d3.scale.log()) : d3.scale.linear())
        .range([0, this.plot_width]).domain(domain).nice();

    this.proportion_scale = d3.scale.linear().range([this.plot_height, 0]).domain([-0.05, 1]).clamp(true);

    // compute margins -- circle AREA is proportional to the relative weight
    // maximum diameter is (height - text margin)
    this.svg = d3.select("#" + this.props.settings.svg_id).attr("width", dimensions.width).attr("height", dimensions.height);
    this.plot = this.svg.selectAll(".container");

    this.svg.selectAll("defs").remove();
    this.svg.append("defs").append("marker")
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

    if (this.plot.empty()) {
      this.plot = this.svg.append("g").attr("class", "container");
    }

    this.plot.attr("transform", "translate(" + this.props.margins["left"] + " , " + this.props.margins["top"] + ")");
    this.reference_omega_lines = this.plot.selectAll(".hyphy-omega-line-reference"),
    this.displacement_lines = this.plot.selectAll(".hyphy-displacement-line");

    this.createDisplacementLine();
    this.createNeutralLine();
    this.createOmegaLine();
    this.createReferenceLine();
    this.createXAxis();
    this.createYAxis();
    this.setEvents();

  },
  makeSpring : function(x1, x2, y1, y2, step, displacement) {

    if (x1 == x2) {
        y1 = Math.min(y1, y2);
        return "M" + x1 + "," + (y1 - 40) + "v20";
    }

    var spring_data = [],
        point = [x1, y1],
        angle = Math.atan2(y2 - y1, x2 - x1);

    var step = [step * Math.cos(angle), step * Math.sin(angle)];
    var k = 0;

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

  },
  createDisplacementLine : function() {

    var self = this;
    var data_to_plot = this.state.omegas["Reference"];
    var secondary_data = this.state.omegas["Test"];

    if(secondary_data) {
        var diffs = data_to_plot.map(function(d, i) {
            return {
                'x1': d.omega,
                'x2': secondary_data[i].omega,
                'y1': d.weight * 0.98,
                'y2': secondary_data[i].weight * 0.98
            };
        });

      this.displacement_lines = this.displacement_lines.data(diffs);
      this.displacement_lines.enter().append("path");
      this.displacement_lines.exit().remove();
      this.displacement_lines.transition().attr("d", function(d) {
          return self.makeSpring(self.omega_scale(d.x1),
              self.omega_scale(d.x2),
              self.proportion_scale(d.y1 * 0.5),
              self.proportion_scale(d.y2 * 0.5),
              5,
              5);
      }).attr("marker-end", "url(#arrowhead)")
        .attr("class", "hyphy-displacement-line");
    }

  },
  createReferenceLine : function () {

    var data_to_plot = this.state.omegas["Reference"];
    var secondary_data = this.state.omegas["Test"];
    var self = this;

    if(secondary_data) {
        this.reference_omega_lines = this.reference_omega_lines.data(data_to_plot);
        this.reference_omega_lines.enter().append("line");
        this.reference_omega_lines.exit().remove();

        this.reference_omega_lines.transition().attr("x1", function(d) {
            return self.omega_scale(d.omega);
        })
            .attr("x2", function(d) {
                return self.omega_scale(d.omega);
            })
            .attr("y1", function(d) {
                return self.proportion_scale(-0.05);
            })
            .attr("y2", function(d) {
                return self.proportion_scale(d.weight);
            })
            .style("stroke", function(d) {
                return "#d62728";
            })
            .attr("class", "hyphy-omega-line-reference");
    } else {
        this.reference_omega_lines.remove();
        this.displacement_lines.remove();
    }

  },
  createOmegaLine : function() {

    var data_to_plot = this.state.omegas["Reference"];
    var secondary_data = this.state.omegas["Test"];
    var self = this;

    // ** Omega Line (Red) ** //
    var omega_lines = this.plot.selectAll(".hyphy-omega-line").data(secondary_data ? secondary_data : data_to_plot);
    omega_lines.enter().append("line");
    omega_lines.exit().remove();
    omega_lines.transition().attr("x1", function(d) {
        return self.omega_scale(d.omega);
    })
        .attr("x2", function(d) {
            return self.omega_scale(d.omega);
        })
        .attr("y1", function(d) {
            return self.proportion_scale(-0.05);
        })
        .attr("y2", function(d) {
            return self.proportion_scale(d.weight);
        })
        .style("stroke", function(d) {
          return "#1f77b4";
        })
        .attr("class", "hyphy-omega-line");
  },
  createNeutralLine : function() {
    var self = this;

    // ** Neutral Line (Blue) ** //
    var neutral_line = this.plot.selectAll(".hyphy-neutral-line").data([1]);
    neutral_line.enter().append("line").attr("class", "hyphy-neutral-line");
    neutral_line.exit().remove();
    neutral_line.transition().attr("x1", function(d) {
        return self.omega_scale(d);
    }).attr("x2", function(d) {
          return self.omega_scale(d);
      })
      .attr("y1", 0)
      .attr("y2", this.plot_height);

  },
  createXAxis : function() {

    // *** X-AXIS *** //
    var xAxis = d3.svg.axis()
        .scale(this.omega_scale)
        .orient("bottom");

    if (this.props.do_log_plot) {
        xAxis.ticks(10, this.props.has_zeros ? ".2r" : ".1r");
    }

    var x_axis = this.svg.selectAll(".x.axis");
    var x_label;

    if (x_axis.empty()) {
        x_axis = this.svg.append("g")
            .attr("class", "x hyphy-axis");

        x_label = x_axis.append("g").attr("class", "hyphy-axis-label x-label");
    } else {
        x_label = x_axis.select(".axis-label.x-label");
    }

    x_axis.attr("transform", "translate(" + this.props.margins["left"] + "," + (this.plot_height + this.props.margins["top"]) + ")")
        .call(xAxis);
    x_label = x_label.attr("transform", "translate(" + this.plot_width + "," + this.props.margins["bottom"] + ")")
        .selectAll("text").data(["\u03C9"]);
    x_label.enter().append("text");
    x_label.text(function(d) {
        return d
    }).style("text-anchor", "end")
      .attr("dy", "0.0em");

  },
  createYAxis : function() {

    // *** Y-AXIS *** //
    var yAxis = d3.svg.axis()
        .scale(this.proportion_scale)
        .orient("left")
        .ticks(10, ".1p");

    var y_axis = this.svg.selectAll(".y.hyphy-axis");
    var y_label;

    if (y_axis.empty()) {
        y_axis = this.svg.append("g")
            .attr("class", "y hyphy-axis");
        y_label = y_axis.append("g").attr("class", "hyphy-axis-label y-label");
    } else {
        y_label = y_axis.select(".hyphy-axis-label.y-label");
    }
    y_axis.attr("transform", "translate(" + this.props.margins["left"] + "," + this.props.margins["top"] + ")")
        .call(yAxis);
    y_label = y_label.attr("transform", "translate(" + (-this.props.margins["left"]) + "," + 0 + ")")
        .selectAll("text").data(["Proportion of sites"]);
    y_label.enter().append("text");
    y_label.text(function(d) {
        return d
    }).style("text-anchor", "start")
      .attr("dy", "-1em")

  },

  getInitialState: function() {
    return { 
              omegas : this.props.omegas,
              settings : this.props.settings
           };
  },

  componentWillReceiveProps: function(nextProps) {

    this.setState({
             omegas : nextProps.omegas 
           });
  },

  componentDidUpdate : function() {
    this.initialize();
  },

  componentDidMount: function() {
    this.initialize();
  },

  render: function() {

    var key = this.props.omegas.key,
        label = this.props.omegas.label;

    this.svg_id = key + "-svg";
    this.save_svg_id = "export-" + key + "-svg";
    this.save_png_id = "export-" + key + "-png";
    

    return (
      React.createElement("div", {className: "col-lg-6"}, 
          React.createElement("div", {className: "panel panel-default", id:  key }, 
              React.createElement("div", {className: "panel-heading"}, 
                  React.createElement("h3", {className: "panel-title"}, "ω distributions under the ", React.createElement("strong", null,  label ), " model"), 
                  React.createElement("p", null, 
                      React.createElement("small", null, "Test branches are shown in ", React.createElement("span", {className: "hyphy-blue"}, "blue"), " and reference branches are shown in ", React.createElement("span", {className: "hyphy-red"}, "red"))
                  ), 
                  React.createElement("div", {className: "btn-group"}, 
                      React.createElement("button", {id:  this.save_svg_id, type: "button", className: "btn btn-default btn-sm"}, 
                          React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " SVG"
                      ), 
                      React.createElement("button", {id:  this.save_png_id, type: "button", className: "btn btn-default btn-sm"}, 
                          React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " PNG"
                      )
                  )
              ), 
              React.createElement("div", {className: "panel-body"}, 
                  React.createElement("svg", {id:  this.svg_id})
              )
          )
      )
    );
  }
});

var OmegaPlotGrid = React.createClass({displayName: "OmegaPlotGrid",

  getInitialState: function() {
    return { omega_distributions: this.getDistributions(this.props.json) };
  },

  componentWillReceiveProps : function(nextProps) {

    this.setState({ 
      omega_distributions: this.getDistributions(nextProps.json) 
    });

  },

  getDistributions : function(json) {

    var omega_distributions = {};

    if(!json) {
      return [];
    }

    for (var m in json["fits"]) {
        var this_model = json["fits"][m];
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
        }
    }

    _.each(omega_distributions, function(item,key) { 
      item.key   = key.toLowerCase().replace(/ /g, '-'); 
      item.label = key; 
    });

    var omega_distributions = _.filter(omega_distributions, function(item) {
      return _.isObject(item["Reference"]);
    });

    return omega_distributions;
  },

  render: function() {

    var OmegaPlots = _.map(this.state.omega_distributions, function(item, key) {

      var model_name = key;
      var omegas = item;

      var settings = {
        svg_id : omegas.key + '-svg',
        dimensions : { width : 600, height : 400 },
        margins : { 'left': 50, 'right': 15, 'bottom': 35, 'top': 35 },
        has_zeros : false,
        legend_id : null,
        do_log_plot : true,
        k_p : null,
        plot : null
      };

      return (
        React.createElement(OmegaPlot, {name: model_name, omegas: omegas, settings: settings})
      )

    });

    return (
    React.createElement("div", null, 
      OmegaPlots
    )
    );
  }

});

var PropChart = React.createClass({displayName: "PropChart",

  getDefaultProps : function() {
    return {
      svg_id : null,
      dimensions : { width : 600, height : 400 },
      margins : { 'left': 50, 'right': 15, 'bottom': 25, 'top': 35 },
      has_zeros : false,
      legend_id : null,
      do_log_plot : true,
      k_p : null,
      plot : null,
    };

  },

  getInitialState: function() {
    return { 
             model_name : this.props.name, 
             omegas : this.props.omegas,
             settings : this.props.settings,
           };
  },

  setEvents : function() {
    var self = this;

    d3.select("#" + this.save_svg_id).on('click', function(e) {
      datamonkey.save_image("svg", "#" + self.svg_id);
    });

    d3.select("#" + this.save_png_id).on('click', function(e) {
      datamonkey.save_image("png", "#" + self.svg_id);
    });
  },

  initialize : function() {

    // clear svg
    d3.select("#prop-chart").html("");

    this.data_to_plot = this.state.omegas;

    // Set props from settings
    this.props.svg_id = this.props.settings.svg_id;
    this.props.dimensions = this.props.settings.dimensions || this.props.dimensions;
    this.props.margins = this.props.settings.margins || this.props.margins;
    this.props.legend_id = this.props.settings.legend || this.props.legend_id;
    this.props.do_log_plot = this.props.settings.log || this.props.do_log_plot;
    this.props.k_p = this.props.settings.k || this.props.k_p;


    var dimensions = this.props.dimensions;
    var margins = this.props.margins;
    console.log(margins);

    if (this.props.do_log_plot) {
      this.props.has_zeros = this.data_to_plot.some(function(d) { return d.omega <= 0; });
    }

    this.plot_width = dimensions["width"] - margins['left'] - margins['right'],
    this.plot_height = dimensions["height"] - margins['top'] - margins['bottom'];

    var domain = this.state.settings["domain"];

    this.omega_scale = (this.props.settings.do_log_plot 
        ? (this.props.settings.has_zeros 
        ? d3.scale.pow().exponent (0.2) : d3.scale.log()) : d3.scale.linear())
        .range([0, this.plot_width]).domain(domain).nice();

    this.proportion_scale = d3.scale.linear().range([this.plot_height, 0]).domain([-0.05, 1]).clamp(true);

    // compute margins -- circle AREA is proportional to the relative weight
    // maximum diameter is (height - text margin)
    this.svg = d3.select("#" + this.props.settings.svg_id)
                .attr("width", dimensions.width + margins['left'] + margins['right'])
                .attr("height", dimensions.height + margins['top'] + margins['bottom']);

    this.plot = this.svg.selectAll(".container");

    this.svg.selectAll("defs").remove();

    this.svg.append("defs").append("marker")
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

    if (this.plot.empty()) {
      this.plot = this.svg.append("g").attr("class", "container");
    }

    this.plot.attr("transform", "translate(" + this.props.margins["left"] + " , " + this.props.margins["top"] + ")");
    this.reference_omega_lines = this.plot.selectAll(".hyphy-omega-line-reference"),
    this.displacement_lines = this.plot.selectAll(".hyphy-displacement-line");

    this.createNeutralLine();
    this.createXAxis();
    this.createYAxis();
    this.setEvents();
    this.createOmegaLine(this.state.omegas);
    //_.map(this.props.omegas, function(d) { return this.createOmegaLine(d["omega"],d["prop"]); });
    

  },

  createOmegaLine : function(omegas) {

    var data_to_plot = this.data_to_plot;
    var self = this;

    // generate color wheel from omegas
    var colores_g = _.shuffle([ "#1f77b4"
      ,"#ff7f0e"
      ,"#2ca02c"
      ,"#d62728"
      ,"#9467bd"
      ,"#8c564b"
      ,"#e377c2"
      ,"#7f7f7f"
      ,"#bcbd22"
      ,"#17becf"
    ]);


    // ** Omega Line (Red) ** //
    var omega_lines = this.plot.selectAll(".hyphy-omega-line").data(omegas);
    omega_lines.enter().append("line");
    omega_lines.exit().remove();

    omega_lines.transition().attr("x1", function(d) {
        return self.omega_scale(d.omega);
    })
        .attr("x2", function(d) {
            return self.omega_scale(d.omega);
        })
        .attr("y1", function(d) {
            return self.proportion_scale(-0.05);
        })
        .attr("y2", function(d) {
            return self.proportion_scale(d.prop);
        })
        .style("stroke", function(d) {
          color = _.take(colores_g);
          colores_g = _.rest(colores_g);
          return color;
        })
        .attr("class", "hyphy-omega-line");
  },

  createNeutralLine : function() {
    var self = this;

    // ** Neutral Line (Blue) ** //
    var neutral_line = this.plot.selectAll(".hyphy-neutral-line").data([1]);
    neutral_line.enter().append("line").attr("class", "hyphy-neutral-line");
    neutral_line.exit().remove();
    neutral_line.transition().attr("x1", function(d) {
        return self.omega_scale(d);
    }).attr("x2", function(d) {
          return self.omega_scale(d);
      })
      .attr("y1", 0)
      .attr("y2", this.plot_height);

  },
  createXAxis : function() {

    // *** X-AXIS *** //
    var xAxis = d3.svg.axis()
        .scale(this.omega_scale)
        .orient("bottom");

    if (this.props.do_log_plot) {
        xAxis.ticks(10, this.props.has_zeros ? ".2r" : ".1r");
    }

    var x_axis = this.svg.selectAll(".x.axis");
    var x_label;

    if (x_axis.empty()) {
        x_axis = this.svg.append("g")
            .attr("class", "x hyphy-axis");

        x_label = x_axis.append("g").attr("class", "hyphy-axis-label x-label");
    } else {
        x_label = x_axis.select(".axis-label.x-label");
    }

    x_axis.attr("transform", "translate(" + this.props.margins["left"] + "," + (this.plot_height + this.props.margins["top"]) + ")")
        .call(xAxis);
    x_label = x_label.attr("transform", "translate(" + this.plot_width + "," + this.props.margins["bottom"] + ")")
        .selectAll("text").data(["\u03C9"]);
    x_label.enter().append("text");
    x_label.text(function(d) {
        return d
    }).style("text-anchor", "end")
      .attr("dy", "0.0em");

  },
  createYAxis : function() {

    // *** Y-AXIS *** //
    var yAxis = d3.svg.axis()
        .scale(this.proportion_scale)
        .orient("left")
        .ticks(10, ".1p");

    var y_axis = this.svg.selectAll(".y.hyphy-axis");
    var y_label;

    if (y_axis.empty()) {
        y_axis = this.svg.append("g")
            .attr("class", "y hyphy-axis");
        y_label = y_axis.append("g").attr("class", "hyphy-axis-label y-label");
    } else {
        y_label = y_axis.select(".hyphy-axis-label.y-label");
    }
    y_axis.attr("transform", "translate(" + this.props.margins["left"] + "," + this.props.margins["top"] + ")")
        .call(yAxis);
    y_label = y_label.attr("transform", "translate(" + (-this.props.margins["left"]) + "," + 0 + ")")
        .selectAll("text").data(["Proportion of sites"]);
    y_label.enter().append("text");
    y_label.text(function(d) {
        return d
    }).style("text-anchor", "start")
      .attr("dy", "-1em")

  },

  componentDidMount: function() {
    try {
      this.initialize();
    } catch(e) {};
  },

  componentWillReceiveProps: function(nextProps) {

    this.setState({
                    model_name : nextProps.name, 
                    omegas : nextProps.omegas
                  });

  },

  componentDidUpdate : function() {

    try {
      this.initialize();
    } catch(e) {};

  },

  render: function() {

    this.svg_id = this.props.settings.svg_id;
    this.save_svg_id = "export-" + this.svg_id + "-svg";
    this.save_png_id = "export-" + this.svg_id + "-png";

    return (
        React.createElement("div", {className: "panel panel-default", id:  this.state.model_name}, 
            React.createElement("div", {className: "panel-heading"}, 
                React.createElement("h3", {className: "panel-title"}, React.createElement("strong", null,  this.state.model_name)), 
                React.createElement("p", null, "ω distribution"), 
                React.createElement("div", {className: "btn-group"}, 
                    React.createElement("button", {id:  this.save_svg_id, type: "button", className: "btn btn-default btn-sm"}, 
                        React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " SVG"
                    ), 
                    React.createElement("button", {id:  this.save_png_id, type: "button", className: "btn btn-default btn-sm"}, 
                        React.createElement("span", {className: "glyphicon glyphicon-floppy-save"}), " PNG"
                    )
                )
            ), 
            React.createElement("div", {className: "panel-body"}, 
                React.createElement("svg", {id:  this.svg_id})
            )
        )
    );
  }
});

function render_prop_chart(model_name, omegas, settings) {
  return React.render(
    React.createElement(PropChart, {name: model_name, omegas: omegas, settings: settings}),
    document.getElementById("primary-omega-tag")
  );
}

function rerender_prop_chart(model_name, omeags, settings) {

  $("#primary-omega-tag").empty();
  return render_prop_chart(model_name, omeags, settings);

}


var RELAX = React.createClass({displayName: "RELAX",

  float_format : d3.format(".2f"),
  p_value_format : d3.format(".4f"),
  fit_format : d3.format(".2f"),

  loadFromServer : function() {

    var self = this;

    d3.json(this.props.url, function(data) {

      data["fits"]["Partitioned MG94xREV"]["branch-annotations"] = self.formatBranchAnnotations(data, "Partitioned MG94xREV");
      data["fits"]["General Descriptive"]["branch-annotations"] = self.formatBranchAnnotations(data, "General Descriptive");
      data["fits"]["Null"]["branch-annotations"] = self.formatBranchAnnotations(data, "Null");
      data["fits"]["Alternative"]["branch-annotations"] = self.formatBranchAnnotations(data, "Alternative");
      data["fits"]["Partitioned Exploratory"]["branch-annotations"] = self.formatBranchAnnotations(data, "Partitioned Exploratory");

      var annotations = data["fits"]["Partitioned MG94xREV"]["branch-annotations"],
          json = data,
          pmid = data["PMID"],
          test_results = data["relaxation_test"];

      var p = data["relaxation-test"]["p"],
          direction = data["fits"]["Alternative"]["K"] > 1 ? 'intensification' : 'relaxation',
          evidence = p <= self.props.alpha_level ? 'significant' : 'not significant',
          pvalue = self.p_value_format(p),
          lrt = self.fit_format(data["relaxation-test"]["LR"]),
          summary_k = self.fit_format(data["fits"]["Alternative"]["K"]),
          pmid_text = "PubMed ID " + pmid,
          pmid_href = "http://www.ncbi.nlm.nih.gov/pubmed/" + pmid;

      self.setState({
                      annotations : annotations,
                      json : json,
                      pmid : pmid,
                      test_results : test_results,
                      p : p,
                      direction : direction,
                      evidence : evidence,
                      pvalue : pvalue,
                      lrt : lrt,
                      summary_k : summary_k,
                      pmid_text : pmid_text,
                      pmid_href : pmid_href
                    });

    });

  },

  getDefaultProps: function() {

    var edgeColorizer = function(element, data) {

      var self = this,
          scaling_exponent = 0.33,
          omega_format = d3.format(".3r");

      var omega_color = d3.scale.pow().exponent(scaling_exponent)
          .domain([0, 0.25, 1, 5, 10])
          .range(
            self.options()["color-fill"]
              ? ["#DDDDDD", "#AAAAAA", "#888888", "#444444", "#000000"]
              : ["#6e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"])
          .clamp(true);


      if (data.target.annotations) {
          element.style('stroke', omega_color(data.target.annotations.length) || null);
          $(element[0][0]).tooltip('destroy');
          $(element[0][0]).tooltip({
              'title': omega_format(data.target.annotations.length),
              'html': true,
              'trigger': 'hover',
              'container': 'body',
              'placement': 'auto'
          })
      } else {
          element.style('stroke', null);
          $(element[0][0]).tooltip('destroy');
      }

      var selected_partition = $("#hyphy-tree-highlight").attr("value");
      
      if(selected_partition && this.get_partitions()) {
        var partitions = this.get_partitions()[selected_partition];

        element.style('stroke-width', (partitions && partitions[data.target.name]) ? '8' : '4')
            .style('stroke-linejoin', 'round')
            .style('stroke-linecap', 'round');
      }

    }

    return {
      edgeColorizer : edgeColorizer,
      alpha_level : 0.05
    };


  },

  getInitialState: function() {

        var model_fits_id = "#hyphy-model-fits",
            omega_plots_id = "#hyphy-omega-plots",
            summary_id = "#hyphy-relax-summary",
            tree_id = "#tree-tab";

        var tree_settings = {
            'omegaPlot': {},
            'tree-options': {
                /* value arrays have the following meaning
                    [0] - the value of the attribute
                    [1] - does the change in attribute value trigger tree re-layout?
                */
                'hyphy-tree-model': ["Partitioned MG94xREV", true],
                'hyphy-tree-highlight': ["RELAX.test", false],
                'hyphy-tree-branch-lengths': [true, true],
                'hyphy-tree-hide-legend': [true, false],
                'hyphy-tree-fill-color': [true, false]
            },
            'suppress-tree-render': false,
            'chart-append-html' : true,
            'edgeColorizer' : this.props.edgeColorizer
        };

    return { 
              annotations : null,
              json : null,
              pmid : null,
              settings : tree_settings,
              test_results : null,
              tree : null,
              p : null,
              direction : 'unknown',
              evidence : 'unknown',
              pvalue : null,
              lrt : null,
              summary_k : 'unknown',
              pmid_text : "PubMed ID : Unknown",
              pmid_href : "#",
              relaxation_K : "unknown"
           };

  },

  componentWillMount: function() {
    this.loadFromServer();
    this.setEvents();
  },

  setEvents : function() {

    var self = this;

    $("#datamonkey-relax-load-json").on("change", function(e) {
        var files = e.target.files; // FileList object

        if (files.length == 1) {
            var f = files[0];
            var reader = new FileReader();

            reader.onload = (function(theFile) {
              return function(e) {

                var data = JSON.parse(this.result);
                data["fits"]["Partitioned MG94xREV"]["branch-annotations"] = self.formatBranchAnnotations(data, "Partitioned MG94xREV");
                data["fits"]["General Descriptive"]["branch-annotations"] = self.formatBranchAnnotations(data, "General Descriptive");
                data["fits"]["Null"]["branch-annotations"] = self.formatBranchAnnotations(data, "Null");
                data["fits"]["Alternative"]["branch-annotations"] = self.formatBranchAnnotations(data, "Alternative");
                data["fits"]["Partitioned Exploratory"]["branch-annotations"] = self.formatBranchAnnotations(data, "Partitioned Exploratory");

                var annotations = data["fits"]["Partitioned MG94xREV"]["branch-annotations"],
                    json = data,
                    pmid = data["PMID"],
                    test_results = data["relaxation_test"];

                var p = data["relaxation-test"]["p"],
                    direction = data["fits"]["Alternative"]["K"] > 1 ? 'intensification' : 'relaxation',
                    evidence = p <= self.props.alpha_level ? 'significant' : 'not significant',
                    pvalue = self.p_value_format(p),
                    lrt = self.fit_format(data["relaxation-test"]["LR"]),
                    summary_k = self.fit_format(data["fits"]["Alternative"]["K"]),
                    pmid_text = "PubMed ID " + pmid,
                    pmid_href = "http://www.ncbi.nlm.nih.gov/pubmed/" + pmid;


                self.setState({
                                annotations : annotations,
                                json : json,
                                pmid : pmid,
                                test_results : test_results,
                                p : p,
                                direction : direction,
                                evidence : evidence,
                                pvalue : pvalue,
                                lrt : lrt,
                                summary_k : summary_k,
                                pmid_text : pmid_text,
                                pmid_href : pmid_href
                              });
              }

            })(f);
            reader.readAsText(f);
        }

        $("#datamonkey-absrel-toggle-here").dropdown("toggle");
        e.preventDefault();
    });


  },

  formatBranchAnnotations : function(json, key) {

    var initial_branch_annotations = json["fits"][key]["branch-annotations"];

    if(!initial_branch_annotations) {
      initial_branch_annotations = json["fits"][key]["rate distributions"];
    }

    // Iterate over objects
    branch_annotations = _.mapObject(initial_branch_annotations, function(val, key) {
      return {"length" : val};
    });

    return branch_annotations;

  },

  initialize : function() {},

  render: function() {

    var self = this;

    return (
      React.createElement("div", {className: "tab-content"}, 
         React.createElement("div", {className: "tab-pane active", id: "datamonkey-relax-summary-tab"}, 
             React.createElement("div", {id: "hyphy-relax-summary", className: "row"}, 
              React.createElement("div", {className: "col-md-12"}, 
                  React.createElement("ul", {className: "list-group"}, 
                      React.createElement("li", {className: "list-group-item list-group-item-info"}, 
                          React.createElement("h3", {className: "list-group-item-heading"}, 
                            React.createElement("i", {className: "fa fa-list", styleFormat: "margin-right: 10px"}), 
                            React.createElement("span", {id: "summary-method-name"}, "RELAX(ed selection test)"), " summary"
                          ), 
                          React.createElement("p", {className: "list-group-item-text lead", styleFormat: "margin-top:0.5em; "}, 
                            "Test for selection ", React.createElement("strong", {id: "summary-direction"}, this.state.direction), 
                            "(", React.createElement("abbr", {title: "Relaxation coefficient"}, "K"), " = ", React.createElement("strong", {id: "summary-K"}, this.state.summary_k), ") was ", React.createElement("strong", {id: "summary-evidence"}, this.state.evidence), 
                            "(p = ", React.createElement("strong", {id: "summary-pvalue"}, this.state.p), ", ", React.createElement("abbr", {title: "Likelihood ratio statistic"}, "LR"), " = ", React.createElement("strong", {id: "summary-LRT"}, this.state.lrt), ")"
                          ), 
                          React.createElement("p", null, 
                            React.createElement("small", null, "Please cite ", React.createElement("a", {href: this.state.pmid_href, id: "summary-pmid"}, this.state.pmid_text), " if you use this result in a publication, presentation, or other scientific work.")
                          )
                      )
                  )
                )
             ), 
             React.createElement("div", {id: "hyphy-model-fits", className: "row"}, 
               React.createElement(ModelFits, {json: self.state.json})
             ), 
             React.createElement("div", {id: "hyphy-omega-plots", className: "row"}, 
               React.createElement(OmegaPlotGrid, {json: self.state.json})
             )
         ), 
         React.createElement("div", {className: "tab-pane", id: "tree-tab"}, 
           React.createElement(Tree, {json: self.state.json, 
                 settings: self.state.settings})
         )
      )
    )
  }
});


// Will need to make a call to this
// omega distributions
function render_relax(url, element) {
  React.render(
    React.createElement(RELAX, {url: url}),
    document.getElementById(element)
  );
}



const DatamonkeyTableRow = React.createClass ({displayName: "DatamonkeyTableRow",
/**
    A single table row

    *rowData* is an array of cells
        each cell can be one of
            1. string: simply render the text as shown
            2. object: a polymorphic case; can be rendered directly (if the object is a valid react.js element)
               or via a transformation of the value associated with the key 'value'

               supported keys
                2.1. 'value' : the value to use to generate cell context
                2.2. 'format' : the function (returning something react.js can render directly) that will be called
                to transform 'value' into the object to be rendered
                2.3. 'span' : colSpan attribute
                2.4. 'style': CSS style attributes (JSX specification, i.e. {margin-top: '1em'} and not a string)
                2.5. 'classes': CSS classes to apply to the cell
                2.6. 'abbr': wrap cell value in <abbr> tags

            3. array: directly render array elements in the cell (must be renderable to react.js; note that plain
            text elements will be wrapped in "span" which is not allowed to nest in <th/td>


    *header* is a bool indicating whether the header is a header row (th cells) or a regular row (td cells)
*/

    /*propTypes: {
     rowData: React.PropTypes.arrayOf (React.PropTypes.oneOfType ([React.PropTypes.string,React.PropTypes.number,React.PropTypes.object,React.PropTypes.array])).isRequired,
     header:  React.PropTypes.bool,
    },*/

    dm_compareTwoValues: function (a,b) {
        /**
            compare objects by iterating over keys
        */

        var myType = typeof a,
            self   = this;

        if (myType == typeof b) {
            if (myType == "string" || myType == "number") {
                    return a == b ? 1 : 0;
            }

            if (_.isArray (a) && _.isArray (b)) {

                if (a.length != b.length) {
                    return 0;
                }

                var not_compared = 0;
                var result = _.every (a, function (c, i) {var comp = self.dm_compareTwoValues (c, b[i]); if (comp < 0) {not_compared = comp; return false;} return comp == 1;});

                if (not_compared < 0) {
                    return not_compared;
                }

                return result ? 1 : 0;
            }

            return -2;
        }
        return -1;
    },

   dm_log100times: _.before (100, function (v) {
    console.log (v);
    return 0;
   }),

   shouldComponentUpdate: function (nextProps) {

        var self = this;

        if (this.props.header !== nextProps.header) {
            return true;
        }

        var result = _.some (this.props.rowData, function (value, index) {
            /** TO DO
                check for format and other field equality
            */
            if (value === nextProps.rowData[index]) {
                return false;
            }

            var compare = self.dm_compareTwoValues (value, nextProps.rowData[index]);
            if (compare >= 0) {
                return compare == 0;
            }

            if (compare == -2) {
                if (_.has (value, "value") && _.has (nextProps.rowData[index], "value")) {
                    return self.dm_compareTwoValues (value.value, nextProps.rowData[index].value) != 1;
                }

            }

            return true;
        });

        if (result) {
            this.dm_log100times (["Old", this.props.rowData, "New", nextProps.rowData]);
        }

        return result;
    },


    render: function () {
        return (
            React.createElement("tr", null, 
            
                this.props.rowData.map (_.bind(function (cell, index) {

                        var value = _.has (cell, "value") ? cell.value : cell;

                        if (_.isArray (value)) {
                            if (!_.has (cell, "format")) {
                                return value;
                            }
                        } else {
                            if (_.isObject (value)) {
                                if (!React.isValidElement (value)) {
                                    return null;
                                }
                            }
                        }

                        if (_.has (cell, "format")) {
                            value = cell.format (value);
                        }


                        if (_.has (cell, "abbr")) {
                            value = (
                                React.createElement("abbr", {title: cell.abbr}, value)
                            );
                        }

                        var cellProps = {key: index};

                        if (_.has (cell, "span")) {
                            cellProps["colSpan"] = cell.span;
                        }

                        if (_.has (cell, "style")) {
                            cellProps["style"] = cell.style;
                        }

                        if (_.has (cell, "classes")) {
                            cellProps["className"] = cell.classes;
                        }


                        return React.createElement (this.props.header ? "th" : "td" ,
                                                    cellProps,
                                                    value);


                    },this))
            
            )
        );
    }
});

var DatamonkeyTable = React.createClass ({displayName: "DatamonkeyTable",
/**
    A table composed of rows
        *headerData* -- an array of cells (see DatamonkeyTableRow) to render as the header
        *bodyData* -- an array of arrays of cells (rows) to render
        *classes* -- CSS classes to apply to the table element
*/

    /*propTypes: {
        headerData: React.PropTypes.array,
        bodyData: React.PropTypes.arrayOf (React.PropTypes.array),
    },*/

    getDefaultProps : function () {
        return {classes : "table table-condensed table-hover",
                rowHash : null,
                sortableColumns : new Object (null),
                initialSort: null,
                };
    },

    getInitialState: function () {
        return {sortedOn: this.props.initialSort};
    },


    render: function () {
        const children = [];

        if (this.props.headerData) {
            if (_.isArray (this.props.headerData[0])) { // multiple rows
                 children.push ((
                    React.createElement("thead", {key: 0}, 
                        
                            _.map (this.props.headerData, function (row, index) {
                                return (
                                    React.createElement(DatamonkeyTableRow, {rowData: row, header: true, key: index})
                                );
                            })
                        
                    )
                ));
            }
            else {
                children.push ((
                    React.createElement("thead", {key: 0}, 
                        React.createElement(DatamonkeyTableRow, {rowData: this.props.headerData, header: true})
                    )
                ));
            }
        }

        children.push (React.createElement ("tbody", {key : 1},
             _.map (this.props.bodyData, _.bind(function (componentData, index) {
                            return (
                                React.createElement(DatamonkeyTableRow, {rowData: componentData, key: this.props.rowHash ? this.props.rowHash (componentData) : index, header: false})
                            );
                        }, this))));


        return React.createElement ("table", {className: this.props.classes}, children);
    }
});


var DatamonkeyRateDistributionTable = React.createClass ({displayName: "DatamonkeyRateDistributionTable",

  /** render a rate distribution table from JSON formatted like this
  {
       "non-synonymous/synonymous rate ratio for *background*":[ // name of distribution
        [0.1701428265961598, 1] // distribution points (rate, weight)
        ],
       "non-synonymous/synonymous rate ratio for *test*":[
        [0.1452686330406915, 1]
        ]
  }

  */

  propTypes: {
    distribution: React.PropTypes.object.isRequired,
  },

  dm_formatterRate : d3.format (".3r"),
  dm_formatterProp : d3.format (".3p"),

  dm_createDistributionTable: function (jsonRates) {
    var rowData = [];
    var self = this;
    _.each (jsonRates, function (value, key) {
        rowData.push ([{value: key, span: 3, classes: "info"}]);
        _.each (value, function (rate, index) {
            rowData.push ([{value: rate[1], format: self.dm_formatterProp}, '@', {value: rate[0], format: self.dm_formatterRate}]);
        })
    });
    return rowData;
  },

  render: function () {
    return (
        (React.createElement(DatamonkeyTable, {bodyData: this.dm_createDistributionTable(this.props.distribution), classes: "table table-condensed"}))
    );
  },

});

var DatamonkeyPartitionTable = React.createClass({displayName: "DatamonkeyPartitionTable",

   dm_formatterFloat : d3.format (".3r"),
   dm_formatterProp : d3.format (".3p"),

   propTypes: {
        trees: React.PropTypes.object.isRequired,
        partitions: React.PropTypes.object.isRequired,
        branchAttributes: React.PropTypes.object.isRequired,
        siteResults: React.PropTypes.object.isRequired,
        accessorNegative: React.PropTypes.func.isRequired,
        accessorPositive: React.PropTypes.func.isRequired,
        pValue: React.PropTypes.number.isRequired,
    },

    dm_computePartitionInformation: function (trees, partitions, attributes, pValue) {

        var partitionKeys = _.sortBy (_.keys (partitions), function (v) {return v;}),
            matchingKey = null,
            self = this;

        var extractBranchLength = this.props.extractOn || _.find (attributes.attributes, function (value, key) {matchingKey = key; return value["attribute type"] == "branch length";});
        if (matchingKey) {
            extractBranchLength = matchingKey;
        }

        return _.map (partitionKeys, function (key, index) {
            var treeBranches = trees.tested[key],
                tested = {};


            _.each (treeBranches, function (value, key) { if (value == "test") tested[key] = 1;});

            var testedLength = extractBranchLength ? datamonkey.helpers.sum (attributes[key], function (v, k) { if  (tested[k.toUpperCase()]) {return v[extractBranchLength]} return 0;}) : 0;
            var totalLength =  extractBranchLength ? datamonkey.helpers.sum (attributes[key], function (v) { return v[extractBranchLength] || 0;}) : 0; // || 0 is to resolve root node missing length


            return _.map ([index+1, // 1-based partition index
                    partitions[key].coverage[0].length, // number of sites in the partition
                    _.size(tested), // tested branches
                    _.keys (treeBranches).length, // total branches
                    testedLength,
                    testedLength / totalLength,
                    totalLength,
                    _.filter (self.props.accessorPositive (self.props.siteResults, key), function (p) {return p <= pValue;}).length,
                    _.filter (self.props.accessorNegative (self.props.siteResults, key), function (p) {return p <= pValue;}).length,

                   ], function (cell, index) {
                        if (index > 1) {
                            var attributedCell = {value : cell,
                                                  style : {textAlign: 'center'}};

                            if (index == 4 || index == 6) {
                                _.extend (attributedCell, {'format': self.dm_formatterFloat});
                            }
                            if (index == 5) {
                                _.extend (attributedCell, {'format': self.dm_formatterProp});
                            }

                            return attributedCell;
                        }
                        return cell;
                   });
        });

    },

    dm_makeHeaderRow : function (pValue) {
        return [
                    _.map(["Partition", "Sites", "Branches", "Branch Length", "Selected at p" + String.fromCharCode(parseInt("2264",16)) + pValue], function (d,i) {
                        return _.extend ({value:d, style: {borderBottom: 0, textAlign: (i>1 ? 'center' : 'left')}}, i>1 ? {'span' : i == 3 ? 3 : 2} : {});
                    }),
                    _.map (
                        ["", "", "Tested", "Total", "Tested", "% of total", "Total", "Positive", "Negative"], function (d,i) {
                            return {value: d, style: {borderTop : 0, textAlign: (i>1 ? 'center' : 'left')}};
                        })
               ];
    },

    getInitialState: function() {
        return {
            header: this.dm_makeHeaderRow (this.props.pValue),
            rows: this.dm_computePartitionInformation (this.props.trees, this.props.partitions, this.props.branchAttributes, this.props.pValue),
        }
    },

    componentWillReceiveProps: function (nextProps) {
        this.setState ({
            header: this.dm_makeHeaderRow (nextProps.pValue),
            rows: this.dm_computePartitionInformation (nextProps.trees, nextProps.partitions, nextProps.branchAttributes, nextProps.pValue),
        });
    },

    render: function() {
        return (React.createElement("div", {className: "table-responsive"}, 
                    React.createElement(DatamonkeyTable, {headerData: this.state.header, bodyData: this.state.rows})
                ));
    }
});

var DatamonkeyModelTable = React.createClass({displayName: "DatamonkeyModelTable",

  /** render a model fit table from a JSON object with entries like this


        "Global MG94xREV":{ // model name
             "log likelihood":-5453.527975908821,
             "parameters":131,
             "AIC-c":11172.05569160427,
             "rate distributions":{
               "non-synonymous/synonymous rate ratio for *background*":[
                [0.1701428265961598, 1]
                ],
               "non-synonymous/synonymous rate ratio for *test*":[
                [0.1452686330406915, 1]
                ]
              },
             "display order":0
            }

    dm_supportedColumns controls which keys from model specification will be consumed;
        * 'value' is the cell specification to be consumed by DatamonkeyTableRow
        * 'order' is the column order in the resulting table (relative; doesn't have to be sequential)
        * 'display_format' is a formatting function for cell entries
        * 'transform' is a data trasformation function for cell entries

  */

  dm_numberFormatter: d3.format (".2f"),

  dm_supportedColumns : {'log likelihood' :
                                {order: 2,
                                 value: {"value" : "log L", "abbr" : "log likelihood" },
                                 display_format : d3.format (".2f")},
                         'parameters'     :
                                {order: 3,
                                 value: "Parameters"},
                         'AIC-c'  :
                                {order: 1,
                                 value: {value : React.createElement ('span', null, ['AIC', (React.createElement("sub", {key: "0"}, "C"))]),
                                         abbr : "Small-sample corrected Akaike Information Score"},
                                 display_format : d3.format (".2f")},
                         'rate distributions' :
                                {order: 4,
                                 value: "Rate distributions",
                                 transform: function (value) {
                                    return React.createElement (DatamonkeyRateDistributionTable, {distribution:value});
                                }},
                         },




  propTypes: {
    fits: React.PropTypes.object.isRequired,
  },

  getDefaultProps: function() {
    return {
        orderOn : "display order",
    };
  },

  dm_extractFitsTable : function (jsonTable) {
     var modelList = [];
     var columnMap = null;
     var columnMapIterator = [];
     var valueFormat = {};
     var valueTransform = {};
     var rowData   = [];
     var self = this;

     _.each (jsonTable, function (value, key) {
        if (!columnMap) {
            columnMap = {};
            _.each (value, function (cellValue, cellName) {
               if (self.dm_supportedColumns [cellName]) {
                    columnMap[cellName] = self.dm_supportedColumns [cellName];
                    columnMapIterator[columnMap[cellName].order] = cellName;
                    valueFormat [cellName] =  self.dm_supportedColumns [cellName]["display_format"];
                    if (_.isFunction (self.dm_supportedColumns [cellName]["transform"])) {
                        valueTransform [cellName] = self.dm_supportedColumns [cellName]["transform"];
                    }
               }
            });
            columnMapIterator = _.filter (columnMapIterator, function (v) {return v;})
        }


        var thisRow = [{value: key, style: {fontVariant: "small-caps" }}];

        _.each (columnMapIterator, function (tag) {

            var myValue = valueTransform [tag] ?  valueTransform [tag] (value[tag]) : value [tag];


            if (valueFormat[tag]) {
                thisRow.push ({'value' : myValue, 'format' : valueFormat[tag]});
            } else {
                thisRow.push(myValue);
            }
        });

        rowData.push ([thisRow, _.isNumber (value [self.props.orderOn]) ? value [self.props.orderOn] : rowData.length]);

       });



       return {'data' : _.map (_.sortBy (rowData, function (value) { return value[1]; }), function (r) {return r[0];}),
               'columns' : _.map (columnMapIterator, function (tag) {
        return columnMap[tag].value;
     }) };
  },

  dm_makeHeaderRow : function (columnMap) {
    var headerRow = ['Model'];
    _.each(columnMap, function (v) {headerRow.push(v);});
    return headerRow;
  },

  getInitialState: function () {

    var tableInfo = this.dm_extractFitsTable (this.props.fits);

    return {
                header:     this.dm_makeHeaderRow     (tableInfo.columns),
                rows:       tableInfo.data,
                caption:    null,
           };
  },


  render: function() {
        return (React.createElement("div", {className: "table-responsive"}, 
                    React.createElement(DatamonkeyTable, {headerData: this.state.header, bodyData: this.state.rows})
                ));
  },
});

var DatamonkeyTimersTable = React.createClass({displayName: "DatamonkeyTimersTable",

  dm_percentageFormatter: d3.format (".2%"),

  propTypes: {
    timers: React.PropTypes.object.isRequired,
  },

  dm_formatSeconds: function (seconds) {

    var fields = [ ~~ (seconds / 3600),
                ~~ ( (seconds % 3600) / 60),
                seconds % 60];


    return _.map (fields, function (d) { return d < 10 ? "0" + d : "" + d}).join (':') ;
  },

  dm_extractTimerTable : function (jsonTable) {
     var totalTime = 0.,
        formattedRows = _.map (jsonTable, _.bind ( function (value, key) {
        if (this.props.totalTime) {
            if (key == this.props.totalTime) {
                totalTime = value['timer'];
            }
        } else {
            totalTime += value['timer'];
        }
        return [key, value['timer'], value['order']];
     }, this));


     formattedRows = _.sortBy (formattedRows, function (row) {
        return row[2];
     });

     formattedRows = _.map (formattedRows, _.bind (function (row) {
        var fraction = null;
        if (this.props.totalTime === null || this.props.totalTime != row[0]) {
            row[2] = {"value" : row[1]/totalTime, "format": this.dm_percentageFormatter};
        } else {
            row[2] = "";
        }
        row[1] = this.dm_formatSeconds (row[1]);
        return row;
     }, this));

     return formattedRows;
  },

  dm_makeHeaderRow : function () {
    return ['Task', 'Time', '%'];
  },

  getInitialState: function () {

    return {
                header:     this.dm_makeHeaderRow (),
                rows:       this.dm_extractTimerTable (this.props.timers),
                caption:    null,
           };
  },


  render: function() {
        return (
            React.createElement(DatamonkeyTable, {headerData: this.state.header, bodyData: this.state.rows})

        );
  },
});





var SLACSites = React.createClass({displayName: "SLACSites",
    propTypes: {
     headers: React.PropTypes.arrayOf (React.PropTypes.arrayOf (React.PropTypes.string)).isRequired,
     mle  : React.PropTypes.object.isRequired,
     sample25 : React.PropTypes.object,
     sampleMedian: React.PropTypes.object,
     sample975: React.PropTypes.object,
     initialAmbigHandling: React.PropTypes.string.isRequired,
     partitionSites: React.PropTypes.object.isRequired,
    },



  getInitialState: function() {
    var canDoCI = this.props.sample25 && this.props.sampleMedian && this.props.sample975;

    return {

                ambigOptions: this.dm_AmbigOptions (this.props),
                ambigHandling: this.props.initialAmbigHandling,
                filters: new Object (null),
                showIntervals: canDoCI,
                hasCI : canDoCI,
           };
  },

  getDefaultProps: function() {

    return {
                sample25: null,
                sampleMedian: null,
                sample975: null,
                initialAmbigHandling: "RESOLVED",
           };
  },



  componentWillReceiveProps: function(nextProps) {
        this.setState (
           {

                ambigOptions: this.dm_AmbigOptions (nextProps),
                ambigHandling: nextProps.initialAmbigHandling,
           }
        );
  },

  dm_formatNumber: d3.format (".3r"),
  dm_formatNumberShort: d3.format (".2r"),

  dm_log10times: _.before (10, function (v) {
    console.log (v);
    return 0;
  }),

  dm_formatInterval: function (values) {
    //this.dm_log10times (values);

    return this.dm_formatNumber (values[0]) + " / " + this.dm_formatNumber (values[2]) +
                " ["  + this.dm_formatNumber (values[1])  +
                " : " + this.dm_formatNumber (values[3]) + "]";
  },

  dm_AmbigOptions: function (theseProps) {
    return _.keys (theseProps.mle[0]);
  },


  dm_changeAmbig : function (event) {

    this.setState ({
                        ambigHandling : event.target.value,
                   });
  },

  dm_toggleIntervals : function (event) {
     this.setState ({
                        showIntervals : !this.state.showIntervals,
                   });
  },

  dm_toggleVariableFilter: function (event) {

    var filterState = new Object (null);
    _.extend (filterState,  this.state.filters);
    filterState ["variable"] = (this.state.filters["variable"] == "on") ? "off" : "on";
    this.setState ({filters: filterState});

  },

  dm_makeFilterFunction: function () {

    var filterFunction = null;

    _.each (this.state.filters, function (value, key) {
        var composeFunction = null;

        switch (key) {
            case "variable" : {
                if (value == "on") {
                    composeFunction = function (f, partitionIndex, index, site, siteData) {
                        return (!f || f (partitionIndex, index, site, siteData)) && (siteData[2] + siteData[3] > 0);
                    }
                }
                break;
            }
        }

        if (composeFunction) {
         filterFunction = _.wrap (filterFunction, composeFunction);
        }
    });

     return filterFunction;
  },

  dm_makeHeaderRow : function () {

        var headers = ['Partition', 'Site'],
            doCI = this.state.showIntervals;

        if (doCI) {
            var secondRow = ['',''];

            _.each (this.props.headers, function (value) {
                headers.push ({value : value[0], abbr: value[1], span: 4, style: {textAlign: 'center'}});
                secondRow.push ('MLE');
                secondRow.push ('Med');
                secondRow.push ('2.5%');
                secondRow.push ('97.5%');
            });
            return [headers, secondRow];

       } else {

            _.each (this.props.headers, function (value) {
                headers.push ({value : value[0], abbr: value[1]});
            });

        }
        return headers;
  },

  dm_makeDataRows: function (filter) {

    var rows           = [],
        partitionCount = datamonkey.helpers.countPartitionsJSON (this.props.partitionSites),
        partitionIndex = 0,
        self = this,
        doCI = this.state.showIntervals;

    while (partitionIndex < partitionCount) {

        _.each (self.props.partitionSites [partitionIndex].coverage[0], function (site, index) {
            var siteData = self.props.mle[partitionIndex][self.state.ambigHandling][index];
            if (!filter || filter (partitionIndex, index, site, siteData)) {
                var thisRow   = [partitionIndex+1, site+1];
                    //secondRow = doCI ? ['',''] : null;

                _.each (siteData, function (estimate, colIndex) {

                    if (doCI) {
                        thisRow.push ({value : estimate, format : self.dm_formatNumber});
                        thisRow.push ({value : self.props.sample25[partitionIndex][self.state.ambigHandling][index][colIndex], format : self.dm_formatNumberShort});
                        thisRow.push ({value : self.props.sampleMedian[partitionIndex][self.state.ambigHandling][index][colIndex], format : self.dm_formatNumberShort});
                        thisRow.push ({value : self.props.sample975[partitionIndex][self.state.ambigHandling][index][colIndex], format : self.dm_formatNumberShort});

                        /*thisRow.push ({value: [estimate, self.props.sample25[partitionIndex][self.state.ambigHandling][index][colIndex],
                                                         self.props.sampleMedian[partitionIndex][self.state.ambigHandling][index][colIndex],
                                                         self.props.sample975[partitionIndex][self.state.ambigHandling][index][colIndex]],
                                       format: self.dm_formatInterval,

                                       }); */
                    } else {
                        thisRow.push ({value : estimate, format : self.dm_formatNumber});
                    }
                });
                rows.push (thisRow);
                //if (secondRow) {
                //    rows.push (secondRow);
                //}
            }
        });

        partitionIndex ++;
    }

    return rows;
  },

  render: function() {

        var self = this;


        var result = (

                React.createElement("div", {className: "table-responsive"}, 
                    React.createElement("form", {className: "form-inline navbar-form navbar-left"}, 
                      React.createElement("div", {className: "form-group"}, 

                      React.createElement("div", {className: "btn-group"}, 
                          React.createElement("button", {className: "btn btn-default btn-sm dropdown-toggle", type: "button", "data-toggle": "dropdown", "aria-haspopup": "true", "aria-expanded": "false"}, 
                            "Display Options ", React.createElement("span", {className: "caret"})
                          ), 
                          React.createElement("ul", {className: "dropdown-menu"}, 
                            React.createElement("li", {key: "variable"}, 
                                React.createElement("div", {className: "checkbox"}, 
                                    React.createElement("input", {type: "checkbox", checked: self.state.filters["variable"] == "on" ? true : false, defaultChecked: self.state.filters["variable"] == "on" ? true : false, onChange: self.dm_toggleVariableFilter}), " Variable sites only"
                                )
                            ), 
                            self.state.hasCI ? (
                            React.createElement("li", {key: "intervals"}, 
                                React.createElement("div", {className: "checkbox"}, 
                                    React.createElement("input", {type: "checkbox", checked: self.state.showIntervals, defaultChecked: self.state.showIntervals, onChange: self.dm_toggleIntervals}), " Show sampling confidence intervals"
                                )
                            )) : null
                          )
                        ), 


                        React.createElement("div", {className: "input-group"}, 
                          React.createElement("div", {className: "input-group-addon"}, "Ambiguities are "), 
                          React.createElement("select", {className: "form-control input-sm", defaultValue: self.state.ambigHandling, onChange: self.dm_changeAmbig}, 
                                
                                    _.map (this.state.ambigOptions, function (value, index) {
                                        return (
                                            React.createElement("option", {key: index, value: value}, value)
                                        );
                                    })
                                
                          )
                        )
                      )
                    ), 

                    React.createElement(DatamonkeyTable, {headerData: this.dm_makeHeaderRow(), bodyData: this.dm_makeDataRows (this.dm_makeFilterFunction())})
                ));


        return result;


  }
});




var SLACBanner = React.createClass({displayName: "SLACBanner",

  dm_countSites : function (json, cutoff) {

    var result = { all : 0,
                   positive: 0,
                   negative : 0};

    result.all       = datamonkey.helpers.countSitesFromPartitionsJSON (json);

    result.positive = datamonkey.helpers.sum (
                            json["MLE"]["content"],
                            function (partition) {
                                return _.reduce (partition["by-site"]["RESOLVED"], function (sum, row)
                                    {return sum + (row[8] <= cutoff ? 1 : 0);}, 0);
                            }
                       );

    result.negative = datamonkey.helpers.sum (
                            json["MLE"]["content"],
                            function (partition) {
                                return _.reduce (partition["by-site"]["RESOLVED"], function (sum, row)
                                    {return sum + (row[9] <= cutoff ? 1 : 0);}, 0);
                            }
                       );

    return result;
  },


  dm_computeState: function (state, pvalue) {
    return {
              sites: this.dm_countSites (state, pvalue),
           }
  },

  dm_formatP: d3.format (".3f"),

  getInitialState: function() {
    return this.dm_computeState (this.props.analysis_results, this.props.pValue);
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(this.dm_computeState (nextProps.analysis_results, nextProps.pValue));
  },

  render: function() {

        return (
              React.createElement("div", {className: "panel panel-primary"}, 
                  React.createElement("div", {className: "panel-heading"}, 
                      React.createElement("h3", {className: "panel-title"}, 
                        React.createElement("abbr", {title: "Single Likelihood Ancestor Counting"}, "SLAC"), " analysis summary"
                      )
                  ), 
                  React.createElement("div", {className: "panel-body"}, 
                      React.createElement("span", {className: "lead"}, 
                          "Evidence", React.createElement("sup", null, "†"), " of pervasive ", React.createElement("span", {className: "hyphy-red"}, "diversifying"), " / ", React.createElement("span", {className: "hyphy-navy"}, "purifying"), " selection was found at", 
                          React.createElement("strong", {className: "hyphy-red"}, " ", this.state.sites.positive), " / ", React.createElement("strong", {className: "hyphy-navy"}, this.state.sites.negative), " sites" + ' ' +
                          "among ", this.state.sites.all, " tested sites"

                      ), 
                      React.createElement("div", {style: {marginBottom: '0em'}}, 
                        React.createElement("small", null, 
                          React.createElement("sup", null, "†"), "Extended binomial test, p ≤ ", this.dm_formatP(this.props.pValue), 
                          React.createElement("div", {className: "dropdown hidden-print", style: {display: 'inline', marginLeft: '0.25em'}}, 
                            React.createElement("button", {id: "dm.pvalue.slider", type: "button", className: "btn btn-primary btn-xs dropdown-toggle", "data-toggle": "dropdown", "aria-haspopup": "true", "aria-expanded": "false"}, 
                            React.createElement("span", {className: "caret"})), 
                            React.createElement("ul", {className: "dropdown-menu", "aria-labelledby": "dm.pvalue.slider"}, 
                              React.createElement("li", null, React.createElement("a", {href: "#"}, React.createElement("input", {type: "range", min: "0", max: "1", value: this.props.pValue, step: "0.01", onChange: this.props.pAdjuster})))
                            )
                           ), 
                          React.createElement("emph", null, " not"), " corrected for multiple testing; ambiguous characters resolved to minimize substitution counts.", React.createElement("br", null), 
                          React.createElement("i", {className: "fa fa-exclamation-circle"}), " Please cite ", React.createElement("a", {href: "http://www.ncbi.nlm.nih.gov/pubmed/15703242", target: "_blank"}, "PMID 15703242"), " if you use this result in a publication, presentation, or other scientific work."
                        )
                      )
                  )
              )
            );

  }
});




var SLAC = React.createClass({displayName: "SLAC",

  float_format : d3.format(".2f"),

  dm_loadFromServer : function() {
  /* 20160721 SLKP: prefixing all custom (i.e. not defined by REACT) with dm_
     to make it easier to recognize scoping immediately */

    var self = this;

    d3.json(self.props.url, function(request_error, data) {

        if (!data) {
            var error_message_text = request_error.status == 404 ? self.props.url + " could not be loaded" : request_error.statusText;
            self.setState ({error_message: error_message_text});
        } else {
            self.dm_initializeFromJSON (data);
        }
    });

  },


  dm_initializeFromJSON: function (data) {
      this.setState ({ analysis_results : data});
  },

  getDefaultProps: function() {
    /* default properties for the component */

    return {
        url : "#"
    };

  },

  getInitialState: function() {

    return {
              analysis_results : null,
              error_message: null,
              pValue : 0.1,
           };

  },

  componentWillMount: function() {
    this.dm_loadFromServer();
    this.dm_setEvents();
  },

  dm_setEvents : function() {

    var self = this;

    $("#datamonkey-json-file").on("change", function(e) {

        var files = e.target.files; // FileList object

        if (files.length == 1) {
            var f = files[0];
            var reader = new FileReader();



            reader.onload = (function(theFile) {
                return function(e) {
                  try {
                    self.dm_initializeFromJSON (JSON.parse(this.result));
                  }
                  catch (error) {
                    self.setState ({error_message : error.toString()});
                  }
                }
            })(f);

            reader.readAsText(f);
        }

        $("#datamonkey-json-file-toggle").dropdown("toggle");
    });


  },

  dm_adjustPvalue : function (event) {
    this.setState ({pValue: parseFloat(event.target.value)});
  },

  render: function() {

    var self = this;

    if (self.state.error_message) {
        return (
            React.createElement("div", {id: "datamonkey-error", className: "alert alert-danger alert-dismissible", role: "alert"}, 
                React.createElement("button", {type: "button", className: "close", "data-dismiss": "alert", "aria-label": "Close"}, React.createElement("span", {"aria-hidden": "true"}, "×")), 
                React.createElement("strong", null, self.state.error_message), " ", React.createElement("span", {id: "datamonkey-error-text"})
            )
        );
    }

    if (self.state.analysis_results) {

        return (
           React.createElement("div", {className: "tab-content"}, 
                React.createElement("div", {className: "tab-pane", id: "summary_tab"}, 

                    React.createElement("div", {className: "row"}, 
                        React.createElement("div", {id: "summary-div", className: "col-md-12"}, 
                            React.createElement(SLACBanner, {analysis_results: self.state.analysis_results, pValue: self.state.pValue, pAdjuster: _.bind (self.dm_adjustPvalue, self)})
                        )
                    ), 

                    React.createElement("div", {className: "row hidden-print"}, 
                        React.createElement("div", {id: "datamonkey-slac-tree-summary", className: "col-lg-4 col-md-6 col-sm-12"}, 
                             React.createElement("div", {className: "panel panel-default"}, 
                                React.createElement("div", {className: "panel-heading"}, 
                                    React.createElement("h3", {className: "panel-title"}, 
                                        React.createElement("i", {className: "fa fa-puzzle-piece"}), " Partition information"
                                     )
                                ), 
                                React.createElement("div", {className: "panel-body"}, 
                                    React.createElement("small", null, 
                                        React.createElement(DatamonkeyPartitionTable, {
                                            pValue: self.state.pValue, 
                                            trees: self.state.analysis_results.trees, 
                                            partitions: self.state.analysis_results.partitions, 
                                            branchAttributes: self.state.analysis_results['branch attributes'], 
                                            siteResults: self.state.analysis_results.MLE, 
                                            accessorPositive: function (json, partition) {return _.map (json["content"][partition]["by-site"]["AVERAGED"], function (v) {return v[8];});}, 
                                            accessorNegative: function (json, partition) {return _.map (json["content"][partition]["by-site"]["AVERAGED"], function (v) {return v[9];});}}
                                        )
                                    )
                                )
                            )
                       ), 
                        React.createElement("div", {id: "datamonkey-slac-model-fits", className: "col-lg-5 col-md-6 col-sm-12"}, 
                             React.createElement("div", {className: "panel panel-default"}, 
                                React.createElement("div", {className: "panel-heading"}, 
                                    React.createElement("h3", {className: "panel-title"}, 
                                        React.createElement("i", {className: "fa fa-table"}), " Model fits"
                                     )
                                ), 
                                React.createElement("div", {className: "panel-body"}, 
                                    React.createElement("small", null, 
                                        React.createElement(DatamonkeyModelTable, {fits: self.state.analysis_results.fits})
                                    )
                                )
                            )
                        ), 
                        React.createElement("div", {id: "datamonkey-slac-timers", className: "col-lg-3 col-md-3 col-sm-12"}, 
                             React.createElement("div", {className: "panel panel-default"}, 
                                React.createElement("div", {className: "panel-heading"}, 
                                    React.createElement("h3", {className: "panel-title"}, 
                                        React.createElement("i", {className: "fa fa-clock-o"}), " Execution time"
                                     )
                                ), 
                                React.createElement("div", {className: "panel-body"}, 
                                    React.createElement("small", null, 
                                        React.createElement(DatamonkeyTimersTable, {timers: self.state.analysis_results.timers, totalTime: "Total time"})
                                    )
                                )
                            )
                        )
                    )


                    ), 

                    React.createElement("div", {className: "tab-pane active", id: "sites_tab"}, 
                        React.createElement("div", {className: "row"}, 
                            React.createElement("div", {id: "summary-div", className: "col-md-12"}, 
                                React.createElement(SLACSites, {
                                    headers: self.state.analysis_results.MLE.headers, 
                                    mle: datamonkey.helpers.map (datamonkey.helpers.filter (self.state.analysis_results.MLE.content, function (value, key) {return _.has (value, "by-site");}),
                                               function (value, key) {return value["by-site"];}), 
                                    sample25: self.state.analysis_results["sample-2.5"], 
                                    sampleMedian: self.state.analysis_results["sample-median"], 
                                    sample975: self.state.analysis_results["sample-97.5"], 
                                    partitionSites: self.state.analysis_results.partitions}
                                )
                            )
                        )
                    ), 

                    React.createElement("div", {className: "tab-pane", id: "tree_tab"}
                    )

            )
        );
        }
    return null;
  }

});



// Will need to make a call to this
// omega distributions
function render_slac(url, element) {
  ReactDOM.render(
    React.createElement(SLAC, {url: url}),
    document.getElementById(element)
  );
}

var Summary = React.createClass({displayName: "Summary",

  getDefaultProps : function() {
    return {
     alpha_level : 0.05
    };

  },

  getInitialState: function() {
    return {
      p : null,
      direction : 'unknown',
      evidence : 'unknown',
      pvalue : null,
      lrt : null,
      summary_k : 'unknown',
      pmid_text : "PubMed ID : Unknown",
      pmid_href : "#",
      relaxation_K : "unknown"
    };
  },

  p_value_format : d3.format(".4f"),
  fit_format : d3.format(".2f"),

  componentDidMount: function() {
    this.setState({
      p : this.props.json["relaxation-test"]["p"],
      direction : this.props.json["fits"]["Alternative"]["K"] > 1 ? 'intensification' : 'relaxation',
      evidence : this.state.p <= this.props.alpha_level ? 'significant' : 'not significant',
      pvalue : this.p_value_format(this.state.p),
      lrt : this.fit_format(this.props.json["relaxation-test"]["LR"]),
      summary_k : this.fit_format(this.props.json["fits"]["Alternative"]["K"]),
      pmid_text : "PubMed ID " + this.props.json['PMID'],
      pmid_href : "http://www.ncbi.nlm.nih.gov/pubmed/" + this.props.json['PMID']
    });
  },

  render: function() {

    return (
        React.createElement("div", {className: "col-md-12"}, 
            React.createElement("ul", {className: "list-group"}, 
                React.createElement("li", {className: "list-group-item list-group-item-info"}, 
                    React.createElement("h3", {className: "list-group-item-heading"}, 
                      React.createElement("i", {className: "fa fa-list", styleFormat: "margin-right: 10px"}), 
                      React.createElement("span", {id: "summary-method-name"}, "RELAX(ed selection test)"), " summary"
                    ), 
                    React.createElement("p", {className: "list-group-item-text lead", styleFormat: "margin-top:0.5em; "}, 
                      "Test for selection ", React.createElement("strong", {id: "summary-direction"}, this.state.direction), 
                      "(", React.createElement("abbr", {title: "Relaxation coefficient"}, "K"), " = ", React.createElement("strong", {id: "summary-K"}, this.state.summary_k), ") was ", React.createElement("strong", {id: "summary-evidence"}, this.state.evidence), 
                      "(p = ", React.createElement("strong", {id: "summary-pvalue"}, this.state.p), ", ", React.createElement("abbr", {title: "Likelihood ratio statistic"}, "LR"), " = ", React.createElement("strong", {id: "summary-LRT"}, this.state.lrt), ")"
                    ), 
                    React.createElement("p", null, 
                      React.createElement("small", null, "Please cite ", React.createElement("a", {href: this.state.pmid_href, id: "summary-pmid"}, this.state.pmid_text), " if you use this result in a publication, presentation, or other scientific work.")
                    )
                )
            )
          )
        )
  }

});

function render_summary(json) {
  React.render(
    React.createElement(Summary, {json: json}),
    document.getElementById("hyphy-relax-summary")
  );
}

function rerender_summary(json) {
  $("#hyphy-relax-summary").empty();
  render_summary(json);
}

var TreeSummary = React.createClass({displayName: "TreeSummary",

  getInitialState: function() {

    var table_row_data = this.getSummaryRows(this.props.json),
        table_columns = this.getTreeSummaryColumns(table_row_data);

    return { 
              table_row_data: table_row_data, 
              table_columns: table_columns
           };
  },

  getRateClasses : function(branch_annotations) {

    // Get count of all rate classes
    var all_branches = _.values(branch_annotations);

    return _.countBy(all_branches, function(branch) {
      return branch.omegas.length;
    });

  },

  getBranchProportion : function(rate_classes) {
    var sum = _.reduce(_.values(rate_classes), function(memo, num) { return memo + num; });
    return _.mapObject(rate_classes, function(val, key) { return d3.format(".2p")(val/sum) } );
  },

  getBranchLengthProportion : function(rate_classes, branch_annotations, total_branch_length) {

    var self = this;

    // get branch lengths of each rate distribution
    //return prop_format(d[2] / total_tree_length

    // Get count of all rate classes
    var branch_lengths = _.mapObject(rate_classes, function(d) { return 0}); 

    for (var key in branch_annotations) {
      var node = self.tree.get_node_by_name(key);
      branch_lengths[branch_annotations[key].omegas.length] += self.tree.branch_length()(node);
    };

    return _.mapObject(branch_lengths, function(val, key) { return d3.format(".2p")(val/total_branch_length) } );

  },

  getNumUnderSelection : function(rate_classes, branch_annotations, test_results) {

    var num_under_selection = _.mapObject(rate_classes, function(d) { return 0}); 

    for (var key in branch_annotations) {
      num_under_selection[branch_annotations[key].omegas.length] += test_results[key]["p"] <= 0.05;
    };

    return num_under_selection;

  },

  getSummaryRows : function(json) {

    var self = this;

    // Will need to create a tree for each fits
    var analysis_data = json;

    if(!analysis_data) {
      return [];
    }

    // Create an array of phylotrees from fits
    var trees = _.map(analysis_data["fits"], function(d) { return d3.layout.phylotree("body")(d["tree string"]) });
    var tree = trees[0];

    self.tree = tree;
    

    //TODO : Do not hard code model here
    var tree_length = analysis_data["fits"]["Full model"]["tree length"];
    var branch_annotations = analysis_data["fits"]["Full model"]["branch-annotations"];
    var test_results = analysis_data["test results"];

    var rate_classes = this.getRateClasses(branch_annotations),
        proportions = this.getBranchProportion(rate_classes),
        length_proportions = this.getBranchLengthProportion(rate_classes, branch_annotations, tree_length),
        num_under_selection = this.getNumUnderSelection(rate_classes, branch_annotations, test_results);

    // zip objects into matrix
    var keys = _.keys(rate_classes);

    var summary_rows = _.zip(
      keys
      ,_.values(rate_classes)
      ,_.values(proportions)
      ,_.values(length_proportions)
      ,_.values(num_under_selection)
    )

    summary_rows.sort(function(a, b) {
      if (a[0] == b[0]) {
          return a[1] < b[1] ? -1 : (a[1] == b[1] ? 0 : 1);
      }
      return a[0] - b[0];
    });

    return summary_rows;

  },

  getTreeSummaryColumns : function(table_row_data) {

    var omega_header = '<th>ω rate<br>classes</th>',
        branch_num_header = '<th># of <br>branches</th>',
        branch_prop_header = '<th>% of <br>branches</th>',
        branch_prop_length_header = '<th>% of tree <br>length</th>',
        under_selection_header = '<th># under <br>selection</th>';


    // inspect table_row_data and return header
    var all_columns = [ 
                    omega_header,
                    branch_num_header, 
                    branch_prop_header, 
                    branch_prop_length_header, 
                    under_selection_header
                  ];

    // validate each table row with its associated header
    if(table_row_data.length == 0) {
      return [];
    }

    // trim columns to length of table_row_data
    column_headers = _.take(all_columns, table_row_data[0].length)

    return column_headers;
  },

  componentWillReceiveProps: function(nextProps) {

    var table_row_data = this.getSummaryRows(nextProps.json),
        table_columns = this.getTreeSummaryColumns(table_row_data);

    this.setState({
                    table_row_data: table_row_data, 
                    table_columns: table_columns
                  });

  },

  componentDidUpdate : function() {

    d3.select('#summary-tree-header').empty();

    var tree_summary_columns = d3.select('#summary-tree-header');

    tree_summary_columns = tree_summary_columns.selectAll("th").data(this.state.table_columns);
    tree_summary_columns.enter().append("th");
    tree_summary_columns.html(function(d) {
        return d;
    });

    var tree_summary_rows = d3.select('#summary-tree-table').selectAll("tr").data(this.state.table_row_data);
    tree_summary_rows.enter().append('tr');
    tree_summary_rows.exit().remove();
    tree_summary_rows = tree_summary_rows.selectAll("td").data(function(d) {
        return d;
    });

    tree_summary_rows.enter().append("td");
    tree_summary_rows.html(function(d) {
        return d;
    });


  },


  render: function() {

    return (
        React.createElement("ul", {className: "list-group"}, 
            React.createElement("li", {className: "list-group-item"}, 
              React.createElement("h4", {className: "list-group-item-heading"}, React.createElement("i", {className: "fa fa-tree"}), "Tree"), 
              React.createElement("table", {className: "table table-hover table-condensed list-group-item-text"}, 
                React.createElement("thead", {id: "summary-tree-header"}), 
                React.createElement("tbody", {id: "summary-tree-table"})
              )
            )
        )
      )
  }

});

//TODO
//<caption>
//<p className="list-group-item-text text-muted">
//    Total tree length under the branch-site model is <strong id="summary-tree-length">2.30</strong> expected substitutions per nucleotide site, and <strong id="summary-tree-length-mg94">1.74</strong> under the MG94 model.
//</p>
//</caption>


// Will need to make a call to this
// omega distributions
function render_tree_summary(json, element) {
  React.render(
    React.createElement(TreeSummary, {json: json}),
    $(element)[0]
  );
}

// Will need to make a call to this
// omega distributions
function rerender_tree_summary(tree, element) {
  $(element).empty();
  render_tree_summary(tree, element);
}



var Tree = React.createClass({displayName: "Tree",

  getInitialState: function() {
    return { 
              json : this.props.json,
              settings : this.props.settings
           };
  },

  sortNodes : function(asc) {

      var self = this;

      self.tree.traverse_and_compute(function(n) {
          var d = 1;
          if (n.children && n.children.length) {
              d += d3.max(n.children, function(d) {
                  return d["count_depth"];
              });
          }
          n["count_depth"] = d;
      });

      self.tree.resort_children(function(a, b) {
          return (a["count_depth"] - b["count_depth"]) * (asc ? 1 : -1);
      });

  },

  getBranchLengths : function() {

      var self = this;

      if(!this.state.json) {
        return [];
      }

      var branch_lengths = self.settings["tree-options"]["hyphy-tree-branch-lengths"][0] 
                           ? this.state.json["fits"][this.which_model]["branch-lengths"] : null;

      if(!branch_lengths) {

        var nodes = _.filter(self.tree.get_nodes(), function(d) { return d.parent });

        branch_lengths = _.object(
              _.map(nodes, function(d){ return d.name }), 
              _.map(nodes, function(d) { return parseFloat(d.attribute) })
            );

      }

      return branch_lengths;

  },

  assignBranchAnnotations : function() {
    if(this.state.json && this.state.json["fits"][this.which_model]) {
      this.tree.assign_attributes(this.state.json["fits"][this.which_model]["branch-annotations"]);
    }
  },

  renderDiscreteLegendColorScheme : function(svg_container) {

    var self = this,
        svg = self.svg;

    var color_fill = self.settings["tree-options"]["hyphy-tree-fill-color"][0] ? "black" : "red";

    var margins = {
            'bottom': 30,
            'top': 15,
            'left': 40,
            'right': 2
        };


    d3.selectAll("#color-legend").remove();

    var dc_legend = svg.append("g")
          .attr("id", "color-legend")
          .attr("class", "dc-legend")
          .attr("transform", "translate(" + margins["left"] + "," + margins["top"] + ")");

    var fg_item = dc_legend.append("g")
      .attr("class","dc-legend-item")
      .attr("transform", "translate(0,0)")

      fg_item.append("rect")
        .attr("width", "13")
        .attr("height", "13")
        .attr("fill", color_fill)

      fg_item.append("text")
        .attr("x", "15")
        .attr("y", "11")
        .text("Foreground")

    var bg_item = dc_legend.append("g")
      .attr("class","dc-legend-item")
      .attr("transform", "translate(0,18)")

      bg_item.append("rect")
        .attr("width", "13")
        .attr("height", "13")
        .attr("fill", "gray")

      bg_item.append("text")
        .attr("x", "15")
        .attr("y", "11")
        .text("Background")

  },

  renderLegendColorScheme : function(svg_container, attr_name, do_not_render) {

    var self = this;

    var branch_annotations = this.state.json["fits"][this.which_model]["branch-annotations"];

    var svg = self.svg;

    // clear existing linearGradients
    d3.selectAll(".legend-definitions").selectAll("linearGradient").remove();
    d3.selectAll("#color-legend").remove();

    if (branch_annotations && !do_not_render) {
        var bar_width = 70,
            bar_height = 300,
            margins = {
                'bottom': 30,
                'top': 15,
                'left': 40,
                'right': 2
            };

        this_grad = svg.append("defs")
            .attr("class", "legend-definitions")
            .append("linearGradient")
              .attr("id", "_omega_bar")
              .attr("x1", "0%")
              .attr("y1", "0%")
              .attr("x2", "0%")
              .attr("y2", "100%");

        var omega_scale = d3.scale.pow().exponent(this.scaling_exponent)
            .domain(d3.extent(self.omega_color.domain()))
            .range([0, 1]),
            axis_scale = d3.scale.pow().exponent(this.scaling_exponent)
            .domain(d3.extent(self.omega_color.domain()))
            .range([0, bar_height - margins['top'] - margins['bottom']]);


        self.omega_color.domain().forEach(function(d) {
            this_grad.append("stop")
                .attr("offset", "" + omega_scale(d) * 100 + "%")
                .style("stop-color", self.omega_color(d));
        });

        var g_container = svg.append("g")
              .attr("id", "color-legend")
              .attr("transform", "translate(" + margins["left"] + "," + margins["top"] + ")");

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
  },

  setHandlers : function() {

      var self = this;

      $("#hyphy-error-hide").on("click", function(e) {
          d3.select("#hyphy-error").style("display", "none");
          e.preventDefault();
      });

      $(".hyphy-tree-trigger").on("click", function(e) {

        self.renderTree();

      });

      $(".tree-tab-btn").on('click', function(e) {
        self.tree.placenodes().update();
      });

      $("#export-phylo-svg").on('click', function(e) {
          datamonkey.save_image("svg", "#tree_container");
      });

      $("#export-phylo-png").on('click', function(e) {
          datamonkey.save_image("png", "#tree_container");
      });

  },

  setTreeHandlers : function() {

    var self = this;
    var tree_object = self.tree;

    $("[data-direction]").on("click", function(e) {
        var which_function = $(this).data("direction") == 'vertical' ? tree_object.spacing_x : tree_object.spacing_y;
        which_function(which_function() + (+$(this).data("amount"))).update();
    });


    $(".phylotree-layout-mode").on("change", function(e) {
        if ($(this).is(':checked')) {
            if (tree_object.radial() != ($(this).data("mode") == "radial")) {
                tree_object.radial(!tree_object.radial()).placenodes().update();
            }
        }
    });

    $(".phylotree-align-toggler").on("change", function(e) {
        if ($(this).is(':checked')) {
            if (tree_object.align_tips($(this).data("align") == "right")) {
                tree_object.placenodes().update();
            }
        }
    });

    $("#sort_original").on("click", function(e) {
        tree_object.resort_children(function(a, b) {
            return a["original_child_order"] - b["original_child_order"];
        });

        e.preventDefault();

    });

    $("#sort_ascending").on("click", function(e) {
        self.sortNodes(true);
        e.preventDefault();
    });

    $("#sort_descending").on("click", function(e) {
        self.sortNodes(false);
        e.preventDefault();
    });


  },

  setPartitionList : function() {

    var self = this;

    // Check if partition list exists
    if(!self.props.json["partition"]) {
      d3.select("#hyphy-tree-highlight-div").style("display", "none");
      d3.select("#hyphy-tree-highlight").style("display", "none");
      return;
    }

    // set tree partitions
    self.tree.set_partitions(self.props.json["partition"]);

    var partition_list = d3.select("#hyphy-tree-highlight-branches").selectAll("li").data([
        ['None']
    ].concat(d3.keys(self.props.json["partition"]).map(function(d) {
        return [d];
    }).sort()));

    partition_list.enter().append("li");
    partition_list.exit().remove();
    partition_list = partition_list.selectAll("a").data(function(d) {
        return d;
    });

    partition_list.enter().append("a");
    partition_list.attr("href", "#").on("click", function(d, i) {
        d3.select("#hyphy-tree-highlight").attr("value", d);
        self.renderTree();
    });

    // set default to passed setting
    partition_list.text(function(d) {
        if (d == "RELAX.test") {
            this.click();
        }
        return d;
    });

  },

  setModelList : function() {

    var self = this;

    if(!this.state.json) {
      return [];
    }

    this.state.settings['suppress-tree-render'] = true;

    var def_displayed = false;

    var model_list = d3.select("#hyphy-tree-model-list").selectAll("li").data(d3.keys(this.state.json["fits"]).map(function(d) {
        return [d];
    }).sort());

    model_list.enter().append("li");
    model_list.exit().remove();
    model_list = model_list.selectAll("a").data(function(d) {
        return d;
    });

    model_list.enter().append("a");

    model_list.attr("href", "#").on("click", function(d, i) {
      d3.select("#hyphy-tree-model").attr("value", d);
      self.renderTree();
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

        if (!def_displayed && d == "MG94") {
            def_displayed = true;
            this.click();
        }

        if (!def_displayed && d == "Full model") {
            def_displayed = true;
            this.click();
        }

        return d;

    });

    this.settings['suppress-tree-render'] = false;

  },

  initialize : function() {

    var self = this;

    this.settings = this.state.settings;

    if(!this.settings) {
      return null;
    }

    if(!this.state.json) {
      return null;
    }

    $("#hyphy-tree-branch-lengths").click();

    this.scaling_exponent = 0.33;
    this.omega_format = d3.format(".3r");
    this.prop_format = d3.format(".2p");
    this.fit_format = d3.format(".2f");
    this.p_value_format = d3.format(".4f");

    var json =  this.state.json;
    var analysis_data = json;

    this.width = 800;
    this.height = 600;

    this.which_model = this.settings["tree-options"]["hyphy-tree-model"][0];
    this.legend_type = this.settings["hyphy-tree-legend-type"];

    this.setHandlers();
    this.setModelList();
    this.initializeTree();
    this.setPartitionList();

  },

  initializeTree : function() {

    var self = this;

    var analysis_data = self.state.json;

    var width = this.width,
        height = this.height,
        alpha_level = 0.05,
        branch_lengths = [];

    if(!this.tree) {
      this.tree = d3.layout.phylotree("body")
          .size([height, width])
          .separation(function(a, b) {
              return 0;
          });
    }

    this.setTreeHandlers();

    // clear any existing svg
    d3.select("#tree_container").html("");

    this.svg = d3.select("#tree_container").append("svg")
        .attr("width", width)
        .attr("height", height);

    this.tree.branch_name(null);
    this.tree.node_span('equal');
    this.tree.options({
        'draw-size-bubbles': false,
        'selectable': false,
        'left-right-spacing': 'fit-to-size',
        'left-offset': 100,
        'color-fill': this.settings["tree-options"]["hyphy-tree-fill-color"][0]
    }, false);

    this.assignBranchAnnotations();

    self.omega_color = d3.scale.pow().exponent(this.scaling_exponent)
        .domain([0, 0.25, 1, 5, 10])
        .range(this.settings["tree-options"]["hyphy-tree-fill-color"][0] 
                    ? ["#DDDDDD", "#AAAAAA", "#888888", "#444444", "#000000"] 
                    :  ["#5e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"]) 
        .clamp(true);

    self.renderTree();

    if (self.legend_type == 'discrete') {
      self.renderDiscreteLegendColorScheme("tree_container");
    } else {
      self.renderLegendColorScheme("tree_container", analysis_data["fits"][this.which_model]["annotation-tag"]);
    }


    if(this.settings.edgeColorizer) {
      this.edgeColorizer = this.settings.edgeColorizer;
    }


    this.tree.style_edges(this.edgeColorizer);
    this.tree.style_nodes(this.nodeColorizer);

    this.tree.spacing_x(30, true);
    this.tree.layout();
    this.tree.placenodes().update();
    this.tree.layout();

  },

  renderTree : function(skip_render) {

      var self = this;
      var analysis_data = this.state.json;
      var svg = self.svg;

      if (!this.settings['suppress-tree-render']) {

          var do_layout = false;

          for (var k in this.settings["tree-options"]) {

              //TODO : Check to make sure settings has a matching field
              if(k == 'hyphy-tree-model') {

                var controller = d3.select("#" + k),
                    controller_value = (controller.attr("value") || controller.property("checked"));
                    
                if (controller_value != this.settings["tree-options"][k][0] && controller_value != false) {
                    this.settings["tree-options"][k][0] = controller_value;
                    do_layout = do_layout || this.settings["tree-options"][k][1];
                }

              } else {
                var controller = d3.select("#" + k),
                    controller_value = (controller.attr("value") || controller.property("checked"));
                    
                if (controller_value != this.settings["tree-options"][k][0]) {
                    this.settings["tree-options"][k][0] = controller_value;
                    do_layout = do_layout || this.settings["tree-options"][k][1];
                }
              }
          }


          // Update which_model
          if(self.which_model != this.settings["tree-options"]["hyphy-tree-model"][0]) {
            self.which_model = this.settings["tree-options"]["hyphy-tree-model"][0]; 
            self.initializeTree();
            return;
          }

          if(_.indexOf(_.keys(analysis_data), "tree") > -1) {
            this.tree(analysis_data["tree"]).svg(svg);
          } else {
            this.tree(analysis_data["fits"][self.which_model]["tree string"]).svg(svg);
          }

          this.branch_lengths = this.getBranchLengths();

          this.tree.font_size(18);
          this.tree.scale_bar_font_size(14);
          this.tree.node_circle_size(0);

          this.tree.branch_length(function(n) {
              if (self.branch_lengths) {
                  return self.branch_lengths[n.name] || 0;
              }
              return undefined;
          });

          this.assignBranchAnnotations();
          
          if(_.findKey(analysis_data, "partition")) {
            this.partition = (this.settings["tree-options"]["hyphy-tree-highlight"] 
                              ? analysis_data["partition"][this.settings["tree-options"]["hyphy-tree-highlight"][0]] 
                              : null) || null;
          } else {
            this.partition = null;
          }

          self.omega_color = d3.scale.pow().exponent(self.scaling_exponent)
              .domain([0, 0.25, 1, 5, 10])
              .range(self.settings["tree-options"]["hyphy-tree-fill-color"][0] 
                     ? ["#DDDDDD", "#AAAAAA", "#888888", "#444444", "#000000"]
                     : ["#5e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"])
              .clamp(true);

          self.tree.options({
              'color-fill': self.settings["tree-options"]["hyphy-tree-fill-color"][0]
          }, false);


          d3.select(".phylotree-definitions").selectAll("linearGradient").remove();

          // TODO: Should be a prop. Hide or show legend.
          if(!this.settings["tree-options"]["hyphy-tree-hide-legend"][0]) {
            d3.select("#color-legend").style("visibility", "visible");
            
            if(self.legend_type) {
              self.renderDiscreteLegendColorScheme("tree_container");
            } else {
              self.renderLegendColorScheme("tree_container", self.state.json["fits"][self.which_model]["annotation-tag"]);
            }

          } else {
            d3.select("#color-legend").style("visibility", "hidden");
          }

          if (!skip_render) {
              if (do_layout) {
                  this.tree.update_layout();
              }
              d3_phylotree_trigger_refresh(this.tree);
          }

      }
  },

  componentDidMount: function() {
    this.initialize();
  },

  componentWillReceiveProps: function(nextProps) {

    this.setState({
                    json : nextProps.json,
                    settings : nextProps.settings
                  });

  },

  componentDidUpdate : function() {
    this.initialize();
  },

  render: function() {

    return (
        React.createElement("div", null, 
          React.createElement("div", {className: "row"}, 
              React.createElement("div", {className: "cold-md-12"}, 
                  React.createElement("div", {className: "input-group input-group-sm"}, 
                      React.createElement("div", {className: "input-group-btn"}, 
                          React.createElement("button", {id: "export-phylo-png", type: "button", className: "btn btn-default btn-sm", title: "Save Image"}, 
                              React.createElement("i", {className: "fa fa-image"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", "data-direction": "vertical", "data-amount": "1", title: "Expand vertical spacing"}, 
                              React.createElement("i", {className: "fa fa-arrows-v"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", "data-direction": "vertical", "data-amount": "-1", title: "Compress vertical spacing"}, 
                              React.createElement("i", {className: "fa  fa-compress fa-rotate-135"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", "data-direction": "horizontal", "data-amount": "1", title: "Expand horizonal spacing"}, 
                              React.createElement("i", {className: "fa fa-arrows-h"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", "data-direction": "horizontal", "data-amount": "-1", title: "Compress horizonal spacing"}, 
                              React.createElement("i", {className: "fa  fa-compress fa-rotate-45"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", id: "sort_ascending", title: "Sort deepest clades to the bototm"}, 
                              React.createElement("i", {className: "fa fa-sort-amount-asc"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", id: "sort_descending", title: "Sort deepsest clades to the top"}, 
                              React.createElement("i", {className: "fa fa-sort-amount-desc"})
                          ), 
                          React.createElement("button", {type: "button", className: "btn btn-default btn-sm", id: "sort_original", title: "Restore original order"}, 
                              React.createElement("i", {className: "fa fa-sort"})
                          )
                      ), 
                      React.createElement("div", {className: "input-group-btn", "data-toggle": "buttons"}, 
                          React.createElement("label", {className: "btn btn-default active btn-sm"}, 
                              React.createElement("input", {type: "radio", name: "options", className: "phylotree-layout-mode", "data-mode": "linear", autoComplete: "off", checked: "", title: "Layout left-to-right"}), "Linear"
                          ), 
                          React.createElement("label", {className: "btn btn-default  btn-sm"}, 
                              React.createElement("input", {type: "radio", name: "options", className: "phylotree-layout-mode", "data-mode": "radial", autoComplete: "off", title: "Layout radially"}), " Radial"
                          )
                      ), 
                      React.createElement("div", {className: "input-group-btn", "data-toggle": "buttons"}, 
                        React.createElement("label", {className: "btn btn-default active btn-sm"}, 
                          React.createElement("input", {type: "radio", className: "phylotree-align-toggler", "data-align": "left", name: "options-align", autoComplete: "off", checked: "", title: "Align tips labels to branches"}), 
                              React.createElement("i", {className: "fa fa-align-left"})
                        ), 
                        React.createElement("label", {className: "btn btn-default btn-sm"}, 
                         React.createElement("input", {type: "radio", className: "phylotree-align-toggler", "data-align": "right", name: "options-align", autoComplete: "off", title: "Align tips labels to the edge of the plot"}), 
                              React.createElement("i", {className: "fa fa-align-right"})
                        )
                      ), 
      
                      React.createElement("div", {className: "input-group-btn"}, 
                          React.createElement("button", {type: "button", className: "btn btn-default dropdown-toggle", "data-toggle": "dropdown"}, "Model", 
                              React.createElement("span", {className: "caret"})), 
                          React.createElement("ul", {className: "dropdown-menu", id: "hyphy-tree-model-list"}
                          )
                      ), 

                      React.createElement("input", {type: "text", className: "form-control disabled", id: "hyphy-tree-model", disabled: true}), 


                      React.createElement("div", {id: "hyphy-tree-highlight-div", className: "input-group-btn"}, 
                          React.createElement("button", {type: "button", className: "btn btn-default dropdown-toggle", "data-toggle": "dropdown"}, "Highlight branch set", 
                              React.createElement("span", {className: "caret"})), 
                          React.createElement("ul", {className: "dropdown-menu", id: "hyphy-tree-highlight-branches"}
                          )
                      ), 

                      React.createElement("input", {type: "text", className: "form-control disabled", id: "hyphy-tree-highlight", disabled: true}), 

                      React.createElement("span", {className: "input-group-addon"}, 
                        "Use model branch lengths", 
                        React.createElement("input", {type: "checkbox", id: "hyphy-tree-branch-lengths", className: "hyphy-tree-trigger"})
                      ), 

                      React.createElement("span", {className: "input-group-addon"}, 
                        "Hide legend", 
                        React.createElement("input", {type: "checkbox", id: "hyphy-tree-hide-legend", className: "hyphy-tree-trigger"})
                      ), 

                      React.createElement("span", {className: "input-group-addon"}, 
                        "Grayscale",  
                        React.createElement("input", {type: "checkbox", id: "hyphy-tree-fill-color", className: "hyphy-tree-trigger"})
                      )

                  )
              )
          ), 

          React.createElement("div", {className: "row"}, 
              React.createElement("div", {className: "col-md-12"}, 
                  React.createElement("div", {className: "row"}, 
                      React.createElement("div", {id: "tree_container", className: "tree-widget"})
                  )
              )
          )
        )

      )
  }

});

function render_tree(json, element, settings) {

  return React.render (
    React.createElement(Tree, {json: json, settings: settings}),
    $(element)[0]
  );


}

function rerender_tree(json, element, settings) {

  $(element).empty();
  return render_tree(json, settings);

}


//# sourceMappingURL=hyphy-vision.js.map
