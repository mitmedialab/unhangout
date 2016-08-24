/**
 * Get the 11-character youtube ID from a URL.
 * From http://stackoverflow.com/a/6904504 , covering any of the 15 or so
 * different variations on youtube URLs.  Also works permissively on full
 * iframe/object embed codes.
 * @param {String} url - The URL or iframe embed code to parse
 * @return {String|undefined} A string youtube ID if found, or undefined if not found.
 */
export const getIdFromUrl = function(url) {
  return url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i)[1];
}

/**
 * Query the Youtube API to fetch the thumbnail and title of the given youtube URL.
 * @param {String} url - the URL for the youtube video to query.
 * @return {Promise} A promise which resolves to an object with the response
 * from youtube's API server.
 */
export const fetchVideoDetails = function(url, settings) {
  let ytid = getIdFromUrl(url);

  console.log(`Hit youtube API for ${url}`)
  return fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ytid}&fields=items(snippet(thumbnails/default/url,title))&key=${settings.PUBLIC_API_KEYS.youtube}`)
    .then(response => {
      return response.json()
    }).then(json => {
      try {
        return json.items[0].snippet;
      } catch (e) {
        console.log("YouTube API error. Is api key defined in settings.py?", json);
        return {'error': e}
      }
    });
}

/**
 * Given any youtube iframe embed code or valid youtube URL, return a
 * canonicalized URL for embedding that youtube video.
 * @param {String} url - the URL or iframe embed code to canonicalize.
 * @return {String|undefined} A canonicalized URL if the incoming URL can be parsed; or
 * undefined otherwise.
 *
 */
export const getCanonicalUrl = function(url) {
  let ytid = getIdFromUrl(url);
  if (ytid) {
    return `https://www.youtube.com/embed/${ytid}`;
  }
}
