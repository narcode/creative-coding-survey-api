const responses = require('./responses.js');

function getResponses(dbPool) {
  return (req, res) => {
    responses.retrieveAll(dbPool, (err, rows) => {

      if (err != null) {
        res.status(500).send({error: true, message: "Server error"});
      } else {
        res.status(200).send({error: false, data: rows});
      }
    });
  };
}

function getResponse(dbPool) {
  return (req, res) => {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).send({error: true, message: "Invalid id"});
    } else {
      responses.retrieve(dbPool, id, (err, creativeCoder) => {
        if (err != null) {
          res.status(500).send({error: true, message: "Server error"});
        } else if (creativeCoder == null) {
          res.status(404).send({error: true, message: "Not found"});
        } else {
          res.status(200).send({error: false, data: creativeCoder});
        }
      });
    }
  };
}

exports.routes = [
  ['/responses', getResponses],
  ['/responses/:id', getResponse],
]
