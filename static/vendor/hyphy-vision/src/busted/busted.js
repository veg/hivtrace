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

