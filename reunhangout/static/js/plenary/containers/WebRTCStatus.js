import React from 'react';
import DetectRTC from 'detectrtc';

export default function WebRTCStatus(props) {
  if (DetectRTC.isWebRTCSupported) {
    return null;
  }

  return (
    <div className='plenary-status-banner'>
      <p style={{maxWidth: "600px", margin: 'auto'}}>
        Your browser doesn't support the required features for video
        chat. To participate fully on desktop or Android, switch to
        {' '}
        <a href='https://www.mozilla.org/en-US/firefox/new/'>Firefox</a>
        {' '}
        or
        {' '}
        <a href='https://www.google.com/chrome/index.html'>Chrome</a>.
        {' '}
        We're sorry, but iPhones and iPads are not supported at this time.
      </p>
    </div>
  )
};
