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
