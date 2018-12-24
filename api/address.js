'use strict';

// Alternative querying google maps
const requestify = require('requestify');
// Load Address Input Validation
const validateAddressInput = require('../utils/address');
// Install Geocoding package
const NodeGeocoder = require('node-geocoder');
const options = {
  provider: 'google',
  // Optional depending on the providers
  httpAdapter: 'https',         // Default
  apiKey: process.env.API_KEY,  // for Mapquest, OpenCage, Google Premier
  formatter: null               // 'gpx', 'string', ...
};
const google = NodeGeocoder(options);

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// @route   POST api/address.submit
// @desc    Submit address geocoding info and starts interview process.
// @access  Public

module.exports.submit = (event, context, callback) => {

  // const { errors, isValid } = validateAddressInput(event.body);

  // // check validation
  // if (!isValid) {
  //   console.error('Validation Failed');
  //   callback(new Error(`Couldn\'t submit address because of validation: ${errors}`));
  //   return;
  // }

  
  const requestBody = JSON.parse(event.body);
  const address = requestBody.address;
  const token = requestBody.token;
  const zipcode = requestBody.zipcode;
  const latitude = requestBody.latitude;
  const longitude = requestBody.longitude;
  const state = requestBody.state;
  const streetnumber = requestBody.streetnumber;
  
  if (typeof address !== 'string' || typeof token !== 'string' || typeof zipcode !== 'number' ||
      typeof latitude !== 'number' || typeof longitude !== 'number' || typeof state !== 'string' ||
      typeof streetnumber !== 'number') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t submit candidate because of validation errors.'));
    return;
  }

  submitAddressP(addressInfo(address, token, zipcode, latitude, longitude, state, streetnumber))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted address with lat ${latitude} and lon ${longitude}`,
          addressId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit ddress with lat: ${latitude} and lon: ${longitude}`
        })
      })
    });
};

// @route   GET api/address.list
// @desc    List all address
// @access  Public

module.exports.list = (event, context, callback) => {
  var params = {
      TableName: process.env.ADDRESS_TABLE,
      ProjectionExpression: "id, address, zipcode, latitude, longitude, streetnumber"
  };

  console.log("Scanning Address table.");
  const onScan = (err, data) => {

      if (err) {
          console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
          callback(err);
      } else {
          console.log("Scan succeeded.");
          return callback(null, {
              statusCode: 200,
              body: JSON.stringify({
                  address: data.Items
              })
          });
      }

  };

  dynamoDb.scan(params, onScan);

};

// @route   GET api/address.get
// @desc    Get address detail
// @access  Public

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.ADDRESS_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch address.'));
      return;
    });
};

// JS Utilities-Helpers
const submitAddressP = address => {
  console.log('Submitting address');
  const addressInfo = {
    TableName: process.env.ADDRESS_TABLE,
    Item: address,
  };
  return dynamoDb.put(addressInfo).promise()
    .then(res => address);
};

const addressInfo = (address, token, zipcode, latitude, longitude, state, streetnumber) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    address: address,
    token: token,
    zipcode: zipcode,
    latitude: latitude,
    longitude: longitude,
    state: state,
    streetnumber: streetnumber,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};