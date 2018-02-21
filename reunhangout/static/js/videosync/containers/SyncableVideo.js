import React from "react";
import PropTypes from 'prop-types';
import _ from "lodash";
import * as BS from 'react-bootstrap';
import YoutubePlayer from 'youtube-player';
import * as youtube from '../../plenary/youtube';
import * as style from "../../../scss/pages/plenary/_syncableVideoStyle.scss"


const RESYNC_THRESHOLD = 20;
const STATE_NAMES = {
  '-1': 'unstarted',
  '0': 'ended',
  '1': 'playing',
  '2': 'paused',
  '3': 'buffering',
  '5': 'video cued'
};

/**
 * Container for syncable video embeds
 */
export default class SyncableVideo extends React.Component {
  static propTypes = {
    sync_id: PropTypes.string.isRequired,
    embed: PropTypes.object.isRequired,
    videosync: PropTypes.object.isRequired,
    isLiveParticipant: PropTypes.bool.isRequired,
    showSyncControls: PropTypes.bool.isRequired,
    embedDetails: PropTypes.object.isRequired,

    playForAll: PropTypes.func.isRequired,
    pauseForAll: PropTypes.func.isRequired,
    endSync: PropTypes.func.isRequired,
    syncPlayback: PropTypes.func.isRequired,
    breakSyncPlayback: PropTypes.func.isRequired,
  }

  static isSyncable(embed) {
    return embed.type === "youtube" || embed.type === "live";
  }

  constructor(props) {
    super(props);
    if (!SyncableVideo.isSyncable(props.embed)) {
      throw new Error(`Unsyncable embed type ${props.embed.type}.`);
    }
  }

  render() {
    const showYoutube = (
      this.props.embed.type === "youtube" ||
      (this.props.embed.type === "live" && !this.props.isLiveParticipant)
    );
    const showLive = (
      this.props.embed.type === "live" &&
      this.props.isLiveParticipant
    );

    if (showYoutube) {
      if (this.props.embedDetails && this.props.embedDetails.title) {
        const isLive = (
          this.props.embedDetails.liveBroadcastContent === "live" ||
          this.props.embedDetails.liveBroadcastContent === "upcoming"
        );
        return <SyncableYoutubeVideo  isLive={isLive} {...this.props} />
      }
    } else if (showLive) {
      return <LiveVideoBroadcast {...this.props} />
    }
    return null;
  }
}

/**
 * Live or non-live video which maintains sync state with the server.
 */
class SyncableYoutubeVideo extends React.Component {
  static propTypes = {
    sync_id: PropTypes.string.isRequired,
    embed: PropTypes.object.isRequired,
    isLive: PropTypes.bool.isRequired,
    showSyncControls: PropTypes.bool.isRequired,
    videosync: PropTypes.object,
  }

  constructor(props) {
    super(props);
    this.state = {
      localTime: 0,
      syncTime: this.getCurSync().current_time_index || 0
    };
  }

  getCurSync() {
    return this.props.videosync[this.props.sync_id] || {};
  }

  isPlayingForAll() {
    return this.getCurSync().state === "playing";
  }

  log() {
    //console.log.apply(console, arguments);
  }

  togglePlayForAll(event) {
    event && event.preventDefault();
    if (this.isPlayingForAll()) {
      this.log("videosync pauseForAll");
      this.props.pauseForAll({syncId: this.props.sync_id});

      // non-live: pause local video if we're out of sync.
      if (!this.props.isLive && !this.getCurSync().synced) {
        this.player.pauseVideo();
      }
    } else {
      this.log("videosync playForAll");
      if (this.props.isLive) {
        // Live: just play from 0 immediately.
        this.props.playForAll({
          sync_id: this.props.sync_id,
          time_index: 0
        });
      } else {
        // Non-live: get the current playhead position and play from there.
        this.player.getCurrentTime().then((time) => {
          this.log("videosync current time:", time);
          this.props.playForAll({
            sync_id: this.props.sync_id,
            time_index: time
          });
        }).catch(e => {
          console.error(e);
        });
      }
    }
    if (!this.props.isLive && !this.getCurSync().synced) {
      // play or pause for non-live indicates sync intent.
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
    let stateName = STATE_NAMES[e.data];
    let curSync = this.getCurSync();
    let playingForAll = this.isPlayingForAll();
    this.log("videosync playerStateChange:", stateName);
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
    window.__SyncableYoutubeVideo = this; // for console debugging
    this.player.on('stateChange', (e) => this.onPlayerStateChange(e));
    this.syncVideo(this.props);

    // For pre-recorded videos, set up an interval to advance our sync timer in
    // between updates from the server, and to trigger re-syncing.  Skip this
    // for live videos, where we don't care about time, and always play from
    // the tip of the current live broadcast.
    if (!this.props.isLive) {
      this.syncTimeInterval = setInterval(() => {
        if (this.getCurSync().state === 'playing') {
          this.setState({syncTime: (this.state.syncTime || 0) + 1});
          this.player.getCurrentTime().then((time) => {
            this.setState({localTime: time || 0});
            if (Math.abs(this.state.syncTime - time) > RESYNC_THRESHOLD) {
              this.syncVideo();
            }
          });
        }
      }, 1000);
    }
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
      this.log('videosync cueVideoById', props.embed.props.src);
      this.player.cueVideoById({
        videoId: youtube.getIdFromUrl(props.embed.props.src),
        startSeconds: this.state.syncTime,
      });
      this._loaded = true;
    }

    this.log('videosync syncVideo');

    if (curSync.synced === false) {
      // No intent to sync. Carry on.
      return;
    }

    Promise.all([
      this.player.getPlayerState(),
      this.player.getCurrentTime(),
      this.player.getDuration(),
    ]).then(([state, time, duration]) => {
      let playerState = STATE_NAMES[state];
      this.log("videosync syncVideo",
        `desired: "${curSync.state}", current: "${playerState}" (${state})`);

      let isPlayingOrBuffering = (
        playerState === "playing" || playerState === "buffering"
      );

      if (this.props.isLive) {
        // Live videos: Don't pay attention to sync time -- only consider
        // playing/paused/ended.
        if (playerState === "ended") {
          this.videoEnded();
        } else if (playerState === "playing" && curSync.state === "ended") {
          // Let it play out.
          this.log("videosync live LET IT PLAY OUT");
          return;
        } else if (curSync.state !== "playing" && isPlayingOrBuffering) {
          this.log("videosync live SWITCH TO PAUSE");
          this.player.pauseVideo();
        } else if ( curSync.state === "playing" && !isPlayingOrBuffering) {
          this.log("videosync live SWITCH TO PLAY");
          this.player.playVideo();
        }
      } else {
        // Non-live videos: Pay attention to sync time and playing/paused/ended
        // states.
        if (playerState === "ended" &&
            Math.abs(duration - this.state.syncTime) < RESYNC_THRESHOLD) {
          // Stop sync signal if the video has ended.
          this.videoEnded();
        } else if (curSync.state === "ended" && playerState === "playing") {
          if (Math.abs(duration - time) < RESYNC_THRESHOLD) {
            // Sync has ended, but let it play out.
            this.log("videosync LET IT PLAY OUT")
            return;
          } else {
            // We're too far out of bounds; stop ourselves.
            this.log("videosync ENED TOO FAR OUT OF BOUNDS, PAUSE")
            this.player.pauseVideo();
          }
        } else if (curSync.state !== "playing" && isPlayingOrBuffering) {
          this.log("videosync SWITCH TO PAUSE")
          this.player.pauseVideo();
        } else if (curSync.state === "playing" && !isPlayingOrBuffering) {
          this.log("videosync SWITCH TO PLAY", this.state.syncTime)
          this.player.playVideo();
          this.player.seekTo(this.state.syncTime);
        } else if (curSync.state === "playing" &&
                   Math.abs(time - this.state.syncTime) > RESYNC_THRESHOLD) {
          this.log("videosync SEEK TO", this.state.syncTime)
          this.player.seekTo(this.state.syncTime);
        }
      }
    });
  }

  render() {
    return <div>
      <div id={this.playerId()}></div>

      <div className='video-sync-controls'>

        <SyncStateButton
          curSync={this.getCurSync()}
          isLive={this.props.isLive}
          playerState={this.state.playerState}
          toggleSyncIntent={this.toggleSyncIntent.bind(this)}
          syncTime={this.state.syncTime}
          localTime={this.state.localTime}
        />

        { this.props.showSyncControls ?
          <TogglePlayForAllButton
            isPlayingForAll={this.isPlayingForAll()}
            togglePlayForAll={this.togglePlayForAll.bind(this)} />
        : null }
      </div>
    </div>
  }
}


/**
 * Admin button for toggling play for all state
 */
class TogglePlayForAllButton extends React.Component {
  static propTyeps = {
    isPlayingForAll: PropTypes.bool.isRequired,
    togglePlayForAll: PropTypes.func.isRequired,
  }

  render() {
    return (
      <BS.Button bsStyle='success' className="play-button"
          onClick={this.props.togglePlayForAll}>
        { this.props.isPlayingForAll ?
          <span>
            <i className='fa fa-pause' /> Pause for All
          </span>
        :
          <span>
            <i className='fa fa-play' /> Play for All
          </span>
        }
      </BS.Button>
    )
  }

}

/**
 * Lock button for displaying video playback sync status
 */
class SyncStateButton extends React.Component {
  static propTypes = {
    curSync: PropTypes.object.isRequired,
    isLive: PropTypes.bool.isRequired,

    playerState: PropTypes.string,
    localTime: PropTypes.number,
    syncTime: PropTypes.number,

    toggleSyncIntent: PropTypes.func.isRequired,
  }

  syncStateForRender() {
    return {syncAvailable, synced, intendToSync}
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

  render() {
    let syncAvailable = this.props.curSync.state === "playing";
    let intendToSync = this.props.curSync.synced !== false;
    let synced = true;
    if (!this.props.isLive &&
        Math.abs(this.props.localTime - this.props.syncTime) > RESYNC_THRESHOLD) {
      synced = false;
    }
    if (this.props.curSync.state === "playing" && this.props.playerState !== "playing") {
      synced = false;
    }
    const classes = ['sync-indicator'];
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
      <BS.Button className='sync-intent' bsSize='xsmall'
                 onClick={this.props.toggleSyncIntent}>
        <i className={'fa fa-' + (intendToSync ? 'lock' : 'unlock')} />
        {' '}
        {!this.props.isLive ?
          <span className='time-indicator'>
            {this.formatTime(this.props.syncTime)}
          </span>
        : null}
      </BS.Button>
    </span>
  }
}

/**
 * Plenary server broadcast participant. Includes iframe for participation and
 * a button to toggle play for all.
 */
class LiveVideoBroadcast extends React.Component {
  static propTypes = {
    embed: PropTypes.object.isRequired,
    videosync: PropTypes.object.isRequired,
    pauseForAll: PropTypes.func.isRequired,
    playForAll: PropTypes.func.isRequired,
    sync_id: PropTypes.string.isRequired,
  }

  getCurSync() {
    return this.props.videosync[this.props.sync_id] || {};
  }
  isPlayingForAll() {
    return this.getCurSync().state === "playing";
  }
  togglePlayForAll = (event) => {
    event && event.preventDefault();
    if (this.isPlayingForAll()) {
      this.props.pauseForAll({syncId: this.props.sync_id});
    } else {
      this.props.playForAll({
        sync_id: this.props.sync_id,
        time_index: 0
      });
    }
  }
  render() {
    return <div>
      <iframe allow="microphone; camera" src={this.props.embed.broadcast.participate} />
      <div className='video-sync-controls'>
        <TogglePlayForAllButton
          isPlayingForAll={this.isPlayingForAll()}
          togglePlayForAll={this.togglePlayForAll}
        />
      </div>
    </div>
  }
}
