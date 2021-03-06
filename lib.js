var lib = (function () {
	var serialize = function (obj) {
		var convertFunction = function (fn) {
			if (typeof fn === "function") return function (args) {
				var a = args.map(function (arg) { arg = arg instanceof Array ? arg : arg.value; if (!fn.lazy && typeof arg === "function" && arg.thunk) arg = arg(); return arg; });
				return convertFunction(fn.apply(null, a));
			};
			return fn;
		};
		var convertObject = function (obj) {
			return {
				value: obj,
				mutability: 1,
				enumerable: 1
			};
		};
		if (typeof obj === "function") return convertFunction(obj);
		if (typeof obj === "object" && obj !== null && !(obj instanceof Array)) {
			for (var i in obj) {
				if (!obj.hasOwnProperty(i)) continue;
				obj[i] = convertObject(convertFunction(obj[i]));
			}
		}
		return obj;
	};

	var checkFunction = function (fn) {
		if (typeof fn !== "function") throw "Expected function argument";
	};

	var type = function (a) {
		if (a instanceof Array) return "array";
		if (typeof a === "undefined" || a === null) return "nil";
		return typeof a;
	};

	var lazy = function (fn) {
		fn.lazy = true;
		return fn;
	};

	var library = {
		"true": true,
		"false": false,
		"nil": null,
		"?": lazy(function (a, b) {
			var exists = typeof a !== undefined && a !== null;
			if (typeof b !== undefined) {
				//if (typeof b === "function") b = fn(b, []);
				return exists ? a : b;
			}
			return exists;
		}),
		type: function (a) {
			return type(a);
		},
		alert: function (msg) {
			msg = p(msg, "toString");
			alert(msg);
			return msg;
		},
		prompt: function (msg, defaultText) {
			return prompt(msg, defaultText);
		},
		error: function (err) {
			throw err;
		},
		"while": lazy(function (cond, fn) {
			var x;
			while (f(cond, []) === true) {
				x = f(fn, []);
				if (x === "break") break;
			}
			return x;
		}),
		until: lazy(function (cond, fn) {
			var x;
			while (f(cond, []) === false) {
				x = f(fn, []);
				if (x === "break") break;
			}
			return x;
		}),
		"if": lazy(function (cond, result) {
			if (f(cond, []) === true) return f(result, []);
		}),
		unless: lazy(function (cond, result) {
			if (f(cond, []) === false) return f(result, []);
		}),
		array: {
			toString: function (arr) {
				return "[(" + arr.join(") (") + ")]";
			},
			head: function (arr) {
				return arr[0];
			},
			tail: function (arr) {
				return arr.slice(1);
			},
			foot: function (arr) {
				return arr[arr.length - 1];
			},
			body: function (arr) {
				return arr.slice(0, -1);
			},
			length: function (arr) {
				return arr.length;
			},
			isEmpty: function (arr) {
				return !arr.length;
			},
			prepend: function (arr) {
				return function (value, v2) {
					if (typeof v2 !== "undefined") {
						value = [value];
						for (var i = 1; i < arguments.length; i++) {
							value.push(arguments[i]);
						}
					}
					return [].concat(value, arr);
				};
			},
			append: function (arr) {
				return function (value, v2) {
					if (typeof v2 !== "undefined") {
						value = [value];
						for (var i = 1; i < arguments.length; i++) {
							value.push(arguments[i]);
						}
					}
					return arr.concat(value);
				};
			},
			concat: function (arr) {
				return function (arr2) {
					if (!(arr2 instanceof Array)) throw "Expected array argument";
					return arr.concat(arr2);
				};
			},
			range: function (arr) {
				return function (start, end) {
					return arr.slice(start, end);
				};
			},
			remove: function (arr) {
				return function (start, end) {
					end = end || start;
					end++;
					return arr.slice(0, start).concat(arr.slice(end));
				};
			},
			insert: function (arr) {
				return function (index, elems) {
					if (!(elems instanceof Array)) throw "Expected array argument";
					return arr.slice(0, index).concat(elems, arr.slice(index));
				};
			},
			replace: function (arr) {
				return function (index, fn) {
					var x = arr.slice(0, index).concat([f(fn, [arr[index], index, arr])], arr.slice(index + 1));
					return x;
				};
			},
			join: function (arr) {
				return function (separator) {
					separator = separator || "";
					if (typeof separator !== "string") throw "Expected string argument.";
					arr = arr.map(function (v) { return p(v, "toString"); });
					return arr.join(separator);
				};
			},
			reverse: function (arr) {
				var ret = [];
				for (var i = arr.length - 1; i >= 0; i--) {
					ret.push(arr[i]);
				}
				return ret;
			},
			sort: function (arr) {
				return function (fn) {
					if (typeof fn !== "function") fn = function (a, b) {
						var aT = type(a), bT = type(b);
						if (aT !== bT) {
							return parseInt(aT, 36) - parseInt(bT, 36);
						}
						if (a > b) return 1;
						if (a < b) return -1;
						return 0;
					};
					return arr.slice().sort(fn);
				};
			},
			indexOf: function (arr) {
				return function (value) {
					for (var i = 0; i < arr.length; i++) {
						if (q(arr[i], value)) return i;
					}
					return -1;
				};
			},
			lastIndexOf: function (arr) {
				return function (value) {
					for (var i = arr.length - 1; i >= 0; i--) {
						if (q(arr[i], value)) return i;
					}
					return -1;
				};
			},
			contains: function (arr) {
				return function (value) {
					for (var i = 0; i < arr.length; i++) {
						if (q(arr[i], value)) return true;
					}
					return false;
				};
			},
			forEach: function (arr) {
				return function (fn) {
					checkFunction(fn);
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						f(fn, [arr[i], i, arr]);
					}
				};
			},
			fill: function (arr) {
				var ret = [], i;
				for (i = 1; i < arr.length; i++) {
					var from = arr[i - 1], to = arr[i], j;
					if (typeof from !== "number" || typeof to !== "number") throw "Can only fill numeric arrays";
					if (from < to)
						for (j = from; j < to; j++) ret.push(j);
					else
						for (j = from; j > to; j--) ret.push(j);
				}
				ret.push(arr[arr.length - 1]);
				return ret;
			},
			filter: function (arr) {
				return function (fn) {
					checkFunction(fn);
					var ret = [];
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						if (f(fn, [arr[i], i, arr]) === true) ret.push(arr[i]);
					}
					return ret;
				};
			},
			every: function (arr) {
				return function (fn) {
					checkFunction(fn);
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						if (f(fn, [arr[i], i, arr]) !== true) return false;
					}
					return true;
				};
			},
			some: function (arr) {
				return function (fn) {
					checkFunction(fn);
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						if (f(fn, [arr[i], i, arr]) === true) return true;
					}
					return false;
				};
			},
			map: function (arr) {
				return function (fn) {
					checkFunction(fn);
					var ret = [];
					for (var i in arr) {
						if (!arr.hasOwnProperty(i)) continue;
						ret[i] = f(fn, [arr[i], i, arr]);
					}
					return ret;
				};
			},
			reduce: function (arr) {
				return function (fn, seed) {
					var accum, i;
					if (typeof seed === "undefined") {
						if (!arr.length) throw "Cannot reduce empty array.";
						accum = arr[0]; i = 1;
					} else {
						accum = seed; i = 0;
					}
					while (i < arr.length) {
						accum = f(fn, [accum, arr[i], i, arr]);
						i++;
					}
					return accum;
				};
			},
			reduceBack: function (arr) {
				return function (fn, seed) {
					var accum, i;
					if (typeof seed === "undefined") {
						if (!arr.length) throw "Cannot reduce empty array.";
						accum = arr[arr.length - 1]; i = arr.length - 2;
					} else {
						accum = seed; i = arr.length - 1;
					}
					while (i >= 0) {
						accum = f(fn, [accum, arr[i], i, arr]);
						i--;
					}
					return accum;
				};
			},
			multiply: function (arr) {
				return function (arr2, fn) {
					var ret = [];
					for (var i = 0; i < arr.length; i++) {
						for (var j = 0; j < arr2.length; j++) {
							ret.push(f(fn, [arr[i], arr2[j]]));
						}
					}
					return ret;
				}
			},
			sum: function (arr) {
				var sum = 0;
				for (var i = 0; i < arr.length; i++) {
					if (typeof arr[i] === "number") sum += arr[i];
					else throw "Expected number";
				}
				return sum;
			},
			mean: function (arr) {
				var sum = 0;
				if (!arr.length) throw "Cannot find mean of empty array";
				for (var i = 0; i < arr.length; i++) {
					if (typeof arr[i] === "number") sum += arr[i];
					else throw "Expected number";
				}
				return sum / arr.length;
			},
			max: function (arr) {
				var max = Number.MIN_VALUE;
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] > max) max = arr[i];
				}
				return max === Number.MIN_VALUE ? undefined : max;
			},
			min: function (arr) {
				var min = Number.MAX_VALUE;
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] < min) min = arr[i];
				}
				return min === Number.MAX_VALUE ? undefined : min;
			},
			random: function (arr) {
				return arr[(Math.random() * arr.length) | 0];
			},
			shuffle: function (arr) {
				var ret = arr.slice(), i = ret.length;
				if (i === 0) throw "cannot shuffle empty array";
				while (--i) {
					var j = Math.floor(Math.random() * (i + 1)),
                    ti = ret[i], tj = ret[j];
					ret[i] = tj; ret[j] = ti;
				}
				return ret;
			}
		},
		object: {
			toString: function (obj) { return "_object_"; }
		},
		string: {
			toString: function (str) { return str; },
			split: function (str) {
				return function (sep, lim) {
					sep = sep || "";
					if (typeof sep !== "string") throw "Expected string argument";
					if (lim && typeof lim !== "number") throw "Expected number argument";
					return str.split(sep, lim);
				};
			},
			reverse: function (str) {
				return str.split("").reverse().join("");
			},
			format: function (str) {
				return function (obj) {
					newStr = "";
					for (var i = 0, j; i < str.length; i++) {
						j = i;
						if (str[i] === "#") {
							j++;
							var name = "", value = "";
							if (str[j] === "(") {
								while (str[++j] !== ")") name += str[j];
							} else {
								name = str[j];
							}
							if (!obj.hasOwnProperty(name)) {
								newStr += str[i];
								continue;
							}
							var match = obj[name];
							j++;
							if (str[j] === "{") {
								while (str[++j] !== "}") value += str[j];
								j++;
							}
							if (typeof match === "function") match = f(match, [value]);
							newStr += p(match, "toString");
							i = j - 1;
							continue;
						}
						newStr += str[i];
					}
					return newStr;
				};
			}
		},
		number: {
			toString: function (n) { return n + ""; },
			floor: function (n) { return Math.floor(n); },
			ceil: function (n) { return Math.ceil(n); }
		},
		boolean: {
			toString: function (bl) { return bl.toString(); }
		},
		"function": {
			toString: function (fn) { return "_function_"; }
		},
		"_nil": {
			toString: function () { return "nil"; }
		}
	};

	for (var i in library) {
		if (!library.hasOwnProperty(i)) continue;
		library[i] = serialize(library[i]);
	}
	return library;
})();