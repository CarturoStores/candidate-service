const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateGeocodeInput(data) {
  let errors = {};

  data.latitude = !isEmpty(data.latitude) ? data.latitude : '';
  data.longitude = !isEmpty(data.longitude) ? data.longitude : '';
  //check if the string is a postal code
  const regex = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
  const isValidZip = regex.test(data.zipcode);
  
  if (!isValidZip) {
    errors.zipcode = 'Zip Code is invalid'
  }
  
  return {
    errors,
    isValid: isEmpty(errors)
  };
}