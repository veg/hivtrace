importScripts('../../vendor/d3/d3.min.js', '../../vendor/underscore/underscore.js', '../js/misc.js');

onmessage = function(event) {
    try {
      datamonkey.hivtrace.compute_local_clustering(event.data);
      postMessage(event.data);
      self.close();
    } catch(e) {
        var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
          .replace(/^\s+at\s+/gm, '')
          .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
          .split('\n');
    };
};

