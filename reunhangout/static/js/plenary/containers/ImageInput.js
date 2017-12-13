import React from 'react';
import PropTypes from 'prop-types';
import "../../../scss/partials/_imageInput.scss";

export class ImageInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      image: this.props.value,
      error: "",
      loading: false,
    }
  }

  componentWillReceiveProps(newProps) {
    this.setState({image: newProps.value, loading: false, error: ""});
  }

  triggerFileChooser(event) {
    event.preventDefault();
    event.stopPropagation();
    let input = this.refs.fileInput;
    if (window.MouseEvent) {
      // Recent Firefox / Chrome
      let evt = new MouseEvent("click");
      input.dispatchEvent(evt);
    } else {
      input.click();
    }
  }

  onDragEnter(event) {
    this.setState({lastDragEnter: event.target});
    if (event.currentTarget.className.indexOf(" dragging") === -1) {
      event.currentTarget.className += " dragging";
    }
  }

  onDragLeave(event) {
    if (this.state.lastDragEnter === event.target) {
      event.currentTarget.className = event.currentTarget.className.replace(' dragging', '');
    }
  }

  onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.className = event.currentTarget.className.replace(' dragging', '');
    if (event.dataTransfer.files[0]){
      this.ingestFile(event.dataTransfer.files[0]);
    }
  }

  onChangeFile(event) {
    event.stopPropagation();
    event.preventDefault();
    if (event.target.files[0]) {
      this.ingestFile(event.target.files[0]);
    }
  }

  ingestFile(file) {
    if (!file.type.match(/^image\/(png|jpeg|gif)$/i)) {
      this.setState({
        error: "That doesn't seem to be an image file.",
        loading: false
      });
      return;
    }
    this.setState({
      error: "",
      loading: true
    })

    let reader = new FileReader();
    reader.onload = (fileEvent) => {
      let resized = this.resizeImage(fileEvent.target.result, file.type);
      this.resizeImage(fileEvent.target.result, file.type).then(resized => {
        if (resized) {
          this.setState({
            image: resized,
            loading: false,
          }, () => this.onChange());
        }
      });
    }
    reader.readAsDataURL(file);
  }

  resizeImage(dataUrl, type) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.src = dataUrl;
      const start = Date.now();
      const waitAndScale = () => {
        if (img.width && img.height) {
          let height = img.height;
          let width = img.width;
          let scale = Math.min(
            1,
            this.props.maxHeight / height,
            this.props.maxWidth / width
          );
          height *= scale;
          width *= scale;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL(type));
          } catch (e) {
            resolve(canvas.toDataURL());
          }
        } else if (Date.now() - start > 2000) {
          this.setState({
            loading: false,
            error: "That doesn't seem to be a valid image."
          });
          reject(null);
        } else {
          setTimeout(waitAndScale, 100);
        }
      };
      waitAndScale();
    });
  }

  removeImage(event) {
    event && event.preventDefault();
    event && event.stopPropagation();
    this.setState({image: null}, () => this.onChange());
    this.refs.fileInput.value = "";
  }

  onChange() {
    this.props.onChange && this.props.onChange(this.state.image);
  }

  render() {
    return (
      <div className='image-input'>
          <div className={`drop-target ${this.state.error ? 'has-error' : ''}`}
               onClick={(e) => this.triggerFileChooser(e)}
               onDragEnter={(e) => this.onDragEnter(e)}
               onDragOver={(e) => this.onDragOver(e)}
               onDragLeave={(e) => this.onDragLeave(e)}
               onDrop={(e) => this.onDrop(e)}>
            <span className='image-preview'>
              { this.state.image ?
                  <span className='remove-image' onClick={(e) => this.removeImage(e)}>
                    <i className='fa fa-close'/>
                  </span>
                : "" }
              { this.state.loading ?
                  <i className='fa fa-spinner fa-spin' />
                : this.state.image ?
                  <img src={this.state.image} />
                : ""
              }
            </span>
            <span className='prompt'>
              Drag and drop image, or <a>click to choose</a>
              { this.state.error ?  <span className='help-block'>{this.state.error}</span> : "" }
            </span>
          </div>
          <input type='file' className='hide' ref='fileInput'
                 onChange={(e) => this.onChangeFile(e)} />
      </div>
    )
  }
}
ImageInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  maxWidth: PropTypes.number,
  maxHeight: PropTypes.number,
}
ImageInput.defaultProps = {
  maxWidth: 800,
  maxHeight: 600,
}
