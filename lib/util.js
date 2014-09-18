"use strict";

/*
 * Static utility methods for RESTBase
 */

var util = {};


// TODO: use bunyan or the Parsoid logger backend!
util.log = function (level) {
    var msg = JSON.stringify(Array.prototype.slice.call(arguments), null, 2);
    if (/^error/.test(level)) {
        console.error(msg);
    } else {
        console.log(msg);
    }
};


// Optimized URL parsing
var qs = require('querystring');
// Should make it into 0.12, see https://github.com/joyent/node/pull/7878
var SIMPLE_PATH = /^(\/(?!\/)[^\?#\s]*)(\?[^#\s]*)?$/;
util.parseURL = function parseURL (uri) {
    // Fast path for simple path uris
    var fastMatch = SIMPLE_PATH.exec(uri);
    if (fastMatch) {
        return {
            protocol: null,
            slashes: null,
            auth: null,
            host: null,
            port: null,
            hostname: null,
            hash: null,
            search: fastMatch[2] || '',
            pathname: fastMatch[1],
            path: fastMatch[1],
            query: fastMatch[2] && qs.parse(fastMatch[2]) || {},
            href: uri
        };
    } else {
        return url.parse(uri, true);
    }
}

// Parse a POST request into request.body with BusBoy
// Drops file uploads on the floor without creating temporary files
//
// @param {request} HTTP request
// @returns {Promise<>}
util.parsePOST = function parsePOST(req) {
    if (req.method === 'PUT') {
        return new Promise(function(resolve) {
            var chunks = [];
            req.on('data', function(chunk) {
                chunks.push(chunk);
            });

            req.on('end', function() {
                req.body = Buffer.concat(chunks);
                resolve();
            });
        });
    } else if (req.method !== 'POST') {
        return Promise.resolve();
    } else {
        var headers = req.headers;
        if (!headers['content-type']) {
            headers = {
                'content-type': 'application/binary'
            };
        }

        return new Promise(function(resolve) {
            // Parse POST data
            var bboy = new Busboy({
                headers: headers,
                // Increase the form field size limit from the 1M default.
                limits: { fieldSize: 15 * 1024 * 1024 }
            });
            req.body = req.body || {};
            bboy.on('field', function (field, val) {
                req.body[field] = val;
            });
            bboy.on('finish', function () {
                resolve();
            });
            req.pipe(bboy);
        });
    }
}

module.exports = util;
