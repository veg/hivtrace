var root = this;

if (typeof datamonkey === 'undefined') {
	datamonkey = new Object;
}

datamonkey.hivtrace = function () {};

if (typeof exports !== 'undefined') {

  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = datamonkey.hivtrace;
  }

  exports.datamonkey.hivtrace = datamonkey.hivtrace;

} else {

  root.datamonkey.hivtrace = datamonkey.hivtrace;

}
