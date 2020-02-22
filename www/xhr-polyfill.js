(function () {
  'use strict';

  // 'path' module extracted from Node.js v8.11.1 (only the posix part)

  function assertPath(path) {
    if (typeof path !== 'string') {
      throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
    }
  }

  // Resolves . and .. elements in a path with directory names
  function normalizeStringPosix(path, allowAboveRoot) {
    var res = '';
    var lastSegmentLength = 0;
    var lastSlash = -1;
    var dots = 0;
    var code;
    for (var i = 0; i <= path.length; ++i) {
      if (i < path.length)
        code = path.charCodeAt(i);
      else if (code === 47 /*/*/)
        break;
      else
        code = 47 /*/*/;
      if (code === 47 /*/*/) {
        if (lastSlash === i - 1 || dots === 1) ; else if (lastSlash !== i - 1 && dots === 2) {
          if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
            if (res.length > 2) {
              var lastSlashIndex = res.lastIndexOf('/');
              if (lastSlashIndex !== res.length - 1) {
                if (lastSlashIndex === -1) {
                  res = '';
                  lastSegmentLength = 0;
                } else {
                  res = res.slice(0, lastSlashIndex);
                  lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
                }
                lastSlash = i;
                dots = 0;
                continue;
              }
            } else if (res.length === 2 || res.length === 1) {
              res = '';
              lastSegmentLength = 0;
              lastSlash = i;
              dots = 0;
              continue;
            }
          }
          if (allowAboveRoot) {
            if (res.length > 0)
              res += '/..';
            else
              res = '..';
            lastSegmentLength = 2;
          }
        } else {
          if (res.length > 0)
            res += '/' + path.slice(lastSlash + 1, i);
          else
            res = path.slice(lastSlash + 1, i);
          lastSegmentLength = i - lastSlash - 1;
        }
        lastSlash = i;
        dots = 0;
      } else if (code === 46 /*.*/ && dots !== -1) {
        ++dots;
      } else {
        dots = -1;
      }
    }
    return res;
  }

  function _format(sep, pathObject) {
    var dir = pathObject.dir || pathObject.root;
    var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
    if (!dir) {
      return base;
    }
    if (dir === pathObject.root) {
      return dir + base;
    }
    return dir + sep + base;
  }

  var posix = {
    // path.resolve([from ...], to)
    resolve: function resolve() {
      var resolvedPath = '';
      var resolvedAbsolute = false;
      var cwd;

      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path;
        if (i >= 0)
          path = arguments[i];
        else {
          if (cwd === undefined)
            cwd = process.cwd();
          path = cwd;
        }

        assertPath(path);

        // Skip empty entries
        if (path.length === 0) {
          continue;
        }

        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
      }

      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)

      // Normalize the path
      resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

      if (resolvedAbsolute) {
        if (resolvedPath.length > 0)
          return '/' + resolvedPath;
        else
          return '/';
      } else if (resolvedPath.length > 0) {
        return resolvedPath;
      } else {
        return '.';
      }
    },

    normalize: function normalize(path) {
      assertPath(path);

      if (path.length === 0) return '.';

      var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
      var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

      // Normalize the path
      path = normalizeStringPosix(path, !isAbsolute);

      if (path.length === 0 && !isAbsolute) path = '.';
      if (path.length > 0 && trailingSeparator) path += '/';

      if (isAbsolute) return '/' + path;
      return path;
    },

    isAbsolute: function isAbsolute(path) {
      assertPath(path);
      return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
    },

    join: function join() {
      if (arguments.length === 0)
        return '.';
      var joined;
      for (var i = 0; i < arguments.length; ++i) {
        var arg = arguments[i];
        assertPath(arg);
        if (arg.length > 0) {
          if (joined === undefined)
            joined = arg;
          else
            joined += '/' + arg;
        }
      }
      if (joined === undefined)
        return '.';
      return posix.normalize(joined);
    },

    relative: function relative(from, to) {
      assertPath(from);
      assertPath(to);

      if (from === to) return '';

      from = posix.resolve(from);
      to = posix.resolve(to);

      if (from === to) return '';

      // Trim any leading backslashes
      var fromStart = 1;
      for (; fromStart < from.length; ++fromStart) {
        if (from.charCodeAt(fromStart) !== 47 /*/*/)
          break;
      }
      var fromEnd = from.length;
      var fromLen = fromEnd - fromStart;

      // Trim any leading backslashes
      var toStart = 1;
      for (; toStart < to.length; ++toStart) {
        if (to.charCodeAt(toStart) !== 47 /*/*/)
          break;
      }
      var toEnd = to.length;
      var toLen = toEnd - toStart;

      // Compare paths to find the longest common path from root
      var length = fromLen < toLen ? fromLen : toLen;
      var lastCommonSep = -1;
      var i = 0;
      for (; i <= length; ++i) {
        if (i === length) {
          if (toLen > length) {
            if (to.charCodeAt(toStart + i) === 47 /*/*/) {
              // We get here if `from` is the exact base path for `to`.
              // For example: from='/foo/bar'; to='/foo/bar/baz'
              return to.slice(toStart + i + 1);
            } else if (i === 0) {
              // We get here if `from` is the root
              // For example: from='/'; to='/foo'
              return to.slice(toStart + i);
            }
          } else if (fromLen > length) {
            if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
              // We get here if `to` is the exact base path for `from`.
              // For example: from='/foo/bar/baz'; to='/foo/bar'
              lastCommonSep = i;
            } else if (i === 0) {
              // We get here if `to` is the root.
              // For example: from='/foo'; to='/'
              lastCommonSep = 0;
            }
          }
          break;
        }
        var fromCode = from.charCodeAt(fromStart + i);
        var toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode)
          break;
        else if (fromCode === 47 /*/*/)
          lastCommonSep = i;
      }

      var out = '';
      // Generate the relative path based on the path difference between `to`
      // and `from`
      for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
        if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
          if (out.length === 0)
            out += '..';
          else
            out += '/..';
        }
      }

      // Lastly, append the rest of the destination (`to`) path that comes after
      // the common path parts
      if (out.length > 0)
        return out + to.slice(toStart + lastCommonSep);
      else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === 47 /*/*/)
          ++toStart;
        return to.slice(toStart);
      }
    },

    _makeLong: function _makeLong(path) {
      return path;
    },

    dirname: function dirname(path) {
      assertPath(path);
      if (path.length === 0) return '.';
      var code = path.charCodeAt(0);
      var hasRoot = code === 47 /*/*/;
      var end = -1;
      var matchedSlash = true;
      for (var i = path.length - 1; i >= 1; --i) {
        code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
          // We saw the first non-path separator
          matchedSlash = false;
        }
      }

      if (end === -1) return hasRoot ? '/' : '.';
      if (hasRoot && end === 1) return '//';
      return path.slice(0, end);
    },

    basename: function basename(path, ext) {
      if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
      assertPath(path);

      var start = 0;
      var end = -1;
      var matchedSlash = true;
      var i;

      if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return '';
        var extIdx = ext.length - 1;
        var firstNonSlashEnd = -1;
        for (i = path.length - 1; i >= 0; --i) {
          var code = path.charCodeAt(i);
          if (code === 47 /*/*/) {
              // If we reached a path separator that was not part of a set of path
              // separators at the end of the string, stop now
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
            if (firstNonSlashEnd === -1) {
              // We saw the first non-path separator, remember this index in case
              // we need it if the extension ends up not matching
              matchedSlash = false;
              firstNonSlashEnd = i + 1;
            }
            if (extIdx >= 0) {
              // Try to match the explicit extension
              if (code === ext.charCodeAt(extIdx)) {
                if (--extIdx === -1) {
                  // We matched the extension, so mark this as the end of our path
                  // component
                  end = i;
                }
              } else {
                // Extension does not match, so our result is the entire path
                // component
                extIdx = -1;
                end = firstNonSlashEnd;
              }
            }
          }
        }

        if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
        return path.slice(start, end);
      } else {
        for (i = path.length - 1; i >= 0; --i) {
          if (path.charCodeAt(i) === 47 /*/*/) {
              // If we reached a path separator that was not part of a set of path
              // separators at the end of the string, stop now
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // path component
            matchedSlash = false;
            end = i + 1;
          }
        }

        if (end === -1) return '';
        return path.slice(start, end);
      }
    },

    extname: function extname(path) {
      assertPath(path);
      var startDot = -1;
      var startPart = 0;
      var end = -1;
      var matchedSlash = true;
      // Track the state of characters (if any) we see before our first dot and
      // after any path separator we find
      var preDotState = 0;
      for (var i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
        if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // extension
          matchedSlash = false;
          end = i + 1;
        }
        if (code === 46 /*.*/) {
            // If this is our first dot, mark it as the start of our extension
            if (startDot === -1)
              startDot = i;
            else if (preDotState !== 1)
              preDotState = 1;
        } else if (startDot !== -1) {
          // We saw a non-dot and non-path separator before our dot, so we should
          // have a good chance at having a non-empty extension
          preDotState = -1;
        }
      }

      if (startDot === -1 || end === -1 ||
          // We saw a non-dot character immediately before the dot
          preDotState === 0 ||
          // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return '';
      }
      return path.slice(startDot, end);
    },

    format: function format(pathObject) {
      if (pathObject === null || typeof pathObject !== 'object') {
        throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
      }
      return _format('/', pathObject);
    },

    parse: function parse(path) {
      assertPath(path);

      var ret = { root: '', dir: '', base: '', ext: '', name: '' };
      if (path.length === 0) return ret;
      var code = path.charCodeAt(0);
      var isAbsolute = code === 47 /*/*/;
      var start;
      if (isAbsolute) {
        ret.root = '/';
        start = 1;
      } else {
        start = 0;
      }
      var startDot = -1;
      var startPart = 0;
      var end = -1;
      var matchedSlash = true;
      var i = path.length - 1;

      // Track the state of characters (if any) we see before our first dot and
      // after any path separator we find
      var preDotState = 0;

      // Get non-dir info
      for (; i >= start; --i) {
        code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
        if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // extension
          matchedSlash = false;
          end = i + 1;
        }
        if (code === 46 /*.*/) {
            // If this is our first dot, mark it as the start of our extension
            if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
          } else if (startDot !== -1) {
          // We saw a non-dot and non-path separator before our dot, so we should
          // have a good chance at having a non-empty extension
          preDotState = -1;
        }
      }

      if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
          if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
        }
      } else {
        if (startPart === 0 && isAbsolute) {
          ret.name = path.slice(1, startDot);
          ret.base = path.slice(1, end);
        } else {
          ret.name = path.slice(startPart, startDot);
          ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
      }

      if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

      return ret;
    },

    sep: '/',
    delimiter: ':',
    win32: null,
    posix: null
  };

  posix.posix = posix;

  var pathBrowserify = posix;

  // Handles native file:// XHR GET requests
  function FileHandler(reqContext) {
    this._reqContext = reqContext;
  }

  FileHandler._getMimeType = function(reqContext) {
    if (reqContext.overrideMimeType) return reqContext.overrideMimeType
    else if (reqContext.responseHeaders['content-type'])
      return reqContext.responseHeaders['content-type']

    var url = reqContext.url;
    var ext = url.substr(url.lastIndexOf('.'));
    return FileHandler._EXT_TO_MIME[ext] ? FileHandler._EXT_TO_MIME[ext] : ''
  };

  FileHandler.getHandlerForResponseType = function(reqContext) {
    var responseType = reqContext.responseType;
    if (FileHandler._RESPONSE_HANDLERS[responseType])
      return FileHandler._RESPONSE_HANDLERS[responseType]
    else return FileHandler._RESPONSE_HANDLERS['text']
  };

  FileHandler._EXT_TO_MIME = {
    '.img': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.xml': 'application/xml',
    '.xsl': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.svg': 'image/svg+xml',
    '.svgz': 'image/svg+xml',
    '.json': 'application/json',
    '.js': 'application/javascript'
  };

  FileHandler._RESPONSE_HANDLERS = {
    text: {
      action: 'readAsText',
      properties: ['response', 'responseText'],
      convert: function(mimeType, r) {
        this._size = r['length'];
        return r
      },
      responseSize: function() {
        return isNaN(this._size) ? 0 : this._size
      }
    },
    arraybuffer: {
      action: 'readAsArrayBuffer',
      properties: ['response'],
      convert: function(mimeType, r) {
        this._size = r['byteLength'];
        return r
      },
      responseSize: function() {
        return isNaN(this._size) ? 0 : this._size
      }
    },
    json: {
      action: 'readAsText',
      properties: ['response'],
      convert: function(mimeType, r) {
        this._size = r['length'];
        try {
          r = JSON.parse(r);
        } catch (e) {}

        return r
      },
      responseSize: function() {
        return isNaN(this._size) ? 0 : this._size
      }
    },
    document: {
      action: 'readAsText',
      properties: ['response', 'responseXML'],
      convert: function(mimeType, r) {
        this._size = r['length'];
        try {
          r = new DOMParser().parseFromString(r, 'text/xml');
        } catch (e) {}
        return r
      },
      responseSize: function() {
        return isNaN(this._size) ? 0 : this._size
      }
    },
    blob: {
      action: 'readAsArrayBuffer',
      properties: ['response'],
      convert: function(mimeType, r) {
        var blob = new Blob([r], { type: mimeType });
        this._size = blob.size;
        return blob
      },
      responseSize: function() {
        return isNaN(this._size) ? 0 : this._size
      }
    }
  };

  FileHandler._presend = function(reqContext) {
    reqContext.dispatchReadyStateChangeEvent(1); // OPEN
    reqContext.dispatchProgressEvent('loadstart');
    // no upload events for a GET
  };

  FileHandler._error = function(reqContext, e) {
    console.error(
      'xhr-polyfill.js - native file XHR Response: Unable to find file %o\n%o',
      reqContext.url,
      e
    );

    reqContext.status = 404;
    reqContext.responseText = 'File Not Found';

    reqContext.dispatchReadyStateChangeEvent(2); // HEADERS_RECIEVED
    reqContext.dispatchReadyStateChangeEvent(3); // LOADING
    reqContext.dispatchProgressEvent('progress');

    reqContext.dispatchReadyStateChangeEvent(4); // DONE
    reqContext.dispatchProgressEvent('error');
    reqContext.dispatchProgressEvent('loadend');
  };

  FileHandler._success = function(reqContext, rspTypeHandler, result) {
    console.log(
      `xhr-polyfill.js - native file XHR Response: (${result.length} bytes)`
    );

    var mimeType = FileHandler._getMimeType(reqContext);
    var convertedResult = rspTypeHandler.convert(mimeType, result);

    var respSize = rspTypeHandler.responseSize();
    for (var i = 0; i < rspTypeHandler.properties.length; i++)
      reqContext[rspTypeHandler.properties[i]] = convertedResult;

    reqContext.status = 200;
    reqContext.statusText = 'OK';
    reqContext.responseURL = reqContext.url;

    reqContext.dispatchReadyStateChangeEvent(2); // HEADERS_RECIEVED
    reqContext.dispatchReadyStateChangeEvent(3); // LOADING
    reqContext.dispatchProgressEvent('progress', respSize);
    reqContext.dispatchReadyStateChangeEvent(4); // DONE
    reqContext.dispatchProgressEvent('load', respSize);
    reqContext.dispatchProgressEvent('loadend', respSize);
  };

  FileHandler.prototype.send = function() {
    var reqContext = this._reqContext;
    var rspTypeHandler = FileHandler.getHandlerForResponseType(reqContext);

    console.log('xhr-polyfill.js - native file XHR Request:\n%o', reqContext.url);

    FileHandler._presend(reqContext);

    const url =
      'file://' + pathBrowserify.join(window.location.pathname, '..', reqContext.url);
    window.resolveLocalFileSystemURL(
      url,
      entry => {
        console.log('cdvfile URI: ' + entry.toInternalURL());
        entry.file(
          file => {
            var reader = new FileReader();

            reader.onloadend = e => {
              FileHandler._success(reqContext, rspTypeHandler, e.target.result);
            };

            reader[rspTypeHandler.action](file);
          },
          e => {
            console.error('Error reading file', JSON.stringify(e));
          }
        );
      },
      fileError => {
        console.error('Error reading file:', url, JSON.stringify(fileError));
      }
    );
  };

  // sends the request using JS native XMLHttpRequest
  function DelegateHandler(reqContext) {
    this._reqContext = reqContext;
    this._reqContext.delegate = new window._XMLHttpRequest();
  }

  DelegateHandler._FROM_PROPERTIES = [
    'response',
    'responseText',
    'responseXML',
    'responseURL',
    'status',
    'statusText'
  ];

  DelegateHandler._TO_PROPERTIES = ['responseType', 'timeout', 'withCredentials'];

  DelegateHandler._parseResponseHeaders = function(delegate, toHeaders) {
    var fromHeaders = delegate.getAllResponseHeaders().split(/\r?\n/);
    for (var i = 0; i < fromHeaders.length; i++) {
      var tokens = fromHeaders[i];
      var n = tokens.indexOf(': ');
      if (n > -1) {
        var key = tokens.substr(0, n).toLowerCase();
        var value = tokens.substr(n + 2);
        toHeaders[key] = value;
      }
    }
  };

  DelegateHandler._progressEventRelay = function(reqContext, event) {
    var respSize = isNaN(event.totalSize) ? 0 : event.totalSize;
    reqContext.dispatchProgressEvent(event.type, respSize);
  };

  DelegateHandler._uploadProgressEventRelay = function(reqContext, event) {
    var respSize = isNaN(event.totalSize) ? 0 : event.totalSize;
    reqContext.dispatchUploadProgressEvent(event.type, respSize);
  };

  DelegateHandler._readystatechangeEventRelay = function(
    reqContext,
    delegate,
    event
  ) {
    if (delegate.readyState > 1) {
      // readyState gt HEADERS_RECIEVED
      if (Object.keys(reqContext.responseHeaders).length === 0)
        DelegateHandler._parseResponseHeaders(
          delegate,
          reqContext.responseHeaders
        );

      for (var i = 0; i < DelegateHandler._FROM_PROPERTIES.length; i++) {
        try {
          reqContext[DelegateHandler._FROM_PROPERTIES[i]] =
            delegate[DelegateHandler._FROM_PROPERTIES[i]];
        } catch (e) {}
      }

      reqContext.dispatchReadyStateChangeEvent(delegate.readyState);
    }
  };

  DelegateHandler.prototype.send = function() {
    var reqContext = this._reqContext;
    var delegate = reqContext.delegate;

    delegate.onreadystatechange = DelegateHandler._readystatechangeEventRelay.bind(
      delegate,
      reqContext,
      delegate
    )
    ;[
      'ontimeout',
      'onloadstart',
      'onprogress',
      'onabort',
      'onerror',
      'onload',
      'onloadend'
    ].forEach(function(eventType) {
      delegate[eventType] = DelegateHandler._progressEventRelay.bind(
        delegate,
        reqContext
      );
      delegate.upload[eventType] = DelegateHandler._uploadProgressEventRelay.bind(
        delegate,
        reqContext
      );
    });

    if (reqContext.overrideMimeType)
      delegate.overrideMimeType(reqContext.overrideMimeType);

    delegate.open(
      reqContext.method,
      reqContext.url,
      reqContext.async,
      reqContext.user,
      reqContext.password
    );

    for (var i = 0; i < DelegateHandler._TO_PROPERTIES.length; i++)
      delegate[DelegateHandler._TO_PROPERTIES[i]] =
        reqContext[DelegateHandler._TO_PROPERTIES[i]];

    var keys = Object.keys(reqContext.requestHeaders);
    for (var i = 0; i < keys.length; i++)
      delegate.setRequestHeader(keys[i], reqContext.requestHeaders[keys[i]]);

    var requestData = reqContext.requestData;
    reqContext.requestData = undefined;

    // returns a native FormData from the plugin's polyfill
    if (FormData.prototype.isPrototypeOf(requestData))
      requestData = requestData.__getNative();

    delegate.send(requestData);
  };

  function HandlerFactory() {}

  HandlerFactory.getHandler = function(context) {
    var promise = new Promise(function(resolve) {
      if (
        'GET' === context.method &&
        typeof context.url === 'string' &&
        ((context.url.indexOf('://') === -1 &&
          window.location.protocol === 'file:') ||
          context.url.toLowerCase().startsWith('file://'))
      ) {
        resolve(new FileHandler(context));
      } else {
        resolve(new DelegateHandler(context));
      }
    });

    return promise
  };

  function _XMLHttpRequestUpload() {
    this._context = { listeners: {} };
  }

  _XMLHttpRequestUpload.prototype.removeEventListener = function(type, listener) {
    var listeners = this._context.listeners;
    if (!listener) listeners[type] = [];
    else {
      var lset = listeners[type] ? listeners[type] : [];
      var i = lset.indexOf(listener);
      if (i > -1) lset.splice(i, 1);
    }
  };

  _XMLHttpRequestUpload.prototype.addEventListener = function(type, listener) {
    if (!listener) return

    var listeners = this._context.listeners;
    var lset = listeners[type];
    if (!lset) lset = listeners[type] = [];

    if (lset.indexOf(listeners) < 0) lset.push(listener);
  };

  _XMLHttpRequestUpload.prototype.dispatchEvent = function(event) {
    if (!event) return

    var type = event.type;
    var listeners = this._context.listeners;
    var lset = listeners[type] ? listeners[type] : [];

    // call property listeners
    var listener = this._context[['on', type].join('')];
    if (listener) {
      try {
        listener.call(this, event);
      } catch (e) {
        console.log(
          'xhr-polyfill.js - exception delivering upload event %o\n%o',
          event,
          e
        );
      }
    }
  };

  /** @type {?} */
  window._XMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    this._context = {
      delegate: null,
      requestHeaders: {},
      responseHeaders: {},
      listeners: {},
      readyState: 0,
      responseType: 'text',
      withCredentials: false,
      upload: new _XMLHttpRequestUpload(),
      status: 0
    };

    this._context.dispatchProgressEvent = function(req, type, respSize) {
      if (isNaN(respSize)) respSize = 0;

      var event = document.createEvent('Event');
      event.initEvent(type, false, false)
      ;['total', 'totalSize', 'loaded', 'position'].forEach(function(propName) {
        Object.defineProperty(event, propName, { value: respSize });
      });
      Object.defineProperty(event, 'lengthComputable', {
        value: respSize === 0 ? false : true
      });

      req.dispatchEvent(event);
    }.bind(this._context, this);

    this._context.dispatchReadyStateChangeEvent = function(req, readyState) {
      var event = document.createEvent('Event');
      event.initEvent('readystatechange', false, false);

      this.readyState = readyState;
      req.dispatchEvent(event);
    }.bind(this._context, this);

    this._context.dispatchUploadProgressEvent = function(type, reqSize) {
      // no body sent on a GET request
      if (this.method === 'GET') return

      if (isNaN(reqSize)) reqSize = 0;

      var event = document.createEvent('Event');
      event.initEvent(type, false, false)
      ;['total', 'totalSize', 'loaded', 'position'].forEach(function(propName) {
        Object.defineProperty(event, propName, { value: reqSize });
      });
      Object.defineProperty(event, 'lengthComputable', {
        value: reqSize === 0 ? false : true
      });

      this.upload.dispatchEvent(event);
    }.bind(this._context);
  }

  // define readonly const properties
  ;['UNSENT', 'OPENED', 'HEADERS_RECIEVED', 'LOADING', 'DONE'].forEach(function(
    propName,
    i
  ) {
    Object.defineProperty(window.XMLHttpRequest.prototype, propName, {
      get: function() {
        return i
      }
    });
  })

  // define readonly properties.
  ;[
    'readyState',
    'response',
    'responseText',
    'responseURL',
    'responseXML',
    'status',
    'statusText',
    'upload'
  ].forEach(function(propName) {
    Object.defineProperty(window.XMLHttpRequest.prototype, propName, {
      get: function() {
        return this._context[propName]
      }
    });
  })

  // define read/write properties
  ;['responseType', 'timeout', 'withCredentials'].forEach(function(propName) {
    Object.defineProperty(window.XMLHttpRequest.prototype, propName, {
      get: function() {
        return this._context[propName]
      },
      set: function(value) {
        this._context[propName] = value;
      }
    });
  });

  // define read/write readychange event listener properties
  Object.defineProperty(window.XMLHttpRequest.prototype, 'onreadystatechange', {
    get: function() {
      return this._context['onreadystatechange']
    },
    set: function(value) {
      if (typeof value === 'function') this._context['onreadystatechange'] = value;
    }
  })

  // define read/write event progress listener properties
  ;[
    'ontimeout',
    'onloadstart',
    'onprogress',
    'onabort',
    'onerror',
    'onload',
    'onloadend'
  ].forEach(function(propName) {
    Object.defineProperty(window.XMLHttpRequest.prototype, propName, {
      get: function() {
        return this._context[propName]
      },
      set: function(value) {
        if (typeof value === 'function') this._context[propName] = value;
      }
    });

    Object.defineProperty(_XMLHttpRequestUpload.prototype, propName, {
      get: function() {
        return this._context[propName]
      },
      set: function(value) {
        if (typeof value === 'function') this._context[propName] = value;
      }
    });
  });

  window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    // normalize value pair to strings
    header = String(header).toLowerCase();
    value = String(value);
    this._context.requestHeaders[header] = value;
  };

  window.XMLHttpRequest.prototype.abort = function() {
    if (this._context['delegate']) this._context.delegate.abort();
  };

  window.XMLHttpRequest.prototype.getResponseHeader = function(name) {
    name = name.toLowerCase();
    return this._context.responseHeaders[name]
  };

  window.XMLHttpRequest.prototype.overrideMimeType = function(mimetype) {
    return (this._context.overrideMimeType = mimetype)
  };

  window.XMLHttpRequest.prototype.getAllResponseHeaders = function() {
    var responseHeaders = this._context.responseHeaders;
    var names = Object.keys(responseHeaders);
    var list = [];
    for (var i = 0; i < names.length; i++)
      list.push([names[i], responseHeaders[names[i]]].join(':'));

    return list.join('\n')
  };

  window.XMLHttpRequest.prototype.removeEventListener = function(type, listener) {
    var listeners = this._context.listeners;
    if (!listener) listeners[type] = [];
    else {
      var lset = listeners[type] ? listeners[type] : [];
      var i = lset.indexOf(listener);
      if (i > -1) lset.splice(i, 1);
    }
  };

  window.XMLHttpRequest.prototype.addEventListener = function(type, listener) {
    if (!listener) return

    var listeners = this._context.listeners;
    var lset = listeners[type];
    if (!lset) lset = listeners[type] = [];

    if (lset.indexOf(listeners) < 0) lset.push(listener);
  };

  window.XMLHttpRequest.prototype.dispatchEvent = function(event) {
    if (!event) return

    var type = event.type;
    var listeners = this._context.listeners;
    var lset = listeners[type] ? listeners[type] : [];

    // call property listeners
    var listener = this._context[['on', type].join('')];
    if (listener) {
      try {
        listener.call(this, event);
      } catch (e) {
        console.log(
          'xhr-polyfill.js - exception delivering event %o\n%o',
          event,
          e
        );
      }
    }

    // call listeners registered via addEventListener
    for (var i = 0; i < lset.length; i++) {
      listener = lset[i];
      if (listener) {
        try {
          listener.call(this, event);
        } catch (e) {
          console.log(
            'xhr-polyfill.js - exception delivering event %o\n%o',
            event,
            e
          );
        }
      }
    }
  };

  window.XMLHttpRequest.prototype.open = function(
    method,
    url,
    async,
    user,
    password
  ) {
    this._context.method = !method ? 'GET' : method.toUpperCase(); // FortifyFalsePositive
    this._context.url = url;
    this._context.async = async === undefined ? true : async;
    this._context.user = user;
    this._context.password = password;
  };

  window.XMLHttpRequest.prototype.send = function(data) {
    if ('GET' !== this._context.method && 'HEAD' !== this._context.method)
      this._context.requestData = data;

    HandlerFactory.getHandler(this._context).then(function(handler) {
      handler.send();
    });
  };

}());
//# sourceMappingURL=xhr-polyfill.js.map
