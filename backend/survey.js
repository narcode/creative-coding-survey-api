const countryList = require('country-list');

function normalizeCountry(countryString) {
  let normalizedInput = countryString
    .trim()
      .toLowerCase()
      .replace(/^the /, "")
      .replace(/\s+/, " ");
  if (normalizedInput === "united states") {
    normalizedInput = "united states of america";
  }
  const countryCode = countryList.getCode(normalizedInput);
  return countryCode === undefined ? normalizedInput : countryCode;
}

function transformResidence(residence) {
  return normalizeCountry(residence);
}

function transformTools(tools) {
  return tools.split(",").map(x => x.trim()).filter(x => x.length > 0);
}

function transformCountry(country) {
  return normalizeCountry(country);
}

function none(x) {
  return x;
}

function yesNoDefaultYes(x) {
  return x === "no" ? false : true;
}

function arrayExclude(exclude) {
  const excludeSet = new Set(exclude);
  return (array) => array.filter(x => !excludeSet.has(x));
}

function splitNewlines(x) {
  return x.split("\n").map(x => x.trim()).filter(x => x.length > 0);
}

function nullableString(x) {
  const trimmed = x.trim();
  return trimmed === ""
      || trimmed.localeCompare("no", undefined, {sensitivity: "accent"}) === 0
       ? null : trimmed;
}

const questions = {
  1: { name: "countryOfResidence", transform: none, },
  2: { name: "pronoun", transform: nullableString, },
  3: { name: "disciplines", transform: arrayExclude(["", "If you feel like your discipline is not represented please add it here"]), },
  4: { name: "keywords", transform: arrayExclude([""]), },
  5: { name: "tools", transform: arrayExclude(["", "If you are using a tool that is not mentioned please add it here"]) },
  6: { name: "organization", transform: nullableString },
  7: { name: "event", transform: nullableString },
  8: { name: "venue", transform: nullableString },
  9: { name: "includedInDatabase", transform: yesNoDefaultYes },
  10: { name: "type", transform: arrayExclude([""]) },
  11: { name: "name", transform: nullableString },
  12: { name: "website", transform: nullableString },
  13: { name: "links", transform: splitNewlines },
};

exports.formatResponses = (responsesById) => {
  return Object.keys(responsesById).reduce((object, key) => {
    const question = questions[key];
    if (question == null) {
      console.error("invalid question key: " + key);
      return object;
    } else {
      const response = question.transform(responsesById[key]);
      if (response != null) {
        object[question.name] = response;
      }
      return object;
    }
  }, { // defaults
    includedInDatabase: true,
  });
};
