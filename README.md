# cordova-plugin-xhr-local-file

This plugin is a polyfill for XmlHTTPRequest that will handle the `file://` protocol correctly using Cordova's [File](https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-file/index.html) API behind the scenes.

## Installation

You can install this plugin with Cordova CLI, from npm:

```
$ cordova plugin add cordova-plugin-xhr-local-file
$ cordova prepare
```

## Usage

You may now make XHR requests to local files. Moreover, other JS libraries that load assets via XHR will now function normally.

Since Cordova apps are loaded from `file://`, every relative URL uses the `file://` protocol by default. This library resolves relative and absolute URLs using the Cordova `www` folder as the webroot.

```javascript
var oReq = new XMLHttpRequest()
oReq.open('GET', './foo.json') // If you are in ./www/index.html, this resolves to ./www/foo.json
oReq.send()
```

```javascript
var oReq = new XMLHttpRequest()
oReq.open('GET', '/foo.json') // If you are in ./www/index.html, this ralso esolves to ./www/foo.json
oReq.send()
```

`cdvfile://` protocol is also honored:

```javascript
var oReq = new XMLHttpRequest()
oReq.open('GET', 'cdvfile://localhost/bundle/www/data/foo.json')
oReq.send()
```

## Thanks

Thanks to [Oracle](https://github.com/oracle/cordova-plugin-wkwebview-file-xhr) for their XHR polyfill implementation, upon which this one is based.
