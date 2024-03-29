import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_embedstyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";
import * as youtube from "../youtube";
import {SyncableVideo, isEmbedSyncable} from "../../videosync";
import * as VIDEOSYNC_ACTIONS from "../../videosync/actions";

const uniqueEmbeds = (embeds) => _.uniqBy(embeds, (e) => {
  return e.type === 'live' ? 'live' : e.props.src
});

const VIMEO_LINK_RE = /^https?:\/\/vimeo\.com\/(\d+).*$/i

class Embed extends React.Component {
  constructor(props) {
    super(props);
    this.state = {embedValue: ''};
    this.updateEmbedDetails(props);
  }
  componentWillReceiveProps(newProps) {
    this.updateEmbedDetails(newProps);
  }

  /**
   * Trigger a state update for the video embed details (title, thumbnail) for
   * any new embeds.
   */
  updateEmbedDetails(props) {
    props = props || this.props;
    props.embeds.embeds.map((embed, i) => {
      if (embed.props && !props.embedDetails[embed.props.src]) {
        props.fetchEmbedDetails(embed, props.settings);
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
    } else if (VIMEO_LINK_RE.test(v)) {
      // Vimeo: translate plain vimeo links to their embeddable endpoint.
      let id = VIMEO_LINK_RE.exec(v)[1];
      return {
        type: 'url',
        props: {
          src: `https://player.vimeo.com/video/${id}`
        }
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
    } else if (/^<iframe.*\/iframe>.*$/.test(v)) {
      // <iframe /> embed codes
      let frag = document.createElement('div');
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
    event && event.preventDefault();
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
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
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
    event && event.preventDefault();
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

  getCurrentEmbed() {
    if (_.isNumber(this.props.embeds.current)) {
      return this.props.embeds.embeds[this.props.embeds.current];
    }
  }

  render() {
    let chosen = this.getCurrentEmbed();

    return <div className='plenary-embed'>
      { chosen ?
        (
          isEmbedSyncable(chosen) ? 
            <SyncableVideo embed={chosen}
              sync_id={this.props.plenary.video_sync_id}
              showSyncControls={this.props.auth.is_admin}
              className='plenary-embed' />
          :
            <iframe {...chosen.props} />
        )
        : ""
      }
      { this.props.auth.is_admin ? this.renderAdminControls(chosen) : "" }
    </div>;
  }

  renderAdminControls(chosen) {
    let hasPrevEmbeds = (!chosen && this.props.embeds.embeds.length > 0) ||
                        (chosen && this.props.embeds.embeds.length > 1);

    let embedDisplay = [];
    this.props.embeds.embeds.forEach((embed, i) => {
      if (i === this.props.embeds.current) {
        return;
      } else {
        let details = this.props.embedDetails[embed.props.src];
        embedDisplay.push({
          index: i,
          title: details && details.title ? details.title : embed.props.src,
          image: details && details.thumbnails && details.thumbnails.default.url,
        });
      }
    });

    return <div className='embed-admin-controls'>
      <form onSubmit={(e) => this.setEmbed(e)}>
        <BS.FormGroup className='embed-input-form-group'>
          <BS.InputGroup>
            <BS.InputGroup.Button>
              <BS.Dropdown id="embed-list input">
                <BS.Dropdown.Toggle><i className='fa fa-align-justify' /></BS.Dropdown.Toggle>
                <BS.Dropdown.Menu>
                  { embedDisplay.length === 0 ?
                      <BS.MenuItem><em>Nothing here yet.</em></BS.MenuItem>
                    : ""
                  }
                  {
                    embedDisplay.map(({title, image, index}) => (
                      <BS.MenuItem key={index}
                          onClick={(event) => this.setCurrent(event, index)}>
                        <span className='previous-embed-list-item'>
                          { image ?
                              <img src={image}
                                   className='previous-embed-list-item-thumbnail'
                                   width={64}
                                   height={48}
                                   alt='' />
                            : ""
                          }

                          <span className='previous-embed-list-item-title'>
                            {title}
                          </span>
                          <span className='previous-embed-list-item-delete'>
                            <BS.OverlayTrigger placement='left' overlay={
                              <BS.Tooltip id='remove-embed'>Remove from list</BS.Tooltip>
                            }>
                              <i className='fa fa-trash'
                                 onClick={(e) => this.removeEmbed(e, index)} />
                            </BS.OverlayTrigger>
                          </span>
                        </span>
                      </BS.MenuItem>
                    ))
                  }
                </BS.Dropdown.Menu>
              </BS.Dropdown>
            </BS.InputGroup.Button>
            <BS.FormControl
              type="text"
              placeholder="YouTube URL or embed code"
              value={this.state.embedValue}
              className='input-field'
              onChange={(e) => this.setState({embedValue: e.target.value})}/>
            <BS.DropdownButton
              componentClass={BS.InputGroup.Button}
              id="input-dropdown-addon"
              title="Action"
              pullRight
            >
              <BS.MenuItem key="1" onClick={(e) => this.setEmbed(e)}>Embed</BS.MenuItem>
              <BS.MenuItem key="2" onClick={(e) => this.enqueueEmbed(e)}>Add to list</BS.MenuItem>
            </BS.DropdownButton>
          </BS.InputGroup>
        </BS.FormGroup>
        { this.props.embedsSending.state === "error" ? 
          <div className='alert alert-error'><i className='fa fa-exclamation-triangle' />{this.props.embedsSending.error}</div>
          : "" }
        <div className="button-flex-container">
          {chosen ?
            <BS.Button bsStyle='danger' className="remove-button"
                onClick={(e) => this.removeEmbed(e, null)}>
              <i className='fa fa-eject' /> Un-Embed
            </BS.Button>
          : null}
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
    settings: state.settings,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    // admin -- youtube only
    onAdminSendEmbeds: (payload) => dispatch(A.adminSendEmbeds(payload)),
    onAdminEmbedsError: (payload) => dispatch(A.adminEmbedsError(payload)),

    // user
    fetchEmbedDetails: (embed, settings) => dispatch(A.fetchEmbedDetails(embed, settings)),
  })
)(Embed);


