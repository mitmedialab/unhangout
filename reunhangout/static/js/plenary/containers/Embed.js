import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_embedstyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";
import * as VIDEOSYNC_ACTIONS from "../../videosync/actions";
import * as youtube from "../youtube";

const uniqueEmbeds = (embeds) => _.uniqBy(embeds, (e) => e.props.src);

class Embed extends React.Component {
  constructor(props) {
    super(props);
    this.state = {embedValue: ''};
    this.updateEmbedDetails();
  }
  componentWillReceiveProps() {
    this.updateEmbedDetails();
  }

  /**
   * Trigger a state update for the video embed details (title, thumbnail) for
   * any new embeds.
   */
  updateEmbedDetails() {
    this.props.embeds.embeds.map((embed, i) => {
      if (!this.props.embedDetails[embed.props.src]) {
        this.props.fetchEmbedDetails(embed);
      }
    });
  }

  /**
   * Parse the user-input URL or iframe embed code to extract the appropriate
   * source or value. Throws an error if the URL or iframe embed code can't be
   * parsed.
   * @return Object - props to persist as an iframe embed.
   */
  parseEmbedValue() {
    let v = this.state.embedValue.trim().replace(/\s+/g, ' ');
    if (!v) {
      return;
    }

    // Youtube embeds and URLs
    if (/youtube\.com|youtu\.be/.test(v)) {
      let canonicalUrl = youtube.getCanonicalUrl(v);
      if (canonicalUrl) {
        return {
          type: 'youtube',
          props: {src: canonicalUrl}
        }
      } else {
        throw new Error("Unrecognized youtube URL.");
      }
    } else if (/^https?:\/\//.test(v)) {
      // plain URLs
      if (!/^https/.test(v)) {
        throw new Error("Only secure (https) embeds allowed.");
      } else {
        return {
          type: 'url',
          props: {src: v}
        }
      }
    } else if (/^<iframe.*\/iframe>$/.test(v)) {
      // <iframe /> embed codes
      let frag = document.createElement('template');
      frag.innerHTML = v;
      let iframe = frag.querySelector("iframe");
      if (!/^https:\/\//.test(iframe.src)) {
        throw new Error("Only secure (https) embeds allowed.");
      }
      return {
        type: 'url',
        props: {src: iframe.src} 
      }
    } else {
      throw new Error("URL or embed code not understood.");
    }
  }
  setEmbed(event) {
    let parsed;
    try {
      parsed = this.parseEmbedValue();
    } catch (e) {
      this.props.onAdminEmbedsError({error: e.message});
      return;
    }
    if (parsed) {
      this.props.onAdminSendEmbeds({
        embeds: uniqueEmbeds([parsed, ...this.props.embeds.embeds]),
        current: 0 
      });
      this.setState({embedValue: ''});
    }
  }
  removeEmbed(event, index=null) {
    if (index === null) {
      // Just remove the "current"; don't remove from queue
      this.props.onAdminSendEmbeds({
        embeds: this.props.embeds.embeds,
        current: null
      });
    } else {
      // Remove from queue. Remove current only if the enqueued one is current.
      let prev = this.props.embeds.embeds;
      let next = {
        embeds: [...prev.slice(0, index), ...prev.slice(index + 1)]
      };
      if (index === this.props.embeds.current) {
        next.current = null;
      } else if (this.props.embeds.current > index) {
        next.current = this.props.embeds.current - 1;
      } else {
        next.current = this.props.embeds.current;
      }
      this.props.onAdminSendEmbeds(next);
    }
  }
  enqueueEmbed(event) {
    let parsed;
    try {
      parsed = this.parseEmbedValue();
    } catch (e) {
      this.props.onAdminEmbedsError({error: e.message});
      return;
    }
    if (parsed) {
      this.props.onAdminSendEmbeds({
        embeds: uniqueEmbeds([...this.props.embeds.embeds, parsed]),
        current: this.props.embeds.current
      });
      this.setState({embedValue: ''});

    }
  }
  setCurrent(event, index) {
    this.props.onAdminSendEmbeds({
      embeds: this.props.embeds.embeds,
      current: index
    });
  }
  isPlayingForAll() {
    let curSync = this.props.videosync[this.props.plenary.video_sync_id];
    console.log(curSync);
    return curSync && curSync.state === "playing";
  }
  togglePlayForAll(event) {
    if (this.isPlayingForAll()) {
      this.props.onAdminPauseForAll(this.props.plenary.video_sync_id);
    } else {
      this.props.onAdminPlayForAll(this.props.plenary.video_sync_id);
    }
  }
  render() {
    let chosen;
    if (_.isNumber(this.props.embeds.current)) {
      chosen = this.props.embeds.embeds[this.props.embeds.current];
    }
    return <div>
      { chosen ?  <iframe className='plenary-embed' {...chosen.props} /> : "" }
      { this.props.auth.is_admin ? this.renderAdminControls(chosen) : "" }
    </div>;
  }
  renderAdminControls(chosen) {
    let hasPrevEmbeds = (!chosen && this.props.embeds.embeds.length > 0) ||
                        (chosen && this.props.embeds.embeds.length > 1);

    return <div className='embed-admin-controls'>
      <form>
        { chosen && chosen.type === "youtube" ?
          <div className="button-flex-container">
            <BS.Button bsStyle='success' className="play-button"
                onClick={(e) => this.togglePlayForAll(e)}>
              { this.isPlayingForAll() ? "Pause for all" : "Play for all" }
            </BS.Button>
            <BS.Button bsStyle='danger' className="remove-button"
                onClick={(e) => this.removeEmbed(e, null)}>
              Remove Embed
            </BS.Button>
          </div>
          : "" }
        { this.props.embedsSending.state === "error" ? 
          <div className='alert alert-error'>{this.props.embedsSending.error}</div>
          : "" }
        <BS.FormGroup>
          <BS.InputGroup>
            { hasPrevEmbeds ?
              <BS.InputGroup.Button>
                <BS.Dropdown id="embed-list input">
                  <BS.Dropdown.Toggle>
                      <BS.Glyphicon glyph="menu-hamburger" />
                  </BS.Dropdown.Toggle>
                  <BS.Dropdown.Menu>
                    {this.props.embeds.embeds.map((embed, i) => {
                      if (i !== this.props.embeds.current) {
                        return <BS.MenuItem key={i}
                          onClick={(event) => this.setCurrent(event, i)}
                        >
                          {
                            /* No embed details? Show URL. */
                            !this.props.embedDetails[embed.props.src] ?
                              embed.props.src
                            /* Currently loading the details.. */
                            : this.props.embedDetails[embed.props.src].loading ?
                              embed.props.src
                            /* Have embed details */
                            : <span>
                                <img src={this.props.embedDetails[embed.props.src].thumbnails.default.url}
                                    width={64}
                                    height={48}
                                    alt="" />
                                {this.props.embedDetails[embed.props.src].title}
                              </span>
                          }
                          <i className='fa fa-trash'
                             onClick={(e) => this.removeEmbed(e, i)} />
                        </BS.MenuItem>;
                      }
                      return "";
                    })}
                  </BS.Dropdown.Menu>
                </BS.Dropdown>
              </BS.InputGroup.Button>
              : "" }
            <BS.FormControl
              type="text"
              placeholder="YouTube URL or embed code"
              value={this.state.embedValue}
              onChange={(e) => this.setState({embedValue: e.target.value})}/>
            <BS.DropdownButton
              componentClass={BS.InputGroup.Button}
              id="input-dropdown-addon"
              title="Action"
              pullRight
            >
              <BS.MenuItem key="1" onClick={(e) => this.setEmbed(e)}>Set</BS.MenuItem>
              <BS.MenuItem key="2" onClick={(e) => this.enqueueEmbed(e)}>Enqueue</BS.MenuItem>
            </BS.DropdownButton>
          </BS.InputGroup>
          </BS.FormGroup>
        <div className="button-flex-container">
        <BS.Button className="hangout-on-air-button">Create Hangout-on-Air</BS.Button>
        </div>
      </form>
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    embeds: state.plenary.embeds || {embeds: [], current: null},
    embedDetails: state.plenary.embedDetails || {},
    embedsSending: state.plenary.embedsSending || {},
    auth: state.auth,
    videosync: state.videosync,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    // admin -- youtube only
    onAdminCreateHoA: () => dispatch(A.adminCreateHoA()),
    onAdminSendEmbeds: (payload) => dispatch(A.adminSendEmbeds(payload)),
    onAdminEmbedsError: (payload) => dispatch(A.adminEmbedsError(payload)),

    onAdminPlayForAll: (sync_id) => dispatch(VIDEOSYNC_ACTIONS.playForAll({sync_id})),
    onAdminPauseForAll: (sync_id) => dispatch(VIDEOSYNC_ACTIONS.pauseForAll({sync_id})),
    // user
    fetchEmbedDetails: (embed) => dispatch(A.fetchEmbedDetails(embed)),
    onSyncPlayback: (sync_id) => dispatch(VIDEOSYNC_ACTIONS.syncPlayback({sync_id})),
    onBreakSyncPlayback: (sync_id) => dispatch(VIDEOSYNC_ACTIONS.breakSyncPlayback({sync_id})),
  })
)(Embed);


