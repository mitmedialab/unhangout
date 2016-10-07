import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from 'react-bootstrap';
import YoutubePlayer from 'youtube-player';
import * as A from "../actions";
import * as youtube from '../../plenary/youtube';

class SyncableVideo extends React.Component {
  constructor(props) {
    super(props);
    if (props.embed.type !== "youtube") {
      throw new Error(`Unsyncable embed type ${props.embed.type}.`);
    }
  }
  render() {
    if (this.props.embed.type === "youtube") {
      return <SyncableYoutubeVideo {...this.props} />
    }
    return null;
  }
}
SyncableVideo.propTypes = {
  'sync_id': React.PropTypes.string.isRequired,
  'embed': React.PropTypes.object.isRequired,
};

class SyncableYoutubeVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      localTime: 0,
      syncTime: this.getCurSync().current_time_index || 0
    };
    // How many seconds can we drift by before we reposition?
    this.RESYNC_THRESHOLD = 15;
    this.STATE_NAMES = {
      '-1': 'unstarted',
      0: 'ended',
      1: 'playing',
      2: 'paused',
      3: 'buffering',
      5: 'video cued'
    };
  }
  getCurSync() {
    return this.props.videosync[this.props.sync_id] || {};
  }
  isPlayingForAll() {
    return this.getCurSync().state === "playing";
  }

  togglePlayForAll(event) {
    event && event.preventDefault();
    if (this.isPlayingForAll()) {
      this.props.onPauseForAll({syncId: this.props.sync_id});
    } else {
      this.player.getCurrentTime().then((time) => {
        this.props.onPlayForAll({
          sync_id: this.props.sync_id,
          time_index: time
        });
      });
    }
  }

  videoEnded() {
    this.props.onPauseForAll({syncId: this.props.sync_id});
  }

  toggleSyncIntent(event) {
    event.preventDefault();
    if (this.getCurSync().synced) {
      this.props.onBreakSyncPlayback({sync_id: this.props.sync_id});
    } else {
      this.props.onSyncPlayback({sync_id: this.props.sync_id});
    }
  }

  onPlayerStateChange(e) {
    let stateName = this.STATE_NAMES[e.data];
    if (stateName === "ended") {
      if (this.props.showSyncControls && this.isPlayingForAll()) {
        this.videoEnded();
      }
    }
  }

  componentDidMount() {
    this.player = YoutubePlayer(this.playerId(), {
      playerVars: {autoplay: 0, controls: 1}
    });
    this.player.on('stateChange', (e) => this.onPlayerStateChange(e));
    this.syncVideo(this.props, true);
    // Set up an interval to advance our sync timer in between updates from the
    // server, and to trigger re-syncing.
    this.syncTimeInterval = setInterval(() => {
      if (this.getCurSync().state === 'playing') {
        this.setState({syncTime: (this.state.syncTime || 0) + 1});
        this.player.getCurrentTime().then((time) => {
          this.setState({localTime: time || 0});
          if (Math.abs(this.state.syncTime - time) > this.RESYNC_THRESHOLD) {
            this.syncVideo();
          }
        });
      }
    }, 1000);
  }

  componentWillUnmount() {
    if (this.syncTimeInterval) {
      clearInterval(this.syncTimeInterval);
    }
  }

  componentWillReceiveProps(props) {
    let newSync = props.videosync[props.sync_id] || {};
    this.setState({syncTime: newSync.current_time_index || 0});

    this.syncVideo(props);
  }

  playerId() {
    return `player-${this.props.sync_id}`;
  }

  syncVideo(props, firstLoad) {
    props = props || this.props;
    let curSync = props.videosync[props.sync_id] || {};
    // Change out video if props have changed.
    if (firstLoad || this.props.embed.props.src !== props.embed.props.src) {
      this.player.cueVideoById({
        videoId: youtube.getIdFromUrl(props.embed.props.src),
        startSeconds: this.state.syncTime,
      });
    }

    Promise.all([
      this.player.getPlayerState(),
      this.player.getCurrentTime(),
      this.player.getDuration(),
    ]).then(([state, time, duration]) => {
      let stateName = this.STATE_NAMES[state];
      // Stop playback if we've exceeded the duration
      if (stateName === "ended" || (this.syncTime > duration && curSync.state === "playing")) {
        if (this.props.showSyncControls) {
          this.videoEnded();
        }
        return;
      }
      if (curSync.synced === false) {
        // No intent to sync. Carry on.
        return;
      }
      if (stateName === "playing" && curSync.state !== "playing") {
        this.player.pauseVideo();
      } else if (stateName !== "playing" && curSync.state === "playing") {
        this.player.playVideo();
        this.player.seekTo(this.state.syncTime);
      } else if (Math.abs(time - this.state.syncTime) > this.RESYNC_THRESHOLD) {
        this.player.seekTo(this.state.syncTime);
      }
    });
  }

  render() {
    return <div>
      <div id={this.playerId()}></div>

      <div className='video-sync-controls'>
        { this.props.showSyncControls ?
            <BS.Button bsStyle='success' className="play-button"
                onClick={(e) => this.togglePlayForAll(e)}>
              { this.isPlayingForAll() ? "Pause for all" : "Play for all" }
            </BS.Button>
          : "" }
        {this.renderSyncState()}
      </div>
    </div>
  }
  renderSyncState() {
    let curSync = this.getCurSync();
    let synced = Math.abs(
      this.state.localTime - this.state.syncTime
    ) < this.RESYNC_THRESHOLD;
    let syncAvailable = curSync.state === "playing";
    let intendToSync = curSync.synced !== false;
    let classes = ['sync-indicator'];
    let message;
    if (synced) {
      classes.push("synced");
      message = "Synced";
    } else if (!syncAvailable) {
      classes.push("No sync");
      message = "No sync";
    } else if (intendToSync) {
      classes.push("syncing");
      message = "Syncing..";
    } else {
      classes.push("unsynced");
      message = "Out of sync";
    }
    return <span>
      <span className={classes.join(" ")}></span>{' '}
      {message}{' '}
      <BS.Button className='sync-intent' onClick={(e) => this.toggleSyncIntent(e)}>
        <i className={'fa fa-' + (intendToSync ? 'lock' : 'unlock')}></i>
        {' '}
        <span className='time-indicator'>{this.formatTime(this.state.syncTime)}</span>
      </BS.Button>
    </span>
  }
  formatTime(totalSeconds) {
    if (totalSeconds === 0) {
      return "";
    }
    let hours = parseInt(totalSeconds / (60*60));
    let minutes = parseInt((totalSeconds % 3600) / 60);
    let seconds = parseInt(totalSeconds % 60);
    hours = (hours > 0 ? hours + ":" : "");
    minutes = ((hours && (minutes < 10)) ? "0" : "") + minutes + ":";
    seconds = (seconds < 10 ? "0" : "") + seconds;
    return hours + minutes + seconds;
  }
}

class SyncState extends React.Component {
  render() {
  }
}

export default connect(
  // map state to props
  (state) => ({
    videosync: state.videosync
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    onPlayForAll: (payload) => dispatch(A.playForAll(payload)),
    onPauseForAll: (payload) => dispatch(A.pauseForAll(payload)),
    onSyncPlayback: (payload) => dispatch(A.syncPlayback(payload)),
    onBreakSyncPlayback: (payload) => dispatch(A.breakSyncPlayback(payload)),
  }),
)(SyncableVideo);

