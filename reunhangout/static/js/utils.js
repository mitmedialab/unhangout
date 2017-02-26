import DetectRTC from 'detectrtc';

// The "@diegoperini" url regex: https://mathiasbynens.be/demo/url-regex
// https://gist.github.com/dperini/729294
export const urlRegex = new RegExp(
"(" +
  "(?:^|\\b)" +
    // protocol identifier
    "(?:(?:https?|ftp)://)" +
    // user:pass authentication
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
      // IP address exclusion
      // private & local networks
      "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
      "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
      "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
      // IP address dotted notation octets
      // excludes loopback network 0.0.0.0
      // excludes reserved space >= 224.0.0.0
      // excludes network & broacast addresses
      // (first & last IP address of each class)
      "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
      "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
      "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
      // host name
      "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
      // domain name
      "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
      // TLD identifier
      "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
      // TLD may end with dot
      "\\.?" +
    ")" +
    // port number
    "(?::\\d{2,5})?" +
    // resource path
    "(?:[/?#]\\S*)?" +
  "(?:\\b|$)" +
")", "i"
);

export const errorLogs = [];
window.onerror = (message, source, lineno, colno, error) => {
  try {
    errorLogs.push({
      timestamp: Date.now(),
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      error: error && {
        message: error.message,
        stack: error.stack,
        description: error.description,
        fileName: error.fileName,
        lineNumber: error.lineNumber,
        columnNumber: error.columnNumber,
        stack: error.stack,
        source: error.toSource && error.toSource(),
        string: error.toString(),
      }
    });
  } catch(e) {
    console.error("Error logging error:", e);
  }
}

export const getErrorData = () => {
  return new Promise((resolve, reject) => {
    let navigatorData = {};
    ["appCodeName", "appName", "appVersion", "connection.type",
      "connection.downLinkMax", "oscpu", "userAgent", "cookieEnabled", "vendor",
      "vendorSub"
    ].forEach(path => {
      try {
        let val = _.get(window.navigator, path);
        if (val !== undefined) {
          _.set(navigatorData, path, val);
        }
      } catch (e) {
        console.error("Error logging navigator key", path);
      }
    });

    let webrtc = {};
    DetectRTC.load(() => {
      [ "hasWebCam",
        "hasMicrophone",
        "hasSpeakers",
        "isWebRTCSupported",
        "isMobileDevice",
        "isWebSocketsSupported",
        "isWebSocketsBlocked",
        "isWebsiteHasWebcamPermissions",
        "isWebsiteHasMicrophonePermissions",
        "osName",
        "osVersion",
        "browser.name",
        "browser.version",
        "browser.isChrome",
        "browser.isFirefox",
        "browser.isOpera",
        "browser.isIE",
        "browser.isSafari",
        "browser.isEdge",
      ].forEach(path => {
        let val = _.get(DetectRTC, path);
        if (val !== undefined) {
          _.set(webrtc, path, val)
        }
      });
      return resolve({
        'navigator': navigatorData, 'errors': errorLogs, 'webrtc': webrtc
      })
    });
  });
}
