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

const creativeCodersQuestions = {
  1: {name: "residence", transform: transformResidence},
  2: { name: "gender" },
  3: {name: "country", transform: transformCountry},
  4: { name: "discipline" },
  "4a": { name: "discipline_describe" },
  5: { name: "style" },
  6: { name: "practice" },
  7: {name: "tools", transform: transformTools},
  8: { name: "language" },
  9: { name: "tools_links" },
  10: { name: "projects" },
  11: { name: "group" },
  12: { name: "inspiration" },
  13: { name: "aim" },
  14: { name: "peers" },
  "14a": { name: "peers_describe" },
  "14b": { name: "online_practice" },
  "14c": { name: "offline_practice" },
  15: { name: "shared_interest" },
  "15a": { name: "work" },
  "15b": { name: "school" },
  "15c": { name: "university" },
  "15d": { name: "collective" },
  "15e": { name: "interest_other" },
  16: { name: "time" },
  17: { name: "performing" },
  "17a": { name: "location" } ,
  "17b": { name: "not_performed" },
  18: { name: "spaces" },
  19: {name: "facilities"},
  20: {name: "equipment"},
  21: {name: "visited"},
  22: {name: "website"},
  23: {name: "conversation"},
  "23a": {name: "email"},
  24: {name: "updates"},
};

exports.formatCreativeCodersResponses = (jsonString) => {
  const responsesById = JSON.parse(jsonString);
  return Object.keys(responsesById).reduce((object, key) => {
    const question = creativeCodersQuestions[key];
    const response = responsesById[key];
    const transformedResponse = question.transform ? question.transform(response) : response.trim();
    if (transformedResponse != null && transformedResponse !== "") {
      object[question.name] = transformedResponse;
    }
    return object;
  }, {});
}
