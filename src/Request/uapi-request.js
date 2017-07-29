import handlebars from 'handlebars';
import axios from 'axios';
import { pd } from 'pretty-data';
import {
  RequestValidationError,
  RequestRuntimeError,
  RequestSoapError,
} from './RequestErrors';
import UapiParser from './uapi-parser';
import configInit from '../config';

/**
 * basic function for requests/responses
 * @param  {string} service          service url for current response (gateway)
 * @param  {object} auth             {username,password} - credentials
 * @param  {string} reqType          url to file with xml for current request
 * @param  {function} validateFunction function for validation
 * @param  {function} errorHandler    function that gets SOAP:Fault object and handle error
 * @param  {function} parseFunction    function for transforming json soap object to normal object
 * @param  {boolean} debugMode        true - log requests, false - dont
 * @return {Promise}                  returning promise for best error handling ever)
 */
module.exports = function (
  service,
  auth,
  reqType,
  rootObject,
  validateFunction,
  errorHandler,
  parseFunction,
  debugMode = false,
  options = {},
) {
  const config = configInit(auth.region || 'emea');
  const log = options.logFunction || console.log;

  // Performing checks
  if (!service || service.length <= 0) {
    throw new RequestValidationError.ServiceUrlMissing();
  } else if (!auth || auth.username === undefined || auth.password === undefined) {
    throw new RequestValidationError.AuthDataMissing();
  } else if (reqType === undefined) {
    throw new RequestValidationError.RequestTypeUndefined();
  } else if (Object.prototype.toString.call(reqType) !== '[object String]') {
    throw new RequestRuntimeError.TemplateFileMissing();
  }

  return function serviceFunc(params) {
    if (debugMode) {
      log('Input params ', pd.json(JSON.stringify(params)));
    }

    // create a v36 uAPI parser with default params and request data in env
    const uParser = new UapiParser(rootObject, 'v36_0', params, debugMode);

    const validateInput = () =>
      Promise.resolve(params)
        .then(validateFunction)
        .then((validatedParams) => {
          params = validatedParams;
          uParser.env = validatedParams;
          return reqType;
        });

    const prepareRequest = function (template) {
      // adding target branch param from auth variable and render xml
      params.TargetBranch = auth.targetBranch;
      params.Username = auth.username;
      params.emulatePcc = auth.emulatePcc || false;
      const renderedObj = template(params);
      return renderedObj;
    };

    const sendRequest = function (xml) {
      if (debugMode) {
        log('Request URL: ', service);
        log('Request XML: ', pd.xml(xml));
      }
      return axios.request({
        url: service,
        method: 'POST',
        timeout: config.timeout || 5000,
        auth: {
          username: auth.username,
          password: auth.password,
        },
        headers: {
          'Accept-Encoding': 'gzip',
        },
        data: xml,
      })
        .then((response) => {
          if (debugMode > 1) {
            log('Response SOAP: ', pd.xml(response.data));
          }
          return response.data;
        })
        .catch((e) => {
          const rsp = e.response;
          const error = {
            status: rsp.status,
            data: rsp.data,
          };

          if (debugMode) {
            log('Error Response SOAP: ', pd.json(JSON.stringify(error)));
          }

          return Promise.reject(new RequestSoapError.SoapRequestError(error));
        });
    };

    const parseResponse = function (response) {
      // if there are web server or HTTP auth errors, uAPI returns a JSON
      let data = null;
      try {
        data = JSON.parse(response);
      } catch (err) {
        return uParser.parse(response);
      }

      // TODO parse JSON errors
      return Promise.reject(new RequestSoapError.SoapServerError(data));
    };

    const validateSOAP = function (parsedXML) {
      if (parsedXML['SOAP:Fault']) {
        if (debugMode > 2) {
          log('Parsed error response', pd.json(JSON.stringify(parsedXML)));
        }
        const errData = uParser.mergeLeafRecursive(parsedXML['SOAP:Fault'][0]); // parse error data
        return errorHandler.call(uParser, errData);
      } else if (debugMode > 2) {
        log('Parsed response', pd.json(JSON.stringify(parsedXML)));
      }

      return parsedXML;
    };

    const handleSuccess = function (result) {
      if (debugMode > 1) {
        log('Returning result', pd.json(JSON.stringify(result)));
      }
      return result;
    };


    return validateInput()
      .then(handlebars.compile)
      .then(prepareRequest)
      .then(sendRequest)
      .then(parseResponse)
      .then(validateSOAP)
      .then(parseFunction.bind(uParser))// TODO merge Hotels
      .then(handleSuccess);
  };
};
