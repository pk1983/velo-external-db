const objectContainsKey = (obj, key) => typeof obj[key] === 'string' && obj[key].length > 0

const checkRequiredKeys = (obj, requiredKeys) => requiredKeys.filter(key => !objectContainsKey(obj, key))

const checkThatHasAtLestOneRequiredKeys = (obj, keys) => keys.some(key => objectContainsKey(obj, key)) ? [] : [keys.join('/')]

module.exports = { checkRequiredKeys, checkThatHasAtLestOneRequiredKeys }