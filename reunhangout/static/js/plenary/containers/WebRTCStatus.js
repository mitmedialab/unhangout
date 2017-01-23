import React from 'react';
import DetectRTC from 'detectrtc';
import * as style from "../../../scss/pages/plenary/_statusBanner.scss"

export default function WebRTCStatus(props) {
  if (DetectRTC.isWebRTCSupported) {
    return null;
  }

  return (
    <div className='webrtc-status-banner'>
      <p>
        Your browser doesn't support the required features for video
        chat. <strong>To participate fully on desktop or Android, switch to
        {' '}
        <a href='https://www.mozilla.org/en-US/firefox/new/'>Firefox</a>
        {' '}
        or
        {' '}
        <a href='https://www.google.com/chrome/index.html'>Chrome</a>.</strong>
        {' '}
        <br/><small>(We're sorry, but iPhones and iPads are not supported at this time.)</small>
      </p>
    </div>
  )
};
