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
