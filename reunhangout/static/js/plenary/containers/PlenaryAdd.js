import React from "react";
import * as BS from 'react-bootstrap';
import {PlenaryEditor} from './PlenaryEditor';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    let cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export default class PlenaryAdd extends React.Component {
  onChange(data) {
    this.setState({loading: true});
    let formData = new FormData();
    formData.append('data', JSON.stringify(data));
    fetch('', {
      method: 'POST',
      headers: {'X-CSRFToken': getCookie('csrftoken')},
      credentials: 'same-origin',
      body: formData
    }).then((res) => {
      if (res.status === 200) {
        document.location.href = `${document.location.protocol}//${document.location.host}/event/${data.slug}/`;
      } else {
        alert("Server error!");
        this.setState({loading: false});
        console.log("Error!");
        console.log(res.status);
        res.text().then((text) => {
          console.log(text);
        });
      }
    });
  }
  render() {
    return <div className='container'>
      <h1>Create a new event</h1>
      <PlenaryEditor onChange={(details) => this.onChange(details)}
                     copyablePlenaries={window.COPYABLE_PLENARIES}
                     copyFromId={window.COPY_FROM_ID || undefined}
                     loading={this.state && this.state.loading} />
    </div>
  }
}
