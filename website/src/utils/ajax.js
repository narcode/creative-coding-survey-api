export const ajax = (method, url, data = {}) => {

  return new Promise(function (resolve, reject) {

    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = false;

    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve( JSON.parse(xhr.response) );
      } else {
        console.log('xhr error', this.status, xhr.statusText);
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      console.log('xhr error', this.status, xhr.statusText);
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };

    // stringify data
    data = JSON.stringify(data);

    xhr.send(data);
  });
}

export const loadJSON = (url, success, error = null) => {

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {

    if (xhr.readyState === XMLHttpRequest.DONE) {

      if (xhr.status === 200) {

        if (success) {
          success(JSON.parse(xhr.responseText));
        }
        else if (error) {
          error(xhr);
        }
      }
    }
  }
  xhr.onerror = () => {
    error(`there's an error dont you know`)
  }

  xhr.open('GET', url, true);
  xhr.send();
}