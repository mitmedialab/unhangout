import React from "react";
import PropTypes from 'prop-types';
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from 'react-bootstrap';
import YoutubePlayer from 'youtube-player';
import * as A from "../actions";
import * as youtube from '../../plenary/youtube';
import * as style from "../../../scss/pages/plenary/_syncableVideoStyle.scss"


class SyncableVideo extends React.Component {
  constructor(props) {
    super(props);
    if (props.embed.type !== "youtube") {
      throw new Error(`Unsyncable embed type ${props.embed.type}.`);
    }
  }
  render() {
    if (this.props.embed.type === "youtube") {
      let embedDetails = _.get(this.props, [
        "plenary", "embedDetails", this.props.embed.props.src
      ]);
      if (embedDetails && embedDetails.title) {
        if (embedDetails.liveBroadcastContent === "live" ||
            embedDetails.liveBroadcastContent === "upcoming") {
          return <LiveYoutubeVideo {...this.props} />
        }
        return <SyncableYoutubeVideo {...this.props} />
      }
    }
    return null;
  }
}
SyncableVideo.propTypes = {
  'sync_id': PropTypes.string.isRequired,
  'embed': PropTypes.object.isRequired,
  'embedDetails': PropTypes.object,
};

class SyncableYoutubeVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      localTime: 0,
      syncTime: this.getCurSync().current_time_index || 0
    };
    // How many seconds can we drift by before we reposition?
    this.RESYNC_THRESHOLD = 20;
    this.STATE_NAMES = {
      '-1': 'unstarted',
      0: 'ended',
      1: 'playing',
      2: 'paused',
      3: 'buffering',
      5: 'video cued'
    };
    this.isLive = false;
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
      console.log("videosync pauseForAll");
      this.props.pauseForAll({syncId: this.props.sync_id});
      if (!this.getCurSync().synced) {
        this.player.pauseVideo();
      }
    } else {
      console.log("videosync playForAll");
      this.player.getCurrentTime().then((time) => {
        console.log("videosync current time:", time);
        this.props.playForAll({
          sync_id: this.props.sync_id,
          time_index: time
        });
      }).catch(e => {
        console.error(e);
      });
    }
    // play or pause for all indicates sync intent.
    if (!this.getCurSync().synced) {
      this.toggleSyncIntent();
    }
  }

  videoEnded() {
    if (this.props.showSyncControls) {
      this.props.endSync({syncId: this.props.sync_id});
    }
  }

  toggleSyncIntent(event) {
    event && event.preventDefault();
    if (this.getCurSync().synced) {
      this.props.breakSyncPlayback({sync_id: this.props.sync_id});
    } else {
      this.props.syncPlayback({sync_id: this.props.sync_id});
    }
  }

  onPlayerStateChange(e) {
    let stateName = this.STATE_NAMES[e.data];
    let curSync = this.getCurSync();
    let playingForAll = this.isPlayingForAll();
    console.log("videosync playerStateChange:", stateName);
    this.setState({playerState: stateName});

    if (stateName === "ended") {
      if (this.isPlayingForAll()) {
        this.videoEnded();
      }
    } else if (stateName === "paused" && playingForAll && curSync.synced) {
      this.toggleSyncIntent();
    }
  }

  componentDidMount() {
    this.player = YoutubePlayer(this.playerId(), {
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      }
    });
    window.__SyncableYoutubeVideo = this;
    this.player.on('stateChange', (e) => this.onPlayerStateChange(e));
    this.syncVideo(this.props);
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
    let oldSync = (this.props.videosync || {})[this.props.sync_id] || {};
    if (newSync.current_time_index != oldSync.current_time_index) {
      this.setState({syncTime: newSync.current_time_index || 0});
    }
    this.syncVideo(props);
  }

  playerId() {
    return `player-${this.props.sync_id}`;
  }

  syncVideo(props) {
    props = props || this.props;
    let curSync = props.videosync[props.sync_id] || {};
    // Change out video if props have changed.
    if (!this._loaded || this.props.embed.props.src !== props.embed.props.src) {
      console.log('videosync cueVideoById', props.embed.props.src);
      this.player.cueVideoById({
        videoId: youtube.getIdFromUrl(props.embed.props.src),
        startSeconds: this.state.syncTime,
      });
      this._loaded = true;
    }

    console.log('videosync syncVideo');

    if (curSync.synced === false) {
      // No intent to sync. Carry on.
      return;
    }

    Promise.all([
      this.player.getPlayerState(),
      this.player.getCurrentTime(),
      this.player.getDuration(),
    ]).then(([state, time, duration]) => {
      let playerState = this.STATE_NAMES[state];
      console.log("videosync syncVideo",
        `desired: "${curSync.state}", current: "${playerState}" (${state})`);

      let isPlayingOrBuffering = playerState === "playing" || playerState === "buffering";

      if (playerState === "ended" &&
          Math.abs(duration - this.state.syncTime) < this.RESYNC_THRESHOLD) {
        // Stop sync signal if the video has ended.
        this.videoEnded();
      } else if (curSync.state === "ended" && playerState === "playing") {
        if (Math.abs(duration - time) < this.RESYNC_THRESHOLD) {
          // Sync has ended, but let it play out.
          console.log("videosync LET IT PLAY OUT")
          return;
        } else {
          // We're too far out of bounds; stop ourselves.
          console.log("videosync ENED TOO FAR OUT OF BOUNDS, PAUSE")
          this.player.pauseVideo();
        }
      } else if (curSync.state !== "playing" && isPlayingOrBuffering) {
        console.log("videosync SWITCH TO PAUSE")
        this.player.pauseVideo();
      } else if (curSync.state === "playing" && !isPlayingOrBuffering) {
        console.log("videosync SWITCH TO PLAY", this.state.syncTime)
        this.player.playVideo();
        this.player.seekTo(this.state.syncTime);
      } else if (curSync.state === "playing" &&
                 Math.abs(time - this.state.syncTime) > this.RESYNC_THRESHOLD) {
        console.log("videosync SEEK TO", this.state.syncTime)
        this.player.seekTo(this.state.syncTime);
      }
    });
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

  _syncStateForRender() {
    let curSync = this.getCurSync();
    let syncAvailable = curSync.state === "playing";
    let intendToSync = curSync.synced !== false;
    let synced = true;
    if (Math.abs(this.state.localTime - this.state.syncTime) > this.RESYNC_THRESHOLD) {
      synced = false;
    }
    if (curSync.state === "playing" && this.state.playerState !== "playing") {
      synced = false;
    }
    return {syncAvailable, synced, intendToSync}
  }

  renderSyncState() {
    let {syncAvailable, synced, intendToSync} = this._syncStateForRender();

    let classes = ['sync-indicator'];
    let message;
    if (!syncAvailable) {
      classes.push("no-sync");
      message = "No sync";
    } else if (synced) {
      classes.push("synced");
      message = "Synced";
    } else if (intendToSync) {
      classes.push("syncing");
      message = "Syncing..";
    } else {
      classes.push("unsynced");
      message = "Out of sync";
    }
    return <span className='sync-status-indicator'>
      <span className={classes.join(" ")}></span>{' '}
      {message}{' '}
      <BS.Button className='sync-intent' bsSize='xsmall' onClick={(e) => this.toggleSyncIntent(e)}>
        <i className={'fa fa-' + (intendToSync ? 'lock' : 'unlock')}></i>
        {' '}
        {!this.isLive ?
          <span className='time-indicator'>{this.formatTime(this.state.syncTime)}</span>
        : null}
      </BS.Button>
    </span>
  }

  render() {
    return <div>
      <div id={this.playerId()}></div>

      <div className='video-sync-controls'>
        {this.renderSyncState()}
        { this.props.showSyncControls ?
            <BS.Button bsStyle='success' className="play-button"
                onClick={(e) => this.togglePlayForAll(e)}>
              { this.isPlayingForAll() ? <span><i className='fa fa-pause' /> Pause for All</span> : <span><i className='fa fa-play' /> Play for All</span> }
            </BS.Button>
          : "" }
      </div>
    </div>
  }
}

class LiveYoutubeVideo extends SyncableYoutubeVideo {
  constructor(props) {
    super(props);
    this.isLive = true;
  }

  /*
   * For a live youtube video, only ever play at the tip of the current live
   * broadcast, rather than at arbitrary points within the video. Thus, we
   * disregard all "time" components of a sync signal, and focus only on
  * "playing" state. 
   */
  componentDidMount() {
    this.player = YoutubePlayer(this.playerId(), {
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      }
    });
    window.__SyncableYoutubeVideo = this;
    this.player.on('stateChange', (e) => this.onPlayerStateChange(e));
  }

  syncVideo(props) {
    props = props || this.props;
    let curSync = props.videosync[props.sync_id] || {};
    // Change out video if props have changed.
    if (!this._loaded || (this.props.embed.props.src !== props.embed.props.src)) {
      console.log('videosync live cueVideoById', props.embed.props.src);
      this.player.cueVideoById({
        videoId: youtube.getIdFromUrl(props.embed.props.src),
        startSeconds: this.state.syncTime,
      });
      this._loaded = true;
    }

    console.log('videosync syncVideo live');

    if (curSync.synced === false) {
      // No intent to sync. Carry on.
      return;
    }
    
    this.player.getPlayerState().then(state => {
      let playerState = this.STATE_NAMES[state];
      console.log("videosync syncVideo", "live",
        `desired: "${curSync.state}", current: "${playerState}" (${state})`);

      let isPlayingOrBuffering = playerState === "playing" || playerState === "buffering";

      if (playerState === "ended") {
        this.videoEnded();
      } else if (playerState === "playing" && curSync.state === "ended") {
        // Let it play out.
        console.log("videosync live LET IT PLAY OUT");
        return;
      } else if (curSync.state !== "playing" && isPlayingOrBuffering) {
        console.log("videosync live SWITCH TO PAUSE");
        this.player.pauseVideo();
      } else if ( curSync.state === "playing" && !isPlayingOrBuffering) {
        console.log("videosync live SWITCH TO PLAY");
        this.player.playVideo();
      }
    });
  }

  _syncStateForRender() {
    let curSync = this.getCurSync();
    let syncAvailable = curSync.state === "playing";
    let intendToSync = curSync.synced !== false;
    let synced = true;
    if (curSync.state === "playing" && this.state.playerState !== "playing") {
      synced = false;
    }
    return {syncAvailable, synced, intendToSync}
  }
  togglePlayForAll(event) {
    event && event.preventDefault();
    if (this.isPlayingForAll()) {
      console.log("videosync live pauseForAll");
      this.props.pauseForAll({syncId: this.props.sync_id});
    } else {
      console.log("videosync live playForAll");
      this.props.playForAll({
        sync_id: this.props.sync_id,
        time_index: 0
      });
    }
  }
}

export default connect(
  // map state to props
  (state) => ({
    videosync: state.videosync,
    plenary: state.plenary,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    playForAll: (payload) => dispatch(A.playForAll(payload)),
    pauseForAll: (payload) => dispatch(A.pauseForAll(payload)),
    endSync: (payload) => dispatch(A.endSync(payload)),
    syncPlayback: (payload) => dispatch(A.syncPlayback(payload)),
    breakSyncPlayback: (payload) => dispatch(A.breakSyncPlayback(payload)),
  }),
)(SyncableVideo);

