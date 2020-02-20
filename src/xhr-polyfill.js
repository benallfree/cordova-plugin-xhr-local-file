// Handles native file:// XHR GET requests
function FileHandler(reqContext) {
  this._reqContext = reqContext
}

FileHandler._getMimeType = function(reqContext) {
  if (reqContext.overrideMimeType) return reqContext.overrideMimeType
  else if (reqContext.responseHeaders['content-type'])
    return reqContext.responseHeaders['content-type']

  var url = reqContext.url
  var ext = url.substr(url.lastIndexOf('.'))
  return FileHandler._EXT_TO_MIME[ext] ? FileHandler._EXT_TO_MIME[ext] : ''
}

FileHandler.getHandlerForResponseType = function(reqContext) {
  var responseType = reqContext.responseType
  if (FileHandler._RESPONSE_HANDLERS[responseType])
    return FileHandler._RESPONSE_HANDLERS[responseType]
  else return FileHandler._RESPONSE_HANDLERS['text']
}

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
}

FileHandler._RESPONSE_HANDLERS = {
  text: {
    action: 'readAsText',
    properties: ['response', 'responseText'],
    convert: function(mimeType, r) {
      this._size = r['length']
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
      this._size = r['byteLength']
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
      this._size = r['length']
      try {
        r = JSON.parse(r)
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
      this._size = r['length']
      try {
        r = new DOMParser().parseFromString(r, 'text/xml')
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
      var blob = new Blob([r], { type: mimeType })
      this._size = blob.size
      return blob
    },
    responseSize: function() {
      return isNaN(this._size) ? 0 : this._size
    }
  }
}

FileHandler._presend = function(reqContext) {
  reqContext.dispatchReadyStateChangeEvent(1) // OPEN
  reqContext.dispatchProgressEvent('loadstart')
  // no upload events for a GET
}

FileHandler._error = function(reqContext, e) {
  console.error(
    'xhr-polyfill.js - native file XHR Response: Unable to find file %o\n%o',
    reqContext.url,
    e
  )

  reqContext.status = 404
  reqContext.responseText = 'File Not Found'

  reqContext.dispatchReadyStateChangeEvent(2) // HEADERS_RECIEVED
  reqContext.dispatchReadyStateChangeEvent(3) // LOADING
  reqContext.dispatchProgressEvent('progress')

  reqContext.dispatchReadyStateChangeEvent(4) // DONE
  reqContext.dispatchProgressEvent('error')
  reqContext.dispatchProgressEvent('loadend')
}

FileHandler._success = function(reqContext, rspTypeHandler, result) {
  console.log(
    'xhr-polyfill.js - native file XHR Response:\n%o\n',
    reqContext.url,
    result
  )

  var mimeType = FileHandler._getMimeType(reqContext)
  var convertedResult = rspTypeHandler.convert(mimeType, result)

  var respSize = rspTypeHandler.responseSize()
  for (var i = 0; i < rspTypeHandler.properties.length; i++)
    reqContext[rspTypeHandler.properties[i]] = convertedResult

  console.log(
    'xhr-polyfill.js - native file XHR converted result:\n%o\n',
    convertedResult
  )
  reqContext.status = 200
  reqContext.statusText = 'OK'
  reqContext.responseURL = reqContext.url

  reqContext.dispatchReadyStateChangeEvent(2) // HEADERS_RECIEVED
  reqContext.dispatchReadyStateChangeEvent(3) // LOADING
  reqContext.dispatchProgressEvent('progress', respSize)
  reqContext.dispatchReadyStateChangeEvent(4) // DONE
  reqContext.dispatchProgressEvent('load', respSize)
  reqContext.dispatchProgressEvent('loadend', respSize)
}

FileHandler.prototype.send = function() {
  var reqContext = this._reqContext
  var rspTypeHandler = FileHandler.getHandlerForResponseType(reqContext)

  console.log('xhr-polyfill.js - native file XHR Request:\n%o', reqContext.url)

  FileHandler._presend(reqContext)

  const url = `cdvfile://localhost/bundle/www/${reqContext.url}`
  window.resolveLocalFileSystemURL(url, entry => {
    console.log('cdvfile URI: ' + entry.toInternalURL())
    entry.file(
      file => {
        var reader = new FileReader()

        reader.onloadend = e => {
          FileHandler._success(reqContext, rspTypeHandler, e.target.result)
        }

        reader[rspTypeHandler.action](file)
      },
      e => {
        console.error('Error reading file', e)
      }
    )
  })
}

// sends the request using JS native XMLHttpRequest
function DelegateHandler(reqContext) {
  this._reqContext = reqContext
  this._reqContext.delegate = new window._XMLHttpRequest()
}

DelegateHandler._FROM_PROPERTIES = [
  'response',
  'responseText',
  'responseXML',
  'responseURL',
  'status',
  'statusText'
]

DelegateHandler._TO_PROPERTIES = ['responseType', 'timeout', 'withCredentials']

DelegateHandler._parseResponseHeaders = function(delegate, toHeaders) {
  var fromHeaders = delegate.getAllResponseHeaders().split(/\r?\n/)
  for (var i = 0; i < fromHeaders.length; i++) {
    var tokens = fromHeaders[i]
    var n = tokens.indexOf(': ')
    if (n > -1) {
      var key = tokens.substr(0, n).toLowerCase()
      var value = tokens.substr(n + 2)
      toHeaders[key] = value
    }
  }
}

DelegateHandler._progressEventRelay = function(reqContext, event) {
  var respSize = isNaN(event.totalSize) ? 0 : event.totalSize
  reqContext.dispatchProgressEvent(event.type, respSize)
}

DelegateHandler._uploadProgressEventRelay = function(reqContext, event) {
  var respSize = isNaN(event.totalSize) ? 0 : event.totalSize
  reqContext.dispatchUploadProgressEvent(event.type, respSize)
}

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
      )

    for (var i = 0; i < DelegateHandler._FROM_PROPERTIES.length; i++) {
      try {
        reqContext[DelegateHandler._FROM_PROPERTIES[i]] =
          delegate[DelegateHandler._FROM_PROPERTIES[i]]
      } catch (e) {}
    }

    reqContext.dispatchReadyStateChangeEvent(delegate.readyState)
  }
}

DelegateHandler.prototype.send = function() {
  var reqContext = this._reqContext
  var delegate = reqContext.delegate

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
    )
    delegate.upload[eventType] = DelegateHandler._uploadProgressEventRelay.bind(
      delegate,
      reqContext
    )
  })

  if (reqContext.overrideMimeType)
    delegate.overrideMimeType(reqContext.overrideMimeType)

  delegate.open(
    reqContext.method,
    reqContext.url,
    reqContext.async,
    reqContext.user,
    reqContext.password
  )

  for (var i = 0; i < DelegateHandler._TO_PROPERTIES.length; i++)
    delegate[DelegateHandler._TO_PROPERTIES[i]] =
      reqContext[DelegateHandler._TO_PROPERTIES[i]]

  var keys = Object.keys(reqContext.requestHeaders)
  for (var i = 0; i < keys.length; i++)
    delegate.setRequestHeader(keys[i], reqContext.requestHeaders[keys[i]])

  var requestData = reqContext.requestData
  reqContext.requestData = undefined

  // returns a native FormData from the plugin's polyfill
  if (FormData.prototype.isPrototypeOf(requestData))
    requestData = requestData.__getNative()

  delegate.send(requestData)
}

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
      resolve(new FileHandler(context))
    } else {
      resolve(new DelegateHandler(context))
    }
  })

  return promise
}

function _XMLHttpRequestUpload() {
  this._context = { listeners: {} }
}

_XMLHttpRequestUpload.prototype.removeEventListener = function(type, listener) {
  var listeners = this._context.listeners
  if (!listener) listeners[type] = []
  else {
    var lset = listeners[type] ? listeners[type] : []
    var i = lset.indexOf(listener)
    if (i > -1) lset.splice(i, 1)
  }
}

_XMLHttpRequestUpload.prototype.addEventListener = function(type, listener) {
  if (!listener) return

  var listeners = this._context.listeners
  var lset = listeners[type]
  if (!lset) lset = listeners[type] = []

  if (lset.indexOf(listeners) < 0) lset.push(listener)
}

_XMLHttpRequestUpload.prototype.dispatchEvent = function(event) {
  if (!event) return

  var type = event.type
  var listeners = this._context.listeners
  var lset = listeners[type] ? listeners[type] : []

  // call property listeners
  var listener = this._context[['on', type].join('')]
  if (listener) {
    try {
      listener.call(this, event)
    } catch (e) {
      console.log(
        'xhr-polyfill.js - exception delivering upload event %o\n%o',
        event,
        e
      )
    }
  }
}

/** @type {?} */
window._XMLHttpRequest = window.XMLHttpRequest
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
  }

  this._context.dispatchProgressEvent = function(req, type, respSize) {
    if (isNaN(respSize)) respSize = 0

    var event = document.createEvent('Event')
    event.initEvent(type, false, false)
    ;['total', 'totalSize', 'loaded', 'position'].forEach(function(propName) {
      Object.defineProperty(event, propName, { value: respSize })
    })
    Object.defineProperty(event, 'lengthComputable', {
      value: respSize === 0 ? false : true
    })

    req.dispatchEvent(event)
  }.bind(this._context, this)

  this._context.dispatchReadyStateChangeEvent = function(req, readyState) {
    var event = document.createEvent('Event')
    event.initEvent('readystatechange', false, false)

    this.readyState = readyState
    req.dispatchEvent(event)
  }.bind(this._context, this)

  this._context.dispatchUploadProgressEvent = function(type, reqSize) {
    // no body sent on a GET request
    if (this.method === 'GET') return

    if (isNaN(reqSize)) reqSize = 0

    var event = document.createEvent('Event')
    event.initEvent(type, false, false)
    ;['total', 'totalSize', 'loaded', 'position'].forEach(function(propName) {
      Object.defineProperty(event, propName, { value: reqSize })
    })
    Object.defineProperty(event, 'lengthComputable', {
      value: reqSize === 0 ? false : true
    })

    this.upload.dispatchEvent(event)
  }.bind(this._context)
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
  })
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
  })
})

// define read/write properties
;['responseType', 'timeout', 'withCredentials'].forEach(function(propName) {
  Object.defineProperty(window.XMLHttpRequest.prototype, propName, {
    get: function() {
      return this._context[propName]
    },
    set: function(value) {
      this._context[propName] = value
    }
  })
})

// define read/write readychange event listener properties
Object.defineProperty(window.XMLHttpRequest.prototype, 'onreadystatechange', {
  get: function() {
    return this._context['onreadystatechange']
  },
  set: function(value) {
    if (typeof value === 'function') this._context['onreadystatechange'] = value
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
      if (typeof value === 'function') this._context[propName] = value
    }
  })

  Object.defineProperty(_XMLHttpRequestUpload.prototype, propName, {
    get: function() {
      return this._context[propName]
    },
    set: function(value) {
      if (typeof value === 'function') this._context[propName] = value
    }
  })
})

window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
  // normalize value pair to strings
  header = String(header).toLowerCase()
  value = String(value)
  this._context.requestHeaders[header] = value
}

window.XMLHttpRequest.prototype.abort = function() {
  if (this._context['delegate']) this._context.delegate.abort()
}

window.XMLHttpRequest.prototype.getResponseHeader = function(name) {
  name = name.toLowerCase()
  return this._context.responseHeaders[name]
}

window.XMLHttpRequest.prototype.overrideMimeType = function(mimetype) {
  return (this._context.overrideMimeType = mimetype)
}

window.XMLHttpRequest.prototype.getAllResponseHeaders = function() {
  var responseHeaders = this._context.responseHeaders
  var names = Object.keys(responseHeaders)
  var list = []
  for (var i = 0; i < names.length; i++)
    list.push([names[i], responseHeaders[names[i]]].join(':'))

  return list.join('\n')
}

window.XMLHttpRequest.prototype.removeEventListener = function(type, listener) {
  var listeners = this._context.listeners
  if (!listener) listeners[type] = []
  else {
    var lset = listeners[type] ? listeners[type] : []
    var i = lset.indexOf(listener)
    if (i > -1) lset.splice(i, 1)
  }
}

window.XMLHttpRequest.prototype.addEventListener = function(type, listener) {
  if (!listener) return

  var listeners = this._context.listeners
  var lset = listeners[type]
  if (!lset) lset = listeners[type] = []

  if (lset.indexOf(listeners) < 0) lset.push(listener)
}

window.XMLHttpRequest.prototype.dispatchEvent = function(event) {
  if (!event) return

  var type = event.type
  var listeners = this._context.listeners
  var lset = listeners[type] ? listeners[type] : []

  // call property listeners
  var listener = this._context[['on', type].join('')]
  if (listener) {
    try {
      listener.call(this, event)
    } catch (e) {
      console.log(
        'xhr-polyfill.js - exception delivering event %o\n%o',
        event,
        e
      )
    }
  }

  // call listeners registered via addEventListener
  for (var i = 0; i < lset.length; i++) {
    listener = lset[i]
    if (listener) {
      try {
        listener.call(this, event)
      } catch (e) {
        console.log(
          'xhr-polyfill.js - exception delivering event %o\n%o',
          event,
          e
        )
      }
    }
  }
}

window.XMLHttpRequest.prototype.open = function(
  method,
  url,
  async,
  user,
  password
) {
  this._context.method = !method ? 'GET' : method.toUpperCase() // FortifyFalsePositive
  this._context.url = url
  this._context.async = async === undefined ? true : async
  this._context.user = user
  this._context.password = password
}

window.XMLHttpRequest.prototype.send = function(data) {
  if ('GET' !== this._context.method && 'HEAD' !== this._context.method)
    this._context.requestData = data

  HandlerFactory.getHandler(this._context).then(function(handler) {
    handler.send()
  })
}
