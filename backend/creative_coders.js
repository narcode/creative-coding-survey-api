const {formatCreativeCodersResponses} = require('./survey.js');

function responseFromRow(row) {
  return {
    ...row,
    responses: formatCreativeCodersResponses(row.responses),
  };
}

exports.retrieveAll = (pool, callback) => {
  pool.query("SELECT id, created, modified, branch, responses, submitted FROM responses where branch='Creative Coders' AND submitted=1", (err, rows) => {
    if (err != null) {
      callback(err, null)
    } else {
      callback(null, rows.map(responseFromRow));
    }
  });
}

exports.retrieve = (pool, id, callback) => {
  pool.query("SELECT id, created, modified, branch, responses, submitted FROM responses where id = ? AND branch = 'Creative Coders' AND submitted=1", id, (err, rows) => {
    if (err != null) {
      console.error(err);
      callback(err, null);
    } else if (rows.length == 0) {
      callback(null, null);
    } else {
      callback(null, responseFromRow(rows[0]));
    }
  });
}
