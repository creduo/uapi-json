module.exports = `
<soap:Envelope
  xmlns:air="http://www.travelport.com/schema/air_v47_0"
  xmlns:univ="http://www.travelport.com/schema/universal_v47_0"
  xmlns:com="http://www.travelport.com/schema/common_v47_0"
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
     <soap:Body>
        <univ:AirMerchandisingFulfillmentReq 
            AuthorizedBy="user" 
            TargetBranch="{{TargetBranch}}">
            <com:BillingPointOfSaleInfo OriginApplication="uAPI" />
            <air:HostReservation
                Carrier="{{platingCarrier}}"
                CarrierLocatorCode="{{carrier_pnr}}"
                ProviderCode="{{provider}}"
                ProviderLocatorCode="{{pnr}}" 
                UniversalLocatorCode="{{uapi_ur_locator}}" />
            <air:AirSolution>
                {{#each passengers}}
                <air:SearchTraveler Code="{{passengerTypeCode}}" BookingTravelerRef="{{{uapi_traveler_ref}}}" Key="{{{uapi_traveler_ref}}}"
                                DOB="{{birthDate}}" Age="{{age}}">
                    <com:Name Prefix="{{prefix}}" First="{{firstName}}" Last="{{lastName}}" />
                </air:SearchTraveler>
                {{/each}}
                
                {{#each segments}}
                <air:AirSegment 
                    Key="{{{uapi_segment_ref}}}"
                    ProviderCode="{{provider}}"
                    Group="{{#if group}}{{group}}{{else}}0{{/if}}"
                    Carrier="{{airline}}" FlightNumber="{{flightNumber}}"
                    Origin="{{from}}" Destination="{{to}}"
                    DepartureTime="{{departure}}"
                    ClassOfService="{{bookingClass}}" />
                {{/each}}
                {{#each fareBasisCodes}}
                <air:FareBasis Code="{{this}}" />
                {{/each}}
            </air:AirSolution>
            {{#if optionalServices}}
            <air:OptionalServices>
                {{#each optionalServices}}
                <air:OptionalService Type="{{type}}" Source="{{source}}" SupplierCode="{{supplierCode}}"
                                 Quantity="{{quantity}}" ServiceSubCode="{{serviceSubCode}}" 
                                 TotalPrice="{{totalPrice}}" BasePrice="{{basePrice}}">
                    <com:ServiceData Data="{{seat_id}}" AirSegmentRef="{{{uapi_segment_ref}}}" BookingTravelerRef="{{{uapi_traveler_ref}}}" /> 
                </air:OptionalService>
                {{/each}}
            </air:OptionalServices>
            {{/if}}
            {{#each seats}}
                <air:SpecificSeatAssignment BookingTravelerRef="{{{uapi_traveler_ref}}}" SegmentRef="{{{uapi_segment_ref}}}" SeatId="{{seat_id}}" />
            {{/each}}
        </univ:AirMerchandisingFulfillmentReq>
    </soap:Body>
</soap:Envelope>
`;
