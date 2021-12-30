const {formatResponses} = require('./survey.js');

function nullableResponseFromRow(row) {
  const responses =
    formatResponses({
      ...JSON.parse(row.responses),
      ...JSON.parse(row.checkboxes),
    });
  if (!responses.includedInDatabase) {
    return null;
  } else {
    delete responses.includedInDatabase;
    return {
      id: row.id,
      created: row.created,
      modified: row.modified,
      responses: responses,
    };
  }
}

const columns = "id, created, modified, responses, checkboxes";

exports.retrieveAll = (pool, callback) => {
  pool.query(`SELECT ${columns} FROM responses where branch='Creative Coders' AND submitted=1`, (err, rows) => {
    if (err != null) {
      callback(err, null)
    } else {
      callback(null, rows.map(nullableResponseFromRow).filter(x => x != null));
    }
  });
}

exports.retrieve = (pool, id, callback) => {
  pool.query(`SELECT ${columns} FROM responses where id = ? AND branch = 'Creative Coders' AND submitted = 1`, id, (err, rows) => {
    if (err != null) {
      console.error(err);
      callback(err, null);
    } else if (rows.length == 0) {
      callback(null, null);
    } else {
      callback(null, nullableResponseFromRow(rows[0]));
    }
  });
}
