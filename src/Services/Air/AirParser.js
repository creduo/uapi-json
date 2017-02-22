import _ from 'lodash';
import xml2js from 'xml2js';
import moment from 'moment';
import utils from '../../utils';
import format from './AirFormat';
import {
  AirParsingError,
  AirRuntimeError,
  AirFlightInfoRuntimeError,
  GdsRuntimeError,
} from './AirErrors';

/*
 * take air:AirSegment list and return Directions
 */
// TODO integrate into format.getTripsFromBooking
const groupSegmentsByLegs = (segments) => {
  const legs = _.toArray(_.groupBy(segments, 'Group'));
  const mapper = legsSegments => _.map(legsSegments, segment => format.formatTrip(segment, {}));
  const result = _.map(legs, legsSegments => mapper(legsSegments));
  return result;
};

const getPlatingCarrier = (booking) => {
  let platingCarriers = _.pluck(booking['air:AirPricingInfo'], 'PlatingCarrier').filter(pc => pc);

  if (platingCarriers.length === 0) {
    // FIXME: use a smart collapse algorithm?
    platingCarriers = _.pluck(booking['air:TicketingModifiers'], 'PlatingCarrier');
  }

  const singlePlatingCarrier = _.uniq(platingCarriers);

  return singlePlatingCarrier[0];
};

const searchLowFaresValidate = (obj) => {
  // +List, e.g. AirPricePointList, see below
  const rootArrays = ['AirPricePoint', 'AirSegment', 'FareInfo', 'FlightDetails', 'Route'];

  rootArrays.forEach((name) => {
    const airName = 'air:' + name + 'List';
    if (!_.isObject(obj[airName])) {
      throw new AirParsingError.ResponseDataMissing({ missing: airName });
    }
  });

  return obj;
};

const countHistogram = (arr) => {
  const a = {};
  let prev = null;

  if (!_.isArray(arr)) {
    throw new AirParsingError.HistogramTypeInvalid();
  }

  if (_.isObject(arr[0])) {
    arr = arr.map(elem => elem.Code);
  }

  arr.sort();
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i] !== prev) {
      a[arr[i]] = 1;
    } else {
      a[arr[i]] += 1;
    }
    prev = arr[i];
  }

  return a;
};

function lowFaresSearchRequest(obj) {
  return format.formatLowFaresSearch({
    debug: false,
  }, searchLowFaresValidate.call(this, obj));
}


const ticketParse = function (obj) {
  let checkResponseMessage = false;
  let checkTickets = false;

  if (obj['air:TicketFailureInfo']) {
    const msg = obj['air:TicketFailureInfo'].Message;
    if (/VALID\sFORM\sOF\sID\s\sFOID\s\sREQUIRED/.exec(msg)) {
      throw new AirRuntimeError.TicketingFoidRequired(obj);
    }
    throw new AirRuntimeError.TicketingFailed(obj);
  }

  if (obj[`common_${this.uapi_version}:ResponseMessage`]) {
    const responseMessage = obj[`common_${this.uapi_version}:ResponseMessage`];
    responseMessage.forEach((msg) => {
      if (msg._ === 'OK:Ticket issued') {
        checkResponseMessage = true;
      }
    });
  }

  if (checkResponseMessage === false) {
    throw new AirRuntimeError.TicketingResponseMissing(obj);
  }

  if (obj['air:ETR']) {
    try {
      checkTickets = _.reduce(obj['air:ETR'], (acc, x) => {
        const tickets = _.reduce(x['air:Ticket'], (acc2, t) => !!(acc2 && t.TicketNumber), true);
        return !!(acc && tickets);
      }, true);
    } catch (e) {
      console.log(e);
      throw new AirRuntimeError.TicketingTicketsMissing(obj);
    }
  }

  return checkResponseMessage && checkTickets;
};

const nullParsing = obj => obj;

const extractFareRulesLong = (obj) => {
  const result = obj['air:FareRule'];
  return _.map(result, (item) => {
    utils.renameProperty(item, 'air:FareRuleLong', 'Rules');
    return item;
  });
};

const AirPriceFareRules = (obj) => {
  const rules = _.extend(
    extractFareRulesLong(obj['air:AirPriceResult'], {
      // NOTE provider is given for native uAPI request by FareRuleKey, but not here, add it
      // FIXME fixed provider code
      ProviderCode: '1G',
    })
  );
  return rules;
};

function FareRules(obj) {
  return extractFareRulesLong(obj);
}

/*
 * The flagship function for parsing reservations in
 * AirPriceReq (multiple passengers per
 *  air:AirPriceResult/air:AirPricingSolution/air:AirPricingInfo, no air:BookingInfo inside)
 *
 * AirCreateReservationReq/UniversalRecordImportReq - air:AirReservation/air:AirPricingInfo
 *  (one passenger per air:AirPricingInfo, booking exists)
 *
 * NOTES:
 * - air:PassengerType in fare should be an array of passenger
 *   type codes (transform it if necessary)
 */
function parseReservation(fare, pricing) {
  const reservation = {
    priceInfo: {
      TotalPrice: pricing.TotalPrice,
      BasePrice: pricing.BasePrice,
      Taxes: pricing.Taxes,
      passengersCount: countHistogram(fare['air:PassengerType']),
      TaxesInfo: _.map(
          fare['air:TaxInfo'],
          item => ({ value: item.Amount, type: item.Category })
        ),
    },

    fare_str: fare['air:FareCalc'],
    // fares: [], TODO
    // uapi_fare_rule_keys:
    // TODO add dropLeafs option type to parser, use air:FareRuleKey as array of strings
    // TODO add baggage
  };

    // only in booked reservations
  if (fare.LatestTicketingTime) {
    reservation.timeToReprice = fare.LatestTicketingTime;
    // TODO check if pricing['PricingMethod'] == Guaranteed
  }

  if (_.isObject(fare['air:FareInfo'])) {
    reservation.baggage = _.map(fare['air:FareInfo'], info =>
      format.getBaggage({}, info['air:BaggageAllowance'])
    );
  }

  return reservation;
}

const getPricingOptions = (prices) => {
  const result = _.map(prices, (pricing) => {
    const reservations = _.map(pricing['air:AirPricingInfo'], (fare) => {
      const reservation = parseReservation(fare, pricing);
      reservation.status = 'Pricing';
      return reservation;
    });

    return reservations;
  });

  return result;
};


function airPriceRsp(obj) {
  // TODO check root object
  const data = this.mergeLeafRecursive(obj, 'air:AirPriceRsp')['air:AirPriceRsp'];

  const itinerary = data['air:AirItinerary']; // TODO checks
  const segments = itinerary['air:AirSegment']; // TODO checks

  const legs = groupSegmentsByLegs(segments);

  const priceResult = data['air:AirPriceResult'];
  const prices = priceResult['air:AirPricingSolution'];
  const priceKeys = Object.keys(prices);

  if (priceKeys.length > 1) {
    throw new AirParsingError.MultiplePricingSolutionsNotAllowed();
  }

  if (priceKeys.length === 0) {
    throw new AirParsingError.PricingSolutionNotFound();
  }

  // TODO move to separate function e.g. get_reservation_options
  const pricingOptions = getPricingOptions(prices);

  return {
    reservations: pricingOptions[0],
    Directions: legs,
  };
}

function fillAirFlightInfoResponseItem(data) {
  const item = data['air:FlightInfoDetail'];
  return {
    from: item.Origin || '',
    to: item.Destination || '',
    departure: item.ScheduledDepartureTime || '',
    arrival: item.ScheduledArrivalTime || '',
    duration: item.TravelTime || '',
    plane: item.Equipment || '',
    fromTerminal: item.OriginTerminal || '',
    toTerminal: item.DestinationTerminal || '',
  };
}

function airFlightInfoRsp(obj) {
  const data = this.mergeLeafRecursive(obj, 'air:FlightInformationRsp')['air:FlightInfo'];

  if (typeof data['air:FlightInfoErrorMessage'] !== 'undefined') {
    switch (data['air:FlightInfoErrorMessage']._) {
      case 'Airline not supported':
        throw new AirFlightInfoRuntimeError.AirlineNotSupported(obj);
      case 'Flight not found':
        throw new AirFlightInfoRuntimeError.FlightNotFound(obj);
      case 'Invalid Flight Number field':
        throw new AirFlightInfoRuntimeError.InvalidFlightNumber(obj);
      default:
        throw new AirFlightInfoRuntimeError(obj);
    }
  }

  if (typeof data.Carrier === 'undefined') {
    const response = [];
    data.forEach((item) => {
      response.push(fillAirFlightInfoResponseItem(item));
    });
    return response;
  }

  return fillAirFlightInfoResponseItem(data);
}

/*
 * returns keys of reservations (AirPricingInfos) with their corresponding passenger
 * category types and counts for an AirPricingSolution
 *
 * NOTE: uses non-parsed input
 */
function airPriceRspPassengersPerReservation(obj) {
  const data = this.mergeLeafRecursive(obj, 'air:AirPriceRsp')['air:AirPriceRsp'];

  const priceResult = data['air:AirPriceResult'];
  const prices = priceResult['air:AirPricingSolution'];
  const priceKeys = Object.keys(prices);

  const pricing = prices[_.first(priceKeys)];

  return _.mapValues(pricing['air:AirPricingInfo'], (fare) => {
    const histogram = countHistogram(fare['air:PassengerType']);
    return histogram;
  });
}

function airPriceRspPricingSolutionXML(obj) {
  // first let's parse a regular structure
  const objCopy = _.cloneDeep(obj);
  const passengersPerReservations = airPriceRspPassengersPerReservation.call(this, objCopy);

  const segments = obj['air:AirPriceRsp'][0]['air:AirItinerary'][0]['air:AirSegment'];
  const priceResult = obj['air:AirPriceRsp'][0]['air:AirPriceResult'][0];
  const pricingSolutions = priceResult['air:AirPricingSolution'];
  let pricingSolution = 0;
  if (pricingSolutions.length > 1) {
    console.log('More than one solution found in booking. Resolving the cheapest one.');
    const sorted = pricingSolutions.sort(
      (a, b) => parseFloat(a.$.TotalPrice.slice(3)) - parseFloat(b.$.TotalPrice.slice(3))
    );
    pricingSolution = sorted[0];
  } else {
    pricingSolution = pricingSolutions[0];
  }


  // remove segment references and add real segments (required)
  delete (pricingSolution['air:AirSegmentRef']);

  pricingSolution['air:AirSegment'] = segments;

  // pricingSolution = moveObjectElement('air:AirSegment', '$', pricingSolution);

  // delete existing air passenger types for each fare (map stored in passengersPerReservations)
  const pricingInfos = pricingSolution['air:AirPricingInfo'].map(
    info => _.assign({}, info, { 'air:PassengerType': [] })
  );

  this.env.passengers.forEach((passenger, index) => {
    // find a reservation with places available for this passenger type, decrease counter
    const reservationKey = _.findKey(passengersPerReservations, (elem) => {
      const item = elem;
      const ageCategory = passenger.ageCategory;
      if (item[ageCategory] > 0) {
        item[ageCategory] -= 1;
        return true;
      }
      return false;
    });

    const pricingInfo = _.find(pricingInfos, info => info.$.Key === reservationKey);

    pricingInfo['air:PassengerType'].push({
      $: {
        BookingTravelerRef: 'P_' + index,
        Code: passenger.ageCategory,
        Age: passenger.Age,
      },
    });
  });

  pricingSolution['air:AirPricingInfo'] = pricingInfos;
  const resultXml = {};

  ['air:AirSegment', 'air:AirPricingInfo', 'air:FareNote'].forEach((root) => {
    const builder = new xml2js.Builder({
      headless: true,
      rootName: root,
    });

        // workaround because xml2js does not accept arrays to generate multiple "root objects"
    const buildObject = {
      [root]: pricingSolution[root],
    };

    const intResult = builder.buildObject(buildObject);
        // remove root object tags at first and last line
    const lines = intResult.split('\n');
    lines.splice(0, 1);
    lines.splice(-1, 1);

        // return
    resultXml[root + '_XML'] = lines.join('\n');
  });

  return {
    'air:AirPricingSolution': _.clone(pricingSolution.$),
    'air:AirPricingSolution_XML': resultXml,
  };
}

const AirErrorHandler = function (obj) {
  const errData = (obj.detail && obj.detail[`common_${this.uapi_version}:ErrorInfo`]) || null;
  // FIXME collapse versions using a regexp search in ParserUapi
  if (errData) {
    switch (errData[`common_${this.uapi_version}:Code`]) {
      case '3003':
        throw new AirRuntimeError.InvalidRequestData(obj);
      case '2602': // No Solutions in the response.
      case '3037': // No availability on chosen flights, unable to fare quote
        throw new AirRuntimeError.NoResultsFound(obj);
      default:
        throw new AirRuntimeError(obj); // TODO replace with custom error
    }
  }
  throw new AirParsingError(obj);
};

const airGetTicket = function (obj) {
  const etr = obj['air:ETR'];
  if (!etr) {
    throw new AirRuntimeError.TicketRetrieveError(obj);
  }
  const passengersList = etr[`common_${this.uapi_version}:BookingTraveler`];
  const passengers = Object.keys(passengersList).map(
    passengerKey => ({
      firstName: passengersList[passengerKey][`common_${this.uapi_version}:BookingTravelerName`].First,
      lastName: passengersList[passengerKey][`common_${this.uapi_version}:BookingTravelerName`].Last,
    })
  );
  // Checking if pricing info exists
  if (!etr['air:AirPricingInfo']) {
    throw new AirRuntimeError.TicketInfoIncomplete(etr);
  }
  const airPricingInfo = etr['air:AirPricingInfo'][Object.keys(etr['air:AirPricingInfo'])[0]];
  const bookingInfo = airPricingInfo['air:BookingInfo'];
  const ticketsList = etr['air:Ticket'];
  let segmentIterator = 0;
  const tickets = Object.keys(ticketsList).map(
    (ticketKey) => {
      const ticket = ticketsList[ticketKey];
      return {
        ticketNumber: ticket.TicketNumber,
        coupons: Object.keys(ticket['air:Coupon']).map(
          (couponKey) => {
            const coupon = ticket['air:Coupon'][couponKey];
            const couponInfo = {
              couponNumber: coupon.CouponNumber,
              from: coupon.Origin,
              to: coupon.Destination,
              departure: coupon.DepartureTime,
              airline: coupon.MarketingCarrier,
              flightNumber: coupon.MarketingFlightNumber,
              fareBasisCode: coupon.FareBasis,
              status: coupon.Status,
              notValidBefore: coupon.NotValidBefore,
              notValidAfter: coupon.NotValidAfter,
              serviceClass: bookingInfo[segmentIterator].CabinClass,
              bookingClass: bookingInfo[segmentIterator].BookingCode,
            };
            // Incrementing segment index
            segmentIterator += 1;
            // Returning coupon info
            return couponInfo;
          }
        ),
      };
    }
  );
  const taxes = Object.keys(airPricingInfo['air:TaxInfo']).map(
    taxKey => ({
      type: airPricingInfo['air:TaxInfo'][taxKey].Category,
      value: airPricingInfo['air:TaxInfo'][taxKey].Amount,
    })
  );
  const response = {
    uapi_ur_locator: obj.UniversalRecordLocatorCode,
    uapi_reservation_locator: etr['air:AirReservationLocatorCode'],
    pnr: etr.ProviderLocatorCode,
    platingCarrier: etr.PlatingCarrier,
    ticketingPcc: etr.PseudoCityCode,
    issuedAt: etr.IssuedDate,
    fareCalculation: etr['air:FareCalc'],
    priceInfo: {
      TotalPrice: etr.TotalPrice,
      BasePrice: etr.BasePrice,
      EquivalentBasePrice: etr.EquivalentBasePrice,
      Taxes: etr.Taxes,
      TaxesInfo: taxes,
    },
    passengers,
    tickets,
  };

  return response;
};

function extractBookings(obj) {
  const record = obj['universal:UniversalRecord'];
  const messages = obj['common_v36_0:ResponseMessage'] || [];

  messages.forEach((message) => {
    if (/NO VALID FARE FOR INPUT CRITERIA/.exec(message._)) {
      throw new AirRuntimeError.NoValidFare(obj);
    }
  });

  if (!record['air:AirReservation'] || record['air:AirReservation'].length === 0) {
    throw new AirParsingError.ReservationsMissing();
  }

  if (obj['air:AirSegmentSellFailureInfo']) {
    throw new AirRuntimeError.SegmentBookingFailed(obj);
  }

  const travelers = record['common_' + this.uapi_version + ':BookingTraveler'];
  const reservationInfo = record['universal:ProviderReservationInfo'];

  return record['air:AirReservation'].map((booking) => {
    const resKey = `common_${this.uapi_version}:ProviderReservationInfoRef`;
    const providerInfo = reservationInfo[booking[resKey]];

    if (!providerInfo) {
      throw new AirParsingError.ReservationProviderInfoMissing();
    }

    // we usually have one plating carrier across all per-passenger reservations
    const platingCarrier = getPlatingCarrier(booking);

    const passengers = booking[`common_${this.uapi_version}:BookingTravelerRef`].map(
      (travellerRef) => {
        const traveler = travelers[travellerRef];
        if (!traveler) {
          throw new AirRuntimeError.TravelersListError();
        }
        const name = traveler[`common_${this.uapi_version}:BookingTravelerName`];

        // SSR DOC parsing of passport data http://gitlab.travel-swift.com/galileo/galileocommand/blob/master/lib/command/booking.js#L84
        // TODO safety checks
        const firstTraveler = utils.firstInObj(traveler[`common_${this.uapi_version}:SSR`]);
        const ssr = firstTraveler ? firstTraveler.FreeText.split('/') : null;

        // TODO try to parse Swift XI from common_v36_0:AccountingRemark first

        return Object.assign(
          {
            lastName: name.Last,
            firstName: name.First,
            uapi_passenger_ref: traveler.Key,
          },
          ssr ? {
            passCountry: ssr[1], // also in ssr[3]
            passNumber: ssr[2],
          } : null,
          traveler.DOB ? {
            birthDate: moment(traveler.DOB).format('DDMMMYY'),
          } : null,
          traveler.TravelerType ? {
            ageType: traveler.TravelerType,
          } : null,
          traveler.Gender ? {
            gender: traveler.Gender,
          } : null,
        );
      }
    );

    const supplierLocator = booking[`common_${this.uapi_version}:SupplierLocator`] || {};
    const trips = Object.keys(booking['air:AirSegment']).map(
      (key) => {
        const segment = booking['air:AirSegment'][key];
        const flightDetails = Object.keys(segment['air:FlightDetails']).map(
          detailsKey => segment['air:FlightDetails'][detailsKey]
        );
        const plane = flightDetails.map(details => details.Equipment);
        const duration = flightDetails.map(details => details.FlightTime);
        const techStops = flightDetails.slice(1).map(details => details.Origin);
        return {
          from: segment.Origin,
          to: segment.Destination,
          bookingClass: segment.ClassOfService,
          departure: segment.DepartureTime,
          arrival: segment.ArrivalTime,
          airline: segment.Carrier,
          flightNumber: segment.FlightNumber,
          serviceClass: segment.CabinClass,
          status: segment.Status,
          plane,
          duration,
          techStops,
          uapi_segment_ref: segment.ProviderReservationInfoRef,
        };
      }
    );

    const reservations = Object.keys(booking['air:AirPricingInfo']).map(
      (key) => {
        const reservation = booking['air:AirPricingInfo'][key];
        const uapiSegmentRefs = reservation['air:BookingInfo'].map(
          segment => segment.SegmentRef
        );
        const uapiPassengerRefs = reservation[`common_${this.uapi_version}:BookingTravelerRef`];
        const fareInfo = reservation['air:FareInfo'];
        const baggage = Object.keys(fareInfo).map(
          (fareLegKey) => {
            const baggageAllowance = fareInfo[fareLegKey]['air:BaggageAllowance'];
            if (
              !baggageAllowance ||
              !baggageAllowance['air:NumberOfPieces'] ||
              !baggageAllowance['air:MaxWeight']
            ) {
              console.warn('Baggage information is not number and is not weight!', JSON.stringify(obj));
              return { units: 'piece', amount: 0 };
            } else if (baggageAllowance['air:MaxWeight']) {
              return {
                units: baggageAllowance['air:MaxWeight'].Unit.toLowerCase(),
                amount: Number(baggageAllowance['air:MaxWeight'].Value),
              };
            }
            return {
              units: 'piece',
              amount: Number(baggageAllowance['air:NumberOfPieces']),
            };
          }
        );
        const passengersCount = reservation['air:PassengerType'].reduce(
          (memo, data) => Object.assign(memo, {
            [data.Code]: Object.prototype.toString.call(data.BookingTravelerRef) === '[object Array]' ? (
              data.BookingTravelerRef.length
            ) : 1,
          }), {}
        );
        const taxesInfo = Object.keys(reservation['air:TaxInfo']).map(
          taxKey => ({
            value: reservation['air:TaxInfo'][taxKey].Amount,
            type: reservation['air:TaxInfo'][taxKey].Category,
          })
        );
        const priceInfo = {
          totalPrice: reservation.TotalPrice,
          basePrice: reservation.BasePrice,
          equivalentBasePrice: reservation.BasePrice,
          taxes: reservation.Taxes,
          passengersCount,
          taxesInfo,
        };
        return {
          status: reservation.Ticketed ? 'Ticketed' : 'Reserved',
          fareCalculation: reservation['air:FareCalc'],
          priceInfo,
          baggage,
          timeToReprice: reservation.LatestTicketingTime,
          uapi_segment_refs: uapiSegmentRefs,
          uapi_passenger_refs: uapiPassengerRefs,
        };
      }
    );

    return {
      type: 'uAPI',
      pnr: providerInfo.LocatorCode,
      version: record.Version,
      uapi_ur_locator: record.LocatorCode,
      uapi_reservation_locator: booking.LocatorCode,
      uapi_airline_locator: supplierLocator.SupplierLocatorCode || null,
      pnrList: [providerInfo.LocatorCode],
      platingCarrier,
      createdAt: providerInfo.CreateDate,
      modifiedAt: providerInfo.ModifiedDate,
      reservations,
      trips,
      passengers,
      bookingPCC: providerInfo.OwningPCC,
    };
  });
}

function importRequest(data) {
  const response = extractBookings.call(this, data);
  return response;
}

function gdsQueue(req) {
    // TODO implement all major error cases
    // https://support.travelport.com/webhelp/uapi/uAPI.htm#Error_Codes/QUESVC_Service_Error_Codes.htm%3FTocPath%3DError%2520Codes%2520and%2520Messages|_____9
    // like 7015 "Branch does not have Queueing configured"

  let data = null;
  try {
    data = req['common_v36_0:ResponseMessage'][0];
  } catch (e) {
    throw new GdsRuntimeError.PlacingInQueueError(req);
  }

  // TODO check if there can be several messages
  const message = data._;
  if (message.match(/^Booking successfully placed/) === null) {
    throw new GdsRuntimeError.PlacingInQueueMessageMissing(message);
  }

  return true;
}

module.exports = {
  AIR_LOW_FARE_SEARCH_REQUEST: lowFaresSearchRequest,
  AIR_PRICE_REQUEST: airPriceRsp,
  AIR_PRICE_REQUEST_PRICING_SOLUTION_XML: airPriceRspPricingSolutionXML,
  AIR_CREATE_RESERVATION_REQUEST: extractBookings,
  AIR_TICKET_REQUEST: ticketParse,
  AIR_IMPORT_REQUEST: importRequest,
  AIR_PRICE_FARE_RULES: AirPriceFareRules,
  FARE_RULES_RESPONSE: FareRules,
  GDS_QUEUE_PLACE_RESPONSE: gdsQueue,
  AIR_CANCEL_UR: nullParsing,
  UNIVERSAL_RECORD_FOID: nullParsing,
  AIR_ERRORS: AirErrorHandler, // errors handling
  AIR_FLIGHT_INFORMATION: airFlightInfoRsp,
  AIR_GET_TICKET: airGetTicket,
};
